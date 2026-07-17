// Connection diagnostics orchestrator. Walks the product's six-step checklist
// (DNS → TCP → jump chain → host key → auth → SFTP) using injected probes so
// the sequencing/skip logic is testable without real network or ssh2.

const {
  planSteps,
  resolveProbeTarget,
  classifySshError,
} = require("./diagnosticsCore.cjs");

async function runDiagnosticsWithDeps(options, deps, onProgress = () => {}) {
  const results = [];
  const startedAt = new Map();

  const emit = (step, status, extra = {}) => {
    const now = Date.now();
    if (status === "running") startedAt.set(step, now);
    const durationMs = status !== "running" && startedAt.has(step)
      ? now - startedAt.get(step)
      : undefined;
    const entry = { step, status, ...extra };
    if (durationMs !== undefined) entry.durationMs = durationMs;
    const existing = results.findIndex((r) => r.step === step);
    if (existing >= 0) results[existing] = entry;
    else results.push(entry);
    try {
      onProgress(entry);
    } catch {
      // Progress delivery must never abort the run.
    }
  };

  const steps = planSteps(options);
  const skipFrom = (failedStep) => {
    const failedIndex = steps.indexOf(failedStep);
    for (const step of steps.slice(failedIndex + 1)) {
      emit(step, "skipped");
    }
  };

  const target = resolveProbeTarget(options);
  const jumpHosts = options.jumpHosts || [];

  // 1. DNS + 2. TCP against the endpoint this machine actually dials.
  if (target.kind === "proxy-command") {
    emit("dns", "skipped", { detailKind: "proxyCommand" });
    emit("tcp", "skipped", { detailKind: "proxyCommand" });
  } else {
    emit("dns", "running");
    let address = target.hostname;
    if (deps.isIp(target.hostname)) {
      emit("dns", "success", { detail: target.hostname, detailKind: "ipLiteral" });
    } else {
      try {
        address = await deps.lookup(target.hostname);
        emit("dns", "success", { detail: address });
      } catch (err) {
        emit("dns", "failed", {
          detail: err?.message,
          errorKind: "dns",
        });
        skipFrom("dns");
        return { results };
      }
    }

    emit("tcp", "running");
    try {
      const ms = await deps.probeTcp(address, target.port, options.tcpTimeoutMs);
      emit("tcp", "success", { detail: `${ms} ms`, latencyMs: ms });
    } catch (err) {
      emit("tcp", "failed", {
        detail: err?.message,
        errorKind: classifySshError(err?.message),
      });
      skipFrom("tcp");
      return { results };
    }
  }

  // 3. Jump chain (only when configured).
  let sock;
  let chainConnections = [];
  if (jumpHosts.length > 0) {
    emit("jumpChain", "running");
    try {
      const chain = await deps.connectChain(options, jumpHosts);
      sock = chain.socket;
      chainConnections = chain.connections || [];
      emit("jumpChain", "success", { detail: `${jumpHosts.length}` });
    } catch (err) {
      emit("jumpChain", "failed", {
        detail: err?.message,
        errorKind: classifySshError(err?.message),
      });
      skipFrom("jumpChain");
      return { results };
    }
  }

  // 4. Host key + 5. Auth run inside one target connection attempt: the
  // verifier callback reports the key before ssh2 moves on to authentication.
  emit("hostKey", "running");
  emit("auth", "running");
  let probe = null;
  let conn = null;
  try {
    probe = await deps.connectTarget({
      options,
      sock,
      onHostKey: (info) => {
        const status = info.status === "trusted" || info.status === "trusted-system"
          ? "success"
          : "warning";
        emit("hostKey", status, {
          detail: info.fingerprint ? `${info.keyType} SHA256:${info.fingerprint}` : undefined,
          hostKeyStatus: info.status,
        });
      },
      onAuthAttempt: (label) => emit("auth", "running", { detail: label }),
    });
    conn = probe.conn || null;

    // Transport died before the host key was even presented.
    if (results.find((r) => r.step === "hostKey")?.status === "running") {
      emit("hostKey", probe.ok ? "success" : "skipped");
    }

    if (probe.ok) {
      emit("auth", "success", { detail: probe.method, authMethod: probe.method });
    } else if (probe.needsInteractive) {
      emit("auth", "warning", {
        detailKind: "needsInteractive",
        detail: probe.error,
      });
    } else {
      emit("auth", "failed", {
        detail: (probe.methodsTried || []).length > 0
          ? `${probe.error || ""} (${probe.methodsTried.join(", ")})`.trim()
          : probe.error,
        errorKind: classifySshError(probe.error),
        methodsTried: probe.methodsTried,
      });
    }
  } catch (err) {
    if (results.find((r) => r.step === "hostKey")?.status === "running") {
      emit("hostKey", "skipped");
    }
    emit("auth", "failed", {
      detail: err?.message,
      errorKind: classifySshError(err?.message),
    });
  }

  // 6. SFTP (only meaningful after a successful authentication).
  if (probe?.ok && conn) {
    emit("sftp", "running");
    try {
      await deps.probeSftp(conn);
      emit("sftp", "success");
    } catch (err) {
      emit("sftp", "failed", { detail: err?.message });
    }
  } else {
    emit("sftp", "skipped");
  }

  try {
    deps.closeAll({ conn, connections: chainConnections });
  } catch {
    // Best-effort teardown only.
  }

  return { results };
}

module.exports = { runDiagnosticsWithDeps };
