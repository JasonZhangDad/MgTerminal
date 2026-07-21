import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildKubernetesInteractiveExecCommand,
  buildKubernetesPortForwardCommand,
} from './kubernetesCommands';

test('buildKubernetesInteractiveExecCommand validates names and builds a TTY command', () => {
  assert.equal(buildKubernetesInteractiveExecCommand({
    namespace: 'default',
    pod: 'bad pod',
  }), null);
  assert.equal(buildKubernetesInteractiveExecCommand({
    namespace: 'payments',
    pod: 'api-1',
    container: 'api',
  }), "kubectl exec -it -n 'payments' 'api-1' -c 'api' -- sh");
});

test('buildKubernetesPortForwardCommand constrains ports and loopback binding', () => {
  assert.equal(buildKubernetesPortForwardCommand({
    namespace: 'default', pod: 'api-1', localPort: 0, remotePort: 80,
  }), null);
  assert.equal(buildKubernetesPortForwardCommand({
    namespace: 'payments', pod: 'api-1', localPort: 8080, remotePort: 80,
  }), "kubectl port-forward -n 'payments' 'api-1' 8080:80 --address 127.0.0.1");
});
