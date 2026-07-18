/**
 * Temp Directory Bridge - Manages MagiesTerminal's dedicated temp directory
 * 
 * All temporary files (SFTP downloads, etc.) are stored in a dedicated
 * MagiesTerminal folder within the system temp directory for easier cleanup.
 */

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

// MagiesTerminal temp directory name
const MAGIES_TERMINAL_TEMP_DIR_NAME = "MagiesTerminal";

// Cached temp directory path
let cachedTempDir = null;
let tempFileCounter = 0;

/**
 * Get the MagiesTerminal temp directory path
 * Creates the directory if it doesn't exist
 */
/**
 * Ensure path is a real directory we own (not a symlink planted by another user).
 * Returns true when safe to use.
 */
function isSafeOwnedDir(dirPath) {
  try {
    const st = fs.lstatSync(dirPath);
    if (!st.isDirectory() || st.isSymbolicLink()) return false;
    // On POSIX, require mode bits and ownership by the current uid when available.
    if (process.platform !== "win32" && typeof process.getuid === "function") {
      if (st.uid !== process.getuid()) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function getTempDir() {
  if (cachedTempDir && isSafeOwnedDir(cachedTempDir)) {
    return cachedTempDir;
  }
  cachedTempDir = null;

  const systemTempDir = os.tmpdir();
  const magiesTerminalTempDir = path.join(systemTempDir, MAGIES_TERMINAL_TEMP_DIR_NAME);

  try {
    if (fs.existsSync(magiesTerminalTempDir)) {
      if (!isSafeOwnedDir(magiesTerminalTempDir)) {
        // Hostile or unexpected entry — recreate under a unique suffix.
        const unique = path.join(
          systemTempDir,
          `${MAGIES_TERMINAL_TEMP_DIR_NAME}-${process.pid}-${Date.now()}`,
        );
        fs.mkdirSync(unique, { recursive: true, mode: 0o700 });
        try { fs.chmodSync(unique, 0o700); } catch { /* best-effort */ }
        cachedTempDir = unique;
        console.warn(`[TempDir] Unsafe temp path replaced: ${magiesTerminalTempDir} → ${unique}`);
        return unique;
      }
      try { fs.chmodSync(magiesTerminalTempDir, 0o700); } catch { /* best-effort */ }
      cachedTempDir = magiesTerminalTempDir;
      return magiesTerminalTempDir;
    }
    fs.mkdirSync(magiesTerminalTempDir, { recursive: true, mode: 0o700 });
    try { fs.chmodSync(magiesTerminalTempDir, 0o700); } catch { /* best-effort */ }
    console.log(`[TempDir] Created MagiesTerminal temp directory: ${magiesTerminalTempDir}`);
    cachedTempDir = magiesTerminalTempDir;
    return magiesTerminalTempDir;
  } catch (err) {
    console.error(`[TempDir] Failed to create temp directory:`, err.message);
    // Never fall back to the shared system temp root (symlink/cleanup risk).
    // Use a unique subdirectory under tmpdir instead.
    const fallback = path.join(
      systemTempDir,
      `${MAGIES_TERMINAL_TEMP_DIR_NAME}-fallback-${process.pid}`,
    );
    try {
      fs.mkdirSync(fallback, { recursive: true, mode: 0o700 });
      try { fs.chmodSync(fallback, 0o700); } catch { /* best-effort */ }
      cachedTempDir = fallback;
      return fallback;
    } catch (fallbackErr) {
      console.error(`[TempDir] Fallback temp dir failed:`, fallbackErr.message);
      throw fallbackErr;
    }
  }
}

/**
 * Ensure the temp directory exists (call on app startup)
 */
function ensureTempDir() {
  const tempDir = getTempDir();
  console.log(`[TempDir] MagiesTerminal temp directory: ${tempDir}`);
  return tempDir;
}

/**
 * Get temp directory info (path, size, file count)
 */
async function getTempDirInfo() {
  const tempDir = getTempDir();
  
  try {
    const files = await fs.promises.readdir(tempDir);
    let totalSize = 0;
    let fileCount = 0;
    
    for (const file of files) {
      try {
        const filePath = path.join(tempDir, file);
        const stat = await fs.promises.stat(filePath);
        if (stat.isFile()) {
          totalSize += stat.size;
          fileCount++;
        }
      } catch {
        // Skip files that can't be stat'd
      }
    }
    
    return {
      path: tempDir,
      totalSize,
      fileCount,
    };
  } catch (err) {
    console.error(`[TempDir] Failed to get temp dir info:`, err.message);
    return {
      path: tempDir,
      totalSize: 0,
      fileCount: 0,
    };
  }
}

/**
 * Clear all files in the temp directory
 * Returns the number of files deleted
 */
async function clearTempDir() {
  const tempDir = getTempDir();
  let deletedCount = 0;
  let failedCount = 0;

  // Refuse to clear if the path is no longer a safe owned directory (symlink swap).
  if (!isSafeOwnedDir(tempDir)) {
    return { deletedCount: 0, failedCount: 0, error: "temp_dir_unsafe" };
  }

  try {
    const files = await fs.promises.readdir(tempDir);

    for (const file of files) {
      try {
        const filePath = path.join(tempDir, file);
        // lstat: never follow symlinks when deciding what to delete.
        const stat = await fs.promises.lstat(filePath);
        if (stat.isSymbolicLink()) {
          await fs.promises.unlink(filePath);
          deletedCount++;
          continue;
        }
        if (stat.isFile()) {
          await fs.promises.unlink(filePath);
          deletedCount++;
        } else if (stat.isDirectory()) {
          await fs.promises.rm(filePath, { recursive: true, force: true });
          deletedCount++;
        }
      } catch (err) {
        failedCount++;
        console.log(`[TempDir] Could not delete ${file}: ${err.message}`);
      }
    }

    console.log(`[TempDir] Cleanup complete: ${deletedCount} deleted, ${failedCount} failed`);
    return { deletedCount, failedCount };
  } catch (err) {
    console.error(`[TempDir] Failed to clear temp dir:`, err.message);
    return { deletedCount: 0, failedCount: 0, error: err.message };
  }
}

/**
 * Generate a unique temp file path for a given filename
 */
function getTempFilePath(fileName) {
  const tempDir = getTempDir();
  const timestamp = Date.now();
  tempFileCounter = (tempFileCounter + 1) % 1000000;
  const safeFileName = fileName.replace(/[<>:"/\\|?*]/g, "_");
  return path.join(tempDir, `${timestamp}_${tempFileCounter}_${safeFileName}`);
}

/**
 * Register IPC handlers
 */
function registerHandlers(ipcMain, shell) {
  ipcMain.handle("magiesTerminal:tempdir:getInfo", async () => {
    return getTempDirInfo();
  });
  
  ipcMain.handle("magiesTerminal:tempdir:clear", async () => {
    return clearTempDir();
  });
  
  ipcMain.handle("magiesTerminal:tempdir:getPath", () => {
    return getTempDir();
  });
  
  ipcMain.handle("magiesTerminal:tempdir:open", async () => {
    const tempDir = getTempDir();
    if (shell?.openPath) {
      await shell.openPath(tempDir);
      return { success: true };
    }
    return { success: false };
  });
}

module.exports = {
  getTempDir,
  ensureTempDir,
  getTempDirInfo,
  clearTempDir,
  getTempFilePath,
  registerHandlers,
};
