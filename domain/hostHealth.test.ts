import test from "node:test";
import assert from "node:assert/strict";

import {
  buildHostHealthRequests,
  isHealthCheckableHost,
  isUnhealthyStatus,
} from "./hostHealth";
import type { Host } from "./models";

const host = (overrides: Partial<Host>): Host => ({
  id: "h1",
  label: "web",
  hostname: "example.com",
  username: "root",
  tags: [],
  os: "linux",
  protocol: "ssh",
  ...overrides,
} as Host);

test("isUnhealthyStatus: only healthy is healthy", () => {
  assert.equal(isUnhealthyStatus("healthy"), false);
  assert.equal(isUnhealthyStatus("degraded"), true);
  assert.equal(isUnhealthyStatus("auth-failed"), true);
  assert.equal(isUnhealthyStatus("unreachable"), true);
});

test("isHealthCheckableHost: ssh only, hostname required", () => {
  assert.equal(isHealthCheckableHost(host({})), true);
  assert.equal(isHealthCheckableHost(host({ protocol: undefined })), true);
  assert.equal(isHealthCheckableHost(host({ protocol: "telnet" })), false);
  assert.equal(isHealthCheckableHost(host({ protocol: "serial" })), false);
  assert.equal(isHealthCheckableHost(host({ hostname: "  " })), false);
});

test("buildHostHealthRequests filters non-ssh hosts and resolves chains", () => {
  const bastion = host({ id: "b1", hostname: "bastion.example.com" });
  const requests = buildHostHealthRequests({
    hosts: [
      host({ id: "h1" }),
      host({ id: "h2", protocol: "telnet" }),
      host({ id: "h3", hostChain: { hostIds: ["b1"] } }),
    ],
    keys: [],
    identities: [],
    allHosts: [bastion],
  });
  assert.deepEqual(requests.map((r) => r.hostId), ["h1", "h3"]);
  assert.equal(requests[1].options.jumpHosts?.length, 1);
  assert.equal(requests[1].options.jumpHosts?.[0].hostname, "bastion.example.com");
});
