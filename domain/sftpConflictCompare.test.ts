import assert from 'node:assert/strict';
import test from 'node:test';
import { compareSftpConflictMeta } from './sftpConflictCompare.ts';

test('compareSftpConflictMeta detects newer sides by mtime', () => {
  const result = compareSftpConflictMeta({
    isDirectory: false,
    existingSize: 100,
    newSize: 100,
    existingModified: 2000,
    newModified: 1000,
  });
  assert.equal(result.newer, 'existing');
  assert.equal(result.sizeDelta, 0);
  assert.equal(result.partialOverlapHint, false);
});

test('compareSftpConflictMeta flags partial size overlap for resume UX', () => {
  const result = compareSftpConflictMeta({
    isDirectory: false,
    existingSize: 50,
    newSize: 200,
    existingModified: 1000,
    newModified: 2000,
  });
  assert.equal(result.partialOverlapHint, true);
  assert.equal(result.newer, 'incoming');
  assert.equal(result.sizeDelta, 150);
});

test('compareSftpConflictMeta does not suggest partial overlap for directories', () => {
  const result = compareSftpConflictMeta({
    isDirectory: true,
    existingSize: 0,
    newSize: 0,
    existingModified: 1,
    newModified: 2,
  });
  assert.equal(result.partialOverlapHint, false);
});
