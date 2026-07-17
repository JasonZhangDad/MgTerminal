"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const follow = require("./sessionFollowManager.cjs");

test("follow manager start join grant write gate", () => {
  follow.__resetForTests();
  const start = follow.startFollow("s1", 1, "Host");
  assert.equal(start.success, true);
  assert.deepEqual(follow.getWebContentsIds("s1"), [1]);

  const join = follow.joinFollow("s1", 2, "Viewer");
  assert.equal(join.success, true);
  assert.equal(follow.shouldBlockWrite("s1", 1).blocked, false);
  assert.equal(follow.shouldBlockWrite("s1", 2).blocked, true);

  follow.requestControl("s1", 2);
  const grant = follow.grantControl("s1", 1, join.peerId);
  assert.equal(grant.success, true);
  assert.equal(follow.shouldBlockWrite("s1", 2).blocked, false);
  assert.equal(follow.shouldBlockWrite("s1", 1).blocked, true);

  follow.revokeControl("s1", 1);
  assert.equal(follow.shouldBlockWrite("s1", 1).blocked, false);

  follow.stopFollow("s1", 1);
  assert.equal(follow.getWebContentsIds("s1"), null);
  assert.equal(follow.shouldBlockWrite("s1", 2).blocked, false);
});
