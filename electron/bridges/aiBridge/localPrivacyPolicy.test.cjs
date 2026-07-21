"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { isLoopbackHttpUrl } = require("./localPrivacyPolicy.cjs");

test("isLoopbackHttpUrl accepts only HTTP(S) loopback targets", () => {
  assert.equal(isLoopbackHttpUrl("http://localhost:11434/v1"), true);
  assert.equal(isLoopbackHttpUrl("https://127.9.8.7:8443/v1"), true);
  assert.equal(isLoopbackHttpUrl("http://[::1]:8080/v1"), true);
  assert.equal(isLoopbackHttpUrl("http://192.168.1.2:11434/v1"), false);
  assert.equal(isLoopbackHttpUrl("https://api.openai.com/v1"), false);
  assert.equal(isLoopbackHttpUrl("file:///tmp/model"), false);
  assert.equal(isLoopbackHttpUrl("not-a-url"), false);
});
