"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const mcpServerBridge = require("./mcpServerBridge.cjs");

test("external MCP approvals are audited at the main-process source without tool arguments", async (t) => {
  const sent = [];
  const audit = [];
  mcpServerBridge.setMainWindowGetter(() => ({
    isDestroyed: () => false,
    webContents: {
      id: 1,
      send: (channel, payload) => sent.push({ channel, payload }),
    },
  }));
  mcpServerBridge.setApprovalAuditWriter((entry) => audit.push(entry));
  t.after(() => {
    mcpServerBridge.clearPendingApprovals();
    mcpServerBridge.setApprovalAuditWriter(null);
    mcpServerBridge.setMainWindowGetter(null);
  });

  const decision = mcpServerBridge.requestApprovalFromRenderer(
    "kubernetes_pods_delete",
    { namespace: "default", token: "must-not-be-audited" },
    "chat-1",
  );
  const request = sent.find((item) => item.channel === "magiesTerminal:ai:mcp:approval-request");
  assert.ok(request);
  assert.deepEqual(audit, [{
    id: `${request.payload.approvalId}:requested`,
    at: audit[0].at,
    phase: "requested",
    toolName: "kubernetes_pods_delete",
    chatSessionId: "chat-1",
  }]);
  assert.doesNotMatch(JSON.stringify(audit), /token|must-not-be-audited/);

  mcpServerBridge.resolveApprovalFromRenderer(request.payload.approvalId, true);
  assert.equal(await decision, true);
  assert.deepEqual(audit[1], {
    id: `${request.payload.approvalId}:resolved`,
    at: audit[1].at,
    phase: "resolved",
    toolName: "kubernetes_pods_delete",
    chatSessionId: "chat-1",
    outcome: "approved",
  });
});
