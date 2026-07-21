/* eslint-disable no-undef */

/**
 * Remote kubectl wrappers for System Manager (read-only MVP).
 * Commands run on the connected session; no kube secrets are returned to the UI.
 */

function shQuote(str) {
  return `'${String(str).replace(/'/g, `'\"'\"'`)}'`;
}

/** DNS-1123-ish name: alnum, dash, dot; max 253. */
function sanitizeK8sName(name) {
  const trimmed = String(name || "").trim().slice(0, 253);
  if (!trimmed) return null;
  if (!/^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?$/.test(trimmed) && !/^[a-zA-Z0-9]$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function isSuccessfulCommandResult(result) {
  return result?.success && (result.code === 0 || result.code === null || result.code === undefined);
}

function kubectlError(result, fallback) {
  return (result?.stderr || result?.error || "").trim() || fallback;
}

function parseWideRows(stdout, headers) {
  const lines = (stdout || "").split("\n").map((l) => l.trimEnd()).filter(Boolean);
  if (lines.length === 0) return [];
  // Drop header if present
  const start = /NAME\s+/i.test(lines[0]) ? 1 : 0;
  const rows = [];
  for (let i = start; i < lines.length; i += 1) {
    const cols = lines[i].trim().split(/\s{2,}|\t+/).map((c) => c.trim()).filter(Boolean);
    if (cols.length < 2) continue;
    const row = {};
    for (let h = 0; h < headers.length; h += 1) {
      row[headers[h]] = cols[h] ?? "";
    }
    // last column may absorb rest
    if (cols.length > headers.length) {
      row[headers[headers.length - 1]] = cols.slice(headers.length - 1).join(" ");
    }
    rows.push(row);
  }
  return rows;
}

function parseRestarts(value) {
  const m = String(value || "0").match(/^(\d+)/);
  return m ? Number(m[1]) : 0;
}

function createKubectlOpsApi({ execOnSession }) {
  async function runKubectl(event, sessionId, args, timeoutMs = 20000) {
    const cmd = `kubectl ${args}`.trim();
    const result = await execOnSession(event, sessionId, cmd, timeoutMs);
    if (isSuccessfulCommandResult(result)) return result;
    if (!result.success) return result;
    return {
      success: false,
      error: kubectlError(result, `kubectl exited with code ${result.code}`),
      stderr: result.stderr,
      stdout: result.stdout,
      code: result.code,
    };
  }

  async function getCurrentContext(event, sessionId) {
    const result = await runKubectl(event, sessionId, "config current-context", 10000);
    if (!result.success) {
      return { success: false, error: result.error || "Failed to get current context" };
    }
    const name = String(result.stdout || "").trim();
    return { success: true, context: name || null };
  }

  async function listContexts(event, sessionId) {
    const result = await runKubectl(
      event,
      sessionId,
      "config get-contexts --no-headers",
      12000,
    );
    if (!result.success) {
      return { success: false, error: result.error || "Failed to list contexts" };
    }
    const contexts = [];
    for (const line of String(result.stdout || "").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      // Format: * NAME CLUSTER AUTHINFO NAMESPACE  (leading * for current)
      const current = trimmed.startsWith("*");
      const rest = current ? trimmed.slice(1).trim() : trimmed;
      const parts = rest.split(/\s+/).filter(Boolean);
      if (parts.length < 3) continue;
      contexts.push({
        name: parts[0],
        cluster: parts[1] || "",
        user: parts[2] || "",
        namespace: parts[3] || "",
        current,
      });
    }
    return { success: true, contexts };
  }

  async function listNamespaces(event, sessionId) {
    const result = await runKubectl(
      event,
      sessionId,
      "get namespaces --no-headers",
      20000,
    );
    if (!result.success) {
      return { success: false, error: result.error || "Failed to list namespaces" };
    }
    const namespaces = [];
    for (const line of String(result.stdout || "").split("\n")) {
      const cols = line.trim().split(/\s+/).filter(Boolean);
      if (cols.length < 2) continue;
      namespaces.push({
        name: cols[0],
        status: cols[1] || "",
        age: cols[2] || "",
      });
    }
    return { success: true, namespaces };
  }

  async function listPods(event, payload) {
    const sessionId = payload?.sessionId;
    if (!sessionId) return { success: false, error: "Missing sessionId" };
    const ns = payload?.namespace ? sanitizeK8sName(payload.namespace) : null;
    if (payload?.namespace && !ns) {
      return { success: false, error: "Invalid namespace" };
    }
    const scope = ns ? `-n ${shQuote(ns)}` : "--all-namespaces";
    const result = await runKubectl(
      event,
      sessionId,
      `get pods ${scope} --no-headers -o wide`,
      25000,
    );
    if (!result.success) {
      return { success: false, error: result.error || "Failed to list pods" };
    }

    const pods = [];
    for (const line of String(result.stdout || "").split("\n")) {
      const cols = line.trim().split(/\s+/).filter(Boolean);
      if (cols.length < 5) continue;
      // all-namespaces: NS NAME READY STATUS RESTARTS AGE IP NODE ...
      // namespaced: NAME READY STATUS RESTARTS AGE IP NODE ...
      if (ns) {
        pods.push({
          name: cols[0],
          namespace: ns,
          ready: cols[1] || "",
          status: cols[2] || "",
          restarts: parseRestarts(cols[3]),
          age: cols[4] || "",
          ip: cols[5] || "",
          node: cols[6] || "",
        });
      } else {
        pods.push({
          namespace: cols[0],
          name: cols[1],
          ready: cols[2] || "",
          status: cols[3] || "",
          restarts: parseRestarts(cols[4]),
          age: cols[5] || "",
          ip: cols[6] || "",
          node: cols[7] || "",
        });
      }
    }
    return { success: true, pods };
  }

  async function listDeployments(event, payload) {
    const sessionId = payload?.sessionId;
    if (!sessionId) return { success: false, error: "Missing sessionId" };
    const ns = payload?.namespace ? sanitizeK8sName(payload.namespace) : null;
    if (payload?.namespace && !ns) {
      return { success: false, error: "Invalid namespace" };
    }
    const scope = ns ? `-n ${shQuote(ns)}` : "--all-namespaces";
    const result = await runKubectl(
      event,
      sessionId,
      `get deployments ${scope} --no-headers -o wide`,
      25000,
    );
    if (!result.success) {
      return { success: false, error: result.error || "Failed to list deployments" };
    }

    const deployments = [];
    for (const line of String(result.stdout || "").split("\n")) {
      const cols = line.trim().split(/\s+/).filter(Boolean);
      if (cols.length < 4) continue;
      // all-namespaces: NS NAME READY UP-TO-DATE AVAILABLE AGE ...
      // namespaced: NAME READY UP-TO-DATE AVAILABLE AGE ...
      if (ns) {
        deployments.push({
          name: cols[0],
          namespace: ns,
          ready: cols[1] || "",
          upToDate: cols[2] || "",
          available: cols[3] || "",
          age: cols[4] || "",
        });
      } else {
        if (cols.length < 5) continue;
        deployments.push({
          namespace: cols[0],
          name: cols[1],
          ready: cols[2] || "",
          upToDate: cols[3] || "",
          available: cols[4] || "",
          age: cols[5] || "",
        });
      }
    }
    return { success: true, deployments };
  }

  async function getPodLogs(event, payload) {
    const sessionId = payload?.sessionId;
    const namespace = sanitizeK8sName(payload?.namespace);
    const pod = sanitizeK8sName(payload?.pod);
    if (!sessionId) return { success: false, error: "Missing sessionId" };
    if (!namespace || !pod) return { success: false, error: "Invalid namespace or pod" };
    const tail = Math.min(Math.max(Number(payload?.tailLines) || 200, 10), 2000);
    const container = payload?.container ? sanitizeK8sName(payload.container) : null;
    const containerArg = container ? `-c ${shQuote(container)}` : "";
    const result = await runKubectl(
      event,
      sessionId,
      `logs -n ${shQuote(namespace)} ${shQuote(pod)} ${containerArg} --tail=${tail}`.replace(/\s+/g, " ").trim(),
      30000,
    );
    if (!result.success) {
      return { success: false, error: result.error || "Failed to fetch pod logs" };
    }
    return { success: true, logs: String(result.stdout || "") };
  }

  async function describePod(event, payload) {
    const sessionId = payload?.sessionId;
    const namespace = sanitizeK8sName(payload?.namespace);
    const pod = sanitizeK8sName(payload?.pod);
    if (!sessionId) return { success: false, error: "Missing sessionId" };
    if (!namespace || !pod) return { success: false, error: "Invalid namespace or pod" };
    const result = await runKubectl(
      event,
      sessionId,
      `describe pod -n ${shQuote(namespace)} ${shQuote(pod)}`,
      30000,
    );
    if (!result.success) {
      return { success: false, error: result.error || "Failed to describe pod" };
    }
    return { success: true, describe: String(result.stdout || "") };
  }

  async function deletePod(event, payload) {
    const sessionId = payload?.sessionId;
    const namespace = sanitizeK8sName(payload?.namespace);
    const pod = sanitizeK8sName(payload?.pod);
    if (!sessionId) return { success: false, error: "Missing sessionId" };
    if (!namespace || !pod) return { success: false, error: "Invalid namespace or pod" };
    const result = await runKubectl(
      event,
      sessionId,
      `delete pod -n ${shQuote(namespace)} ${shQuote(pod)} --wait=false`,
      60000,
    );
    if (!result.success) {
      return { success: false, error: result.error || "Failed to delete pod" };
    }
    return { success: true, output: String(result.stdout || result.stderr || "deleted") };
  }

  async function scaleDeployment(event, payload) {
    const sessionId = payload?.sessionId;
    const namespace = sanitizeK8sName(payload?.namespace) || "default";
    const name = sanitizeK8sName(payload?.name || payload?.deployment);
    const replicas = Number(payload?.replicas);
    if (!sessionId) return { success: false, error: "Missing sessionId" };
    if (!name) return { success: false, error: "Invalid deployment name" };
    if (!Number.isFinite(replicas) || replicas < 0 || replicas > 1000 || !Number.isInteger(replicas)) {
      return { success: false, error: "replicas must be an integer between 0 and 1000" };
    }
    // name is DNS-1123 sanitized (no shell metacharacters); safe in resource path.
    const result = await runKubectl(
      event,
      sessionId,
      `scale deployment/${name} -n ${shQuote(namespace)} --replicas=${replicas}`,
      60000,
    );
    if (!result.success) {
      return { success: false, error: result.error || "Failed to scale deployment" };
    }
    return { success: true, output: String(result.stdout || result.stderr || "scaled") };
  }

  return {
    getCurrentContext,
    listContexts,
    listNamespaces,
    listPods,
    listDeployments,
    getPodLogs,
    describePod,
    deletePod,
    scaleDeployment,
  };
}

module.exports = {
  createKubectlOpsApi,
  sanitizeK8sName,
};
