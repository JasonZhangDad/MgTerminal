"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createKubectlOpsApi, sanitizeK8sName } = require("./kubectlOps.cjs");

test("sanitizeK8sName accepts DNS-1123-like names", () => {
  assert.equal(sanitizeK8sName("default"), "default");
  assert.equal(sanitizeK8sName("kube-system"), "kube-system");
  assert.equal(sanitizeK8sName("nginx-7d4b9"), "nginx-7d4b9");
  assert.equal(sanitizeK8sName(""), null);
  assert.equal(sanitizeK8sName("bad;name"), null);
  assert.equal(sanitizeK8sName("x && rm -rf /"), null);
});

test("listPods all-namespaces parses kubectl JSON without relying on column spacing", async () => {
  const calls = [];
  const api = createKubectlOpsApi({
    execOnSession: async (_event, _sessionId, cmd) => {
      calls.push(cmd);
      return {
        success: true,
        code: 0,
        stdout: JSON.stringify({
          items: [
            {
              metadata: { name: "coredns-abc", namespace: "kube-system", creationTimestamp: "2026-07-10T00:00:00Z" },
              spec: { nodeName: "node-a", containers: [{ name: "dns" }] },
              status: { phase: "Running", podIP: "10.0.0.1", containerStatuses: [{ ready: true, restartCount: 0 }] },
            },
            {
              metadata: { name: "nginx-xyz", namespace: "default", creationTimestamp: "2026-07-20T00:00:00Z" },
              spec: { nodeName: "node-b", containers: [{ name: "nginx" }] },
              status: { phase: "Running", podIP: "10.0.0.2", containerStatuses: [{ ready: true, restartCount: 2 }] },
            },
          ],
        }),
      };
    },
  });

  const result = await api.listPods({}, { sessionId: "s1" });
  assert.equal(result.success, true);
  assert.equal(result.pods.length, 2);
  assert.equal(result.pods[0].namespace, "kube-system");
  assert.equal(result.pods[0].name, "coredns-abc");
  assert.equal(result.pods[0].ready, "1/1");
  assert.equal(result.pods[1].restarts, 2);
  assert.match(calls[0], /--all-namespaces/);
  assert.match(calls[0], /-o json/);
  assert.doesNotMatch(calls[0], /-o wide/);
});

test("listPods namespaced rejects invalid namespace", async () => {
  const api = createKubectlOpsApi({
    execOnSession: async () => ({ success: true, code: 0, stdout: "" }),
  });
  const result = await api.listPods({}, { sessionId: "s1", namespace: "bad name" });
  assert.equal(result.success, false);
});

test("getPodLogs quotes identifiers and tails", async () => {
  const calls = [];
  const api = createKubectlOpsApi({
    execOnSession: async (_e, _s, cmd) => {
      calls.push(cmd);
      return { success: true, code: 0, stdout: "line1\nline2\n" };
    },
  });
  const result = await api.getPodLogs({}, {
    sessionId: "s1",
    namespace: "default",
    pod: "nginx-1",
    tailLines: 50,
  });
  assert.equal(result.success, true);
  assert.equal(result.logs, "line1\nline2\n");
  assert.match(calls[0], /kubectl logs -n 'default' 'nginx-1'/);
  assert.match(calls[0], /--tail=50/);
});

test("listNamespaces parses kubectl JSON", async () => {
  const api = createKubectlOpsApi({
    execOnSession: async () => ({
      success: true,
      code: 0,
      stdout: JSON.stringify({
        items: [
          { metadata: { name: "default", creationTimestamp: "2026-06-20T00:00:00Z" }, status: { phase: "Active" } },
          { metadata: { name: "kube-system", creationTimestamp: "2026-06-20T00:00:00Z" }, status: { phase: "Active" } },
        ],
      }),
    }),
  });
  const result = await api.listNamespaces({}, "s1");
  assert.equal(result.success, true);
  assert.equal(result.namespaces.length, 2);
  assert.equal(result.namespaces[0].name, "default");
});

test("deletePod rejects invalid names and quotes safe names", async () => {
  const calls = [];
  const api = createKubectlOpsApi({
    execOnSession: async (_e, _s, cmd) => {
      calls.push(cmd);
      return { success: true, code: 0, stdout: "pod \"nginx\" deleted\n" };
    },
  });
  const bad = await api.deletePod({}, { sessionId: "s1", namespace: "bad;rm", pod: "x" });
  assert.equal(bad.success, false);
  const ok = await api.deletePod({}, { sessionId: "s1", namespace: "default", pod: "nginx-1" });
  assert.equal(ok.success, true);
  assert.match(calls[0], /delete pod -n 'default' 'nginx-1'/);
});

test("scaleDeployment validates replicas and builds scale command", async () => {
  const calls = [];
  const api = createKubectlOpsApi({
    execOnSession: async (_e, _s, cmd) => {
      calls.push(cmd);
      return { success: true, code: 0, stdout: "deployment.apps/api scaled\n" };
    },
  });
  const bad = await api.scaleDeployment({}, {
    sessionId: "s1",
    name: "api",
    replicas: 1.5,
  });
  assert.equal(bad.success, false);
  const ok = await api.scaleDeployment({}, {
    sessionId: "s1",
    namespace: "prod",
    name: "api",
    replicas: 3,
  });
  assert.equal(ok.success, true);
  assert.match(calls[0], /scale deployment\/api -n 'prod' --replicas=3/);
});

