import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createLocalProviderConfig,
  defaultBaseURLForLocalProvider,
  hasLocalOpenAICompatProvider,
  isLocalOpenAICompatProviderId,
  localOpenAICompatDummyApiKey,
} from './localProviders';

test('isLocalOpenAICompatProviderId accepts ollama and lmstudio only', () => {
  assert.equal(isLocalOpenAICompatProviderId('ollama'), true);
  assert.equal(isLocalOpenAICompatProviderId('lmstudio'), true);
  assert.equal(isLocalOpenAICompatProviderId('openai'), false);
  assert.equal(isLocalOpenAICompatProviderId('custom'), false);
  assert.equal(isLocalOpenAICompatProviderId(undefined), false);
});

test('localOpenAICompatDummyApiKey returns disposable keys', () => {
  assert.equal(localOpenAICompatDummyApiKey('ollama'), 'ollama');
  assert.equal(localOpenAICompatDummyApiKey('lmstudio'), 'lm-studio');
});

test('defaultBaseURLForLocalProvider points at loopback ports', () => {
  assert.equal(defaultBaseURLForLocalProvider('ollama'), 'http://localhost:11434/v1');
  assert.equal(defaultBaseURLForLocalProvider('lmstudio'), 'http://localhost:1234/v1');
});

test('createLocalProviderConfig builds a disabled preset config', () => {
  const config = createLocalProviderConfig('lmstudio', 'provider_test');
  assert.equal(config.id, 'provider_test');
  assert.equal(config.providerId, 'lmstudio');
  assert.equal(config.name, 'LM Studio');
  assert.equal(config.baseURL, 'http://localhost:1234/v1');
  assert.equal(config.enabled, false);
});

test('hasLocalOpenAICompatProvider scans provider list', () => {
  assert.equal(hasLocalOpenAICompatProvider([]), false);
  assert.equal(hasLocalOpenAICompatProvider([{ providerId: 'openai' }]), false);
  assert.equal(hasLocalOpenAICompatProvider([{ providerId: 'openai' }, { providerId: 'ollama' }]), true);
});
