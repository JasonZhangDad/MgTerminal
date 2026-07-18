const assert = require("node:assert/strict");
const net = require("node:net");
const { test } = require("node:test");
const { createFollowRelayServer } = require("./sessionFollowRelay.cjs");
const { sealFollowFrame, openFollowFrame } = require("./sessionFollowCrypto.cjs");

function send(socket, obj) {
  socket.write(`${JSON.stringify(obj)}\n`);
}

function sendRaw(socket, line) {
  socket.write(`${line}\n`);
}

function readLines(socket, count, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const lines = [];
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`timeout waiting for ${count} lines, got ${lines.length}: ${lines.join(" | ")}`));
    }, timeoutMs);
    const onData = (chunk) => {
      buffer += chunk;
      let idx;
      while ((idx = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line) continue;
        lines.push(line);
        if (lines.length >= count) {
          cleanup();
          resolve(lines);
        }
      }
    };
    const cleanup = () => {
      clearTimeout(timer);
      socket.off("data", onData);
    };
    socket.on("data", onData);
  });
}

test("relay fans opaque host frames to viewer and wraps viewer frames for host", async () => {
  const token = "0123456789abcdef";
  const relay = createFollowRelayServer({ host: "127.0.0.1", port: 0 });
  const { port } = await relay.start();

  const host = net.connect({ host: "127.0.0.1", port });
  const viewer = net.connect({ host: "127.0.0.1", port });
  await Promise.all([
    new Promise((r) => host.once("connect", r)),
    new Promise((r) => viewer.once("connect", r)),
  ]);
  host.setEncoding("utf8");
  viewer.setEncoding("utf8");

  send(host, { type: "relayJoin", role: "host", roomId: "r1", token });
  const hostWelcome = await readLines(host, 1);
  assert.equal(JSON.parse(hostWelcome[0]).type, "relayWelcome");

  send(viewer, {
    type: "relayJoin",
    role: "viewer",
    roomId: "r1",
    token,
    displayName: "Bob",
  });
  const viewerWelcome = await readLines(viewer, 1);
  assert.equal(JSON.parse(viewerWelcome[0]).type, "relayWelcome");
  assert.equal(JSON.parse(viewerWelcome[0]).role, "viewer");

  const hostJoinNotice = await readLines(host, 1);
  assert.equal(JSON.parse(hostJoinNotice[0]).type, "viewerJoined");

  // Host → viewer: sealed frame forwarded opaquely (still decryptable with token).
  const sealedHost = sealFollowFrame({ type: "data", data: "hello-from-host" }, token);
  sendRaw(host, sealedHost);
  const viewerData = await readLines(viewer, 1);
  const openedViewer = openFollowFrame(viewerData[0], token);
  assert.equal(openedViewer.ok, true);
  assert.equal(openedViewer.msg.type, "data");
  assert.equal(openedViewer.msg.data, "hello-from-host");

  // Viewer → host: sealed frame wrapped with peerId outside ciphertext.
  const sealedViewer = sealFollowFrame({ type: "input", data: "ls\n" }, token);
  sendRaw(viewer, sealedViewer);
  const hostInput = await readLines(host, 1);
  const wrap = JSON.parse(hostInput[0]);
  assert.equal(wrap.type, "relayViewerFrame");
  assert.ok(wrap.peerId);
  const openedHost = openFollowFrame(wrap.frame, token);
  assert.equal(openedHost.ok, true);
  assert.equal(openedHost.msg.type, "input");
  assert.equal(openedHost.msg.data, "ls\n");

  host.destroy();
  viewer.destroy();
  await relay.stop();
});
