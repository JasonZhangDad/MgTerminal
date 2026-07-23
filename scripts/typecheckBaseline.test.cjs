const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  parseTscOutput,
  loadBaseline,
  writeBaseline,
  diffAgainstBaseline,
} = require("./typecheckBaseline.cjs");

const SAMPLE_OUTPUT = `foo.ts(1,2): error TS2339: Property 'x' does not exist on type 'Y'.
bar.ts(10,5): error TS2322: Type 'A' is not assignable to type 'B'.
  'B' could be instantiated with an arbitrary type.
foo.ts(99,1): error TS2339: Property 'x' does not exist on type 'Y'.
`;

test("parseTscOutput folds continuation lines into one identity, drops line/col", () => {
  const ids = parseTscOutput(SAMPLE_OUTPUT);
  // The two foo.ts(1,2) / foo.ts(99,1) errors share file+code+message once
  // line/col are stripped, so they collapse into a single identity.
  assert.deepEqual(new Set(ids), new Set([
    "foo.ts::TS2339::Property 'x' does not exist on type 'Y'.",
    "bar.ts::TS2322::Type 'A' is not assignable to type 'B'. 'B' could be instantiated with an arbitrary type.",
  ]));
});

test("parseTscOutput returns nothing for clean output", () => {
  assert.deepEqual(parseTscOutput("\n"), []);
});

test("diffAgainstBaseline reports new violations and fixed baseline entries", () => {
  const baseline = new Set(["a.ts::TS1::old error", "b.ts::TS2::still here"]);
  const current = ["b.ts::TS2::still here", "c.ts::TS3::brand new error"];

  const { newViolations, fixed } = diffAgainstBaseline(current, baseline);
  assert.deepEqual(newViolations, ["c.ts::TS3::brand new error"]);
  assert.deepEqual(fixed, ["a.ts::TS1::old error"]);
});

test("diffAgainstBaseline is clean when current exactly matches baseline", () => {
  const baseline = new Set(["a.ts::TS1::x"]);
  const { newViolations, fixed } = diffAgainstBaseline(["a.ts::TS1::x"], baseline);
  assert.deepEqual(newViolations, []);
  assert.deepEqual(fixed, []);
});

test("writeBaseline then loadBaseline round-trips a sorted, deduped set", () => {
  const tmpFile = path.join(os.tmpdir(), `typecheck-baseline-test-${Date.now()}.json`);
  try {
    writeBaseline(tmpFile, ["z.ts::TS1::z", "a.ts::TS1::a"]);
    const loaded = loadBaseline(tmpFile);
    assert.deepEqual(loaded, new Set(["a.ts::TS1::a", "z.ts::TS1::z"]));
    const raw = JSON.parse(fs.readFileSync(tmpFile, "utf8"));
    assert.deepEqual(raw, ["a.ts::TS1::a", "z.ts::TS1::z"]);
  } finally {
    fs.rmSync(tmpFile, { force: true });
  }
});

test("loadBaseline returns an empty set when the file is missing", () => {
  const missing = path.join(os.tmpdir(), "typecheck-baseline-does-not-exist.json");
  assert.deepEqual(loadBaseline(missing), new Set());
});
