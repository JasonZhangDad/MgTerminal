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

function parseKubectlList(stdout, resourceName) {
  try {
    const parsed = JSON.parse(String(stdout || ""));
    if (!parsed || !Array.isArray(parsed.items)) {
      return { ok: false, error: `Invalid JSON returned while listing ${resourceName}: missing items array` };
    }
    return { ok: true, items: parsed.items };
  } catch (error) {
    return {
      ok: false,
      error: `Invalid JSON returned while listing ${resourceName}: ${error?.message || "parse failed"}`,
    };
  }
}

function formatResourceAge(creationTimestamp) {
  const createdAt = Date.parse(String(creationTimestamp || ""));
  if (!Number.isFinite(createdAt)) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - createdAt) / 1000));
  if (seconds >= 86400) return `${Math.floor(seconds / 86400)}d`;
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)}h`;
  if (seconds >= 60) return `${Math.floor(seconds / 60)}m`;
  return `${seconds}s`;
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
      "get namespaces -o json",
      20000,
    );
    if (!result.success) {
      return { success: false, error: result.error || "Failed to list namespaces" };
    }
    const parsed = parseKubectlList(result.stdout, "namespaces");
    if (!parsed.ok) return { success: false, error: parsed.error };
    const namespaces = parsed.items.map((item) => ({
      name: item?.metadata?.name || "",
      status: item?.status?.phase || "",
      age: formatResourceAge(item?.metadata?.creationTimestamp),
    })).filter((namespace) => namespace.name);
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
      `get pods ${scope} -o json`,
      25000,
    );
    if (!result.success) {
      return { success: false, error: result.error || "Failed to list pods" };
    }

    const parsed = parseKubectlList(result.stdout, "pods");
    if (!parsed.ok) return { success: false, error: parsed.error };
    const pods = parsed.items.map((item) => {
      const containerStatuses = Array.isArray(item?.status?.containerStatuses)
        ? item.status.containerStatuses
        : [];
      const containerCount = Array.isArray(item?.spec?.containers)
        ? item.spec.containers.length
        : containerStatuses.length;
      return {
        name: item?.metadata?.name || "",
        namespace: item?.metadata?.namespace || ns || "default",
        ready: `${containerStatuses.filter((status) => status?.ready).length}/${containerCount}`,
        status: item?.metadata?.deletionTimestamp ? "Terminating" : (item?.status?.phase || ""),
        restarts: containerStatuses.reduce(
          (total, status) => total + (Number(status?.restartCount) || 0),
          0,
        ),
        age: formatResourceAge(item?.metadata?.creationTimestamp),
        ip: item?.status?.podIP || "",
        node: item?.spec?.nodeName || "",
      };
    }).filter((pod) => pod.name);
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
      `get deployments ${scope} -o json`,
      25000,
    );
    if (!result.success) {
      return { success: false, error: result.error || "Failed to list deployments" };
    }

    const parsed = parseKubectlList(result.stdout, "deployments");
    if (!parsed.ok) return { success: false, error: parsed.error };
    const deployments = parsed.items.map((item) => ({
      name: item?.metadata?.name || "",
      namespace: item?.metadata?.namespace || ns || "default",
      ready: `${Number(item?.status?.readyReplicas) || 0}/${Number(item?.spec?.replicas) || 0}`,
      upToDate: String(Number(item?.status?.updatedReplicas) || 0),
      available: String(Number(item?.status?.availableReplicas) || 0),
      age: formatResourceAge(item?.metadata?.creationTimestamp),
    })).filter((deployment) => deployment.name);
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

  async function listEvents(event, payload) {
    const sessionId = payload?.sessionId;
    if (!sessionId) return { success: false, error: "Missing sessionId" };
    const namespace = payload?.namespace ? sanitizeK8sName(payload.namespace) : null;
    if (payload?.namespace && !namespace) return { success: false, error: "Invalid namespace" };
    const scope = namespace ? `-n ${shQuote(namespace)}` : "--all-namespaces";
    const result = await runKubectl(
      event,
      sessionId,
      `get events ${scope} -o json --sort-by=.metadata.creationTimestamp`,
      25000,
    );
    if (!result.success) return { success: false, error: result.error || "Failed to list events" };
    const parsed = parseKubectlList(result.stdout, "events");
    if (!parsed.ok) return { success: false, error: parsed.error };
    const events = parsed.items.map((item) => {
      const component = item?.source?.component || item?.reportingController || "";
      const host = item?.source?.host || item?.reportingInstance || "";
      return {
        name: item?.metadata?.name || "",
        namespace: item?.metadata?.namespace || item?.involvedObject?.namespace || namespace || "default",
        type: item?.type || "Normal",
        reason: item?.reason || "",
        message: item?.message || item?.note || "",
        count: Number(item?.count || item?.deprecatedCount) || 1,
        objectKind: item?.involvedObject?.kind || item?.regarding?.kind || "",
        objectName: item?.involvedObject?.name || item?.regarding?.name || "",
        source: [component, host].filter(Boolean).join("/"),
        firstSeen: item?.firstTimestamp || item?.deprecatedFirstTimestamp || item?.metadata?.creationTimestamp || "",
        lastSeen: item?.eventTime || item?.lastTimestamp || item?.series?.lastObservedTime || item?.deprecatedLastTimestamp || item?.metadata?.creationTimestamp || "",
      };
    }).filter((item) => item.name || item.reason || item.message);
    return { success: true, events };
  }

  function deploymentRolloutTarget(payload) {
    const sessionId = payload?.sessionId;
    const namespace = sanitizeK8sName(payload?.namespace) || "default";
    const name = sanitizeK8sName(payload?.name || payload?.deployment);
    if (!sessionId) return { error: "Missing sessionId" };
    if (!name) return { error: "Invalid deployment name" };
    return { sessionId, namespace, name };
  }

  async function runDeploymentRollout(event, payload, args, timeoutMs) {
    const target = deploymentRolloutTarget(payload);
    if (target.error) return { success: false, error: target.error };
    const result = await runKubectl(
      event,
      target.sessionId,
      `rollout ${args} deployment/${target.name} -n ${shQuote(target.namespace)}`,
      timeoutMs,
    );
    if (!result.success) return { success: false, error: result.error || "Rollout command failed" };
    return { success: true, output: String(result.stdout || result.stderr || "") };
  }

  async function getDeploymentRolloutStatus(event, payload) {
    const target = deploymentRolloutTarget(payload);
    if (target.error) return { success: false, error: target.error };
    const result = await runKubectl(
      event,
      target.sessionId,
      `rollout status deployment/${target.name} -n ${shQuote(target.namespace)} --timeout=20s`,
      30000,
    );
    if (!result.success) return { success: false, error: result.error || "Failed to get rollout status" };
    return { success: true, output: String(result.stdout || result.stderr || "") };
  }

  async function getDeploymentRolloutHistory(event, payload) {
    return runDeploymentRollout(event, payload, "history", 30000);
  }

  async function restartDeploymentRollout(event, payload) {
    return runDeploymentRollout(event, payload, "restart", 60000);
  }

  async function execPod(event, payload) {
    const sessionId = payload?.sessionId;
    const namespace = sanitizeK8sName(payload?.namespace);
    const pod = sanitizeK8sName(payload?.pod);
    const container = payload?.container ? sanitizeK8sName(payload.container) : null;
    const command = typeof payload?.command === "string" ? payload.command.trim().slice(0, 32768) : "";
    if (!sessionId) return { success: false, error: "Missing sessionId" };
    if (!namespace || !pod || (payload?.container && !container)) {
      return { success: false, error: "Invalid namespace, pod, or container" };
    }
    if (!command) return { success: false, error: "Command is required" };
    if (command.includes("\0")) return { success: false, error: "Invalid command" };
    const containerArg = container ? ` -c ${shQuote(container)}` : "";
    const result = await runKubectl(
      event,
      sessionId,
      `exec -n ${shQuote(namespace)} ${shQuote(pod)}${containerArg} -- sh -lc ${shQuote(command)}`,
      60000,
    );
    if (!result.success) return { success: false, error: result.error || "Pod exec failed" };
    return { success: true, output: String(result.stdout || result.stderr || "") };
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
    listEvents,
    getDeploymentRolloutStatus,
    getDeploymentRolloutHistory,
    restartDeploymentRollout,
    execPod,
  };
}

module.exports = {
  createKubectlOpsApi,
  sanitizeK8sName,
};
