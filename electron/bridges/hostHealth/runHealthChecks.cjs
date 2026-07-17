// Concurrency-limited runner for user-triggered batch host health checks.
// Pure sequencing logic; the per-host probe is injected.

async function runHealthChecksWithDeps(
  hosts,
  probeHost,
  { concurrency = 3, onProgress = () => {}, isCancelled = () => false } = {},
) {
  const results = [];
  let nextIndex = 0;

  const emit = (event) => {
    try {
      onProgress(event);
    } catch {
      // Progress delivery must never abort the run.
    }
  };

  const worker = async () => {
    for (;;) {
      if (isCancelled()) return;
      const index = nextIndex;
      nextIndex += 1;
      if (index >= hosts.length) return;
      const host = hosts[index];
      emit({ hostId: host.hostId, status: "running" });
      let result;
      try {
        result = await probeHost(host);
      } catch (err) {
        result = { status: "error", error: err?.message || String(err) };
      }
      const entry = { hostId: host.hostId, ...result };
      results.push(entry);
      emit({ hostId: host.hostId, status: "done", result: entry });
    }
  };

  const workerCount = Math.max(1, Math.min(concurrency, hosts.length));
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

module.exports = { runHealthChecksWithDeps };
