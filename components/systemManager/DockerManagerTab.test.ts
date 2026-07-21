import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('Docker manager exposes Compose as a peer sub-tab without replacing existing panels', () => {
  const source = readFileSync(new URL('./DockerManagerTab.tsx', import.meta.url), 'utf8');

  assert.match(source, /type DockerSubTab = 'containers' \| 'images' \| 'compose'/);
  assert.match(source, /import \{ DockerComposePanel \} from '\.\/DockerComposePanel'/);
  assert.match(source, /id: 'compose'/);
  assert.match(source, /<DockerContainersPanel/);
  assert.match(source, /<DockerImagesPanel/);
  assert.match(source, /<DockerComposePanel/);
});
