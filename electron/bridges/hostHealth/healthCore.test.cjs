const test = require("node:test");
const assert = require("node:assert/strict");

const {
  HEALTH_SNAPSHOT_SCRIPT,
  parseHealthSnapshot,
  summarizeHealthStatus,
} = require("./healthCore.cjs");

test("snapshot script emits LOAD/MEM/DISK markers", () => {
  assert.match(HEALTH_SNAPSHOT_SCRIPT, /LOAD/);
  assert.match(HEALTH_SNAPSHOT_SCRIPT, /MEM/);
  assert.match(HEALTH_SNAPSHOT_SCRIPT, /DISK/);
});

test("parseHealthSnapshot reads linux-style output", () => {
  const stdout = [
    "LOAD 0.42 0.36 0.30 1/234 5678",
    "MEM 16384000 8192000",
    "DISK 102400000 51200000",
  ].join("\n");
  const snapshot = parseHealthSnapshot(stdout);
  assert.equal(snapshot.loadAvg1, 0.42);
  assert.equal(snapshot.memTotalKb, 16384000);
  assert.equal(snapshot.memUsedKb, 8192000);
  assert.equal(snapshot.memPercent, 50);
  assert.equal(snapshot.diskTotalKb, 102400000);
  assert.equal(snapshot.diskPercent, 50);
});

test("parseHealthSnapshot tolerates missing sections", () => {
  const snapshot = parseHealthSnapshot("LOAD 1.5 1.2 1.0\n");
  assert.equal(snapshot.loadAvg1, 1.5);
  assert.equal(snapshot.memPercent, undefined);
  assert.equal(snapshot.diskPercent, undefined);
});

test("parseHealthSnapshot handles macOS sysctl loadavg format", () => {
  const snapshot = parseHealthSnapshot("LOAD { 2.05 1.90 1.80 }\n");
  assert.equal(snapshot.loadAvg1, 2.05);
});

test("summarizeHealthStatus: unreachable when tcp failed", () => {
  assert.equal(
    summarizeHealthStatus({ tcpOk: false, authOk: false }),
    "unreachable",
  );
});

test("summarizeHealthStatus: auth-failed when tcp ok but auth failed", () => {
  assert.equal(
    summarizeHealthStatus({ tcpOk: true, authOk: false }),
    "auth-failed",
  );
});

test("summarizeHealthStatus: degraded on high memory/disk pressure", () => {
  assert.equal(
    summarizeHealthStatus({
      tcpOk: true,
      authOk: true,
      snapshot: { memPercent: 96 },
    }),
    "degraded",
  );
  assert.equal(
    summarizeHealthStatus({
      tcpOk: true,
      authOk: true,
      snapshot: { diskPercent: 92 },
    }),
    "degraded",
  );
});

test("summarizeHealthStatus: healthy otherwise", () => {
  assert.equal(
    summarizeHealthStatus({
      tcpOk: true,
      authOk: true,
      snapshot: { memPercent: 40, diskPercent: 50 },
    }),
    "healthy",
  );
  assert.equal(
    summarizeHealthStatus({ tcpOk: true, authOk: true }),
    "healthy",
  );
});
