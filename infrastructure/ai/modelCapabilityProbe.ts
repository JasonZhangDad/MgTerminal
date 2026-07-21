import type { ModelCapabilityInfo, ProviderConfig } from './types';
import { resolveProviderBaseURL } from './localPrivacy';

export type ModelProbeFetch = (
  url: string,
  method?: string,
  headers?: Record<string, string>,
  body?: string,
  providerId?: string,
) => Promise<{ ok: boolean; status?: number; data: string; error?: string }>;

type ProbeResult = ModelCapabilityInfo & { ok: true } | {
  ok: false;
  supportsTools: false;
  checkedAt: number;
  error: string;
};

function chatCompletionsUrl(baseURL: string): string {
  const normalized = baseURL.endsWith('/') ? baseURL : `${baseURL}/`;
  return new URL('chat/completions', normalized).toString();
}

export async function probeModelCapabilities(input: {
  provider: ProviderConfig;
  fetch: ModelProbeFetch;
  modelId?: string;
  now?: () => number;
}): Promise<ProbeResult> {
  const checkedAt = (input.now ?? Date.now)();
  const modelId = input.modelId?.trim() || input.provider.defaultModel?.trim() || '';
  if (!modelId) {
    return { ok: false, supportsTools: false, checkedAt, error: 'Select a model before probing capabilities.' };
  }

  let url: string;
  try {
    url = chatCompletionsUrl(resolveProviderBaseURL(input.provider));
  } catch {
    return { ok: false, supportsTools: false, checkedAt, error: 'Provider base URL is invalid.' };
  }

  let response: Awaited<ReturnType<ModelProbeFetch>>;
  try {
    response = await input.fetch(
      url,
      'POST',
      { 'content-type': 'application/json' },
      JSON.stringify({
        model: modelId,
        messages: [{
          role: 'user',
          content: 'Call the capability_probe function exactly once with value "ok".',
        }],
        tools: [{
          type: 'function',
          function: {
            name: 'capability_probe',
            description: 'Harmless local model capability check.',
            parameters: {
              type: 'object',
              properties: { value: { type: 'string' } },
              required: ['value'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: 'required',
        temperature: 0,
        max_tokens: 32,
        stream: false,
      }),
      input.provider.id,
    );
  } catch (error) {
    return {
      ok: false,
      supportsTools: false,
      checkedAt,
      error: `Capability probe request failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      supportsTools: false,
      checkedAt,
      error: response.error || `Capability probe failed with HTTP ${response.status ?? 0}.`,
    };
  }

  try {
    const parsed = JSON.parse(response.data) as {
      choices?: Array<{ message?: { tool_calls?: unknown[] } }>;
    };
    const supportsTools = Boolean(parsed.choices?.some(
      (choice) => Array.isArray(choice.message?.tool_calls) && choice.message.tool_calls.length > 0,
    ));
    return { ok: true, supportsTools, checkedAt };
  } catch (error) {
    return {
      ok: false,
      supportsTools: false,
      checkedAt,
      error: `Capability probe returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
