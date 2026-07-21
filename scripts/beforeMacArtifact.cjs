"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { adHocSignAppBundle } = require("./afterPackMacUuid.cjs");

const ELECTRON_BUILDER_ARCH_NAMES = {
  1: "x64",
  3: "arm64",
  4: "universal",
};

function resolveMacArtifactAppPath(event, options = {}) {
  const hostPlatform = options.hostPlatform || process.platform;
  const readDirectory = options.readdirSync || fs.readdirSync;
  const artifactFile = typeof event?.file === "string" ? event.file : "";
  const artifactName = path.basename(artifactFile);

  if (
    hostPlatform !== "darwin" ||
    !artifactName.includes("-mac-") ||
    (!artifactName.endsWith(".dmg") && !artifactName.endsWith(".zip"))
  ) {
    return null;
  }

  const arch = ELECTRON_BUILDER_ARCH_NAMES[event.arch] || event.arch;
  const appDirectoryName =
    arch === "arm64" ? "mac-arm64" : arch === "universal" ? "mac-universal" : "mac";
  const appDirectory = path.join(path.dirname(artifactFile), appDirectoryName);
  const appBundles = readDirectory(appDirectory, { withFileTypes: true }).filter(
    (entry) => entry.isDirectory() && entry.name.endsWith(".app"),
  );

  if (appBundles.length !== 1) {
    throw new Error(
      `[artifactBuildStarted] Expected one macOS app bundle in ${appDirectory}, found ${appBundles.length}`,
    );
  }

  return path.join(appDirectory, appBundles[0].name);
}

function verifyAppBundle(appPath, execFile) {
  execFile("codesign", ["--verify", "--deep", "--strict", appPath], {
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function ensureMacArtifactIntegrity(event, options = {}) {
  const hostPlatform = options.hostPlatform || process.platform;
  const execFile = options.execFileSync || execFileSync;
  const appPath = resolveMacArtifactAppPath(event, options);
  if (!appPath) return false;

  try {
    verifyAppBundle(appPath, execFile);
    return false;
  } catch {
    adHocSignAppBundle(appPath, {
      hostPlatform,
      execFileSync: execFile,
    });
    verifyAppBundle(appPath, execFile);
    console.log(
      `[artifactBuildStarted] Applied free ad-hoc integrity to ${appPath} after Electron fuse changes`,
    );
    return true;
  }
}

function beforeMacArtifact(event) {
  ensureMacArtifactIntegrity(event);
}

module.exports = beforeMacArtifact;
module.exports.default = beforeMacArtifact;
module.exports.ensureMacArtifactIntegrity = ensureMacArtifactIntegrity;
module.exports.resolveMacArtifactAppPath = resolveMacArtifactAppPath;
