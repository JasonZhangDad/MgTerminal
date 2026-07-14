export type ThemeListEntry = {
  id: string;
  name: string;
  type: 'dark' | 'light';
};

export const matchesThemeListQuery = (
  theme: Pick<ThemeListEntry, 'id' | 'name'>,
  query: string,
): boolean => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  const haystack = `${theme.name} ${theme.id}`.toLowerCase();
  return haystack.includes(normalizedQuery);
};

export const filterThemesForList = <T extends ThemeListEntry>(
  themes: readonly T[],
  query: string,
): T[] => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [...themes];
  return themes.filter((theme) => matchesThemeListQuery(theme, normalizedQuery));
};

export const partitionThemesByType = <T extends ThemeListEntry>(
  themes: readonly T[],
): { darkThemes: T[]; lightThemes: T[] } => ({
  darkThemes: themes.filter((theme) => theme.type === 'dark'),
  lightThemes: themes.filter((theme) => theme.type === 'light'),
});
