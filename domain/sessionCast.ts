/**
 * Asciinema cast v2 helpers for timed session recording.
 * Spec: https://docs.asciinema.org/manual/asciicast/v2/
 */

export interface AsciinemaCastHeader {
  version: 2;
  width: number;
  height: number;
  timestamp?: number;
  title?: string;
  env?: Record<string, string>;
}

export type AsciinemaCastEventType = 'o' | 'i';

export function buildAsciinemaCastHeader(input: {
  width?: number;
  height?: number;
  timestampMs?: number;
  title?: string;
}): AsciinemaCastHeader {
  const width = Number.isFinite(input.width) && Number(input.width) > 0
    ? Math.floor(Number(input.width))
    : 80;
  const height = Number.isFinite(input.height) && Number(input.height) > 0
    ? Math.floor(Number(input.height))
    : 24;
  const header: AsciinemaCastHeader = {
    version: 2,
    width,
    height,
    env: { TERM: 'xterm-256color' },
  };
  if (Number.isFinite(input.timestampMs)) {
    header.timestamp = Math.floor(Number(input.timestampMs) / 1000);
  }
  if (input.title && input.title.trim()) {
    header.title = input.title.trim().slice(0, 200);
  }
  return header;
}

export function formatAsciinemaCastHeaderLine(header: AsciinemaCastHeader): string {
  return `${JSON.stringify(header)}\n`;
}

export function relativeCastTimeSeconds(startTimeMs: number, nowMs: number): number {
  const start = Number.isFinite(startTimeMs) ? startTimeMs : nowMs;
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  return Math.max(0, (now - start) / 1000);
}

export function formatAsciinemaCastEventLine(
  relativeSeconds: number,
  type: AsciinemaCastEventType,
  data: string,
): string {
  const t = Number.isFinite(relativeSeconds) ? Number(relativeSeconds.toFixed(6)) : 0;
  return `${JSON.stringify([t, type, data ?? ''])}\n`;
}
