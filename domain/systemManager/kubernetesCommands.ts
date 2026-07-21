function isKubernetesName(value: string | undefined): value is string {
  return Boolean(value && /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?$/.test(value));
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

export function buildKubernetesInteractiveExecCommand(options: {
  namespace: string;
  pod: string;
  container?: string;
}): string | null {
  if (!isKubernetesName(options.namespace) || !isKubernetesName(options.pod)) return null;
  if (options.container && !isKubernetesName(options.container)) return null;
  const container = options.container ? ` -c ${shellQuote(options.container)}` : '';
  return `kubectl exec -it -n ${shellQuote(options.namespace)} ${shellQuote(options.pod)}${container} -- sh`;
}

export function buildKubernetesPortForwardCommand(options: {
  namespace: string;
  pod: string;
  localPort: number;
  remotePort: number;
}): string | null {
  if (!isKubernetesName(options.namespace) || !isKubernetesName(options.pod)) return null;
  const { localPort, remotePort } = options;
  if (![localPort, remotePort].every((port) => Number.isInteger(port) && port >= 1 && port <= 65535)) {
    return null;
  }
  return `kubectl port-forward -n ${shellQuote(options.namespace)} ${shellQuote(options.pod)} ${localPort}:${remotePort} --address 127.0.0.1`;
}
