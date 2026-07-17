const test = require("node:test");
const assert = require("node:assert/strict");

const {
  DIAGNOSTIC_STEP_ORDER,
  planSteps,
  resolveProbeTarget,
  classifySshError,
  buildAuthMethodPlan,
} = require("./diagnosticsCore.cjs");

test("DIAGNOSTIC_STEP_ORDER covers all six product steps in order", () => {
  assert.deepEqual(DIAGNOSTIC_STEP_ORDER, [
    "dns",
    "tcp",
    "jumpChain",
    "hostKey",
    "auth",
    "sftp",
  ]);
});

test("planSteps: direct ssh host gets dns/tcp/hostKey/auth/sftp", () => {
  assert.deepEqual(planSteps({ hostname: "h", port: 22 }), [
    "dns",
    "tcp",
    "hostKey",
    "auth",
    "sftp",
  ]);
});

test("planSteps: host with jump chain includes jumpChain step", () => {
  assert.deepEqual(
    planSteps({ hostname: "h", jumpHosts: [{ hostname: "bastion" }] }),
    ["dns", "tcp", "jumpChain", "hostKey", "auth", "sftp"],
  );
});

test("resolveProbeTarget: direct host probes the host itself", () => {
  assert.deepEqual(resolveProbeTarget({ hostname: "example.com", port: 2222 }), {
    kind: "direct",
    hostname: "example.com",
    port: 2222,
  });
});

test("resolveProbeTarget: defaults port to 22", () => {
  assert.equal(resolveProbeTarget({ hostname: "h" }).port, 22);
});

test("resolveProbeTarget: with jump hosts probes the first hop", () => {
  assert.deepEqual(
    resolveProbeTarget({
      hostname: "target",
      port: 22,
      jumpHosts: [{ hostname: "bastion", port: 2200 }, { hostname: "inner" }],
    }),
    { kind: "jump", hostname: "bastion", port: 2200 },
  );
});

test("resolveProbeTarget: with http/socks5 proxy probes the proxy endpoint", () => {
  assert.deepEqual(
    resolveProbeTarget({
      hostname: "target",
      proxy: { type: "socks5", host: "proxy.local", port: 1080 },
    }),
    { kind: "proxy", hostname: "proxy.local", port: 1080 },
  );
});

test("resolveProbeTarget: proxy command cannot be probed directly", () => {
  assert.deepEqual(
    resolveProbeTarget({
      hostname: "target",
      proxy: { type: "command", host: "", port: 0, command: "nc %h %p" },
    }),
    { kind: "proxy-command" },
  );
});

test("resolveProbeTarget: jump hosts win over proxy (proxy applies to first hop)", () => {
  const target = resolveProbeTarget({
    hostname: "target",
    proxy: { type: "http", host: "proxy.local", port: 8080 },
    jumpHosts: [{ hostname: "bastion" }],
  });
  // The chain connector dials the proxy for hop 1 when configured, but the
  // reachable endpoint from this machine is still the proxy.
  assert.equal(target.kind, "proxy");
  assert.equal(target.hostname, "proxy.local");
});

test("classifySshError: auth failures", () => {
  assert.equal(
    classifySshError("All configured authentication methods failed"),
    "auth",
  );
  assert.equal(classifySshError("Authentication failed."), "auth");
  assert.equal(classifySshError("Permission denied (publickey)"), "auth");
});

test("classifySshError: timeouts and refusals", () => {
  assert.equal(classifySshError("Timed out while waiting for handshake"), "timeout");
  assert.equal(classifySshError("connect ETIMEDOUT 1.2.3.4:22"), "timeout");
  assert.equal(classifySshError("connect ECONNREFUSED 1.2.3.4:22"), "refused");
  assert.equal(classifySshError("getaddrinfo ENOTFOUND nope.invalid"), "dns");
  assert.equal(classifySshError("Something odd"), "other");
});

test("buildAuthMethodPlan: user key first, then agent, password, defaults", () => {
  const plan = buildAuthMethodPlan({
    hasUserKey: true,
    hasAgent: true,
    hasPassword: true,
    defaultKeyNames: ["id_ed25519"],
  });
  assert.deepEqual(plan.map((m) => m.type), ["publickey", "agent", "password"]);
});

test("buildAuthMethodPlan: default keys only offered without a user key", () => {
  const plan = buildAuthMethodPlan({
    hasUserKey: false,
    hasAgent: false,
    hasPassword: false,
    defaultKeyNames: ["id_ed25519", "id_rsa"],
  });
  assert.deepEqual(
    plan.map((m) => m.id),
    ["publickey-default-id_ed25519", "publickey-default-id_rsa"],
  );
});

test("buildAuthMethodPlan: empty plan when nothing configured", () => {
  assert.deepEqual(
    buildAuthMethodPlan({ hasUserKey: false, hasAgent: false, hasPassword: false, defaultKeyNames: [] }),
    [],
  );
});
