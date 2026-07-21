import assert from 'node:assert/strict';
import test from 'node:test';
import {
  appendApprovalAudit,
  clearApprovalAudit,
  MAX_APPROVAL_AUDIT_ENTRIES,
  readApprovalAudit,
  readApprovalAuditPersisted,
  sanitizeApprovalAuditEntries,
  writeApprovalAudit,
} from './approvalAudit';

const memory = new Map<string, string>();

test.beforeEach(() => {
  memory.clear();
  // Minimal localStorage polyfill for unit tests (approvalAudit uses localStorageAdapter).
  const store = {
    get length() { return memory.size; },
    clear() { memory.clear(); },
    getItem(key: string) { return memory.has(key) ? memory.get(key)! : null; },
    setItem(key: string, value: string) { memory.set(key, String(value)); },
    removeItem(key: string) { memory.delete(key); },
    key(index: number) { return [...memory.keys()][index] ?? null; },
  };
  (globalThis as { localStorage: Storage }).localStorage = store as Storage;
  (globalThis as { window: unknown }).window = {};
});

test('sanitizeApprovalAuditEntries drops malformed rows', () => {
  const ok = {
    id: 'a1',
    at: 1,
    phase: 'resolved' as const,
    toolName: 'sftp_write',
    outcome: 'denied' as const,
  };
  assert.deepEqual(sanitizeApprovalAuditEntries([ok, { id: 1 }, null, 'x']), [ok]);
});

test('appendApprovalAudit prepends and caps length', () => {
  clearApprovalAudit();
  for (let i = 0; i < MAX_APPROVAL_AUDIT_ENTRIES + 5; i += 1) {
    appendApprovalAudit({
      phase: 'resolved',
      toolName: `tool_${i}`,
      outcome: 'approved',
    });
  }
  const entries = readApprovalAudit();
  assert.equal(entries.length, MAX_APPROVAL_AUDIT_ENTRIES);
  assert.equal(entries[0].toolName, `tool_${MAX_APPROVAL_AUDIT_ENTRIES + 4}`);
});

test('clearApprovalAudit empties storage', () => {
  writeApprovalAudit([{
    id: 'x',
    at: Date.now(),
    phase: 'requested',
    toolName: 'terminal_execute',
  }]);
  clearApprovalAudit();
  assert.deepEqual(readApprovalAudit(), []);
});

test('appendApprovalAudit mirrors metadata to main-process persistence', async () => {
  const calls: unknown[] = [];
  (globalThis as { window: unknown }).window = {
    magiesTerminal: {
      aiApprovalAuditAppend: async (entry: unknown) => {
        calls.push(entry);
        return { ok: true };
      },
    },
  };

  const entry = appendApprovalAudit({
    id: 'audit-main-1',
    at: 10,
    phase: 'resolved',
    toolName: 'terminal_execute',
    outcome: 'denied',
  });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(calls, [entry]);
});

test('readApprovalAuditPersisted refreshes the renderer cache from the main process', async () => {
  writeApprovalAudit([{
    id: 'legacy',
    at: 1,
    phase: 'requested',
    toolName: 'legacy_tool',
  }]);
  const persisted = [{
    id: 'main',
    at: 2,
    phase: 'resolved' as const,
    toolName: 'main_tool',
    outcome: 'approved' as const,
  }];
  (globalThis as { window: unknown }).window = {
    magiesTerminal: {
      aiApprovalAuditList: async () => ({ ok: true, entries: persisted }),
    },
  };

  assert.deepEqual(await readApprovalAuditPersisted(), persisted);
  assert.deepEqual(readApprovalAudit(), persisted);
});
