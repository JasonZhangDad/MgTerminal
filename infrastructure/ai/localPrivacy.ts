import { PROVIDER_PRESETS, type ProviderConfig } from './types';

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (normalized === 'localhost' || normalized.endsWith('.localhost') || normalized === '::1') {
    return true;
  }
  if (normalized.startsWith('::ffff:')) {
    return isLoopbackHostname(normalized.slice(7));
  }
  const octets = normalized.split('.');
  return octets.length === 4
    && octets.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255)
    && Number(octets[0]) === 127;
}

export function resolveProviderBaseURL(
  provider: Pick<ProviderConfig, 'providerId' | 'baseURL'>,
): string {
  return provider.baseURL?.trim() || PROVIDER_PRESETS[provider.providerId]?.defaultBaseURL || '';
}

export function isLoopbackProviderEndpoint(
  provider: Pick<ProviderConfig, 'providerId' | 'baseURL'>,
): boolean {
  try {
    const url = new URL(resolveProviderBaseURL(provider));
    return (url.protocol === 'http:' || url.protocol === 'https:')
      && isLoopbackHostname(url.hostname);
  } catch {
    return false;
  }
}

export function getStrictLocalPrivacyViolation(
  enabled: boolean,
  provider: Pick<ProviderConfig, 'providerId' | 'baseURL'>,
): string | null {
  if (!enabled || isLoopbackProviderEndpoint(provider)) return null;
  return 'Strict local privacy mode only allows AI providers on a loopback endpoint (localhost, 127.0.0.0/8, or ::1).';
}
