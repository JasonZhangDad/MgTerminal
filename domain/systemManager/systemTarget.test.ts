import assert from "node:assert/strict";
import test from "node:test";

import { buildSystemManagerTabs, shouldCollectServerStats } from "./systemTarget.ts";

test("system manager shows overview before detailed management tabs", () => {
  assert.deepEqual(buildSystemManagerTabs(null, undefined, null), ["overview", "processes"]);
});

test("system manager shows kubernetes when kubectl is detected", () => {
  assert.deepEqual(
    buildSystemManagerTabs(
      {
        id: "host-1",
        label: "Linux",
        hostname: "linux.local",
        username: "root",
        tags: [],
        os: "linux",
      },
      {
        targetOs: "linux",
        hasTmux: false,
        hasDocker: false,
        hasKubectl: true,
        probedAt: Date.now(),
      },
      null,
    ),
    ["overview", "processes", "tmux", "docker", "kubernetes"],
  );
});

test("system manager hides kubernetes when probe reports no kubectl", () => {
  const tabs = buildSystemManagerTabs(
    {
      id: "host-1",
      label: "Linux",
      hostname: "linux.local",
      username: "root",
      tags: [],
      os: "linux",
    },
    {
      targetOs: "linux",
      hasTmux: false,
      hasDocker: false,
      hasKubectl: false,
      probedAt: Date.now(),
    },
    null,
  );
  assert.equal(tabs.includes("kubernetes"), false);
});

test("system overview stats skip network devices even when a Linux icon was selected", () => {
  assert.equal(
    shouldCollectServerStats(
      {
        id: "host-1",
        label: "Router",
        hostname: "router.local",
        username: "admin",
        tags: [],
        os: "linux",
        deviceType: "network",
      },
      undefined,
      null,
    ),
    false,
  );
});

test("system overview stats run for Linux and macOS targets", () => {
  assert.equal(
    shouldCollectServerStats(
      {
        id: "host-1",
        label: "Linux",
        hostname: "linux.local",
        username: "root",
        tags: [],
        os: "linux",
      },
      undefined,
      null,
    ),
    true,
  );
  assert.equal(
    shouldCollectServerStats(
      {
        id: "host-2",
        label: "Mac",
        hostname: "mac.local",
        username: "root",
        tags: [],
        os: "macos",
      },
      undefined,
      null,
    ),
    true,
  );
});
