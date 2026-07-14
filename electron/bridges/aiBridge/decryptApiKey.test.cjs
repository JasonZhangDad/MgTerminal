const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { createLocalVault, ENC_PREFIX_V1, ENC_PREFIX_V2 } = require("../credentialBridge.cjs");
const { decryptApiKeyValue } = require("./decryptApiKey.cjs");

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "magies-decrypt-key-"));
}

test("plaintext keys pass through unchanged", () => {
  assert.equal(decryptApiKeyValue("sk-live-real-key"), "sk-live-real-key");
  assert.equal(decryptApiKeyValue(""), "");
  assert.equal(decryptApiKeyValue(null), "");
});

test("enc:v1 decrypts via safeStorage", () => {
  const safeStorage = {
    isEncryptionAvailable: () => true,
    decryptString: (buf) => buf.toString("utf8").replace(/^cipher:/, ""),
  };
  const encrypted = `${ENC_PREFIX_V1}${Buffer.from("cipher:secret-key").toString("base64")}`;
  assert.equal(decryptApiKeyValue(encrypted, { safeStorage }), "secret-key");
});

test("enc:v1 never returns ciphertext when safeStorage is unavailable", () => {
  const encrypted = `${ENC_PREFIX_V1}${Buffer.from("cipher:secret").toString("base64")}`;
  const out = decryptApiKeyValue(encrypted, {
    safeStorage: { isEncryptionAvailable: () => false },
  });
  assert.equal(out, "");
  assert.doesNotMatch(out, /^enc:v1:/);
});

test("enc:v2 decrypts via local vault and never leaks ciphertext", () => {
  const dir = tempDir();
  const vault = createLocalVault({ userDataPath: dir });
  const encrypted = vault.encrypt("sk-from-local-vault");
  assert.match(encrypted, new RegExp(`^${ENC_PREFIX_V2}`));

  assert.equal(
    decryptApiKeyValue(encrypted, { userDataPath: dir }),
    "sk-from-local-vault",
  );

  assert.equal(
    decryptApiKeyValue(encrypted, { userDataPath: undefined }),
    "",
    "missing userData must not return enc:v2 blob",
  );
});

test("failed enc:v1 decrypt returns empty string not base64 tail", () => {
  const safeStorage = {
    isEncryptionAvailable: () => true,
    decryptString: () => {
      throw new Error("bad key");
    },
  };
  const encrypted = `${ENC_PREFIX_V1}${Buffer.from("xxxx").toString("base64")}`;
  const out = decryptApiKeyValue(encrypted, { safeStorage });
  assert.equal(out, "");
});
