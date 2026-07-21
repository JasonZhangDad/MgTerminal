"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createDockerOpsApi } = require("./dockerOps.cjs");

test("listContainers uses plain docker first even when a saved session password exists", async () => {
  const calls = [];
  const dockerOps = createDockerOpsApi({
    getSession: () => ({ systemManagerSudoPassword: "host-secret" }),
    execOnSession: async (_event, sessionId, command, timeoutMs, execOptions) => {
      calls.push({ sessionId, command, timeoutMs, execOptions });
      return {
        success: true,
        stdout: '{"ID":"abc123","Names":"web","Image":"nginx","State":"running"}\n',
        stderr: "",
        code: 0,
      };
    },
  });

  const result = await dockerOps.listContainers(null, "s1");

  assert.equal(result.success, true);
  assert.equal(result.containers.length, 1);
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].command,
    "docker ps -a --format '{{json .}}'",
  );
  assert.equal(calls[0].execOptions, undefined);
});

test("listContainers falls back to sudo when plain docker hits socket permission denial", async () => {
  const calls = [];
  const dockerOps = createDockerOpsApi({
    getSession: () => ({ systemManagerSudoPassword: "host-secret" }),
    execOnSession: async (_event, sessionId, command, timeoutMs, execOptions) => {
      calls.push({ sessionId, command, timeoutMs, execOptions });
      if (calls.length === 1) {
        return {
          success: true,
          stdout: "",
          stderr: "permission denied while trying to connect to the Docker daemon socket",
          code: 1,
        };
      }
      if (calls.length === 2) {
        return {
          success: true,
          stdout: "",
          stderr: "sudo: a password is required",
          code: 1,
        };
      }
      return {
        success: true,
        stdout: '{"ID":"abc123","Names":"web","Image":"nginx","State":"running"}\n',
        stderr: "",
        code: 0,
      };
    },
  });

  const result = await dockerOps.listContainers(null, "s1");

  assert.equal(result.success, true);
  assert.equal(result.containers.length, 1);
  assert.equal(calls.length, 3);
  assert.equal(calls[0].command, "docker ps -a --format '{{json .}}'");
  assert.equal(calls[0].execOptions, undefined);
  assert.equal(
    calls[1].command,
    "sudo docker ps -a --format '{{json .}}'",
  );
  assert.equal(calls[1].execOptions, undefined);
  assert.equal(
    calls[2].command,
    "sudo -S -p '' docker ps -a --format '{{json .}}'",
  );
  assert.deepEqual(calls[2].execOptions, { stdin: "host-secret\n" });
});

test("listContainers falls back to passwordless sudo when no saved password exists", async () => {
  const calls = [];
  const dockerOps = createDockerOpsApi({
    getSession: () => ({}),
    execOnSession: async (_event, sessionId, command, timeoutMs, execOptions) => {
      calls.push({ sessionId, command, timeoutMs, execOptions });
      if (calls.length === 1) {
        return {
          success: true,
          stdout: "",
          stderr: "Got permission denied while trying to connect to the Docker daemon socket",
          code: 1,
        };
      }
      return {
        success: true,
        stdout: '{"ID":"abc123","Names":"web","Image":"nginx","State":"running"}\n',
        stderr: "",
        code: 0,
      };
    },
  });

  const result = await dockerOps.listContainers(null, "s1");

  assert.equal(result.success, true);
  assert.equal(result.containers.length, 1);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].command, "docker ps -a --format '{{json .}}'");
  assert.equal(
    calls[1].command,
    "sudo docker ps -a --format '{{json .}}'",
  );
  assert.equal(calls[1].execOptions, undefined);
});

test("listContainers does not retry with transport auth passwords that were not saved for sudo autofill", async () => {
  const calls = [];
  const dockerOps = createDockerOpsApi({
    getSession: () => ({
      moshStatsAuth: { password: "interactive-mosh-password" },
      etStatsAuth: { password: "interactive-et-password" },
    }),
    execOnSession: async (_event, sessionId, command, timeoutMs, execOptions) => {
      calls.push({ sessionId, command, timeoutMs, execOptions });
      return {
        success: true,
        stdout: "",
        stderr: "permission denied while trying to connect to the Docker daemon socket",
        code: 1,
      };
    },
  });

  const result = await dockerOps.listContainers(null, "s1");

  assert.equal(result.success, false);
  assert.match(result.error, /permission denied/i);
  assert.equal(calls.length, 2);
  assert.equal(
    calls[1].command,
    "sudo docker ps -a --format '{{json .}}'",
  );
  assert.equal(calls[1].execOptions, undefined);
});

