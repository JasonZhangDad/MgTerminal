import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, RefreshCw } from "lucide-react";
import type { AIProviderId, ProviderStyle } from "../../../../infrastructure/ai/types";
import { resolveProviderStyle } from "../../../../infrastructure/ai/types";
import { buildModelDiscoveryHeaders, resolveModelsDiscoveryEndpoint } from "../../../../infrastructure/ai/modelDiscoveryHeaders";
import { useI18n } from "../../../../application/i18n/I18nProvider";
import { Button } from "../../../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../ui/tooltip";
import { cn } from "../../../../lib/utils";
import type { FetchedModel } from "./types";
import { getFetchBridge } from "./types";
import { parseFetchedModels } from "./modelMetadata";

export function buildModelSuggestions({
  presetModels,
  fetchedModels,
  hasFetched,
  value,
}: {
  presetModels?: readonly string[];
  fetchedModels: FetchedModel[];
  hasFetched: boolean;
  value: string;
}): FetchedModel[] {
  const byId = new Map<string, FetchedModel>();
  // Live catalog wins: after a successful /models fetch, list those first and
  // only keep presets that the provider didn't return (offline fallbacks).
  if (hasFetched) {
    for (const model of fetchedModels) {
      byId.set(model.id, model);
    }
    for (const modelId of presetModels ?? []) {
      const id = modelId.trim();
      if (id && !byId.has(id)) byId.set(id, { id });
    }
  } else {
    for (const modelId of presetModels ?? []) {
      const id = modelId.trim();
      if (id) byId.set(id, { id });
    }
  }

  const allSuggestions = Array.from(byId.values());
  if (!value.trim()) return allSuggestions;
  const q = value.toLowerCase();
  return allSuggestions.filter((m) =>
    m.id.toLowerCase().includes(q) || (m.name && m.name.toLowerCase().includes(q)),
  );
}

export type ModelCatalogSource = "idle" | "loading" | "live" | "presets" | "error";

export function getModelCatalogSource({
  canFetch,
  isLoading,
  hasFetched,
  fetchCount,
  hasPresetModels,
  error,
}: {
  canFetch: boolean;
  isLoading: boolean;
  hasFetched: boolean;
  fetchCount: number;
  hasPresetModels: boolean;
  error: string | null;
}): ModelCatalogSource {
  if (isLoading) return "loading";
  if (error && !hasFetched) return "error";
  if (hasFetched && fetchCount > 0) return "live";
  if (hasPresetModels) return "presets";
  if (error) return "error";
  if (canFetch) return "idle";
  return "idle";
}

export function getModelSuggestionsPresentation({
  suggestionsLength,
  isLoading,
  error,
  hasFetched,
  hasPresetModels,
}: {
  suggestionsLength: number;
  isLoading: boolean;
  error: string | null;
  hasFetched: boolean;
  hasPresetModels: boolean;
}): {
  showSuggestions: boolean;
  emptyState: "loading" | "error" | "noMatches" | "loadPrompt" | "needApiKey" | null;
  footerState: "loading" | "error" | "live" | null;
} {
  if (suggestionsLength > 0) {
    return {
      showSuggestions: true,
      emptyState: null,
      footerState: isLoading ? "loading" : error ? "error" : hasFetched ? "live" : null,
    };
  }

  if (isLoading) {
    return { showSuggestions: false, emptyState: "loading", footerState: null };
  }
  if (error) {
    return { showSuggestions: false, emptyState: "error", footerState: null };
  }
  return {
    showSuggestions: false,
    emptyState: hasFetched || hasPresetModels ? "noMatches" : "loadPrompt",
    footerState: null,
  };
}

