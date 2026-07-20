export type MobileHost = {
  id: string;
  label: string;
  hostname: string;
  port: number;
  username: string;
  note?: string;
  updatedAt: number;
};

const STORAGE_KEY = 'magies.mobile.hosts.v1';

function uid(): string {
  return `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function loadHosts(): MobileHost[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is MobileHost => Boolean(item && typeof item === 'object' && (item as MobileHost).id))
      .map((item) => ({
        id: String(item.id),
        label: String(item.label || item.hostname || 'host'),
        hostname: String(item.hostname || ''),
        port: Number(item.port) > 0 ? Number(item.port) : 22,
        username: String(item.username || ''),
        note: item.note ? String(item.note) : undefined,
        updatedAt: Number(item.updatedAt) || Date.now(),
      }))
      .filter((h) => h.hostname);
  } catch {
    return [];
  }
}

export function saveHosts(hosts: MobileHost[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(hosts));
}

export function createHost(input: {
  label: string;
  hostname: string;
  port?: number;
  username: string;
  note?: string;
}): MobileHost {
  return {
    id: uid(),
    label: input.label.trim() || input.hostname.trim(),
    hostname: input.hostname.trim(),
    port: input.port && input.port > 0 ? input.port : 22,
    username: input.username.trim(),
    note: input.note?.trim() || undefined,
    updatedAt: Date.now(),
  };
}

/** Parse a simple paste format: user@host[:port]  optional label after space. */
export function parseQuickHost(line: string): Omit<MobileHost, 'id' | 'updatedAt'> | null {
  const text = line.trim();
  if (!text) return null;
  // label user@host:port
  const parts = text.split(/\s+/);
  let target = parts[0] ?? '';
  let label = '';
  if (parts.length >= 2 && parts[0] && !parts[0].includes('@') && parts[1]?.includes('@')) {
    label = parts[0];
    target = parts.slice(1).join(' ');
  }
  const m = target.match(/^(?:([^@\s]+)@)?(\[[^\]]+\]|[^:\s]+)(?::(\d+))?$/);
  if (!m) return null;
  const username = m[1] || '';
  const hostname = (m[2] || '').replace(/^\[|\]$/g, '');
  const port = m[3] ? Number(m[3]) : 22;
  if (!hostname) return null;
  return {
    label: label || hostname,
    hostname,
    port: Number.isFinite(port) && port > 0 ? port : 22,
    username,
  };
}
