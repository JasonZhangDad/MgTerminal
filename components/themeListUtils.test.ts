import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  filterThemesForList,
  matchesThemeListQuery,
  partitionThemesByType,
  type ThemeListEntry,
} from './themeListUtils';

const themes: ThemeListEntry[] = [
  { id: 'dracula', name: 'Dracula', type: 'dark' },
  { id: 'github-dark', name: 'GitHub Dark', type: 'dark' },
  { id: 'github-light', name: 'GitHub Light', type: 'light' },
  { id: 'solarized-light', name: 'Solarized Light', type: 'light' },
];

describe('themeListUtils', () => {
  it('matches empty query against every theme', () => {
    assert.equal(matchesThemeListQuery(themes[0], ''), true);
    assert.equal(matchesThemeListQuery(themes[0], '   '), true);
  });

  it('matches name and id case-insensitively', () => {
    assert.equal(matchesThemeListQuery(themes[0], 'DRAC'), true);
    assert.equal(matchesThemeListQuery(themes[1], 'github-dark'), true);
    assert.equal(matchesThemeListQuery(themes[2], 'light'), true);
    assert.equal(matchesThemeListQuery(themes[0], 'nope'), false);
  });

  it('filters the list by query', () => {
    assert.deepEqual(
      filterThemesForList(themes, 'github').map((theme) => theme.id),
      ['github-dark', 'github-light'],
    );
    assert.deepEqual(
      filterThemesForList(themes, '').map((theme) => theme.id),
      themes.map((theme) => theme.id),
    );
  });

  it('partitions themes by type', () => {
    const { darkThemes, lightThemes } = partitionThemesByType(themes);
    assert.deepEqual(darkThemes.map((theme) => theme.id), ['dracula', 'github-dark']);
    assert.deepEqual(lightThemes.map((theme) => theme.id), ['github-light', 'solarized-light']);
  });
});
