// Connection diagnostics ("Test Connection") — renderer-side types and the
// pure builder that turns a Host (plus resolved credentials) into the probe
// request consumed by the connectionDiagnostics bridge.

import { sanitizeCredentialValue } from "./credentials";
import type { Host, Identity, KnownHost, SSHKey } from "./models";
import { hasUsableProxyConfig, resolveProxyConfigAuth } from "./proxyProfiles";
import { resolveHostAuth } from "./sshAuth";

export const DIAGNOSTIC_STEP_IDS = [
  "dns",
  "tcp",
  "jumpChain",
  "hostKey",
  "auth",
  "sftp",
] as const;

export type DiagnosticStepId = (typeof DIAGNOSTIC_STEP_IDS)[number];

export type DiagnosticStepStatus =
  | "pending"
  | "running"
  | "success"
  | "warning"
  | "failed"
  | "skipped";

export interface DiagnosticStepResult {
  step: DiagnosticStepId;
  status: DiagnosticStepStatus;
  detail?: string;
  detailKind?: string;
  errorKind?: string;
  latencyMs?: number;
  hostKeyStatus?: "trusted" | "trusted-system" | "unknown" | "changed";
  authMethod?: string;
  methodsTried?: string[];
  durationMs?: number;
}

export const diagnosticStepLabelKey = (step: DiagnosticStepId): string =>
  `diagnostics.step.${step}`;

export interface BuildConnectionDiagnosticsRequestInput {
  host: Host;
  keys: SSHKey[];
  identities: Identity[];
  knownHosts?: KnownHost[];
  /** Resolved jump chain hosts, ordered first hop → last hop. */
  chainHosts?: Host[];
}

const resolveIdentityFilePaths = (
  host: Host,
  auth: ReturnType<typeof resolveHostAuth>,
): string[] | undefined => {
  if (auth.authMethod === "password") return undefined;
  const referencePath = auth.key?.source === "reference" ? auth.key.filePath : undefined;
  if (referencePath) return [referencePath];
  // Without an explicitly selected vault key, local identity files may apply.
  if (!auth.keyId) return host.identityFilePaths;
  return undefined;
};

export const buildConnectionDiagnosticsRequest = ({
  host,
  keys,
  identities,
  knownHosts = [],
  chainHosts = [],
}: BuildConnectionDiagnosticsRequestInput): MagiesTerminalSSHOptions => {
  const auth = resolveHostAuth({ host, keys, identities });
  const key = auth.key;

  const jumpHosts = chainHosts.map<MagiesTerminalJumpHost>((jumpHost) => {
    const jumpAuth = resolveHostAuth({ host: jumpHost, keys, identities });
    const jumpKey = jumpAuth.key;
    return {
      hostname: jumpHost.hostname,
      port: jumpHost.port || 22,
      username: jumpAuth.username || "root",
      password: sanitizeCredentialValue(jumpAuth.password),
      privateKey: jumpKey?.source === "reference"
        ? undefined
        : sanitizeCredentialValue(jumpKey?.privateKey),
      certificate: jumpKey?.certificate,
      publicKey: jumpKey?.publicKey,
      keyId: jumpAuth.keyId,
      keySource: jumpKey?.source,
      passphrase: sanitizeCredentialValue(jumpAuth.passphrase || jumpKey?.passphrase),
      label: jumpHost.label,
      proxy: hasUsableProxyConfig(jumpHost.proxyConfig)
        ? resolveProxyConfigAuth(jumpHost.proxyConfig, identities)
        : undefined,
      identityFilePaths: resolveIdentityFilePaths(jumpHost, jumpAuth),
      // Diagnostics is non-interactive: an unanswerable host-key prompt on a
      // hop would hang the probe, so hops accept and the final target's key
      // is classified and reported instead.
      verifyHostKeys: false,
      legacyAlgorithms: jumpHost.legacyAlgorithms,
      skipEcdsaHostKey: jumpHost.skipEcdsaHostKey,
      algorithmOverrides: jumpHost.algorithms,
    };
  });

  return {
    hostname: host.hostname.trim(),
    port: host.port || 22,
    username: auth.username || "root",
    password: sanitizeCredentialValue(auth.password),
    privateKey: key?.source === "reference"
      ? undefined
      : sanitizeCredentialValue(key?.privateKey),
    certificate: key?.certificate,
    publicKey: key?.publicKey,
    keyId: auth.keyId,
    passphrase: sanitizeCredentialValue(auth.passphrase || key?.passphrase),
    identityFilePaths: resolveIdentityFilePaths(host, auth),
    proxy: hasUsableProxyConfig(host.proxyConfig)
      ? resolveProxyConfigAuth(host.proxyConfig, identities)
      : undefined,
    jumpHosts: jumpHosts.length > 0 ? jumpHosts : undefined,
    knownHosts,
    // The diagnostics bridge classifies the target host key itself; hop
    // verification is disabled (see jumpHosts note above).
    verifyHostKeys: false,
    legacyAlgorithms: host.legacyAlgorithms,
    skipEcdsaHostKey: host.skipEcdsaHostKey,
    algorithmOverrides: host.algorithms,
  };
};
