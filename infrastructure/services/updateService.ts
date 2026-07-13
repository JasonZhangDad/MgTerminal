/**
 * Update Service
 *
 * Combines two update mechanisms:
 * 1. Official server manifest version comparison (used by useUpdateCheck for notification banner)
 * 2. electron-updater bridge (used by SettingsSystemTab for download/install)
 */

import { magiesTerminalBridge } from "./magiesTerminalBridge";

// ================================
// Part 1: Official Server Version Check
// ================================

const RELEASE_MANIFEST_URL = 'https://shell.magies.top/releases/latest.json';
const RELEASE_ASSET_BASE_URL = 'https://shell.magies.top/releases/latest';
const RELEASES_PAGE_URL = 'https://shell.magies.top/#download';

export interface ReleaseInfo {
  version: string;       // e.g. "1.0.0" (without 'v' prefix)
  tagName: string;       // e.g. "v1.0.0"
  name: string;          // Release title
  body: string;          // Release notes (markdown)
  htmlUrl: string;       // URL to the release page
  publishedAt: string;   // ISO date string
  assets: ReleaseAsset[];
}

export interface ReleaseAsset {
  name: string;
  browserDownloadUrl: string;
  size: number;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestRelease: ReleaseInfo | null;
  error?: string;
}

/**
 * Parse version string to comparable array
 * e.g. "1.2.3" -> [1, 2, 3]
 */
function parseVersion(version: string): number[] {
  // Remove 'v' prefix if present
  const clean = version.replace(/^v/i, '');
  return clean.split('.').map((part) => {
    const num = parseInt(part, 10);
    return isNaN(num) ? 0 : num;
  });
}

/**
 * Compare two version strings
 * Returns: 1 if a > b, -1 if a < b, 0 if equal
 */
export function compareVersions(a: string, b: string): number {
  const partsA = parseVersion(a);
  const partsB = parseVersion(b);
  const maxLen = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < maxLen; i++) {
    const numA = partsA[i] ?? 0;
    const numB = partsB[i] ?? 0;
    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }
  return 0;
}

/**
 * Check for updates via the official server manifest (compares version strings).
 * Used by useUpdateCheck for the notification banner.
 */
export async function checkForUpdates(currentVersion: string): Promise<UpdateCheckResult> {
  try {
    const response = await fetch(RELEASE_MANIFEST_URL, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Update server returned ${response.status}`);
    }

    const data = await response.json();
    const tagName = data.tag as string;
    const latestVersion = (data.version as string | undefined)?.replace(/^v/i, '')
      || tagName.replace(/^v/i, '');

    const latestRelease: ReleaseInfo = {
      version: latestVersion,
      tagName,
      name: data.name || tagName,
      body: data.body || '',
      htmlUrl: RELEASES_PAGE_URL,
      publishedAt: data.syncedAt || '',
      assets: (data.assets || []).map((a: { name: string; size?: number }) => ({
        name: a.name,
        browserDownloadUrl: `${RELEASE_ASSET_BASE_URL}/${encodeURIComponent(a.name)}`,
        size: a.size || 0,
      })),
    };

    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;

    return { hasUpdate, currentVersion, latestRelease };
  } catch (error) {
    return {
      hasUpdate: false,
      currentVersion,
      latestRelease: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get release page URL for a specific version
 */
export function getReleaseUrl(version?: string): string {
  void version;
  return RELEASES_PAGE_URL;
}

/**
 * Get download URL for current platform
 */
export function getDownloadUrlForPlatform(
  release: ReleaseInfo,
  platform: string
): string | null {
  const assets = release.assets;

  // Platform-specific file patterns
  const patterns: Record<string, RegExp[]> = {
    win32: [/\.exe$/i, /win.*\.zip$/i, /windows/i],
    darwin: [/\.dmg$/i, /mac.*\.zip$/i, /darwin/i],
    linux: [/\.AppImage$/i, /\.deb$/i, /linux/i],
  };

  const platformPatterns = patterns[platform] || [];

  for (const pattern of platformPatterns) {
    const asset = assets.find((a) => pattern.test(a.name));
    if (asset) {
      return asset.browserDownloadUrl;
    }
  }

  // Fallback to release page
  return null;
}

// =============================================
// Part 2: electron-updater Bridge (IPC-based)
// =============================================

export interface ElectronUpdateCheckResult {
  available: boolean;
  supported?: boolean;
  version?: string;
  releaseNotes?: string;
  releaseDate?: string | null;
  error?: string;
}

export interface UpdateDownloadProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

export async function checkForUpdate(): Promise<ElectronUpdateCheckResult> {
  const bridge = magiesTerminalBridge.get();
  if (!bridge?.checkForUpdate) {
    return { available: false, supported: false, error: "Bridge unavailable" };
  }
  try {
    return await bridge.checkForUpdate();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { available: false, error: message };
  }
}

export async function downloadUpdate(): Promise<{ success: boolean; error?: string }> {
  const bridge = magiesTerminalBridge.get();
  if (!bridge?.downloadUpdate) {
    return { success: false, error: "Bridge unavailable" };
  }
  return bridge.downloadUpdate();
}

export async function installUpdate(): Promise<{
  success: boolean;
  error?: string;
  needsSave?: boolean;
  unsupported?: boolean;
} | void> {
  const bridge = magiesTerminalBridge.get();
  return bridge?.installUpdate?.();
}

export function onDownloadProgress(
  cb: (progress: UpdateDownloadProgress) => void,
): (() => void) | undefined {
  return magiesTerminalBridge.get()?.onUpdateDownloadProgress?.(cb);
}

export function onDownloaded(cb: () => void): (() => void) | undefined {
  return magiesTerminalBridge.get()?.onUpdateDownloaded?.(cb);
}

export function onError(
  cb: (payload: { error: string }) => void,
): (() => void) | undefined {
  return magiesTerminalBridge.get()?.onUpdateError?.(cb);
}

/** Returns the official download page URL. */
export function getReleasesUrl(version?: string): string {
  void version;
  return RELEASES_PAGE_URL;
}
