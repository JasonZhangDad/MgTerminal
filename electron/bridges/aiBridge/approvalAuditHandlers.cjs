"use strict";

function registerApprovalAuditHandlers({
  ipcMain,
  validateSenderOrSettings,
  getApprovalAuditStore,
}) {
  const unauthorized = { ok: false, error: "Unauthorized IPC sender" };

  ipcMain.handle("magiesTerminal:ai:approval-audit:list", async (event) => {
    if (!validateSenderOrSettings(event)) return unauthorized;
    return { ok: true, entries: getApprovalAuditStore().list() };
  });

  ipcMain.handle("magiesTerminal:ai:approval-audit:append", async (event, { entry } = {}) => {
    if (!validateSenderOrSettings(event)) return unauthorized;
    return getApprovalAuditStore().append(entry);
  });

  ipcMain.handle("magiesTerminal:ai:approval-audit:clear", async (event) => {
    if (!validateSenderOrSettings(event)) return unauthorized;
    return getApprovalAuditStore().clear();
  });
}

module.exports = { registerApprovalAuditHandlers };
