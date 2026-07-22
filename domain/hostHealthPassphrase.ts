/**
 * Filling in passphrases the user already unlocked interactively.
 *
 * A passphrase typed during a normal connect is remembered per key path
 * (application/defaultKeyPassphrases). The health check never consulted that
 * store, so a key that works in the terminal was skipped here — the probe
 * cannot prompt, so it fell back to the agent and reported a plain auth
 * failure.
 *
 * Kept split in two so the domain stays pure: the caller does the async
 * lookups, these decide what to look up and what to do with the answers.
 */

import type { HostHealthRequest } from "./hostHealth";

const identityPathsOf = (request: HostHealthRequest): string[] =>
  (request.options as { identityFilePaths?: string[] }).identityFilePaths ?? [];

const passphraseOf = (request: HostHealthRequest): string | undefined =>
  (request.options as { passphrase?: string }).passphrase;

/** Key paths worth a lookup: referenced by a request that has no passphrase. */
export function collectMissingPassphrasePaths(
  requests: HostHealthRequest[],
): string[] {
  const paths = new Set<string>();
  for (const request of requests) {
    if (passphraseOf(request)) continue;
    for (const path of identityPathsOf(request)) {
      if (path) paths.add(path);
    }
  }
  return [...paths];
}

/**
 * Attach resolved passphrases. An existing one is never overwritten — it came
 * from the vault and is the more deliberate choice.
 */
export function applyResolvedPassphrases(
  requests: HostHealthRequest[],
  resolved: ReadonlyMap<string, string>,
): HostHealthRequest[] {
  if (resolved.size === 0) return requests;
  return requests.map((request) => {
    if (passphraseOf(request)) return request;
    const match = identityPathsOf(request)
      .map((path) => resolved.get(path))
      .find((value): value is string => Boolean(value));
    if (!match) return request;
    return { ...request, options: { ...request.options, passphrase: match } };
  });
}
