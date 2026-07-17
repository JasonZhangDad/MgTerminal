const test = require("node:test");
const assert = require("node:assert/strict");

const { runDiagnosticsWithDeps } = require("./runDiagnostics.cjs");

const baseDeps = (overrides = {}) => ({
  isIp: () => false,
  lookup: async () => "10.0.0.8",
  probeTcp: async () => 82,
  connectChain: async () => ({ socket: { fake: true }, connections: [] }),
  connectTarget: async ({ onHostKey }) => {
    onHostKey({ status: "trusted", keyType: "ssh-ed25519", fingerprint: "abc" });
    return { ok: true, method: "password", methodsTried: ["password"], conn: {} };
  },
  probeSftp: async () => {},
  closeAll: () => {},
  ...overrides,
});

const statusOf = (results, step) => results.find((r) => r.step === step)?.status;

test("full success path: every step succeeds", async () => {
  const { results } = await runDiagnosticsWithDeps(
    { hostname: "example.com", port: 22 },
    baseDeps(),
  );
  assert.equal(statusOf(results, "dns"), "success");
  assert.equal(statusOf(results, "tcp"), "success");
  assert.equal(statusOf(results, "hostKey"), "success");
  assert.equal(statusOf(results, "auth"), "success");
  assert.equal(statusOf(results, "sftp"), "success");
  assert.equal(results.find((r) => r.step === "auth").detail, "password");
  // no jump chain configured -> no jumpChain step in the report
  assert.equal(results.some((r) => r.step === "jumpChain"), false);
});

test("dns failure fails fast and skips all later steps", async () => {
  const { results } = await runDiagnosticsWithDeps(
    { hostname: "nope.invalid" },
    baseDeps({
      lookup: async () => {
        throw new Error("getaddrinfo ENOTFOUND nope.invalid");
      },
    }),
  );
  assert.equal(statusOf(results, "dns"), "failed");
  assert.equal(statusOf(results, "tcp"), "skipped");
  assert.equal(statusOf(results, "auth"), "skipped");
  assert.equal(statusOf(results, "sftp"), "skipped");
});

test("tcp failure skips ssh steps", async () => {
  const { results } = await runDiagnosticsWithDeps(
    { hostname: "example.com" },
    baseDeps({
      probeTcp: async () => {
        throw new Error("connect ECONNREFUSED 10.0.0.8:22");
      },
    }),
  );
  assert.equal(statusOf(results, "dns"), "success");
  assert.equal(statusOf(results, "tcp"), "failed");
  assert.equal(results.find((r) => r.step === "tcp").errorKind, "refused");
  assert.equal(statusOf(results, "hostKey"), "skipped");
});

test("ip literal skips actual dns lookup but reports success", async () => {
  let lookupCalled = false;
  const { results } = await runDiagnosticsWithDeps(
    { hostname: "10.0.0.8" },
    baseDeps({
      isIp: () => true,
      lookup: async () => {
        lookupCalled = true;
        return "10.0.0.8";
      },
    }),
  );
  assert.equal(lookupCalled, false);
  assert.equal(statusOf(results, "dns"), "success");
});

test("jump chain failure skips target steps", async () => {
  const { results } = await runDiagnosticsWithDeps(
    {
      hostname: "target",
      jumpHosts: [{ hostname: "bastion", port: 22 }],
    },
    baseDeps({
      connectChain: async () => {
        throw new Error("Jump host authentication failed: bastion");
      },
    }),
  );
  assert.equal(statusOf(results, "jumpChain"), "failed");
  assert.equal(statusOf(results, "hostKey"), "skipped");
  assert.equal(statusOf(results, "auth"), "skipped");
  assert.equal(statusOf(results, "sftp"), "skipped");
});

test("auth failure marks auth failed and skips sftp", async () => {
  const { results } = await runDiagnosticsWithDeps(
    { hostname: "example.com" },
    baseDeps({
      connectTarget: async ({ onHostKey }) => {
        onHostKey({ status: "unknown", keyType: "ssh-ed25519", fingerprint: "abc" });
        return {
          ok: false,
          error: "All configured authentication methods failed",
          methodsTried: ["agent", "password"],
        };
      },
    }),
  );
  assert.equal(statusOf(results, "hostKey"), "warning");
  assert.equal(statusOf(results, "auth"), "failed");
  assert.match(results.find((r) => r.step === "auth").detail, /agent, password/);
  assert.equal(statusOf(results, "sftp"), "skipped");
});

test("interactive-only server yields auth warning", async () => {
  const { results } = await runDiagnosticsWithDeps(
    { hostname: "example.com" },
    baseDeps({
      connectTarget: async ({ onHostKey }) => {
        onHostKey({ status: "trusted", keyType: "ssh-ed25519", fingerprint: "abc" });
        return { ok: false, needsInteractive: true, methodsTried: [] };
      },
    }),
  );
  assert.equal(statusOf(results, "auth"), "warning");
  assert.equal(statusOf(results, "sftp"), "skipped");
});

test("changed host key is reported as warning but probing continues", async () => {
  const { results } = await runDiagnosticsWithDeps(
    { hostname: "example.com" },
    baseDeps({
      connectTarget: async ({ onHostKey }) => {
        onHostKey({ status: "changed", keyType: "ssh-ed25519", fingerprint: "abc" });
        return { ok: true, method: "publickey-user", methodsTried: [], conn: {} };
      },
    }),
  );
  assert.equal(statusOf(results, "hostKey"), "warning");
  assert.equal(statusOf(results, "auth"), "success");
});

test("proxy command: dns and tcp are skipped, ssh probing continues", async () => {
  const { results } = await runDiagnosticsWithDeps(
    {
      hostname: "target",
      proxy: { type: "command", host: "", port: 0, command: "nc %h %p" },
    },
    baseDeps(),
  );
  assert.equal(statusOf(results, "dns"), "skipped");
  assert.equal(statusOf(results, "tcp"), "skipped");
  assert.equal(statusOf(results, "auth"), "success");
});

test("sftp probe failure is reported without failing auth", async () => {
  const { results } = await runDiagnosticsWithDeps(
    { hostname: "example.com" },
    baseDeps({
      probeSftp: async () => {
        throw new Error("SFTP subsystem not available");
      },
    }),
  );
  assert.equal(statusOf(results, "auth"), "success");
  assert.equal(statusOf(results, "sftp"), "failed");
});

test("progress events are emitted for each step transition", async () => {
  const events = [];
  await runDiagnosticsWithDeps({ hostname: "example.com" }, baseDeps(), (evt) =>
    events.push(evt),
  );
  const dnsEvents = events.filter((e) => e.step === "dns").map((e) => e.status);
  assert.deepEqual(dnsEvents, ["running", "success"]);
  const sftpEvents = events.filter((e) => e.step === "sftp").map((e) => e.status);
  assert.deepEqual(sftpEvents, ["running", "success"]);
});

test("closeAll is invoked even when sftp probe throws", async () => {
  let closed = false;
  await runDiagnosticsWithDeps(
    { hostname: "example.com" },
    baseDeps({
      probeSftp: async () => {
        throw new Error("boom");
      },
      closeAll: () => {
        closed = true;
      },
    }),
  );
  assert.equal(closed, true);
});
