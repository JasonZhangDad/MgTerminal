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

test("listPods all-namespaces parses wide output", async () => {
  const calls = [];
  const api = createKubectlOpsApi({
    execOnSession: async (_event, _sessionId, cmd) => {
      calls.push(cmd);
      return {
        success: true,
        code: 0,
        stdout: [
          "kube-system   coredns-abc   1/1   Running   0   10d   10.0.0.1   node-a   <none>   <none>",
          "default       nginx-xyz     1/1   Running   2   5h    10.0.0.2   node-b   <none>   <none>",
        ].join("\n"),
      };
    },
  });

  const result = await api.listPods({}, { sessionId: "s1" });
  assert.equal(result.success, true);
  assert.equal(result.pods.length, 2);
  assert.equal(result.pods[0].namespace, "kube-system");
  assert.equal(result.pods[0].name, "coredns-abc");
  assert.equal(result.pods[1].restarts, 2);
  assert.match(calls[0], /--all-namespaces/);
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

test("listNamespaces parses get namespaces", async () => {
  const api = createKubectlOpsApi({
    execOnSession: async () => ({
      success: true,
      code: 0,
      stdout: "default   Active   30d\nkube-system   Active   30d\n",
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

test("listDeployments all-namespaces parses wide output", async () => {
  const calls = [];
  const api = createKubectlOpsApi({
    execOnSession: async (_e, _s, cmd) => {
      calls.push(cmd);
      return {
        success: true,
        code: 0,
        stdout: [
          "default       api     2/2   2   2   10d   api     image/api     app=api",
          "kube-system   coredns 1/1   1   1   30d   coredns image/dns    k8s-app=kube-dns",
        ].join("\n"),
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
});

test("listDeployments namespaced rejects invalid namespace", async () => {
  const api = createKubectlOpsApi({
    execOnSession: async () => ({ success: true, code: 0, stdout: "" }),
  });
  const result = await api.listDeployments({}, { sessionId: "s1", namespace: "bad name" });
  assert.equal(result.success, false);
});
