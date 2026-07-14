/**
 * Decrypt provider API keys stored in renderer state.
 *
 * Storage formats:
 *   - plaintext (legacy / migration)
 *   - enc:v1:…  Electron safeStorage (OS keychain)
 *   - enc:v2:…  App-local AES vault (credentialBridge)
 *
 * Fail closed: never return ciphertext to HTTP layers. Returning the
 * encrypted blob as if it were a key produces provider 401s with base64
 * tails like "…5Q==".
 */

const {
  ENC_PREFIX_V1,
  ENC_PREFIX_V2,
  createLocalVault,
} = require("../credentialBridge.cjs");

/**
 * @param {string | undefined | null} encryptedKey
 * @param {{
 *   safeStorage?: { isEncryptionAvailable?: () => boolean, decryptString?: (buf: Buffer) => string } | null,
 *   userDataPath?: string | null,
 *   createVault?: typeof createLocalVault,
 *   logWarn?: (msg: string, err?: unknown) => void,
 * }} [deps]
 * @returns {string}
 */
function decryptApiKeyValue(encryptedKey, deps = {}) {
  if (!encryptedKey || typeof encryptedKey !== "string") return encryptedKey || "";

  const logWarn = deps.logWarn || ((msg, err) => {
    console.warn(msg, err?.message || err || "");
  });

  // Plaintext (no known encryption prefix)
  if (
    !encryptedKey.startsWith(ENC_PREFIX_V1)
    && !encryptedKey.startsWith(ENC_PREFIX_V2)
  ) {
    return encryptedKey;
  }

  // Local vault (enc:v2)
  if (encryptedKey.startsWith(ENC_PREFIX_V2)) {
    const userDataPath = deps.userDataPath;
    if (!userDataPath) {
      logWarn("[AI Bridge] Cannot decrypt enc:v2 API key: no userData path");
      return "";
    }
    try {
      const createVault = deps.createVault || createLocalVault;
      const vault = createVault({ userDataPath });
      return vault.decrypt(encryptedKey);
    } catch (err) {
      logWarn("[AI Bridge] enc:v2 API key decryption failed:", err);
      return "";
    }
  }

  // safeStorage (enc:v1)
  const safeStorage = deps.safeStorage;
  if (!safeStorage?.isEncryptionAvailable?.() || !safeStorage?.decryptString) {
    logWarn("[AI Bridge] Cannot decrypt enc:v1 API key: safeStorage unavailable");
    return "";
  }
  try {
    const base64 = encryptedKey.slice(ENC_PREFIX_V1.length);
    const buf = Buffer.from(base64, "base64");
    return safeStorage.decryptString(buf);
  } catch (err) {
    logWarn("[AI Bridge] enc:v1 API key decryption failed:", err);
    return "";
  }
}

module.exports = {
  decryptApiKeyValue,
  ENC_PREFIX_V1,
  ENC_PREFIX_V2,
};
