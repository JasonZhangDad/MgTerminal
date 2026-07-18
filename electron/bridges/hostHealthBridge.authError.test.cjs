const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "hostHealthBridge.cjs"),
  "utf8",
);

test("health probe surfaces interactive / missing-credential errors clearly", () => {
  assert.match(
    source,
    /Server requires interactive authentication \(e\.g\. MFA\)/,
  );
  assert.match(
    source,
    /Configured private key is encrypted and no passphrase is saved/,
  );
  assert.match(source, /No usable authentication credentials available/);
});
