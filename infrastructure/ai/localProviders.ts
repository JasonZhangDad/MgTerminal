/**
 * Local / privacy-friendly OpenAI-compatible providers (Ollama, LM Studio).
 * These run on loopback, need no real API key for the OpenAI-compat client,
 * and are the recommended path for offline / data-sovereign setups.
 */
import type { AIProviderId, ProviderConfig } from './types';
import { PROVIDER_PRESETS } from './types';

/** Providers that default to localhost and do not require a real API key. */
export const LOCAL_OPENAI_COMPAT_PROVIDER_IDS = ['ollama', 'lmstudio'] as const satisfies readonly AIProviderId[];

export type LocalOpenAICompatProviderId = (typeof LOCAL_OPENAI_COMPAT_PROVIDER_IDS)[number];

const LOCAL_ID_SET = new Set<string>(LOCAL_OPENAI_COMPAT_PROVIDER_IDS);

export function isLocalOpenAICompatProviderId(providerId: string | null | undefined): providerId is LocalOpenAICompatProviderId {
  return typeof providerId === 'string' && LOCAL_ID_SET.has(providerId);
}

/** Dummy key accepted by OpenAI-compatible local servers that ignore auth. */
export function localOpenAICompatDummyApiKey(providerId: LocalOpenAICompatProviderId): string {
  return providerId === 'lmstudio' ? 'lm-studio' : 'ollama';
}

export function defaultBaseURLForLocalProvider(providerId: LocalOpenAICompatProviderId): string {
  return PROVIDER_PRESETS[providerId].defaultBaseURL;
}

export function hasLocalOpenAICompatProvider(providers: readonly Pick<ProviderConfig, 'providerId'>[]): boolean {
  return providers.some((p) => isLocalOpenAICompatProviderId(p.providerId));
}

export function createLocalProviderConfig(
  providerId: LocalOpenAICompatProviderId,
  id: string,
): ProviderConfig {
  const preset = PROVIDER_PRESETS[providerId];
  return {
    id,
    providerId,
    name: preset.name,
    baseURL: preset.defaultBaseURL,
    enabled: false,
  };
}
