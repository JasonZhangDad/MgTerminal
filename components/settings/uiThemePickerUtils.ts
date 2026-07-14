import type { UiThemePreset } from '../../infrastructure/config/uiThemes';

export type UiThemePickerScope = 'core' | 'all';

export type UiThemePickerTheme = Pick<UiThemePreset, 'id' | 'name' | 'tokens'> & {
  collection?: UiThemePreset['collection'];
};

export const isCoreUiTheme = (theme: UiThemePickerTheme): boolean =>
  theme.collection === 'core';

export const filterUiThemesForPicker = (
  themes: readonly UiThemePickerTheme[],
  scope: UiThemePickerScope,
  query: string,
): UiThemePickerTheme[] => {
  const normalizedQuery = query.trim().toLowerCase();
  const scoped = scope === 'core' ? themes.filter(isCoreUiTheme) : [...themes];

  if (!normalizedQuery) return scoped;

  return scoped.filter((theme) => {
    const haystack = `${theme.name} ${theme.id}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });
};

/** Prefer core scope when the selected id is a core theme; otherwise show all. */
export const resolveUiThemePickerScopeForSelection = (
  themes: readonly UiThemePickerTheme[],
  selectedId: string,
): UiThemePickerScope => {
  const selected = themes.find((theme) => theme.id === selectedId);
  if (selected && isCoreUiTheme(selected)) return 'core';
  return 'all';
};
