const test = require("node:test");
const assert = require("node:assert/strict");

const {
  injectApiKeyIntoRequest,
  requestContainsApiKeyPlaceholder,
} = require("./injectApiKey.cjs");

const PLACEHOLDER = "__IPC_SECURED__";

test("requestContainsApiKeyPlaceholder detects header and url placeholders", () => {
  assert.equal(
    requestContainsApiKeyPlaceholder("https://x", { Authorization: `Bearer ${PLACEHOLDER}` }, PLACEHOLDER),
    true,
  );
  assert.equal(
    requestContainsApiKeyPlaceholder(`https://x?key=${PLACEHOLDER}`, {}, PLACEHOLDER),
    true,
  );
  assert.equal(
    requestContainsApiKeyPlaceholder("https://x", { Authorization: "Bearer sk-real" }, PLACEHOLDER),
    false,
  );
});

test("inject replaces placeholder with decrypted key", () => {
  const out = injectApiKeyIntoRequest({
    url: "https://api.example/v1/chat",
    headers: { Authorization: `Bearer ${PLACEHOLDER}` },
    providerId: "p1",
    placeholder: PLACEHOLDER,
    resolveProvider: () => ({ apiKey: "enc:v2:blob" }),
    decryptApiKey: () => "sk-live",
  });
  assert.equal(out.error, undefined);
  assert.equal(out.headers.Authorization, "Bearer sk-live");
});

test("inject fails closed when encrypted key cannot be decrypted", () => {
  const out = injectApiKeyIntoRequest({
    url: "https://api.example/v1/chat",
    headers: { Authorization: `Bearer ${PLACEHOLDER}` },
    providerId: "p1",
    placeholder: PLACEHOLDER,
    resolveProvider: () => ({ apiKey: "enc:v2:deadbeefdeadbeefdeadbeefdeadbeefdeadbeef" }),
    decryptApiKey: () => "",
  });
  assert.match(out.error || "", /could not be decrypted/i);
  assert.match(out.headers.Authorization, new RegExp(PLACEHOLDER));
});

test("inject fails closed when provider is not synced", () => {
  const out = injectApiKeyIntoRequest({
    url: "https://api.example/v1/chat",
    headers: { Authorization: `Bearer ${PLACEHOLDER}` },
    providerId: "missing",
    placeholder: PLACEHOLDER,
    resolveProvider: () => null,
    decryptApiKey: () => "sk",
  });
  assert.match(out.error || "", /not available/i);
});

test("inject fails closed when placeholder remains after replace", () => {
  const out = injectApiKeyIntoRequest({
    url: "https://api.example/v1/chat",
    headers: { Authorization: `Bearer ${PLACEHOLDER}` },
    providerId: "p1",
    placeholder: PLACEHOLDER,
    resolveProvider: () => ({ apiKey: "sk-live" }),
    // Buggy decrypt that returns the placeholder itself
    decryptApiKey: () => PLACEHOLDER,
  });
  assert.match(out.error || "", /placeholder remained/i);
});

test("inject without placeholder is a no-op even if key decrypt fails", () => {
  const out = injectApiKeyIntoRequest({
    url: "https://api.example/v1/models",
    headers: { Accept: "application/json" },
    providerId: "p1",
    placeholder: PLACEHOLDER,
    resolveProvider: () => ({ apiKey: "enc:v1:x" }),
    decryptApiKey: () => "",
  });
  assert.equal(out.error, undefined);
  assert.equal(out.headers.Accept, "application/json");
});
