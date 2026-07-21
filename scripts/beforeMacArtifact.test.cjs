const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  ensureMacArtifactIntegrity,
  resolveMacArtifactAppPath,
} = require("./beforeMacArtifact.cjs");

test("desktop release config opts out of paid signing and notarization", () => {
  const config = require("../electron-builder.config.cjs");

  assert.equal(config.forceCodeSigning, false);
  assert.equal(config.mac.identity, null);
  assert.equal(config.mac.notarize, false);
  assert.equal(config.win.certificateFile, undefined);
});

test("desktop CI rejects macOS artifacts with broken ad-hoc integrity", () => {
  const workflow = fs.readFileSync(
    path.join(__dirname, "..", ".github", "workflows", "build.yml"),
    "utf8",
  );

  assert.match(workflow, /name: Verify macOS app bundle integrity/);
  assert.match(workflow, /if: matrix\.name == 'macos'/);
  assert.match(
    workflow,
    /codesign --verify --deep --strict --verbose=2 release\/mac-arm64\/MagiesTerminal\.app/,
  );
  assert.match(
    workflow,
    /codesign --verify --deep --strict --verbose=2 release\/mac\/MagiesTerminal\.app/,
  );
});

test("resolveMacArtifactAppPath maps builder architecture output directories", () => {
  const listApps = () => [
    { isDirectory: () => true, name: "MagiesTerminal.app" },
  ];

  assert.equal(
    resolveMacArtifactAppPath(
      { arch: 3, file: "/tmp/release/MagiesTerminal-0.5.21-mac-arm64.dmg" },
      { hostPlatform: "darwin", readdirSync: listApps },
    ),
    "/tmp/release/mac-arm64/MagiesTerminal.app",
  );
  assert.equal(
    resolveMacArtifactAppPath(
      { arch: 1, file: "/tmp/release/MagiesTerminal-0.5.21-mac-x64.zip" },
      { hostPlatform: "darwin", readdirSync: listApps },
    ),
    "/tmp/release/mac/MagiesTerminal.app",
  );
});

test("ensureMacArtifactIntegrity leaves an already valid signature unchanged", () => {
  const calls = [];

  const result = ensureMacArtifactIntegrity(
    { arch: 3, file: "/tmp/release/MagiesTerminal-0.5.21-mac-arm64.dmg" },
    {
      hostPlatform: "darwin",
      readdirSync: () => [
        { isDirectory: () => true, name: "MagiesTerminal.app" },
      ],
      execFileSync: (bin, args) => calls.push({ bin, args }),
    },
  );

  assert.equal(result, false);
  assert.deepEqual(calls, [
    {
      bin: "codesign",
      args: [
        "--verify",
        "--deep",
        "--strict",
        "/tmp/release/mac-arm64/MagiesTerminal.app",
      ],
    },
  ]);
});

test("ensureMacArtifactIntegrity reapplies free ad-hoc integrity after Electron fuses", () => {
  const calls = [];

  const result = ensureMacArtifactIntegrity(
    { arch: 1, file: "/tmp/release/MagiesTerminal-0.5.21-mac-x64.zip" },
    {
      hostPlatform: "darwin",
      readdirSync: () => [
        { isDirectory: () => true, name: "MagiesTerminal.app" },
      ],
      execFileSync: (bin, args) => {
        calls.push({ bin, args });
        if (calls.length === 1) throw new Error("invalid signature");
      },
    },
  );

  assert.equal(result, true);
  assert.deepEqual(calls, [
    {
      bin: "codesign",
      args: [
        "--verify",
        "--deep",
        "--strict",
        "/tmp/release/mac/MagiesTerminal.app",
      ],
    },
    {
      bin: "codesign",
      args: [
        "--force",
        "--deep",
        "--sign",
        "-",
        "--timestamp=none",
        "/tmp/release/mac/MagiesTerminal.app",
      ],
    },
    {
      bin: "codesign",
      args: [
        "--verify",
        "--deep",
        "--strict",
        "/tmp/release/mac/MagiesTerminal.app",
      ],
    },
  ]);
});

test("ensureMacArtifactIntegrity ignores non-macOS artifacts", () => {
  let called = false;

  const result = ensureMacArtifactIntegrity(
    { arch: 1, file: "/tmp/release/MagiesTerminal-0.5.21-linux-x86_64.AppImage" },
    {
      hostPlatform: "linux",
      readdirSync: () => {
        called = true;
        return [];
      },
      execFileSync: () => {
        called = true;
      },
    },
  );

  assert.equal(result, false);
  assert.equal(called, false);
});