test("listDeployments all-namespaces parses kubectl JSON", async () => {
  const calls = [];
  const api = createKubectlOpsApi({
    execOnSession: async (_e, _s, cmd) => {
      calls.push(cmd);
      return {
        success: true,
        code: 0,
        stdout: JSON.stringify({
          items: [
            {
              metadata: { name: "api", namespace: "default", creationTimestamp: "2026-07-10T00:00:00Z" },
              spec: { replicas: 2 },
              status: { readyReplicas: 2, updatedReplicas: 2, availableReplicas: 2 },
            },
            {
              metadata: { name: "coredns", namespace: "kube-system", creationTimestamp: "2026-06-20T00:00:00Z" },
              spec: { replicas: 1 },
              status: { readyReplicas: 1, updatedReplicas: 1, availableReplicas: 1 },
            },
          ],
        }),
      };
    },
  });
  const result = await api.listDeployments({}, { sessionId: "s1" });
  assert.equal(result.success, true);
  assert.equal(result.deployments.length, 2);
  assert.equal(result.deployments[0].namespace, "default");
  assert.equal(result.deployments[0].name, "api");
  assert.equal(result.deployments[0].ready, "2/2");
  assert.equal(result.deployments[1].name, "coredns");
  assert.match(calls[0], /get deployments --all-namespaces/);
  assert.match(calls[0], /-o json/);
});

test("Kubernetes list operations fail loudly when kubectl returns invalid JSON", async () => {
  const api = createKubectlOpsApi({
    execOnSession: async () => ({ success: true, code: 0, stdout: "not-json" }),
  });

  const result = await api.listPods({}, { sessionId: "s1" });

  assert.equal(result.success, false);
  assert.match(result.error, /invalid JSON/i);
});

test("listDeployments namespaced rejects invalid namespace", async () => {
  const api = createKubectlOpsApi({
    execOnSession: async () => ({ success: true, code: 0, stdout: "" }),
  });
  const result = await api.listDeployments({}, { sessionId: "s1", namespace: "bad name" });
  assert.equal(result.success, false);
});

test("listEvents parses Kubernetes event JSON", async () => {
  const commands = [];
  const api = createKubectlOpsApi({
    execOnSession: async (_event, _sessionId, command) => {
      commands.push(command);
      return {
        success: true,
        code: 0,
        stdout: JSON.stringify({
          items: [{
            metadata: { name: "api.123", namespace: "payments", creationTimestamp: "2026-07-20T00:00:00Z" },
            type: "Warning",
            reason: "BackOff",
            message: "Back-off restarting failed container",
            count: 4,
            lastTimestamp: "2026-07-20T00:01:00Z",
            involvedObject: { kind: "Pod", name: "api-1", namespace: "payments" },
            source: { component: "kubelet", host: "node-1" },
          }],
        }),
      };
    },
  });

  const result = await api.listEvents({}, { sessionId: "s1", namespace: "payments" });

  assert.equal(commands[0], "kubectl get events -n 'payments' -o json --sort-by=.metadata.creationTimestamp");
  assert.deepEqual(result.events, [{
    name: "api.123",
    namespace: "payments",
    type: "Warning",
    reason: "BackOff",
    message: "Back-off restarting failed container",
    count: 4,
    objectKind: "Pod",
    objectName: "api-1",
    source: "kubelet/node-1",
    firstSeen: "2026-07-20T00:00:00Z",
    lastSeen: "2026-07-20T00:01:00Z",
  }]);
});

test("deployment rollout status, history, and restart build scoped commands", async () => {
  const commands = [];
  const api = createKubectlOpsApi({
    execOnSession: async (_event, _sessionId, command) => {
      commands.push(command);
      return { success: true, code: 0, stdout: `${command}\n` };
    },
  });
  const payload = { sessionId: "s1", namespace: "payments", name: "api" };

  assert.equal((await api.getDeploymentRolloutStatus({}, payload)).success, true);
  assert.equal((await api.getDeploymentRolloutHistory({}, payload)).success, true);
  assert.equal((await api.restartDeploymentRollout({}, payload)).success, true);
  assert.deepEqual(commands, [
    "kubectl rollout status deployment/api -n 'payments' --timeout=20s",
    "kubectl rollout history deployment/api -n 'payments'",
    "kubectl rollout restart deployment/api -n 'payments'",
  ]);
});

test("execPod runs an explicit command with container selection and shell-safe quoting", async () => {
  const commands = [];
  const api = createKubectlOpsApi({
    execOnSession: async (_event, _sessionId, command) => {
      commands.push(command);
      return { success: true, code: 0, stdout: "ok\n" };
    },
  });

  const invalid = await api.execPod({}, {
    sessionId: "s1",
    namespace: "default",
    pod: "api-1",
    command: "",
  });
  assert.deepEqual(invalid, { success: false, error: "Command is required" });

  const result = await api.execPod({}, {
    sessionId: "s1",
    namespace: "default",
    pod: "api-1",
    container: "api",
    command: "printf '%s' \"hello\"",
  });
  assert.deepEqual(result, { success: true, output: "ok\n" });
  assert.equal(
    commands[0],
    "kubectl exec -n 'default' 'api-1' -c 'api' -- sh -lc 'printf '\"'\"'%s'\"'\"' \"hello\"'",
  );
});
