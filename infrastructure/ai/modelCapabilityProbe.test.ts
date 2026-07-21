import assert from 'node:assert/strict';
import test from 'node:test';
import { probeModelCapabilities } from './modelCapabilityProbe';

test('probeModelCapabilities detects OpenAI-compatible tool calls', async () => {
  let requestedUrl = '';
  let requestedBody: Record<string, unknown> = {};
  const result = await probeModelCapabilities({
    provider: {
      id: 'ollama-local',
      providerId: 'ollama',
      name: 'Ollama',
      baseURL: 'http://localhost:11434/v1',
      defaultModel: 'qwen3',
      enabled: true,
    },
    fetch: async (url, _method, _headers, body) => {
      requestedUrl = url;
      requestedBody = JSON.parse(body ?? '{}');
      return {
        ok: true,
        status: 200,
        data: JSON.stringify({
          choices: [{ message: { tool_calls: [{ function: { name: 'capability_probe' } }] } }],
        }),
      };
    },
    now: () => 123,
  });

  assert.equal(requestedUrl, 'http://localhost:11434/v1/chat/completions');
  assert.equal(requestedBody.model, 'qwen3');
  assert.equal(Array.isArray(requestedBody.tools), true);
  assert.deepEqual(result, { ok: true, supportsTools: true, checkedAt: 123 });
});

test('probeModelCapabilities reports a successful text-only response as no tool support', async () => {
  const result = await probeModelCapabilities({
    provider: {
      id: 'lmstudio-local',
      providerId: 'lmstudio',
      name: 'LM Studio',
      baseURL: 'http://localhost:1234/v1',
      defaultModel: 'text-only',
      enabled: true,
    },
    fetch: async () => ({
      ok: true,
      status: 200,
      data: JSON.stringify({ choices: [{ message: { content: 'ok' } }] }),
    }),
    now: () => 456,
  });

  assert.deepEqual(result, { ok: true, supportsTools: false, checkedAt: 456 });
});

test('probeModelCapabilities surfaces provider and JSON failures', async () => {
  const provider = {
    id: 'ollama-local',
    providerId: 'ollama' as const,
    name: 'Ollama',
    baseURL: 'http://localhost:11434/v1',
    defaultModel: 'qwen3',
    enabled: true,
  };
  const rejected = await probeModelCapabilities({
    provider,
    fetch: async () => ({ ok: false, status: 400, data: '', error: 'tools unsupported' }),
  });
  assert.equal(rejected.ok, false);
  assert.match(rejected.error ?? '', /tools unsupported/i);

  const invalid = await probeModelCapabilities({
    provider,
    fetch: async () => ({ ok: true, status: 200, data: 'not-json' }),
  });
  assert.equal(invalid.ok, false);
  assert.match(invalid.error ?? '', /invalid JSON/i);
});

test('probeModelCapabilities converts fetch exceptions into a probe failure', async () => {
  const result = await probeModelCapabilities({
    provider: {
      id: 'ollama-local',
      providerId: 'ollama',
      name: 'Ollama',
      baseURL: 'http://localhost:11434/v1',
      defaultModel: 'qwen3',
      enabled: true,
    },
    fetch: async () => {
      throw new Error('connection refused');
    },
    now: () => 789,
  });

  assert.deepEqual(result, {
    ok: false,
    supportsTools: false,
    checkedAt: 789,
    error: 'Capability probe request failed: connection refused',
  });
});
