"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  defineCapability,
  validateCapabilityDefinition,
  WRITE_BYPASSES_APPROVAL_ALLOWLIST,
} = require("./capabilityDefinition.cjs");
const { CAPABILITY_STATUS } = require("./constants.cjs");

const baseRead = {
  id: "kubernetes.example.list",
  domain: "kubernetes",
  status: CAPABILITY_STATUS.PLANNED,
  description: "Example list tool",
  policy: {
    write: false,
    sensitiveRead: false,
    longRunning: false,
    requiresChatSession: false,
    bypassesObserverBlock: false,
    bypassesApproval: true,
    bypassesChatCancel: true,
  },
  surfaces: {},
};

test("validateCapabilityDefinition accepts a well-formed planned capability", () => {
  const result = validateCapabilityDefinition(baseRead);
  assert.equal(result.ok, true);
  assert.equal(result.capability.id, "kubernetes.example.list");
});

test("validateCapabilityDefinition rejects unknown domains (no third-party plugins)", () => {
  const result = validateCapabilityDefinition({
    ...baseRead,
    domain: "thirdparty-malware",
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("first-party")));
});

test("validateCapabilityDefinition rejects write + bypassesApproval outside allowlist", () => {
  const result = validateCapabilityDefinition({
    ...baseRead,
    id: "sftp.evil.write",
    domain: "sftp",
    status: CAPABILITY_STATUS.IMPLEMENTED,
    description: "Dangerous write",
    policy: {
      write: true,
      sensitiveRead: false,
      longRunning: false,
      requiresChatSession: true,
      bypassesObserverBlock: false,
      bypassesApproval: true,
      bypassesChatCancel: false,
    },
    surfaces: {
      public: { rpcMethod: "public/sftp/evil", mcpTool: "sftp_evil" },
    },
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("bypassesApproval")));
});

test("write bypass allowlist includes terminal.stop only by default", () => {
  assert.deepEqual([...WRITE_BYPASSES_APPROVAL_ALLOWLIST], ["terminal.stop"]);
});

test("defineCapability defaults non-write tools to bypass approval", () => {
  const result = defineCapability({
    id: "system.example.ping",
    domain: "system",
    status: CAPABILITY_STATUS.PLANNED,
    description: "Ping",
    surfaces: {},
  });
  assert.equal(result.ok, true);
  assert.equal(result.capability.policy.write, false);
  assert.equal(result.capability.policy.bypassesApproval, true);
});

test("defineCapability defaults write tools to require approval", () => {
  const result = defineCapability({
    id: "sftp.example.write",
    domain: "sftp",
    status: CAPABILITY_STATUS.IMPLEMENTED,
    description: "Write a file",
    policy: { write: true },
    surfaces: {
      public: { rpcMethod: "public/sftp/exampleWrite", mcpTool: "sftp_example_write" },
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.capability.policy.write, true);
  assert.equal(result.capability.policy.bypassesApproval, false);
  assert.equal(result.capability.policy.bypassesObserverBlock, false);
});
