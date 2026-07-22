/**
 * Parsing hex the user typed for a serial device.
 *
 * The result is a compact lowercase hex string rather than bytes, so it can
 * cross IPC unchanged and be turned into a Buffer in the main process. That
 * keeps a single parser: the renderer validates and previews exactly what the
 * main process will write.
 */

export type HexParseError = "empty" | "odd_length" | "invalid_hex";

export type HexParseResult =
  | { ok: true; hex: string; byteLength: number }
  | { ok: false; error: HexParseError };

/** Separators people use when pasting a byte string. */
const SEPARATORS = /[\s,;:\-_]+/;

export function parseHexBytes(input: string): HexParseResult {
  const raw = String(input ?? "");
  if (!raw.trim()) return { ok: false, error: "empty" };

  const tokens = raw.trim().split(SEPARATORS).filter(Boolean);
  if (tokens.length === 0) return { ok: false, error: "empty" };

  const parts: string[] = [];
  for (const token of tokens) {
    // Strip 0x only where it introduces a token. Removing it anywhere would
    // eat the 0 out of a sequence like "1 0x2" and send a different byte.
    const stripped = /^0x/i.test(token) ? token.slice(2) : token;
    // A bare "0x" is someone mid-typing, not an empty byte.
    if (!stripped) return { ok: false, error: "invalid_hex" };
    parts.push(stripped);
  }

  const compact = parts.join("");
  if (!compact) return { ok: false, error: "empty" };
  if (!/^[0-9a-f]+$/i.test(compact)) return { ok: false, error: "invalid_hex" };
  if (compact.length % 2 !== 0) return { ok: false, error: "odd_length" };

  const hex = compact.toLowerCase();
  return { ok: true, hex, byteLength: hex.length / 2 };
}

/** `48 65 6C  |He|` — the grouped bytes plus their printable ASCII reading. */
export function formatHexPreview(hex: string): string {
  if (!hex) return "";
  const pairs = hex.toUpperCase().match(/../g) ?? [];
  const ascii = pairs
    .map((pair) => {
      const value = Number.parseInt(pair, 16);
      return value >= 0x20 && value <= 0x7e ? String.fromCharCode(value) : ".";
    })
    .join("");
  return `${pairs.join(" ")}  |${ascii}|`;
}
