const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "connectionDiagnosticsBridge.cjs"),
  "utf8",
);

test("probe enables keyboard-interactive when a password is available", () => {
  // Regression: multi-host health + Test Connection used tryKeyboard:false and
  // never offered keyboard-interactive, so PAM-only password hosts always
  // failed with "All configured authentication methods failed" even with a
  // correct saved password (interactive sessions still worked via sshBridge).
  assert.match(source, /isAutoFillablePasswordChallenge/);
  assert.match(source, /type:\s*"keyboard-interactive"/);
  assert.match(source, /connectOpts\.tryKeyboard\s*=\s*true/);
  assert.match(source, /callback\("keyboard-interactive"\)/);
  assert.match(source, /conn\.on\("keyboard-interactive"/);
});

test("probe reports a clear error when no credentials are usable", () => {
  assert.match(source, /No usable authentication credentials available for probe/);
  assert.match(
    source,
    /Configured private key is encrypted and no passphrase is saved/,
  );
});
