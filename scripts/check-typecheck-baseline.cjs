"use strict";

// Ratchets `tsc --noEmit` against a checked-in baseline (scripts/typecheck-baseline.json)
// of pre-existing errors, so CI fails only on *new* type errors rather than the legacy
// backlog. Run with --update to regenerate the baseline from the current tsc output
// (e.g. after fixing some of the backlog, or — sparingly — to grandfather a new one).

const { spawnSync } = require("node:child_process");
const {
  parseTscOutput,
  loadBaseline,
  writeBaseline,
  diffAgainstBaseline,
  DEFAULT_BASELINE_PATH,
} = require("./typecheckBaseline.cjs");

function runTypecheck() {
  const result = spawnSync("npx", ["tsc", "--noEmit", "-p", "."], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 64,
  });
  return `${result.stdout || ""}${result.stderr || ""}`;
}

function main() {
  const shouldUpdate = process.argv.includes("--update");
  const output = runTypecheck();
  const current = parseTscOutput(output);

  if (shouldUpdate) {
    writeBaseline(DEFAULT_BASELINE_PATH, current);
    console.log(`[typecheck-baseline] Wrote ${current.length} entries to ${DEFAULT_BASELINE_PATH}`);
    return;
  }

  const baseline = loadBaseline(DEFAULT_BASELINE_PATH);
  const { newViolations, fixed } = diffAgainstBaseline(current, baseline);

  if (fixed.length > 0) {
    console.log(`[typecheck-baseline] ${fixed.length} baseline error(s) no longer reproduce — consider running "npm run typecheck:baseline:update" to shrink the baseline:`);
    for (const id of fixed) console.log(`  - ${id}`);
  }

  if (newViolations.length > 0) {
    console.error(`[typecheck-baseline] ${newViolations.length} NEW type error(s) not in the baseline:`);
    for (const id of newViolations) console.error(`  + ${id}`);
    console.error(`\nFix them, or if a new baseline entry is genuinely unavoidable, run "npm run typecheck:baseline:update".`);
    process.exitCode = 1;
    return;
  }

  console.log(`[typecheck-baseline] OK — ${current.length} error(s), none new (baseline has ${baseline.size}).`);
}

main();
