import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('Kubernetes manager keeps existing resources and adds events, rollout, exec, and port forward', () => {
  const source = readFileSync(new URL('./KubernetesManagerTab.tsx', import.meta.url), 'utf8');

  assert.match(source, /type ResourceKind = 'pods' \| 'deployments' \| 'events'/);
  assert.match(source, /backend\.listKubernetesEvents/);
  assert.match(source, /backend\.getKubernetesDeploymentRolloutStatus/);
  assert.match(source, /backend\.getKubernetesDeploymentRolloutHistory/);
  assert.match(source, /backend\.restartKubernetesDeploymentRollout/);
  assert.match(source, /buildKubernetesInteractiveExecCommand/);
  assert.match(source, /buildKubernetesPortForwardCommand/);
  assert.match(source, /openInteractiveTerminal/);
  assert.match(source, /<SystemPanelPromptDialog/);
});

test('interactive Kubernetes launch actions surface popup failures', () => {
  const source = readFileSync(new URL('./KubernetesManagerTab.tsx', import.meta.url), 'utf8');

  for (const callbackName of ['openPodExec', 'openPodPortForward']) {
    const start = source.indexOf(`const ${callbackName} = useCallback`);
    const end = source.indexOf('\n  }, [', start);
    assert.notEqual(start, -1, `${callbackName} callback must exist`);
    assert.notEqual(end, -1, `${callbackName} callback must have a dependency list`);
    assert.match(source.slice(start, end), /catch \(error\)/, `${callbackName} must handle rejected popup requests`);
  }
});
