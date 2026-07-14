/**
 * Shared theme list component used by both ThemeSelectPanel and ThemeSelectModal
 */
import React, { memo, useMemo, useState } from 'react';
import { Check, Search, Wand2 } from 'lucide-react';
import { useI18n } from '../application/i18n/I18nProvider';
import { TERMINAL_THEMES, USER_VISIBLE_TERMINAL_THEMES, isUiMatchTerminalThemeId } from '../infrastructure/config/terminalThemes';
import { TERMINAL_THEME_AUTO } from '../domain/terminalAppearance';
import { useCustomThemes } from '../application/state/customThemeStore';
import { cn } from '../lib/utils';
import { TerminalTheme } from '../types';
import { filterThemesForList, partitionThemesByType } from './themeListUtils';

// Memoized theme item component
const ThemeItem = memo(({
    theme,
    isSelected,
    onSelect
}: {
    theme: TerminalTheme;
    isSelected: boolean;
    onSelect: (id: string) => void;
}) => (
    <button
        type="button"
        onPointerDown={(event) => {
            if (event.button !== 0) return;
            // Prevent the follow-up click; overlay scrollbars in Electron often swallow clicks.
            event.preventDefault();
            onSelect(theme.id);
        }}
        onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(theme.id);
            }
        }}
        aria-pressed={isSelected}
        className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-md transition-all duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
            isSelected
                ? 'bg-primary/10 ring-1 ring-primary/35'
                : 'hover:bg-muted',
        )}
    >
        {/* Color swatch preview */}
        <div
            className="w-12 h-8 rounded-md flex-shrink-0 flex flex-col justify-center items-start pl-1.5 gap-0.5 border border-border/50 shadow-sm"
            style={{ backgroundColor: theme.colors.background }}
            aria-hidden
        >
            <div className="h-1 w-4 rounded-full" style={{ backgroundColor: theme.colors.green }} />
            <div className="h-1 w-6 rounded-full" style={{ backgroundColor: theme.colors.blue }} />
            <div className="flex items-center gap-0.5">
                <div className="h-1 w-2.5 rounded-full" style={{ backgroundColor: theme.colors.yellow }} />
                <div className="h-1 w-2 rounded-full" style={{ backgroundColor: theme.colors.red }} />
                <div className="h-1 w-1.5 rounded-full" style={{ backgroundColor: theme.colors.cyan }} />
            </div>
        </div>
        <div className="flex-1 min-w-0">
            <div className={cn('text-sm font-medium truncate', isSelected ? 'text-primary' : 'text-foreground')}>
                {theme.name}
            </div>
            <div className="text-[10px] text-muted-foreground capitalize">{theme.type}</div>
        </div>
        {isSelected && (
            <Check size={16} className="text-primary flex-shrink-0" />
        )}
    </button>
));
ThemeItem.displayName = 'ThemeItem';

interface ThemeListProps {
    selectedThemeId: string;
    onSelect: (themeId: string) => void;
    /** Restrict the list to a single type; omit to show both sections. */
    filterType?: 'dark' | 'light';
    /** Render an "Auto (match app theme)" entry at the top. */
    showAutoOption?: boolean;
}

