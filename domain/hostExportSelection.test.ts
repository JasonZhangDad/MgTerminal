import test from "node:test";
import assert from "node:assert/strict";

import type { Host } from "./models";
import { selectHostsForExport } from "./host.ts";

const host = (id: string): Host => ({
  id,
  label: id,
  hostname: `${id}.example.com`,
  tags: [],
} as unknown as Host);

const hosts = [host("a"), host("b"), host("c")];

test("no selection exports every host", () => {
  assert.deepEqual(selectHostsForExport(hosts, new Set()), hosts);
});

test("a selection exports only the selected hosts, preserving vault order", () => {
  assert.deepEqual(
    selectHostsForExport(hosts, new Set(["c", "a"])).map((h) => h.id),
    ["a", "c"],
  );
});

test("selection ids that no longer exist are ignored", () => {
  assert.deepEqual(
    selectHostsForExport(hosts, new Set(["b", "ghost"])).map((h) => h.id),
    ["b"],
  );
});
