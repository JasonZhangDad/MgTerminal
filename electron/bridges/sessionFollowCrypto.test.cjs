"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { sealFollowFrame, openFollowFrame } = require("./sessionFollowCrypto.cjs");

test("seal/open round-trip preserves payload", () => {
  const token = "aabbccddeeff00112233445566778899";
  const sealed = sealFollowFrame({ type: "data", data: "hi" }, token);
  const env = JSON.parse(sealed);
  assert.equal(env.enc, true);
  assert.equal(env.v, 2);
  const opened = openFollowFrame(sealed, token);
  assert.equal(opened.ok, true);
  assert.deepEqual(opened.msg, { type: "data", data: "hi" });
});

test("wrong token fails decrypt", () => {
  const sealed = sealFollowFrame({ type: "ping" }, "correct-token-value-01");
  const opened = openFollowFrame(sealed, "wrong-token-value-xxxx");
  assert.equal(opened.ok, false);
});

test("clear control frames still parse", () => {
  const opened = openFollowFrame(JSON.stringify({ type: "relayWelcome", role: "host" }), "unused");
  assert.equal(opened.ok, true);
  assert.equal(opened.clear, true);
  assert.equal(opened.msg.type, "relayWelcome");
});
