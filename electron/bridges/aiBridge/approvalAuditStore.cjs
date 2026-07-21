"use strict";

const fs = require("node:fs");
const path = require("node:path");

const STORE_VERSION = 1;
const MAX_APPROVAL_AUDIT_ENTRIES = 50;
const VALID_PHASES = new Set(["requested", "resolved"]);
const VALID_OUTCOMES = new Set(["approved", "denied", "timeout"]);

function optionalString(value, maxLength) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, maxLength) : undefined;
}

function sanitizeApprovalAuditEntry(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const id = optionalString(raw.id, 160);
  const toolName = optionalString(raw.toolName, 200);
  const at = Number(raw.at);
  if (!id || !toolName || !Number.isFinite(at) || !VALID_PHASES.has(raw.phase)) return null;

  const entry = {
    id,
    at,
    phase: raw.phase,
    toolName,
  };
  const capabilityId = optionalString(raw.capabilityId, 200);
  const chatSessionId = optionalString(raw.chatSessionId, 200);
  if (capabilityId) entry.capabilityId = capabilityId;
  if (chatSessionId) entry.chatSessionId = chatSessionId;
  if (raw.phase === "resolved" && VALID_OUTCOMES.has(raw.outcome)) {
    entry.outcome = raw.outcome;
  }
  return entry;
}

function normalizeEntries(raw) {
  const input = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray(raw.entries)
      ? raw.entries
      : [];
  const entries = [];
  for (const item of input) {
    const entry = sanitizeApprovalAuditEntry(item);
    if (entry) entries.push(entry);
    if (entries.length === MAX_APPROVAL_AUDIT_ENTRIES) break;
  }
  return entries;
}

function loadEntries(filePath) {
  if (!filePath) return [];
  try {
    if (!fs.existsSync(filePath)) return [];
    return normalizeEntries(JSON.parse(fs.readFileSync(filePath, "utf8")));
  } catch (error) {
    console.warn("[approvalAuditStore] load failed:", error?.message || error);
    return [];
  }
}

function saveEntries(filePath, entries) {
  if (!filePath) return false;
  const tempPath = `${filePath}.tmp-${process.pid}`;
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(
      tempPath,
      `${JSON.stringify({ version: STORE_VERSION, entries: normalizeEntries(entries) })}\n`,
      { mode: 0o600 },
    );
    fs.renameSync(tempPath, filePath);
    fs.chmodSync(filePath, 0o600);
    return true;
  } catch (error) {
    try { fs.unlinkSync(tempPath); } catch {}
    console.warn("[approvalAuditStore] save failed:", error?.message || error);
    return false;
  }
}

function createApprovalAuditStore({ filePath } = {}) {
  let entries = loadEntries(filePath);

  return {
    list() {
      return entries.map((entry) => ({ ...entry }));
    },
    append(raw) {
      const entry = sanitizeApprovalAuditEntry(raw);
      if (!entry) return { ok: false, error: "Invalid approval audit entry" };
      const next = [entry, ...entries].slice(0, MAX_APPROVAL_AUDIT_ENTRIES);
      if (!saveEntries(filePath, next)) {
        return { ok: false, error: "Failed to persist approval audit" };
      }
      entries = next;
      return { ok: true, entry: { ...entry } };
    },
    clear() {
      if (!saveEntries(filePath, [])) {
        return { ok: false, error: "Failed to persist approval audit" };
      }
      entries = [];
      return { ok: true };
    },
  };
}

function resolveApprovalAuditFilePath(userDataPath) {
  if (typeof userDataPath !== "string" || !userDataPath.trim()) return null;
  return path.join(userDataPath, "approval-audit-v1.json");
}

module.exports = {
  STORE_VERSION,
  MAX_APPROVAL_AUDIT_ENTRIES,
  sanitizeApprovalAuditEntry,
  normalizeEntries,
  loadEntries,
  saveEntries,
  createApprovalAuditStore,
  resolveApprovalAuditFilePath,
};
