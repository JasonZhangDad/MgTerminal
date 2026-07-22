import test from "node:test";
import assert from "node:assert/strict";

import {
  formatHexDump,
  formatHexLine,
  stringToUtf8Bytes,
  TerminalHexRingBuffer,
} from "./terminalHexDump.ts";

test("stringToUtf8Bytes encodes ascii", () => {
  const bytes = stringToUtf8Bytes("Hi\n");
  assert.deepEqual(Array.from(bytes), [0x48, 0x69, 0x0a]);
});

test("formatHexLine shows offset hex and ascii", () => {
  const bytes = stringToUtf8Bytes("Hello, world!!!!");
  const line = formatHexLine(0, bytes, 0, bytes.length, 16);
  assert.match(line, /^00000000 {2}/);
  assert.match(line, /\|Hello, world!!!!\|$/);
  assert.match(line, /48 65 6c 6c 6f/);
});

test("formatHexDump splits multi-line", () => {
  const bytes = stringToUtf8Bytes("0123456789abcdefXYZ");
  const dump = formatHexDump(bytes, { width: 16 });
  const lines = dump.split("\n");
  assert.equal(lines.length, 2);
  assert.match(lines[0]!, /^00000000 {2}/);
  assert.match(lines[1]!, /^00000010 {2}/);
});

test("ring buffer trims oldest bytes and advances offset", () => {
  const ring = new TerminalHexRingBuffer(8);
  ring.push(stringToUtf8Bytes("ABCDEFGH"));
  assert.equal(ring.byteLength, 8);
  assert.equal(ring.startOffset, 0);
  ring.push(stringToUtf8Bytes("XY"));
  assert.equal(ring.byteLength, 8);
  assert.equal(ring.startOffset, 2);
  const text = new TextDecoder().decode(ring.toBytes());
  assert.equal(text, "CDEFGHXY");
});

test("ring format uses sliding offset", () => {
  const ring = new TerminalHexRingBuffer(4);
  ring.pushString("abcd");
  ring.pushString("ef");
  const dump = ring.format(4);
  assert.match(dump, /^00000002 {2}/);
});

test("formatHexDump lays out rows at a non-default width", () => {
  // The width option existed but only 16 was ever exercised; the panel's
  // 8 / 32 selector depends entirely on this path.
  const bytes = stringToUtf8Bytes("ABCDEFGHIJ");

  const narrow = formatHexDump(bytes, { width: 8 }).split("\n");
  assert.equal(narrow.length, 2, "10 bytes at 8 per row is two rows");
  assert.match(narrow[0]!, /^00000000 /);
  assert.match(narrow[1]!, /^00000008 /);
  assert.ok(narrow[0]!.endsWith("|ABCDEFGH|"));
  // The short final row is padded so the ASCII column stays aligned.
  assert.ok(narrow[1]!.endsWith("|IJ      |"));

  const wide = formatHexDump(bytes, { width: 32 }).split("\n");
  assert.equal(wide.length, 1, "10 bytes at 32 per row is one row");
  assert.ok(wide[0]!.endsWith("|ABCDEFGHIJ                      |"));
});

test("formatHexDump falls back to the default width for nonsense input", () => {
  const bytes = stringToUtf8Bytes("A".repeat(17));
  for (const width of [0, -8, Number.NaN]) {
    assert.equal(
      formatHexDump(bytes, { width }).split("\n").length,
      2,
      `width ${width} should behave as the 16-byte default`,
    );
  }
});
