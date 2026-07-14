import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  filterUiThemesForPicker,
  isCoreUiTheme,
  resolveUiThemePickerScopeForSelection,
  type UiThemePickerTheme,
} from './uiThemePickerUtils';

const makeTheme = (
  id: string,
  name: string,
  collection?: 'core',
): UiThemePickerTheme => ({
  id,
  name,
  collection,
  tokens: {
    background: '0 0% 100%',
    foreground: '0 0% 10%',
    card: '0 0% 100%',
    cardForeground: '0 0% 10%',
    popover: '0 0% 100%',
    popoverForeground: '0 0% 10%',
    primary: '210 90% 50%',
    primaryForeground: '0 0% 100%',
    secondary: '0 0% 95%',
    secondaryForeground: '0 0% 10%',
    muted: '0 0% 95%',
    mutedForeground: '0 0% 40%',
    accent: '210 90% 50%',
    accentForeground: '0 0% 100%',
    destructive: '0 70% 50%',
    destructiveForeground: '0 0% 100%',
    border: '0 0% 90%',
    input: '0 0% 90%',
    ring: '210 90% 50%',
  },
});

const themes = [
  makeTheme('snow', 'Snow', 'core'),
  makeTheme('midnight', 'Midnight', 'core'),
  makeTheme('catppuccin', 'Catppuccin'),
  makeTheme('tokyo-night', 'Tokyo Night'),
];

describe('uiThemePickerUtils', () => {
  it('detects core themes via collection', () => {
    assert.equal(isCoreUiTheme(themes[0]), true);
    assert.equal(isCoreUiTheme(themes[2]), false);
  });

  it('filters to core scope only', () => {
    const filtered = filterUiThemesForPicker(themes, 'core', '');
    assert.deepEqual(filtered.map((theme) => theme.id), ['snow', 'midnight']);
  });

  it('returns all themes in all scope', () => {
    const filtered = filterUiThemesForPicker(themes, 'all', '');
    assert.equal(filtered.length, 4);
  });

  it('searches by name and id case-insensitively', () => {
    assert.deepEqual(
      filterUiThemesForPicker(themes, 'all', 'tokyo').map((theme) => theme.id),
      ['tokyo-night'],
    );
    assert.deepEqual(
      filterUiThemesForPicker(themes, 'all', 'SNOW').map((theme) => theme.id),
      ['snow'],
    );
  });

  it('combines scope and search', () => {
    assert.deepEqual(
      filterUiThemesForPicker(themes, 'core', 'cat').map((theme) => theme.id),
      [],
    );
    assert.deepEqual(
      filterUiThemesForPicker(themes, 'core', 'mid').map((theme) => theme.id),
      ['midnight'],
    );
  });

  it('defaults picker scope from selected theme', () => {
    assert.equal(resolveUiThemePickerScopeForSelection(themes, 'snow'), 'core');
    assert.equal(resolveUiThemePickerScopeForSelection(themes, 'catppuccin'), 'all');
    assert.equal(resolveUiThemePickerScopeForSelection(themes, 'missing'), 'all');
  });
});
