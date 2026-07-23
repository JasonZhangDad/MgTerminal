"use strict";

const path = require("node:path");

const ERROR_LINE_RE = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/;

/**
 * Parses `tsc --noEmit` output into a stable, line/column-independent set of
 * error identities: "<file>::<code>::<message>", where continuation lines
 * (the extra explanation tsc indents under some errors) are folded into the
 * same message. Line/column are dropped because they drift on every
 * unrelated edit above an error, which would make a line-number-keyed
 * baseline spuriously stale.
 */
function parseTscOutput(output) {
  const lines = output.split("\n");
  const entries = [];
  let current = null;

  for (const line of lines) {
    const match = line.match(ERROR_LINE_RE);
    if (match) {
      const [, file, , , code, message] = match;
      current = { file: file.trim(), code, messageParts: [message.trim()] };
      entries.push(current);
    } else if (current && line.trim()) {
      current.messageParts.push(line.trim());
    }
  }

  return entries.map((e) => `${e.file}::${e.code}::${e.messageParts.join(" ")}`);
}

function loadBaseline(baselinePath) {
  try {
    const raw = require(baselinePath);
    return new Set(Array.isArray(raw) ? raw : []);
  } catch {
    return new Set();
  }
}

function writeBaseline(baselinePath, identities) {
  const fs = require("node:fs");
  const sorted = [...identities].sort();
  fs.writeFileSync(baselinePath, `${JSON.stringify(sorted, null, 2)}\n`);
}

/** Splits current identities against a baseline set into new/fixed/unchanged. */
function diffAgainstBaseline(currentIdentities, baselineSet) {
  const currentSet = new Set(currentIdentities);
  const newViolations = currentIdentities.filter((id) => !baselineSet.has(id));
  const fixed = [...baselineSet].filter((id) => !currentSet.has(id));
  return { newViolations, fixed };
}

module.exports = {
  parseTscOutput,
  loadBaseline,
  writeBaseline,
  diffAgainstBaseline,
  DEFAULT_BASELINE_PATH: path.join(__dirname, "typecheck-baseline.json"),
};
