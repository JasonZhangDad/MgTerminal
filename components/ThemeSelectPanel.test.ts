import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const panelSource = readFileSync(new URL('./ThemeSelectPanel.tsx', import.meta.url), 'utf8');
const listSource = readFileSync(new URL('./ThemeList.tsx', import.meta.url), 'utf8');

test('theme select panel uses a single ScrollArea (no nested panel content scroll)', () => {
  assert.match(panelSource, /ScrollArea className="min-h-0 min-w-0 flex-1"/);
  assert.doesNotMatch(panelSource, /<AsidePanelContent/);
});

test('theme select panel localizes its title', () => {
  assert.match(panelSource, /title=\{t\('settings\.terminal\.themeModal\.title'\)\}/);
  assert.doesNotMatch(panelSource, /title="Select Color Theme"/);
});

test('theme list provides sticky search and empty state', () => {
  assert.match(listSource, /settings\.terminal\.themeModal\.search\.placeholder/);
  assert.match(listSource, /settings\.terminal\.themeModal\.search\.empty/);
  assert.match(listSource, /sticky top-0/);
  assert.match(listSource, /filterThemesForList/);
});
