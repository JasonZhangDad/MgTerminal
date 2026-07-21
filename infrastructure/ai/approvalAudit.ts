/**
 * Ring-buffer of recent tool-approval decisions for Settings → AI → Safety.
 * Secrets are never stored — only tool name, capability id, session id, outcome.
 */
import { localStorageAdapter } from '../persistence/localStorageAdapter';
import { STORAGE_KEY_AI_APPROVAL_AUDIT } from '../config/storageKeys';

export const MAX_APPROVAL_AUDIT_ENTRIES = 50;

export type ApprovalAuditOutcome = 'approved' | 'denied' | 'timeout';
export type ApprovalAuditPhase = 'requested' | 'resolved';

export interface ApprovalAuditEntry {
  id: string;
  at: number;
  phase: ApprovalAuditPhase;
  toolName: string;
  capabilityId?: string;
  chatSessionId?: string;
  outcome?: ApprovalAuditOutcome;
}

interface ApprovalAuditBridge {
  aiApprovalAuditList?: () => Promise<{
    ok: boolean;
    entries?: unknown;
    error?: string;
  }>;
  aiApprovalAuditAppend?: (entry: ApprovalAuditEntry) => Promise<{
    ok: boolean;
    error?: string;
  }>;
  aiApprovalAuditClear?: () => Promise<{
    ok: boolean;
    error?: string;
  }>;
}

function getApprovalAuditBridge(): ApprovalAuditBridge | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { magiesTerminal?: ApprovalAuditBridge }).magiesTerminal;
}

function isAuditEntry(value: unknown): value is ApprovalAuditEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === 'string'
    && typeof entry.at === 'number'
    && (entry.phase === 'requested' || entry.phase === 'resolved')
    && typeof entry.toolName === 'string'
  );
}

export function sanitizeApprovalAuditEntries(raw: unknown): ApprovalAuditEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isAuditEntry).slice(0, MAX_APPROVAL_AUDIT_ENTRIES);
}

export function readApprovalAudit(): ApprovalAuditEntry[] {
  return sanitizeApprovalAuditEntries(
    localStorageAdapter.read<unknown>(STORAGE_KEY_AI_APPROVAL_AUDIT),
  );
}

export async function readApprovalAuditPersisted(): Promise<ApprovalAuditEntry[]> {
  const bridge = getApprovalAuditBridge();
  if (!bridge?.aiApprovalAuditList) return readApprovalAudit();
  try {
    const result = await bridge.aiApprovalAuditList();
    if (!result.ok) {
      console.warn('[approvalAudit] main-process read failed:', result.error || 'unknown error');
      return readApprovalAudit();
    }
    const entries = sanitizeApprovalAuditEntries(result.entries);
    writeApprovalAudit(entries);
    return entries;
  } catch (error) {
    console.warn('[approvalAudit] main-process read failed:', error);
    return readApprovalAudit();
  }
}

export function writeApprovalAudit(entries: ApprovalAuditEntry[]): void {
  localStorageAdapter.write(
    STORAGE_KEY_AI_APPROVAL_AUDIT,
    entries.slice(0, MAX_APPROVAL_AUDIT_ENTRIES),
  );
}

export function clearApprovalAudit(): void {
  writeApprovalAudit([]);
  const persist = getApprovalAuditBridge()?.aiApprovalAuditClear;
  if (persist) {
    void persist().then((result) => {
      if (!result.ok) {
        console.warn('[approvalAudit] main-process clear failed:', result.error || 'unknown error');
      }
    }).catch((error) => {
      console.warn('[approvalAudit] main-process clear failed:', error);
    });
  }
}

export function appendApprovalAudit(entry: Omit<ApprovalAuditEntry, 'id' | 'at'> & {
  id?: string;
  at?: number;
}): ApprovalAuditEntry {
  const next: ApprovalAuditEntry = {
    id: entry.id ?? `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: entry.at ?? Date.now(),
    phase: entry.phase,
    toolName: entry.toolName,
    capabilityId: entry.capabilityId,
    chatSessionId: entry.chatSessionId,
    outcome: entry.outcome,
  };
  const prev = readApprovalAudit();
  writeApprovalAudit([next, ...prev].slice(0, MAX_APPROVAL_AUDIT_ENTRIES));
  const persist = getApprovalAuditBridge()?.aiApprovalAuditAppend;
  if (persist) {
    void persist(next).then((result) => {
      if (!result.ok) {
        console.warn('[approvalAudit] main-process append failed:', result.error || 'unknown error');
      }
    }).catch((error) => {
      console.warn('[approvalAudit] main-process append failed:', error);
    });
  }
  return next;
}
