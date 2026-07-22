"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const terminalBridge = require("./terminalBridge.cjs");

/** A serial session whose port records exactly what bytes were handed to it. */
function setupSerialSession({ encoding = "gbk" } = {}) {
  const written = [];
  const sessions = new Map();
  sessions.set("serial-1", {
    type: "serial",
    encoding,
    webContentsId: 1,
    serialPort: { write: (chunk) => { written.push(chunk); return true; } },
  });
  terminalBridge.init({
    sessions,
    electronModule: { webContents: { fromId: () => ({ send() {}, isDestroyed: () => false }) } },
  });
  const handlers = new Map();
  const listeners = new Map();
  terminalBridge.registerHandlers(
    {
      handle: (channel, handler) => handlers.set(channel, handler),
      on: (channel, listener) => listeners.set(channel, listener),
    },
    {},
  );
  return { written, handlers, listeners };
}

test("hex input reaches the port as raw bytes, untouched by the charset encoder", () => {
  // The session is GBK: sending these as text would run them through iconv and
  // change them. 0xFF/0x80 have no valid reading in any of the charsets.
  const { written, listeners } = setupSerialSession({ encoding: "gbk" });
  listeners.get("magiesTerminal:write")(
    { sender: { id: 1 } },
    { sessionId: "serial-1", hexData: "ff00807f" },
  );

  assert.equal(written.length, 1);
  assert.ok(Buffer.isBuffer(written[0]), "raw bytes must not be sent as a string");
  assert.deepEqual([...written[0]], [0xff, 0x00, 0x80, 0x7f]);
});

test("hex input is ignored when it is not valid hex", () => {
  const { written, listeners } = setupSerialSession();
  for (const hexData of ["", "zz", "abc"]) {
    listeners.get("magiesTerminal:write")(
      { sender: { id: 1 } },
      { sessionId: "serial-1", hexData },
    );
  }
  assert.equal(written.length, 0, "nothing malformed may reach the device");
});

test("ordinary text input still goes through the encoder", () => {
  const { written, listeners } = setupSerialSession({ encoding: "utf8" });
  listeners.get("magiesTerminal:write")(
    { sender: { id: 1 } },
    { sessionId: "serial-1", data: "hi" },
  );
  assert.equal(written.length, 1);
  assert.equal(String(written[0]), "hi");
});
