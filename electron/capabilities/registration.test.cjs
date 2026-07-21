"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  registerCapabilityExtension,
  clearCapabilityExtensions,
  listExtensionCapabilities,
  listAllCapabilities,
} = require("./registration.cjs");
const {
  getCapabilityById,
  getAllCapabilities,
  listCapabilities,
} = require("./registry.cjs");
const { CAPABILITY_STATUS } = require("./constants.cjs");

test.afterEach(() => {
  clearCapabilityExtensions();
});

test("registerCapabilityExtension accepts a first-party planned capability", () => {
  const result = registerCapabilityExtension({
    id: "kubernetes.extension.demo",
    domain: "kubernetes",
    status: CAPABILITY_STATUS.PLANNED,
    description: "Demo extension",
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
  }, { source: "test" });

  assert.equal(result.ok, true);
  assert.equal(listExtensionCapabilities().length, 1);
  assert.equal(getCapabilityById("kubernetes.extension.demo")?.id, "kubernetes.extension.demo");
  assert.ok(listAllCapabilities().some((c) => c.id === "kubernetes.extension.demo"));
  assert.ok(getAllCapabilities().some((c) => c.id === "kubernetes.extension.demo"));
});

test("registerCapabilityExtension rejects colliding static catalog ids", () => {
  const result = registerCapabilityExtension({
    id: "terminal.execute",
    domain: "terminal",
    status: CAPABILITY_STATUS.IMPLEMENTED,
    description: "Collision",
    policy: {
      write: true,
      sensitiveRead: false,
      longRunning: true,
      requiresChatSession: true,
      bypassesObserverBlock: false,
      bypassesApproval: false,
      bypassesChatCancel: false,
    },
    surfaces: {
      builtin: { rpcMethod: "magiesTerminal/exec-collision", mcpTool: "terminal_execute_collision" },
    },
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("static catalog")));
});

test("registerCapabilityExtension rejects third-party domains", () => {
  const result = registerCapabilityExtension({
    id: "evil.tool",
    domain: "untrusted",
    status: CAPABILITY_STATUS.PLANNED,
    description: "Nope",
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
  });
  assert.equal(result.ok, false);
});

test("clearCapabilityExtensions removes runtime entries from registry lookups", () => {
  registerCapabilityExtension({
    id: "system.extension.temp",
    domain: "system",
    status: CAPABILITY_STATUS.PLANNED,
    description: "Temp",
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
  });
  assert.ok(getCapabilityById("system.extension.temp"));
  clearCapabilityExtensions();
  assert.equal(getCapabilityById("system.extension.temp"), null);
  assert.equal(listCapabilities({ domain: "system" }).filter((c) => c.id === "system.extension.temp").length, 0);
});
