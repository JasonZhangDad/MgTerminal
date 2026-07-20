import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuickHost } from './hosts.ts';

test('parseQuickHost accepts user@host:port', () => {
  assert.deepEqual(parseQuickHost('root@192.168.1.10:2222'), {
    label: '192.168.1.10',
    hostname: '192.168.1.10',
    port: 2222,
    username: 'root',
  });
});

test('parseQuickHost accepts label prefix', () => {
  assert.deepEqual(parseQuickHost('prod deploy@10.0.0.5'), {
    label: 'prod',
    hostname: '10.0.0.5',
    port: 22,
    username: 'deploy',
  });
});

test('parseQuickHost rejects empty', () => {
  assert.equal(parseQuickHost('  '), null);
});
