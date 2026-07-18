"use strict";

/**
 * Token-derived AES-256-GCM framing for session-follow streams.
 * Both LAN peers and WAN endpoints share the invite token out-of-band; the
 * relay must forward opaque lines without reading payload plaintext.
 */

const crypto = require("node:crypto");

const INFO = Buffer.from("magies-follow-e2e-v1", "utf8");

function deriveFollowKey(token) {
  const secret = Buffer.from(String(token || ""), "utf8");
  // HKDF-SHA256 → 32-byte AES key. Token entropy is 128 bits (randomBytes(16)).
  return Buffer.from(crypto.hkdfSync("sha256", secret, Buffer.alloc(0), INFO, 32));
}

/**
 * Encrypt a JSON-serializable object into a single-line frame envelope.
 * @returns {string} JSON line without trailing newline
 */
function sealFollowFrame(obj, token) {
  const key = deriveFollowKey(token);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(obj), "utf8");
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    v: 2,
    enc: true,
    iv: iv.toString("base64url"),
    tag: tag.toString("base64url"),
    ct: ct.toString("base64url"),
  });
}

/**
 * Decrypt a line. Cleartext control messages (relayJoin/relayWelcome/error
 * without enc) pass through for the WAN handshake only.
 * @returns {{ ok: true, msg: object } | { ok: false, error: string }}
 */
function openFollowFrame(line, token) {
  let parsed;
  try {
    parsed = JSON.parse(line);
  } catch {
    return { ok: false, error: "bad_json" };
  }
  if (!parsed || typeof parsed !== "object") return { ok: false, error: "bad_json" };

  // Unencrypted control frames (WAN relay join handshake only).
  if (!parsed.enc) {
    return { ok: true, msg: parsed, clear: true };
  }

  if (parsed.v !== 2 || !parsed.iv || !parsed.tag || !parsed.ct) {
    return { ok: false, error: "bad_envelope" };
  }
  try {
    const key = deriveFollowKey(token);
    const iv = Buffer.from(parsed.iv, "base64url");
    const tag = Buffer.from(parsed.tag, "base64url");
    const ct = Buffer.from(parsed.ct, "base64url");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
    const msg = JSON.parse(pt.toString("utf8"));
    return { ok: true, msg, clear: false };
  } catch {
    return { ok: false, error: "decrypt_failed" };
  }
}

function writeSealed(socket, obj, token) {
  if (!socket || socket.destroyed) return;
  try {
    socket.write(`${sealFollowFrame(obj, token)}\n`);
  } catch {
    // ignore
  }
}

module.exports = {
  deriveFollowKey,
  sealFollowFrame,
  openFollowFrame,
  writeSealed,
};
