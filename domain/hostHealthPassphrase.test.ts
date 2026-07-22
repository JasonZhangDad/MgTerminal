import assert from "node:assert/strict";
import test from "node:test";
import { collectMissingPassphrasePaths, applyResolvedPassphrases } from "./hostHealthPassphrase";
import type { HostHealthRequest } from "./hostHealth";

const req = (hostId: string, over: Record<string, unknown> = {}): HostHealthRequest =>
  ({ hostId, options: { hostname: "h", port: 22, username: "root", ...over } } as HostHealthRequest);

test("collectMissingPassphrasePaths finds identity files with no passphrase", () => {
  const requests = [
    req("a", { identityFilePaths: ["~/.ssh/id_ed25519"] }),
    req("b", { identityFilePaths: ["~/.ssh/id_rsa"], passphrase: "already" }),
    req("c", {}),
  ];
  // Only "a" needs a lookup: "b" already carries one and "c" has no key file.
  assert.deepEqual(collectMissingPassphrasePaths(requests), ["~/.ssh/id_ed25519"]);
});

test("collectMissingPassphrasePaths dedupes a shared key across hosts", () => {
  const shared = ["~/.ssh/id_ed25519"];
  assert.deepEqual(
    collectMissingPassphrasePaths([req("a", { identityFilePaths: shared }), req("b", { identityFilePaths: shared })]),
    ["~/.ssh/id_ed25519"],
    "one lookup, not one per host",
  );
});

test("applyResolvedPassphrases fills only the requests that lacked one", () => {
  const requests = [
    req("a", { identityFilePaths: ["~/.ssh/k1"] }),
    req("b", { identityFilePaths: ["~/.ssh/k1"], passphrase: "kept" }),
    req("c", { identityFilePaths: ["~/.ssh/unknown"] }),
  ];
  const out = applyResolvedPassphrases(requests, new Map([["~/.ssh/k1", "secret"]]));

  assert.equal(out[0]?.options.passphrase, "secret");
  assert.equal(out[1]?.options.passphrase, "kept", "an existing passphrase is never overwritten");
  assert.equal(out[2]?.options.passphrase, undefined, "no stored passphrase means no change");
});

test("applyResolvedPassphrases does not mutate the input", () => {
  const requests = [req("a", { identityFilePaths: ["~/.ssh/k1"] })];
  applyResolvedPassphrases(requests, new Map([["~/.ssh/k1", "secret"]]));
  assert.equal(requests[0]?.options.passphrase, undefined);
});

test("applyResolvedPassphrases is a no-op with nothing resolved", () => {
  const requests = [req("a", { identityFilePaths: ["~/.ssh/k1"] })];
  assert.deepEqual(applyResolvedPassphrases(requests, new Map()), requests);
});
