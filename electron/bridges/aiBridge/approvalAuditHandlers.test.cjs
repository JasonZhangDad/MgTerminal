"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { registerApprovalAuditHandlers } = require("./approvalAuditHandlers.cjs");

function createHarness({ authorized = true } = {}) {
  const handlers = new Map();
  const calls = [];
  const store = {
    list: () => [{ id: "a1", at: 1, phase: "requested", toolName: "tool" }],
    append: (entry) => {
      calls.push(["append", entry]);
      return { ok: true, entry };
    },
    clear: () => {
      calls.push(["clear"]);
      return { ok: true };
    },
  };
  registerApprovalAuditHandlers({
    ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },
    validateSenderOrSettings: () => authorized,
    getApprovalAuditStore: () => store,
  });
  return { handlers, calls };
}

test("approval audit IPC lists, appends, and clears through the main-process store", async () => {
  const { handlers, calls } = createHarness();
  const event = { sender: { id: 1 } };

  assert.deepEqual(
    await handlers.get("magiesTerminal:ai:approval-audit:list")(event),
    { ok: true, entries: [{ id: "a1", at: 1, phase: "requested", toolName: "tool" }] },
  );
  assert.deepEqual(
    await handlers.get("magiesTerminal:ai:approval-audit:append")(event, { entry: { id: "a2" } }),
    { ok: true, entry: { id: "a2" } },
  );
  assert.deepEqual(
    await handlers.get("magiesTerminal:ai:approval-audit:clear")(event),
    { ok: true },
  );
  assert.deepEqual(calls, [["append", { id: "a2" }], ["clear"]]);
});

test("approval audit IPC rejects untrusted senders before touching the store", async () => {
  const { handlers, calls } = createHarness({ authorized: false });
  const event = { sender: { id: 99 } };

  assert.deepEqual(
    await handlers.get("magiesTerminal:ai:approval-audit:list")(event),
    { ok: false, error: "Unauthorized IPC sender" },
  );
  assert.deepEqual(
    await handlers.get("magiesTerminal:ai:approval-audit:append")(event, { entry: {} }),
    { ok: false, error: "Unauthorized IPC sender" },
  );
  assert.deepEqual(calls, []);
});
