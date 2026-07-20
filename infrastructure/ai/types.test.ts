import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CLAUDE_MODEL_PRESETS,
  CODEBUDDY_MODEL_PRESETS,
  CODEX_MODEL_PRESETS,
  GEMINI_MODEL_PRESETS,
  getAgentModelPresets,
  GROK_MODEL_PRESETS,
} from './types';

test('getAgentModelPresets returns CodeBuddy fallback models for command paths', () => {
  assert.deepEqual(
    getAgentModelPresets('/opt/homebrew/bin/codebuddy'),
    CODEBUDDY_MODEL_PRESETS,
  );
  assert.ok(CODEBUDDY_MODEL_PRESETS.some((model) => model.id === 'deepseek-v4-pro'));
});

test('getAgentModelPresets keeps Codex presets separate from CodeBuddy presets', () => {
  assert.deepEqual(getAgentModelPresets('codex'), CODEX_MODEL_PRESETS);
  assert.notDeepEqual(CODEBUDDY_MODEL_PRESETS, CODEX_MODEL_PRESETS);
});

test('getAgentModelPresets resolves Windows command paths with backslashes', () => {
  assert.deepEqual(
    getAgentModelPresets('C\\Users\\foo\\AppData\\Roaming\\npm\\codex.cmd'),
    CODEX_MODEL_PRESETS,
  );
  assert.deepEqual(
    getAgentModelPresets('C\\Program Files\\nodejs\\claude.exe'),
    CLAUDE_MODEL_PRESETS,
  );
});

test('CODEX_MODEL_PRESETS includes GPT-5.6 family', () => {
  assert.ok(CODEX_MODEL_PRESETS.some((model) => model.id === 'gpt-5.6-sol'));
  assert.ok(CODEX_MODEL_PRESETS.some((model) => model.id === 'gpt-5.6-terra'));
  assert.ok(CODEX_MODEL_PRESETS.some((model) => model.id === 'gpt-5.6-luna'));
  assert.equal(CODEX_MODEL_PRESETS[0]?.id, 'gpt-5.6-sol');
});

test('getAgentModelPresets returns Gemini and Grok fallbacks', () => {
  // Antigravity CLI is Gemini — same preset set.
  assert.deepEqual(getAgentModelPresets('gemini'), GEMINI_MODEL_PRESETS);
  assert.deepEqual(getAgentModelPresets('agy'), GEMINI_MODEL_PRESETS);
  assert.deepEqual(getAgentModelPresets('/usr/local/bin/antigravity'), GEMINI_MODEL_PRESETS);
  assert.deepEqual(getAgentModelPresets('grok'), GROK_MODEL_PRESETS);
  assert.deepEqual(getAgentModelPresets('grok.cmd'), GROK_MODEL_PRESETS);
  assert.ok(GROK_MODEL_PRESETS.some((model) => model.id === 'grok-4.5'));
  assert.ok(GEMINI_MODEL_PRESETS.some((model) => model.id === 'gemini-3.1-pro'));
  assert.ok(GEMINI_MODEL_PRESETS.some((model) => model.id === 'gemini-3.5-flash'));
});
