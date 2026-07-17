// Pure planning/classification logic for the connection diagnostics feature
// ("Test Connection"). No I/O here — the bridge injects real DNS/TCP/SSH
// probes so this module stays unit-testable.

const DIAGNOSTIC_STEP_ORDER = ["dns", "tcp", "jumpChain", "hostKey", "auth", "sftp"];

// Which steps apply to this host configuration. dns/tcp always run (they may
// be reported as skipped for command proxies), jumpChain only when a chain is
// configured.
function planSteps(options) {
  const steps = ["dns", "tcp"];
  if ((options.jumpHosts || []).length > 0) steps.push("jumpChain");
  steps.push("hostKey", "auth", "sftp");
  return steps;
}

// The endpoint this machine actually dials first. DNS/TCP probes must run
// against that endpoint: with a jump chain the target is resolved remotely,
// and with a proxy only the proxy endpoint is reachable locally.
function resolveProbeTarget(options) {
  const jumpHosts = options.jumpHosts || [];
  const proxy = options.proxy;
  if (proxy) {
    if (proxy.type === "command") return { kind: "proxy-command" };
    return { kind: "proxy", hostname: proxy.host, port: proxy.port };
  }
  if (jumpHosts.length > 0) {
    return {
      kind: "jump",
      hostname: jumpHosts[0].hostname,
      port: jumpHosts[0].port || 22,
    };
  }
  return { kind: "direct", hostname: options.hostname, port: options.port || 22 };
}

function classifySshError(message) {
  const normalized = String(message || "").toLowerCase();
  if (
    normalized.includes("all configured authentication methods failed") ||
    normalized.includes("authentication failed") ||
    normalized.includes("too many authentication failures") ||
    /permission denied\s*\(/.test(normalized) ||
    normalized.includes("no authentication methods available")
  ) {
    return "auth";
  }
  if (normalized.includes("timed out") || normalized.includes("etimedout")) {
    return "timeout";
  }
  if (normalized.includes("econnrefused")) return "refused";
  if (normalized.includes("enotfound") || normalized.includes("eai_again")) {
    return "dns";
  }
  return "other";
}

// Mirrors the production auth order in startSession.cjs (user key → agent →
// password → default ~/.ssh keys), minus keyboard-interactive: diagnostics is
// non-interactive, so an MFA-only server is reported instead of prompted.
function buildAuthMethodPlan({ hasUserKey, hasAgent, hasPassword, defaultKeyNames = [] }) {
  const plan = [];
  if (hasUserKey) plan.push({ type: "publickey", id: "publickey-user" });
  if (hasAgent) plan.push({ type: "agent", id: "agent" });
  if (hasPassword) plan.push({ type: "password", id: "password" });
  if (!hasUserKey) {
    for (const keyName of defaultKeyNames) {
      plan.push({ type: "publickey", id: `publickey-default-${keyName}` });
    }
  }
  return plan;
}

module.exports = {
  DIAGNOSTIC_STEP_ORDER,
  planSteps,
  resolveProbeTarget,
  classifySshError,
  buildAuthMethodPlan,
};
