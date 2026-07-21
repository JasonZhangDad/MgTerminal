"use strict";

/**
 * Asciinema cast v2 helpers (main process).
 * Keep in sync with domain/sessionCast.ts.
 */

function buildAsciinemaCastHeader(input = {}) {
  const width = Number.isFinite(input.width) && Number(input.width) > 0
    ? Math.floor(Number(input.width))
    : 80;
  const height = Number.isFinite(input.height) && Number(input.height) > 0
    ? Math.floor(Number(input.height))
    : 24;
  const header = {
    version: 2,
    width,
    height,
    env: { TERM: "xterm-256color" },
  };
  if (Number.isFinite(input.timestampMs)) {
    header.timestamp = Math.floor(Number(input.timestampMs) / 1000);
  }
  if (input.title && String(input.title).trim()) {
    header.title = String(input.title).trim().slice(0, 200);
  }
  return header;
}

function formatAsciinemaCastHeaderLine(header) {
  return `${JSON.stringify(header)}\n`;
}

function relativeCastTimeSeconds(startTimeMs, nowMs) {
  const start = Number.isFinite(startTimeMs) ? startTimeMs : nowMs;
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  return Math.max(0, (now - start) / 1000);
}

function formatAsciinemaCastEventLine(relativeSeconds, type, data) {
  const t = Number.isFinite(relativeSeconds) ? Number(relativeSeconds.toFixed(6)) : 0;
  return `${JSON.stringify([t, type, data ?? ""])}\n`;
}

module.exports = {
  buildAsciinemaCastHeader,
  formatAsciinemaCastHeaderLine,
  relativeCastTimeSeconds,
  formatAsciinemaCastEventLine,
};
