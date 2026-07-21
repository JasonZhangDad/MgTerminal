/**
 * Helpers for SFTP conflict dialogs: size/mtime comparison and resume hints.
 * Transfer resume itself lives in transferBridge (startOffset); this is UI/meta only.
 */

export interface SftpConflictCompareInput {
  isDirectory: boolean;
  existingSize: number;
  newSize: number;
  existingModified: number;
  newModified: number;
}

export type SftpConflictNewerSide = 'existing' | 'incoming' | 'same' | 'unknown';

export interface SftpConflictCompareResult {
  sizeDelta: number;
  newer: SftpConflictNewerSide;
  /** Existing file is a non-empty proper prefix by size — resume may apply for file uploads. */
  partialOverlapHint: boolean;
}

export function compareSftpConflictMeta(input: SftpConflictCompareInput): SftpConflictCompareResult {
  const existingSize = Number.isFinite(input.existingSize) ? Number(input.existingSize) : 0;
  const newSize = Number.isFinite(input.newSize) ? Number(input.newSize) : 0;
  const existingModified = Number.isFinite(input.existingModified) ? Number(input.existingModified) : 0;
  const newModified = Number.isFinite(input.newModified) ? Number(input.newModified) : 0;

  let newer: SftpConflictNewerSide = 'unknown';
  if (existingModified > 0 && newModified > 0) {
    if (existingModified > newModified) newer = 'existing';
    else if (newModified > existingModified) newer = 'incoming';
    else newer = 'same';
  }

  const partialOverlapHint = !input.isDirectory
    && existingSize > 0
    && newSize > existingSize;

  return {
    sizeDelta: newSize - existingSize,
    newer,
    partialOverlapHint,
  };
}
