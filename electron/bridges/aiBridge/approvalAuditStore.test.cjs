"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  MAX_APPROVAL_AUDIT_ENTRIES,
  createApprovalAuditStore,
} = require("./approvalAuditStore.cjs");

test("approval audit persists only normalized metadata", (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "magies-approval-audit-"));
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));
  const filePath = path.join(tempDir, "approval-audit-v1.json");
  const store = createApprovalAuditStore({ filePath });

  const result = store.append({
    id: " audit-1 ",
    at: 123,
    phase: "resolved",
    toolName: " kubernetes_pods_delete ",
    capabilityId: "kubernetes.pods.delete",
    chatSessionId: "chat-1",
    outcome: "approved",
    args: { token: "must-not-be-persisted" },
    password: "must-not-be-persisted",
  });

  assert.equal(result.ok, true);
  assert.deepEqual(store.list(), [{
    id: "audit-1",
    at: 123,
    phase: "resolved",
    toolName: "kubernetes_pods_delete",
    capabilityId: "kubernetes.pods.delete",
    chatSessionId: "chat-1",
    outcome: "approved",
  }]);
  assert.equal(fs.statSync(filePath).mode & 0o777, 0o600);
  assert.doesNotMatch(fs.readFileSync(filePath, "utf8"), /token|password|must-not/);
  assert.deepEqual(createApprovalAuditStore({ filePath }).list(), store.list());
});

test("approval audit rejects malformed entries, caps newest-first rows, and clears disk", (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "magies-approval-audit-"));
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));
  const filePath = path.join(tempDir, "approval-audit-v1.json");
  const store = createApprovalAuditStore({ filePath });

  assert.deepEqual(store.append({ toolName: "missing fields" }), {
    ok: false,
    error: "Invalid approval audit entry",
  });

  for (let index = 0; index < MAX_APPROVAL_AUDIT_ENTRIES + 5; index += 1) {
    assert.equal(store.append({
      id: `audit-${index}`,
      at: index,
      phase: "requested",
      toolName: `tool_${index}`,
    }).ok, true);
  }

  const entries = store.list();
  assert.equal(entries.length, MAX_APPROVAL_AUDIT_ENTRIES);
  assert.equal(entries[0].toolName, `tool_${MAX_APPROVAL_AUDIT_ENTRIES + 4}`);
  assert.equal(entries.at(-1).toolName, "tool_5");

  assert.deepEqual(store.clear(), { ok: true });
  assert.deepEqual(store.list(), []);
  assert.deepEqual(createApprovalAuditStore({ filePath }).list(), []);
});
