import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveAgentIconKey, resolveIconSlug } from './agentIcon';

test('resolveIconSlug maps brand aliases to visual keys', () => {
  assert.equal(resolveIconSlug('openai'), 'openai');
  assert.equal(resolveIconSlug('chatgpt'), 'openai');
  assert.equal(resolveIconSlug('codex'), 'openai');
  assert.equal(resolveIconSlug('claude'), 'claude');
  assert.equal(resolveIconSlug('gemini'), 'gemini');
  assert.equal(resolveIconSlug('agy'), 'gemini');
  assert.equal(resolveIconSlug('grok'), 'grok');
  assert.equal(resolveIconSlug('xai'), 'grok');
  assert.equal(resolveIconSlug('copilot'), 'copilot');
  assert.equal(resolveIconSlug('cursor'), 'cursor');
  assert.equal(resolveIconSlug('unknown-thing'), undefined);
});

test('resolveAgentIconKey prefers explicit icon over command path', () => {
  assert.equal(
    resolveAgentIconKey({
      id: 'discovered_codex',
      command: '/usr/local/bin/codex',
      name: 'ChatGPT',
      icon: 'openai',
    }),
    'openai',
  );
  assert.equal(
    resolveAgentIconKey({
      id: 'discovered_claude',
      command: '/opt/homebrew/bin/claude',
      name: 'Claude Code',
      icon: 'claude',
    }),
    'claude',
  );
  assert.equal(
    resolveAgentIconKey({
      id: 'discovered_copilot',
      command: 'copilot',
      icon: 'copilot',
    }),
    'copilot',
  );
  assert.equal(
    resolveAgentIconKey({
      id: 'discovered_cursor',
      command: 'cursor',
      icon: 'cursor',
    }),
    'cursor',
  );
  assert.equal(
    resolveAgentIconKey({
      id: 'discovered_codebuddy',
      command: 'codebuddy',
      icon: 'codebuddy',
    }),
    'codebuddy',
  );
  assert.equal(
    resolveAgentIconKey({
      id: 'discovered_opencode',
      command: 'opencode',
      icon: 'opencode',
    }),
    'opencode',
  );
});

test('resolveAgentIconKey maps gemini/grok by command and name', () => {
  assert.equal(resolveAgentIconKey({ command: 'gemini', name: 'Gemini CLI' }), 'gemini');
  assert.equal(resolveAgentIconKey({ command: 'agy', name: 'Antigravity' }), 'gemini');
  assert.equal(resolveAgentIconKey({ command: 'grok', icon: 'grok' }), 'grok');
  assert.equal(resolveAgentIconKey({ type: 'builtin' }), 'magiesTerminal');
});