test("listContainers retries with explicit sudo autofill password on mosh or et sessions", async () => {
  const calls = [];
  const dockerOps = createDockerOpsApi({
    getSession: () => ({
      systemManagerSudoPassword: "saved-secret",
      moshStatsAuth: { password: "transport-secret" },
    }),
    execOnSession: async (_event, sessionId, command, timeoutMs, execOptions) => {
      calls.push({ sessionId, command, timeoutMs, execOptions });
      if (calls.length === 1) {
        return {
          success: true,
          stdout: "",
          stderr: "dial unix /var/run/docker.sock: connect: permission denied",
          code: 1,
        };
      }
      if (calls.length === 2) {
        return {
          success: true,
          stdout: "",
          stderr: "sudo: a password is required",
          code: 1,
        };
      }
      return {
        success: true,
        stdout: '{"ID":"abc123","Names":"web","Image":"nginx","State":"running"}\n',
        stderr: "",
        code: 0,
      };
    },
  });

  const result = await dockerOps.listContainers(null, "s1");

  assert.equal(result.success, true);
  assert.equal(calls.length, 3);
  assert.equal(
    calls[2].command,
    "sudo -S -p '' docker ps -a --format '{{json .}}'",
  );
  assert.deepEqual(calls[2].execOptions, { stdin: "saved-secret\n" });
});

test("docker image actions retry with sudo and send saved passwords through stdin", async () => {
  const calls = [];
  const dockerOps = createDockerOpsApi({
    getSession: () => ({ systemManagerSudoPassword: "pa'ss" }),
    execOnSession: async (_event, sessionId, command, timeoutMs, execOptions) => {
      calls.push({ sessionId, command, timeoutMs, execOptions });
      if (calls.length === 1) {
        return {
          success: true,
          stdout: "",
          stderr: "dial unix /var/run/docker.sock: connect: permission denied",
          code: 1,
        };
      }
      if (calls.length === 2) {
        return {
          success: true,
          stdout: "",
          stderr: "sudo: a password is required",
          code: 1,
        };
      }
      return { success: true, stdout: "deleted\n", stderr: "", code: 0 };
    },
  });

  const result = await dockerOps.imageAction(null, {
    sessionId: "s1",
    action: "rm",
    imageId: "sha256:abc123",
  });

  assert.equal(result.success, true);
  assert.equal(calls.length, 3);
  assert.equal(
    calls[2].command,
    "sudo -S -p '' docker rmi sha256abc123",
  );
  assert.deepEqual(calls[2].execOptions, { stdin: "pa'ss\n" });
});

test("listComposeProjects parses docker compose JSON", async () => {
  const calls = [];
  const dockerOps = createDockerOpsApi({
    getSession: () => ({}),
    execOnSession: async (_event, sessionId, command) => {
      calls.push({ sessionId, command });
      return {
        success: true,
        stdout: JSON.stringify([{
          Name: "payments",
          Status: "running(2)",
          ConfigFiles: "/srv/payments/compose.yml,/srv/payments/compose.prod.yml",
        }]),
        stderr: "",
        code: 0,
      };
    },
  });

  const result = await dockerOps.listComposeProjects(null, "s1");

  assert.deepEqual(result, {
    success: true,
    projects: [{
      name: "payments",
      status: "running(2)",
      configFiles: ["/srv/payments/compose.yml", "/srv/payments/compose.prod.yml"],
    }],
  });
  assert.deepEqual(calls, [{
    sessionId: "s1",
    command: "docker compose ls --all --format json",
  }]);
});

test("listComposeServices supports JSON-lines output and safely quotes project context", async () => {
  const calls = [];
  const dockerOps = createDockerOpsApi({
    getSession: () => ({}),
    execOnSession: async (_event, _sessionId, command) => {
      calls.push(command);
      return {
        success: true,
        stdout: [
          JSON.stringify({ Service: "api", Name: "payments-api-1", State: "running", Status: "Up 2 minutes", Health: "healthy", Publishers: [{ PublishedPort: 8080, TargetPort: 80, Protocol: "tcp" }] }),
          JSON.stringify({ Service: "db", Name: "payments-db-1", State: "exited", Status: "Exited (0)" }),
        ].join("\n"),
        stderr: "",
        code: 0,
      };
    },
  });

  const result = await dockerOps.listComposeServices(null, {
    sessionId: "s1",
    projectName: "payments",
    configFile: "/srv/payments/app's compose.yml",
  });

  assert.equal(result.success, true);
  assert.equal(result.services.length, 2);
  assert.deepEqual(result.services[0], {
    name: "api",
    containerName: "payments-api-1",
    state: "running",
    status: "Up 2 minutes",
    health: "healthy",
    publishers: "8080:80/tcp",
  });
  assert.equal(
    calls[0],
    "docker compose -f '/srv/payments/app'\"'\"'s compose.yml' -p 'payments' ps --all --format json",
  );
});

test("composeProjectAction validates inputs and runs explicit project actions", async () => {
  const calls = [];
  const dockerOps = createDockerOpsApi({
    getSession: () => ({}),
    execOnSession: async (_event, _sessionId, command) => {
      calls.push(command);
      return { success: true, stdout: "done\n", stderr: "", code: 0 };
    },
  });

  const invalid = await dockerOps.composeProjectAction(null, {
    sessionId: "s1",
    projectName: "bad project",
    configFile: "/srv/compose.yml",
    action: "up",
  });
  assert.deepEqual(invalid, { success: false, error: "Invalid Compose project name" });

  const result = await dockerOps.composeProjectAction(null, {
    sessionId: "s1",
    projectName: "payments",
    configFile: "/srv/payments/compose.yml",
    action: "restart",
  });
  assert.equal(result.success, true);
  assert.equal(
    calls[0],
    "docker compose -f '/srv/payments/compose.yml' -p 'payments' restart",
  );
});
