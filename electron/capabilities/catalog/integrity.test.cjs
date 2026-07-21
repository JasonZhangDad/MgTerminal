"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { ALL_CAPABILITIES } = require("../index.cjs");
const { CAPABILITY_STATUS, CAPABILITY_SURFACES } = require("../constants.cjs");
const { getCliRpcMethod } = require("../adapters/cliAdapter.cjs");
const {
  validateCapabilityDefinition,
  WRITE_BYPASSES_APPROVAL_ALLOWLIST,
} = require("../capabilityDefinition.cjs");

const IMPLEMENTED_CLI_COMMANDS = [
  ["status"],
  ["env"],
  ["session"],
  ["exec"],
  ["job-start"],
  ["job-poll"],
  ["job-stop"],
  ["sftp", "list"],
  ["sftp", "read"],
  ["sftp", "write"],
  ["sftp", "download"],
  ["sftp", "upload"],
  ["sftp", "mkdir"],
  ["sftp", "delete"],
  ["sftp", "rename"],
  ["sftp", "stat"],
  ["sftp", "chmod"],
  ["sftp", "home"],
  ["cancel"],
  ["resume"],
  ["vault", "host", "get"],
  ["vault", "host", "open"],
  ["vault", "host-notes", "get"],
  ["vault", "host-notes", "set"],
  ["snippets", "list"],
  ["snippets", "get"],
  ["snippets", "run"],
  ["snippets", "create"],
  ["snippets", "update"],
  ["snippets", "delete"],
  ["scripts", "list"],
  ["scripts", "get"],
  ["scripts", "run"],
  ["scripts", "create"],
  ["scripts", "update"],
  ["scripts", "delete"],
  ["scripts", "reference"],
  ["scripts", "runs", "list"],
  ["scripts", "run", "stop"],
  ["scripts", "run", "pause"],
  ["scripts", "run", "resume"],
  ["scripts", "targets", "set"],
  ["vault", "host", "connect-scripts", "list"],
  ["vault", "host", "connect-scripts", "set"],
  ["portforward", "rules", "list"],
  ["portforward", "tunnels", "list"],
  ["portforward", "start"],
  ["portforward", "stop"],
  ["kubernetes", "namespaces", "list"],
  ["kubernetes", "pods", "list"],
  ["kubernetes", "deployments", "list"],
  ["kubernetes", "pods", "logs"],
  ["kubernetes", "pods", "describe"],
  ["kubernetes", "pods", "delete"],
  ["kubernetes", "deployments", "scale"],
];

test("every implemented cli command maps to an rpc method", () => {
  for (const command of IMPLEMENTED_CLI_COMMANDS) {
    const rpcMethod = getCliRpcMethod(command);
    assert.ok(rpcMethod, `missing rpc mapping for ${command.join(" ")}`);
  }
});

test("implemented capabilities expose at least one surface binding", () => {
  for (const capability of ALL_CAPABILITIES) {
    if (capability.status !== CAPABILITY_STATUS.IMPLEMENTED) continue;
    const surfaces = Object.keys(capability.surfaces || {});
    assert.ok(surfaces.length > 0, `${capability.id} has no surfaces`);
    const hasRpc = surfaces.some((surface) => capability.surfaces[surface]?.rpcMethod);
    const hasCli = surfaces.some((surface) => capability.surfaces[surface]?.command);
    const hasMagiesTerminal = Boolean(capability.surfaces[CAPABILITY_SURFACES.MAGIES_TERMINAL]?.toolName);
    assert.ok(
      hasRpc || hasCli || hasMagiesTerminal || capability.surfaces[CAPABILITY_SURFACES.BUILTIN]?.mcpTool,
      `${capability.id} has no rpc/cli/magiesTerminal/mcp binding`,
    );
  }
});

test("capability ids are unique", () => {
  const ids = ALL_CAPABILITIES.map((capability) => capability.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("every static catalog capability passes validateCapabilityDefinition", () => {
  for (const capability of ALL_CAPABILITIES) {
    const result = validateCapabilityDefinition(capability);
    assert.equal(
      result.ok,
      true,
      `${capability.id}: ${(result.errors || []).join("; ")}`,
    );
  }
});

test("write capabilities require confirm-mode approval unless explicitly allowlisted", () => {
  for (const capability of ALL_CAPABILITIES) {
    if (capability.status !== CAPABILITY_STATUS.IMPLEMENTED) continue;
    if (!capability.policy?.write) continue;

    if (capability.policy.bypassesApproval) {
      assert.ok(
        WRITE_BYPASSES_APPROVAL_ALLOWLIST.has(capability.id),
        `${capability.id} is write=true with bypassesApproval=true but is not on WRITE_BYPASSES_APPROVAL_ALLOWLIST`,
      );
      continue;
    }

    // write + !bypassesApproval ⇒ requiresApprovalInConfirmMode for every surface binding
    const surfaces = Object.keys(capability.surfaces || {});
    assert.ok(surfaces.length > 0, `${capability.id} write capability has no surfaces`);
    for (const surface of surfaces) {
      const binding = capability.surfaces[surface];
      // Explicit opt-out of confirm is not allowed for write tools
      assert.notEqual(
        binding?.confirmInConfirmMode,
        false,
        `${capability.id} surface ${surface} must not set confirmInConfirmMode=false on a write tool`,
      );
    }
  }
});

test("public MCP write tools never auto-bypass observer mode", () => {
  for (const capability of ALL_CAPABILITIES) {
    if (capability.status !== CAPABILITY_STATUS.IMPLEMENTED) continue;
    if (!capability.policy?.write) continue;
    if (!capability.surfaces?.[CAPABILITY_SURFACES.PUBLIC]) continue;
    if (WRITE_BYPASSES_APPROVAL_ALLOWLIST.has(capability.id)) continue;
    assert.equal(
      capability.policy.bypassesObserverBlock,
      false,
      `${capability.id} public write tool must not bypass observer block`,
    );
  }
});

test("kubernetes catalog tools are implemented with MCP public surfaces", () => {
  const k8s = ALL_CAPABILITIES.filter((c) => c.domain === "kubernetes");
  assert.ok(k8s.length >= 12);
  for (const capability of k8s) {
    assert.equal(capability.status, CAPABILITY_STATUS.IMPLEMENTED);
    assert.ok(capability.surfaces?.public?.mcpTool, `${capability.id} missing public mcpTool`);
    if (capability.policy.write) {
      assert.equal(capability.policy.bypassesApproval, false, `${capability.id} write must require approval`);
    }
  }
  assert.ok(k8s.some((c) => c.id === "kubernetes.deployments.list"));
  assert.ok(k8s.some((c) => c.id === "kubernetes.events.list"));
  assert.ok(k8s.some((c) => c.id === "kubernetes.deployments.rollout.status"));
  assert.ok(k8s.some((c) => c.id === "kubernetes.deployments.rollout.history"));
  const writes = k8s.filter((c) => c.policy.write);
  assert.ok(writes.some((c) => c.id === "kubernetes.pods.delete"));
  assert.ok(writes.some((c) => c.id === "kubernetes.deployments.scale"));
  assert.ok(writes.some((c) => c.id === "kubernetes.deployments.rollout.restart"));
  assert.ok(writes.some((c) => c.id === "kubernetes.pods.exec"));
});