export const ThemeList: React.FC<ThemeListProps> = ({ selectedThemeId, onSelect, filterType, showAutoOption }) => {
    const { t } = useI18n();
    const customThemes = useCustomThemes();
    const [query, setQuery] = useState('');

    const deletedSelectedTheme = useMemo(
        () => (selectedThemeId
            && selectedThemeId !== TERMINAL_THEME_AUTO
            && !isUiMatchTerminalThemeId(selectedThemeId)
            && !TERMINAL_THEMES.some((theme) => theme.id === selectedThemeId)
            && !customThemes.some((theme) => theme.id === selectedThemeId)
            ? selectedThemeId
            : null),
        [customThemes, selectedThemeId],
    );
    const hiddenSelectedTheme = useMemo(
        () => (isUiMatchTerminalThemeId(selectedThemeId)
            ? TERMINAL_THEMES.find(theme => theme.id === selectedThemeId) || null
            : null),
        [selectedThemeId],
    );

    const { darkThemes, lightThemes } = useMemo(
        () => partitionThemesByType(USER_VISIBLE_TERMINAL_THEMES),
        [],
    );

    const filteredDarkThemes = useMemo(
        () => filterThemesForList(darkThemes, query),
        [darkThemes, query],
    );
    const filteredLightThemes = useMemo(
        () => filterThemesForList(lightThemes, query),
        [lightThemes, query],
    );

    const visibleCustomThemes = useMemo(() => {
        const typed = filterType
            ? customThemes.filter(theme => theme.type === filterType)
            : customThemes;
        return filterThemesForList(typed, query);
    }, [customThemes, filterType, query]);

    const showDarkSection = (!filterType || filterType === 'dark') && filteredDarkThemes.length > 0;
    const showLightSection = (!filterType || filterType === 'light') && filteredLightThemes.length > 0;
    const showCustomSection = visibleCustomThemes.length > 0;
    const hasVisibleThemes = showDarkSection || showLightSection || showCustomSection;
    const isAutoSelected = selectedThemeId === TERMINAL_THEME_AUTO;
    const normalizedQuery = query.trim();
    const autoLabel = t('settings.terminal.theme.auto');
    const autoDesc = t('settings.terminal.theme.autoDesc');
    const showAutoEntry = Boolean(
        showAutoOption
        && (
            !normalizedQuery
            || `${autoLabel} ${autoDesc} auto`.toLowerCase().includes(normalizedQuery.toLowerCase())
        ),
    );

    const sectionLabel = (baseKey: string, count: number) => {
        const label = t(baseKey);
        return normalizedQuery ? `${label} (${count})` : label;
    };

    return (
        <>
            <div className="sticky top-0 z-10 mb-3 bg-background/95 px-1 pb-1 pt-0.5 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                <div className="relative">
                    <Search
                        size={14}
                        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={t('settings.terminal.themeModal.search.placeholder')}
                        aria-label={t('settings.terminal.themeModal.search.placeholder')}
                        className={cn(
                            'h-9 w-full rounded-md border border-input bg-background py-1 pl-8 pr-3 text-sm shadow-sm',
                            'placeholder:text-muted-foreground',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        )}
                    />
                </div>
            </div>

            {showAutoEntry && (
                <button
                    type="button"
                    onPointerDown={(event) => {
                        if (event.button !== 0) return;
                        event.preventDefault();
                        onSelect(TERMINAL_THEME_AUTO);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onSelect(TERMINAL_THEME_AUTO);
                        }
                    }}
                    aria-pressed={isAutoSelected}
                    className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 mb-3 rounded-md text-left transition-all duration-150',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
                        isAutoSelected ? 'bg-primary/10 ring-1 ring-primary/35' : 'hover:bg-muted',
                    )}
                >
                    <div className="w-12 h-8 rounded-md flex-shrink-0 flex items-center justify-center border border-border/50 bg-gradient-to-br from-muted to-background shadow-sm">
                        <Wand2 size={14} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className={cn('text-sm font-medium truncate', isAutoSelected ? 'text-primary' : 'text-foreground')}>
                            {autoLabel}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{autoDesc}</div>
                    </div>
                    {isAutoSelected && <Check size={16} className="text-primary flex-shrink-0" />}
                </button>
            )}
            {hiddenSelectedTheme && (
                <div className="mb-4 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">
                        {t('terminal.hiddenTheme.title')}
                    </div>
                    <div className="text-sm font-medium text-foreground">{hiddenSelectedTheme.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                        {t('terminal.hiddenTheme.desc')}
                    </div>
                </div>
            )}
            {deletedSelectedTheme && (
                <div className="mb-4 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">
                        {t('settings.terminal.themeModal.missingTheme.title')}
                    </div>
                    <div className="text-sm font-medium text-foreground">{deletedSelectedTheme}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                        {t('settings.terminal.themeModal.missingTheme.desc')}
                    </div>
                </div>
            )}

            {!hasVisibleThemes && !showAutoEntry && normalizedQuery ? (
                <p className="rounded-md border border-dashed border-border/80 px-3 py-8 text-center text-xs text-muted-foreground">
                    {t('settings.terminal.themeModal.search.empty')}
                </p>
            ) : (
                <>
                    {/* Dark Themes Section */}
                    {showDarkSection && (
                        <div className={showLightSection || showCustomSection ? 'mb-4' : undefined}>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold px-3">
                                {sectionLabel('settings.terminal.themeModal.darkThemes', filteredDarkThemes.length)}
                            </div>
                            <div className="space-y-0.5">
                                {filteredDarkThemes.map(theme => (
                                    <ThemeItem
                                        key={theme.id}
                                        theme={theme}
                                        isSelected={selectedThemeId === theme.id}
                                        onSelect={onSelect}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Light Themes Section */}
                    {showLightSection && (
                        <div className={showCustomSection ? 'mb-4' : undefined}>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold px-3">
                                {sectionLabel('settings.terminal.themeModal.lightThemes', filteredLightThemes.length)}
                            </div>
                            <div className="space-y-0.5">
                                {filteredLightThemes.map(theme => (
                                    <ThemeItem
                                        key={theme.id}
                                        theme={theme}
                                        isSelected={selectedThemeId === theme.id}
                                        onSelect={onSelect}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Custom Themes Section */}
                    {showCustomSection && (
                        <div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold px-3">
                                {sectionLabel('terminal.customTheme.section', visibleCustomThemes.length)}
                            </div>
                            <div className="space-y-0.5">
                                {visibleCustomThemes.map(theme => (
                                    <ThemeItem
                                        key={theme.id}
                                        theme={theme}
                                        isSelected={selectedThemeId === theme.id}
                                        onSelect={onSelect}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </>
    );
};