export const ModelSelector: React.FC<{
  value: string;
  onChange: (value: string) => void;
  baseURL: string;
  modelsEndpoint?: string;
  presetModels?: readonly string[];
  placeholder?: string;
  apiKey?: string;
  providerId?: AIProviderId;
  /** Optional protocol-family override; falls back to `providerId` via {@link resolveProviderStyle}. */
  style?: ProviderStyle;
  skipTLSVerify?: boolean;
  onModelMetadata?: (model: FetchedModel) => void;
}> = ({ value, onChange, baseURL, modelsEndpoint, presetModels, placeholder, apiKey, providerId, style, skipTLSVerify, onModelMetadata }) => {
  const { t } = useI18n();
  const [models, setModels] = useState<FetchedModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // Resolve the wire-protocol family: prefer an explicit style override (set in
  // the form), then fall back to the providerId-derived default.
  const resolvedStyle: ProviderStyle = style
    ?? (providerId ? resolveProviderStyle({ providerId }) : "openai");
  // Endpoint follows the resolved style so a providerId+style mismatch (e.g.
  // Anthropic providerId switched to OpenAI style) still hits the right path.
  const effectiveModelsEndpoint = resolveModelsDiscoveryEndpoint(resolvedStyle, modelsEndpoint);
  // Ollama runs locally without auth; all other providers need an API key to list models
  const needsApiKey = providerId !== "ollama";
  const canFetch = !!effectiveModelsEndpoint && (!needsApiKey || !!apiKey);
  const hasPresetModels = (presetModels?.length ?? 0) > 0;
  const canSuggest = canFetch || hasPresetModels;
  const discoveryKey = JSON.stringify({
    baseURL,
    effectiveModelsEndpoint,
    apiKey,
    resolvedStyle,
    skipTLSVerify,
  });
  const discoveryKeyRef = useRef(discoveryKey);

  useEffect(() => {
    discoveryKeyRef.current = discoveryKey;
    setModels([]);
    setHasFetched(false);
    setError(null);
    setIsLoading(false);
  }, [discoveryKey]);

  const fetchModels = useCallback(async (options: { force?: boolean } = {}) => {
    if (!effectiveModelsEndpoint) return;
    if (needsApiKey && !apiKey) {
      setError(t('ai.providers.needApiKeyForModels'));
      setHasFetched(false);
      setModels([]);
      return;
    }
    const bridge = getFetchBridge();
    if (!bridge?.aiFetch) {
      setError(t('ai.providers.modelsBridgeUnavailable'));
      return;
    }
    const requestKey = discoveryKey;

    setIsLoading(true);
    setError(null);
    if (options.force) {
      setHasFetched(false);
    }
    try {
      // Temporarily allow the provider's host in the backend fetch allowlist
      // so model listing works for URLs not yet synced from the main window.
      if (bridge.aiAllowlistAddHost && baseURL) {
        await bridge.aiAllowlistAddHost(baseURL);
      }
      const url = `${baseURL.replace(/\/+$/, "")}${effectiveModelsEndpoint}`;
      const headers = buildModelDiscoveryHeaders(resolvedStyle, apiKey);
      const result = await bridge.aiFetch(url, "GET", headers, undefined, undefined, undefined, undefined, skipTLSVerify);
      if (!result.ok) {
        if (discoveryKeyRef.current !== requestKey) return;
        setError(
          t('ai.providers.fetchModelsFailed').replace(
            '{detail}',
            result.error || String(result.status || 'unknown'),
          ),
        );
        return;
      }
      const parsed = JSON.parse(result.data);
      const list = parseFetchedModels(parsed);
      list.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id, undefined, { numeric: true }));
      if (discoveryKeyRef.current !== requestKey) return;
      setModels(list);
      setHasFetched(true);
      if (list.length === 0) {
        setError(t('ai.providers.emptyModelCatalog'));
      }
    } catch (err) {
      if (discoveryKeyRef.current !== requestKey) return;
      setError(
        t('ai.providers.fetchModelsFailed').replace(
          '{detail}',
          err instanceof Error ? err.message : 'parse error',
        ),
      );
    } finally {
      if (discoveryKeyRef.current === requestKey) setIsLoading(false);
    }
  }, [baseURL, effectiveModelsEndpoint, apiKey, resolvedStyle, skipTLSVerify, discoveryKey, needsApiKey, t]);

  // Auto-fetch latest models as soon as the provider can talk to /models.
  useEffect(() => {
    if (canFetch && !hasFetched && !isLoading) {
      void fetchModels();
    }
  }, [canFetch, hasFetched, isLoading, fetchModels]);

  useEffect(() => {
    if (isOpen && canFetch && !hasFetched && !isLoading) {
      void fetchModels();
    }
  }, [isOpen, canFetch, hasFetched, isLoading, fetchModels]);

  // Filter preset and discovered models by current input value (inline autocomplete).
  const suggestions = useMemo(() => {
    return buildModelSuggestions({
      presetModels,
      fetchedModels: models,
      hasFetched,
      value,
    });
  }, [models, presetModels, value, hasFetched]);

  const showSuggestions = isOpen && (canSuggest || Boolean(error) || isLoading);
  const presentation = getModelSuggestionsPresentation({
    suggestionsLength: suggestions.length,
    isLoading,
    error,
    hasFetched,
    hasPresetModels,
  });
  const catalogSource = getModelCatalogSource({
    canFetch,
    isLoading,
    hasFetched,
    fetchCount: models.length,
    hasPresetModels,
    error,
  });

  const statusHint = (() => {
    if (catalogSource === "loading") return t('ai.providers.loadingModels');
    if (catalogSource === "error") return error;
    if (catalogSource === "live") {
      return t('ai.providers.liveModelCount').replace('{count}', String(models.length));
    }
    if (catalogSource === "presets") return t('ai.providers.usingPresetModels');
    if (needsApiKey && !apiKey) return t('ai.providers.needApiKeyForModels');
    return null;
  })();

  return (
    <div className="relative space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              if ((canSuggest || canFetch) && !isOpen) setIsOpen(true);
            }}
            onFocus={() => { if (canSuggest || canFetch || error) setIsOpen(true); }}
            onBlur={() => { setIsOpen(false); }}
            placeholder={placeholder ?? (canSuggest ? t('ai.providers.searchModel') : t('ai.providers.defaultModel.placeholder'))}
            className={cn(
              "w-full h-8 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              canSuggest && "pr-8",
            )}
          />
          {(canSuggest || canFetch) && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setIsOpen(!isOpen); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <ChevronDown size={14} className={cn("transition-transform", isOpen && "rotate-180")} />
            </button>
          )}
        </div>
        {(canFetch || needsApiKey) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { void fetchModels({ force: true }); }}
                disabled={isLoading || (needsApiKey && !apiKey)}
                className="shrink-0 px-2"
              >
                <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('ai.providers.refreshModels')}</TooltipContent>
          </Tooltip>
        )}
      </div>

      {statusHint && (
        <div
          className={cn(
            "flex items-center gap-1.5 px-0.5 text-[11px] leading-snug",
            catalogSource === "error" ? "text-destructive" : "text-muted-foreground/75",
          )}
        >
          {catalogSource === "loading" && <RefreshCw size={11} className="animate-spin shrink-0" />}
          <span className="truncate">{statusHint}</span>
          {catalogSource === "error" && canFetch && (
            <button
              type="button"
              className="shrink-0 font-medium text-primary hover:underline"
              onMouseDown={(e) => {
                e.preventDefault();
                void fetchModels({ force: true });
              }}
            >
              {t('ai.providers.retryLoadModels')}
            </button>
          )}
        </div>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-1 z-[101] rounded-md border border-border bg-popover shadow-md">
          <div className="max-h-60 overflow-y-auto">
            {!presentation.showSuggestions ? (
              <div className="px-3 py-3 text-center text-xs text-muted-foreground space-y-2">
                {presentation.emptyState === "loading" ? (
                  <>
                    <RefreshCw size={14} className="animate-spin inline mr-1.5" />
                    {t('ai.providers.loadingModels')}
                  </>
                ) : presentation.emptyState === "error" ? (
                  <div className="space-y-2">
                    <div className="text-destructive">{error}</div>
                    {canFetch && (
                      <button
                        type="button"
                        className="text-primary font-medium hover:underline"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          void fetchModels({ force: true });
                        }}
                      >
                        {t('ai.providers.retryLoadModels')}
                      </button>
                    )}
                    {hasPresetModels && (
                      <div className="text-muted-foreground/70">{t('ai.providers.usingPresetModels')}</div>
                    )}
                  </div>
                ) : presentation.emptyState === "noMatches" ? (
                  t('ai.providers.noMatchingModels')
                ) : (
                  t('ai.providers.clickToLoadModels')
                )}
              </div>
            ) : (
              suggestions.slice(0, 100).map((m) => (
                <button
                  key={m.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(m.id);
                    onModelMetadata?.(m);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors flex items-center justify-between gap-2",
                    m.id === value && "bg-accent",
                  )}
                >
                  <span className="font-mono truncate">{m.id}</span>
                  {m.id === value && <Check size={12} className="text-primary shrink-0" />}
                </button>
              ))
            )}
            {presentation.footerState && (
              <div className={cn(
                "px-3 py-2 text-center text-[10px] border-t border-border/40",
                presentation.footerState === "error" ? "text-destructive" : "text-muted-foreground",
              )}>
                {presentation.footerState === "loading" ? (
                  <>
                    <RefreshCw size={12} className="animate-spin inline mr-1" />
                    {t('ai.providers.loadingModels')}
                  </>
                ) : presentation.footerState === "live" ? (
                  t('ai.providers.liveModelCount').replace('{count}', String(models.length))
                ) : (
                  error
                )}
              </div>
            )}
            {suggestions.length > 100 && (
              <div className="px-3 py-2 text-center text-[10px] text-muted-foreground border-t border-border/40">
                {t('ai.providers.showingModels').replace('{count}', String(suggestions.length))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
