import assert from "node:assert/strict";
import test from "node:test";
import { formatHexPreview, parseHexBytes } from "./serialHexInput";

test("parseHexBytes accepts the separators people actually paste", () => {
  for (const input of [
    "48656C6C6F",
    "48 65 6c 6C 6F",
    "48,65,6C,6C,6F",
    "48-65-6C-6C-6F",
    "0x48 0x65 0x6C 0x6C 0x6F",
    "48\n65\t6C 6C\r\n6F",
  ]) {
    const result = parseHexBytes(input);
    assert.equal(result.ok, true, `${input}: ${result.ok ? "" : result.error}`);
    assert.equal(result.ok && result.hex, "48656c6c6f", input);
    assert.equal(result.ok && result.byteLength, 5, input);
  }
});

test("parseHexBytes rejects an odd number of digits", () => {
  // "4865 6" is one nibble short — guessing whether to pad the front or the
  // back would send a different byte than the user meant.
  const result = parseHexBytes("4865 6");
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.error, "odd_length");
});

test("parseHexBytes rejects non-hex characters", () => {
  for (const input of ["48 6G", "hello", "48 0x", "0xZZ"]) {
    const result = parseHexBytes(input);
    assert.equal(result.ok, false, input);
    assert.equal(result.ok === false && result.error, "invalid_hex", input);
  }
});

test("parseHexBytes rejects an empty payload", () => {
  for (const input of ["", "   ", "\n", ",,,", "0x"]) {
    const result = parseHexBytes(input);
    assert.equal(result.ok, false, JSON.stringify(input));
    assert.ok(["empty", "invalid_hex"].includes(result.ok === false ? result.error : ""), input);
  }
});

test("parseHexBytes round-trips through Buffer without charset involvement", () => {
  const result = parseHexBytes("FF 00 80 7F");
  assert.equal(result.ok, true);
  const bytes = Buffer.from(result.ok ? result.hex : "", "hex");
  // These bytes have no valid UTF-8 / GBK reading; the whole point is that
  // they must reach the wire unchanged rather than being re-encoded.
  assert.deepEqual([...bytes], [0xff, 0x00, 0x80, 0x7f]);
});

test("formatHexPreview shows the bytes grouped and the printable reading", () => {
  assert.equal(formatHexPreview("48656c6c6f"), "48 65 6C 6C 6F  |Hello|");
  assert.equal(formatHexPreview("ff007f"), "FF 00 7F  |...|");
  assert.equal(formatHexPreview(""), "");
});
