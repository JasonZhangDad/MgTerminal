import assert from 'node:assert/strict';
import test from 'node:test';

import { checkForUpdates, getReleasesUrl } from './updateService';

test('checks the official server manifest instead of GitHub', async (t) => {
  let requestedUrl = '';
  t.mock.method(globalThis, 'fetch', async (input) => {
    requestedUrl = String(input);
    return new Response(JSON.stringify({
      tag: 'v0.2.7',
      version: '0.2.7',
      assets: [{ name: 'MagiesTerminal-0.2.7-mac-arm64.dmg', size: 42 }],
    }), { status: 200 });
  });

  const result = await checkForUpdates('0.2.6');

  assert.equal(requestedUrl, 'https://shell.magies.top/releases/latest.json');
  assert.equal(result.hasUpdate, true);
  assert.equal(result.latestRelease?.version, '0.2.7');
  assert.equal(
    result.latestRelease?.assets[0]?.browserDownloadUrl,
    'https://shell.magies.top/releases/latest/MagiesTerminal-0.2.7-mac-arm64.dmg',
  );
});

test('manual update links use the official download page', () => {
  assert.equal(getReleasesUrl(), 'https://shell.magies.top/#download');
  assert.equal(getReleasesUrl('0.2.7'), 'https://shell.magies.top/#download');
});
