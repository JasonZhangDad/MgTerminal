const test = require("node:test");
const assert = require("node:assert/strict");

const { runHealthChecksWithDeps } = require("./runHealthChecks.cjs");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test("probes every host and returns one result each", async () => {
  const hosts = [{ hostId: "a" }, { hostId: "b" }, { hostId: "c" }];
  const results = await runHealthChecksWithDeps(
    hosts,
    async (host) => ({ status: "healthy", probed: host.hostId }),
  );
  assert.equal(results.length, 3);
  assert.deepEqual(
    results.map((r) => r.hostId).sort(),
    ["a", "b", "c"],
  );
});

test("respects the concurrency limit", async () => {
  let inFlight = 0;
  let maxInFlight = 0;
  const hosts = Array.from({ length: 8 }, (_, i) => ({ hostId: `h${i}` }));
  await runHealthChecksWithDeps(
    hosts,
    async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await sleep(10);
      inFlight -= 1;
      return { status: "healthy" };
    },
    { concurrency: 2 },
  );
  assert.ok(maxInFlight <= 2, `max in-flight was ${maxInFlight}`);
});

test("captures probe exceptions as error results", async () => {
  const results = await runHealthChecksWithDeps(
    [{ hostId: "bad" }],
    async () => {
      throw new Error("boom");
    },
  );
  assert.equal(results[0].status, "error");
  assert.equal(results[0].error, "boom");
});

test("emits running and done progress per host", async () => {
  const events = [];
  await runHealthChecksWithDeps(
    [{ hostId: "a" }],
    async () => ({ status: "healthy" }),
    { onProgress: (evt) => events.push(evt) },
  );
  assert.deepEqual(events.map((e) => e.status), ["running", "done"]);
  assert.equal(events[1].result.status, "healthy");
});

test("stops scheduling new probes after cancellation", async () => {
  const probed = [];
  const hosts = Array.from({ length: 6 }, (_, i) => ({ hostId: `h${i}` }));
  const isCancelled = { value: false };
  await runHealthChecksWithDeps(
    hosts,
    async (host) => {
      probed.push(host.hostId);
      isCancelled.value = true;
      await sleep(5);
      return { status: "healthy" };
    },
    { concurrency: 1, isCancelled: () => isCancelled.value },
  );
  assert.equal(probed.length, 1);
});
