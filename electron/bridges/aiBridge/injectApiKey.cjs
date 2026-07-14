/**
 * Replace API key placeholders in outbound AI requests.
 *
 * Fail closed: never leave __IPC_SECURED__ (or similar) in headers/URL when
 * a provider is expected to supply a real key — that produces provider 401s.
 */

/**
 * @param {string | undefined | null} url
 * @param {Record<string, unknown> | null | undefined} headers
 * @param {string} placeholder
 */
function requestContainsApiKeyPlaceholder(url, headers, placeholder) {
  if (typeof url === "string" && url.includes(placeholder)) return true;
  if (!headers || typeof headers !== "object") return false;
  for (const value of Object.values(headers)) {
    if (typeof value === "string" && value.includes(placeholder)) return true;
  }
  return false;
}

/**
 * @param {string | undefined | null} apiKey
 * @param {{ startsWithEnc?: (value: string) => boolean }} [opts]
 */
function isEncryptedApiKeyBlob(apiKey, opts = {}) {
  if (typeof apiKey !== "string" || !apiKey) return false;
  if (opts.startsWithEnc) return opts.startsWithEnc(apiKey);
  return apiKey.startsWith("enc:v1:") || apiKey.startsWith("enc:v2:");
}

/**
 * @param {{
 *   url: string,
 *   headers?: Record<string, unknown> | null,
 *   providerId?: string | null,
 *   placeholder: string,
 *   resolveProvider?: (id: string) => { apiKey?: string } | null | undefined,
 *   decryptApiKey?: (encrypted: string | undefined | null) => string,
 * }} args
 * @returns {{ url: string, headers: Record<string, unknown>, error?: string }}
 */
function injectApiKeyIntoRequest(args) {
  const {
    url,
    headers,
    providerId,
    placeholder,
    resolveProvider,
    decryptApiKey,
  } = args;

  const sourceHeaders = headers && typeof headers === "object" ? headers : {};
  const needsKey = requestContainsApiKeyPlaceholder(url, sourceHeaders, placeholder);

  if (!providerId) {
    if (needsKey) {
      return {
        url,
        headers: { ...sourceHeaders },
        error:
          "API key placeholder present but no provider id was provided. Re-select the model and retry.",
      };
    }
    return { url, headers: { ...sourceHeaders } };
  }

  const config = typeof resolveProvider === "function" ? resolveProvider(providerId) : null;
  if (!config) {
    if (needsKey) {
      return {
        url,
        headers: { ...sourceHeaders },
        error:
          `Provider "${providerId}" is not available in the main process yet. Re-open the AI panel or restart the app, then retry.`,
      };
    }
    return { url, headers: { ...sourceHeaders } };
  }

  const realKey =
    typeof decryptApiKey === "function"
      ? decryptApiKey(config.apiKey)
      : (typeof config.apiKey === "string" ? config.apiKey : "");

  if (needsKey && !realKey) {
    return {
      url,
      headers: { ...sourceHeaders },
      error: isEncryptedApiKeyBlob(config.apiKey)
        ? "API key could not be decrypted. Open Settings → AI, clear and re-enter the API key, save again, then retry."
        : "API key is missing. Open Settings → AI and configure a valid API key.",
    };
  }

  if (!realKey) {
    return { url, headers: { ...sourceHeaders } };
  }

  const patchedHeaders = {};
  for (const [key, value] of Object.entries(sourceHeaders)) {
    patchedHeaders[key] =
      typeof value === "string" ? value.replaceAll(placeholder, realKey) : value;
  }

  let patchedUrl = url;
  if (typeof url === "string" && url.includes(placeholder)) {
    patchedUrl = url.replaceAll(placeholder, encodeURIComponent(realKey));
  }

  if (requestContainsApiKeyPlaceholder(patchedUrl, patchedHeaders, placeholder)) {
    return {
      url: patchedUrl,
      headers: patchedHeaders,
      error:
        "API key injection failed (placeholder remained). Re-save the provider API key and retry.",
    };
  }

  return { url: patchedUrl, headers: patchedHeaders };
}

module.exports = {
  injectApiKeyIntoRequest,
  requestContainsApiKeyPlaceholder,
  isEncryptedApiKeyBlob,
};
