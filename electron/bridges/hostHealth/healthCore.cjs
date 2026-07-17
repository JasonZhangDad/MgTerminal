// Pure logic for the multi-host health snapshot: the remote snapshot script,
// its parser, and the health-status classifier. No I/O here.

// POSIX-safe one-liner emitting marker lines. Linux gets /proc + free; macOS
// falls back to sysctl loadavg. Disk always via `df -kP /`. Missing tools
// simply omit their marker line.
const HEALTH_SNAPSHOT_SCRIPT =
  'echo "LOAD $(cat /proc/loadavg 2>/dev/null || sysctl -n vm.loadavg 2>/dev/null)"; ' +
  'free -k 2>/dev/null | awk \'NR==2{print "MEM",$2,$3}\'; ' +
  'df -kP / 2>/dev/null | awk \'NR==2{print "DISK",$2,$3}\'';

const toPercent = (used, total) => {
  if (!Number.isFinite(used) || !Number.isFinite(total) || total <= 0) return undefined;
  return Math.round((used / total) * 100);
};

function parseHealthSnapshot(stdout) {
  const snapshot = {};
  for (const rawLine of String(stdout || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.startsWith("LOAD ")) {
      // Linux: "0.42 0.36 0.30 1/234 5678"; macOS sysctl: "{ 2.05 1.90 1.80 }"
      const match = line.slice(5).match(/(\d+(?:[.,]\d+)?)/);
      if (match) snapshot.loadAvg1 = Number.parseFloat(match[1].replace(",", "."));
    } else if (line.startsWith("MEM ")) {
      const [total, used] = line.slice(4).trim().split(/\s+/).map(Number);
      if (Number.isFinite(total)) snapshot.memTotalKb = total;
      if (Number.isFinite(used)) snapshot.memUsedKb = used;
      const percent = toPercent(used, total);
      if (percent !== undefined) snapshot.memPercent = percent;
    } else if (line.startsWith("DISK ")) {
      const [total, used] = line.slice(5).trim().split(/\s+/).map(Number);
      if (Number.isFinite(total)) snapshot.diskTotalKb = total;
      if (Number.isFinite(used)) snapshot.diskUsedKb = used;
      const percent = toPercent(used, total);
      if (percent !== undefined) snapshot.diskPercent = percent;
    }
  }
  return snapshot;
}

const MEM_PRESSURE_PERCENT = 95;
const DISK_PRESSURE_PERCENT = 90;

function summarizeHealthStatus({ tcpOk, authOk, snapshot }) {
  if (!tcpOk) return "unreachable";
  if (!authOk) return "auth-failed";
  if (snapshot) {
    if ((snapshot.memPercent ?? 0) >= MEM_PRESSURE_PERCENT) return "degraded";
    if ((snapshot.diskPercent ?? 0) >= DISK_PRESSURE_PERCENT) return "degraded";
  }
  return "healthy";
}

module.exports = {
  HEALTH_SNAPSHOT_SCRIPT,
  parseHealthSnapshot,
  summarizeHealthStatus,
};
