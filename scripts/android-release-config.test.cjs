const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const rootDir = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

test('Android release metadata matches the root package version', () => {
  const { version } = JSON.parse(read('package.json'));
  const [, major, minor, patch] = version.match(/^(\d+)\.(\d+)\.(\d+)$/) || [];
  assert.ok(major, `Expected a stable semantic version, received ${version}`);

  const appGradle = read('mobile/android/app/build.gradle');
  assert.match(appGradle, new RegExp(`versionName ["']${version.replaceAll('.', '\\.')}["']`));
  assert.match(appGradle, new RegExp(`versionCode ${Number(major) * 1_000_000 + Number(minor) * 1_000 + Number(patch)}\\b`));
});

test('Android workflow installs the compile SDK used by the app', () => {
  const variablesGradle = read('mobile/android/variables.gradle');
  const compileSdk = variablesGradle.match(/compileSdkVersion\s*=\s*(\d+)/)?.[1];
  assert.ok(compileSdk, 'Expected compileSdkVersion in variables.gradle');

  const workflow = read('.github/workflows/build-android.yml');
  assert.match(workflow, new RegExp(`platforms;android-${compileSdk}\\b`));
  assert.match(workflow, new RegExp(`build-tools;${compileSdk}\\.0\\.0\\b`));
});
