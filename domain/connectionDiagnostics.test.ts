import test from "node:test";
import assert from "node:assert/strict";

import {
  buildConnectionDiagnosticsRequest,
  DIAGNOSTIC_STEP_IDS,
  diagnosticStepLabelKey,
} from "./connectionDiagnostics";
import type { Host, SSHKey } from "./models";

const baseHost = (overrides: Partial<Host> = {}): Host => ({
  id: "h1",
  label: "web-1",
  hostname: "example.com",
  port: 22,
  username: "deploy",
  tags: [],
  os: "linux",
  protocol: "ssh",
  authMethod: "password",
  password: "secret",
  ...overrides,
} as Host);

test("step ids stay aligned with the bridge order", () => {
  assert.deepEqual(DIAGNOSTIC_STEP_IDS, [
    "dns",
    "tcp",
    "jumpChain",
    "hostKey",
    "auth",
    "sftp",
  ]);
});

test("diagnosticStepLabelKey maps to i18n namespace", () => {
  assert.equal(diagnosticStepLabelKey("dns"), "diagnostics.step.dns");
  assert.equal(diagnosticStepLabelKey("hostKey"), "diagnostics.step.hostKey");
});

test("password host maps to request with password and no key material", () => {
  const request = buildConnectionDiagnosticsRequest({
    host: baseHost(),
    keys: [],
    identities: [],
  });
  assert.equal(request.hostname, "example.com");
  assert.equal(request.username, "deploy");
  assert.equal(request.password, "secret");
  assert.equal(request.privateKey, undefined);
  assert.equal(request.verifyHostKeys, false);
  assert.equal(request.jumpHosts, undefined);
});

test("inline key host maps privateKey and passphrase", () => {
  const key: SSHKey = {
    id: "k1",
    label: "deploy-key",
    type: "ED25519",
    privateKey: "-----BEGIN OPENSSH PRIVATE KEY-----\nabc",
    passphrase: "pp",
    source: "imported",
    category: "key",
    created: 0,
  };
  const request = buildConnectionDiagnosticsRequest({
    host: baseHost({ authMethod: "key", identityFileId: "k1", password: undefined }),
    keys: [key],
    identities: [],
  });
  assert.match(request.privateKey || "", /BEGIN OPENSSH/);
  assert.equal(request.passphrase, "pp");
});

test("reference key host maps to identityFilePaths, not inline key", () => {
  const key: SSHKey = {
    id: "k1",
    label: "ref-key",
    type: "ED25519",
    privateKey: "unused",
    category: "key",
    created: 0,
    source: "reference",
    filePath: "~/.ssh/id_ed25519",
  };
  const request = buildConnectionDiagnosticsRequest({
    host: baseHost({ authMethod: "key", identityFileId: "k1", password: undefined }),
    keys: [key],
    identities: [],
  });
  assert.equal(request.privateKey, undefined);
  assert.deepEqual(request.identityFilePaths, ["~/.ssh/id_ed25519"]);
});

test("chain hosts map to jumpHosts with host key prompts disabled", () => {
  const bastion = baseHost({
    id: "b1",
    hostname: "bastion.example.com",
    username: "jump",
    password: "bpw",
  });
  const request = buildConnectionDiagnosticsRequest({
    host: baseHost({ hostChain: { hostIds: ["b1"] } }),
    keys: [],
    identities: [],
    chainHosts: [bastion],
  });
  assert.equal(request.jumpHosts?.length, 1);
  assert.equal(request.jumpHosts?.[0].hostname, "bastion.example.com");
  assert.equal(request.jumpHosts?.[0].username, "jump");
  assert.equal(request.jumpHosts?.[0].verifyHostKeys, false);
});

test("known hosts are forwarded for host key classification", () => {
  const request = buildConnectionDiagnosticsRequest({
    host: baseHost(),
    keys: [],
    identities: [],
    knownHosts: [
      {
        id: "kh1",
        hostname: "example.com",
        port: 22,
        keyType: "ssh-ed25519",
        publicKey: "ssh-ed25519 AAAA",
        discoveredAt: 0,
      },
    ],
  });
  assert.equal(request.knownHosts?.length, 1);
});
