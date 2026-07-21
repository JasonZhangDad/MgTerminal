import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getStrictLocalPrivacyViolation,
  isLoopbackProviderEndpoint,
} from './localPrivacy';

test('strict local privacy accepts loopback provider endpoints', () => {
  assert.equal(isLoopbackProviderEndpoint({
    providerId: 'ollama',
    baseURL: 'http://127.0.0.42:11434/v1',
  }), true);
  assert.equal(isLoopbackProviderEndpoint({
    providerId: 'custom',
    baseURL: 'http://[::1]:8080/v1',
  }), true);
});

test('strict local privacy rejects LAN and public provider endpoints', () => {
  assert.equal(isLoopbackProviderEndpoint({
    providerId: 'ollama',
    baseURL: 'http://192.168.1.20:11434/v1',
  }), false);
  assert.match(getStrictLocalPrivacyViolation(true, {
    providerId: 'openai',
    baseURL: 'https://api.openai.com/v1',
  }) ?? '', /loopback/i);
});

test('strict local privacy uses safe local defaults but fails closed on invalid URLs', () => {
  assert.equal(getStrictLocalPrivacyViolation(true, { providerId: 'ollama' }), null);
  assert.match(getStrictLocalPrivacyViolation(true, {
    providerId: 'custom',
    baseURL: 'not-a-url',
  }) ?? '', /loopback/i);
  assert.equal(getStrictLocalPrivacyViolation(false, {
    providerId: 'openai',
    baseURL: 'https://api.openai.com/v1',
  }), null);
});
