import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAsciinemaCastHeader,
  formatAsciinemaCastEventLine,
  formatAsciinemaCastHeaderLine,
  relativeCastTimeSeconds,
} from './sessionCast.ts';

test('buildAsciinemaCastHeader defaults size and sets version 2', () => {
  const header = buildAsciinemaCastHeader({ title: 'demo' });
  assert.equal(header.version, 2);
  assert.equal(header.width, 80);
  assert.equal(header.height, 24);
  assert.equal(header.title, 'demo');
  assert.equal(header.env?.TERM, 'xterm-256color');
});

test('formatAsciinemaCastHeaderLine is a single JSON line', () => {
  const line = formatAsciinemaCastHeaderLine(buildAsciinemaCastHeader({ width: 120, height: 40 }));
  assert.match(line, /^\{"/);
  assert.ok(line.endsWith('\n'));
  const parsed = JSON.parse(line.trim());
  assert.equal(parsed.width, 120);
  assert.equal(parsed.height, 40);
});

test('formatAsciinemaCastEventLine encodes timed output events', () => {
  const line = formatAsciinemaCastEventLine(1.5, 'o', 'hello\r\n');
  const parsed = JSON.parse(line.trim());
  assert.deepEqual(parsed, [1.5, 'o', 'hello\r\n']);
});

test('relativeCastTimeSeconds never goes negative', () => {
  assert.equal(relativeCastTimeSeconds(1000, 500), 0);
  assert.equal(relativeCastTimeSeconds(1000, 2500), 1.5);
});
