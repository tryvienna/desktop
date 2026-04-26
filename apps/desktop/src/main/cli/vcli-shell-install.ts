import * as fs from 'node:fs';
import * as path from 'node:path';
import { app } from 'electron';
import type { MainLogger } from '@vienna/logger/main';

/** Default symlink target for the vcli command. */
const INSTALL_PATH = '/usr/local/bin/vcli';

/**
 * Resolve the path to the bundled vcli wrapper script.
 *
 * - **Packaged:** `Vienna.app/Contents/Resources/vcli/vcli` (the shell wrapper)
 * - **Dev:** `packages/vcli/bin/vcli.mjs` via the monorepo root
 */
export function getBundledVcliPath(): string | null {
  if (app.isPackaged) {
    const resourcesPath = process.resourcesPath ?? path.join(app.getAppPath(), '..', 'Resources');
    const wrapperPath = path.join(resourcesPath, 'vcli', 'vcli');
    return fs.existsSync(wrapperPath) ? wrapperPath : null;
  }

  // Dev mode — point to the bin entry in the monorepo
  const monorepoRoot = path.resolve(app.getAppPath(), '..', '..');
  const devPath = path.join(monorepoRoot, 'packages', 'vcli', 'bin', 'vcli.mjs');
  return fs.existsSync(devPath) ? devPath : null;
}

/**
 * Resolve the path to the bundled vcli index.js (for direct node execution).
 */
export function getBundledVcliIndexPath(): string | null {
  if (app.isPackaged) {
    const resourcesPath = process.resourcesPath ?? path.join(app.getAppPath(), '..', 'Resources');
    const indexPath = path.join(resourcesPath, 'vcli', 'index.cjs');
    return fs.existsSync(indexPath) ? indexPath : null;
  }

  // Dev mode — point to the bin wrapper which handles TS execution flags
  const monorepoRoot = path.resolve(app.getAppPath(), '..', '..');
  const devPath = path.join(monorepoRoot, 'packages', 'vcli', 'bin', 'vcli.mjs');
  return fs.existsSync(devPath) ? devPath : null;
}

/**
 * Check if vcli is installed in the user's PATH via our symlink.
 */
export function isVcliInstalled(log?: MainLogger): { installed: boolean; path?: string } {
  try {
    if (!fs.existsSync(INSTALL_PATH)) {
      return { installed: false };
    }

    // Check that the symlink points to our bundled vcli
    const target = fs.readlinkSync(INSTALL_PATH);
    const bundledPath = getBundledVcliPath();

    if (bundledPath && path.resolve(target) === path.resolve(bundledPath)) {
      return { installed: true, path: INSTALL_PATH };
    }

    // Symlink exists but points elsewhere — not our installation
    log?.debug('vcli symlink exists but points to different target', {
      installPath: INSTALL_PATH,
      target,
      expected: bundledPath,
    });
    return { installed: false };
  } catch {
    return { installed: false };
  }
}

/**
 * Install the vcli shell command by creating a symlink at /usr/local/bin/vcli.
 */
export function installVcliCommand(log?: MainLogger): { success: boolean; path?: string; error?: string } {
  const bundledPath = getBundledVcliPath();
  if (!bundledPath) {
    return { success: false, error: 'Bundled vcli not found in app resources' };
  }

  try {
    // Ensure /usr/local/bin exists
    const installDir = path.dirname(INSTALL_PATH);
    if (!fs.existsSync(installDir)) {
      return {
        success: false,
        error: `${installDir} does not exist. Create it with: sudo mkdir -p ${installDir}`,
      };
    }

    // Check if something already exists at the install path
    try {
      const stat = fs.lstatSync(INSTALL_PATH);
      if (stat.isSymbolicLink()) {
        const target = fs.readlinkSync(INSTALL_PATH);
        // Only remove if it points to a Vienna-managed location
        if (target.includes('Vienna') || target.includes('vienna')) {
          fs.unlinkSync(INSTALL_PATH);
        } else {
          return {
            success: false,
            error: `${INSTALL_PATH} is a symlink to ${target} (not managed by Vienna). Remove it manually first.`,
          };
        }
      } else {
        return {
          success: false,
          error: `${INSTALL_PATH} already exists and is not a symlink. Remove it manually first.`,
        };
      }
    } catch {
      // ENOENT — nothing at the path, which is what we want
    }

    fs.symlinkSync(bundledPath, INSTALL_PATH);
    log?.info('vcli command installed', { path: INSTALL_PATH, target: bundledPath });
    return { success: true, path: INSTALL_PATH };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // Permission error — suggest the manual approach
    if (message.includes('EACCES') || message.includes('permission')) {
      return {
        success: false,
        error: `Permission denied. Run this in your terminal:\n  sudo ln -sf "${bundledPath}" ${INSTALL_PATH}`,
      };
    }

    return { success: false, error: message };
  }
}

/**
 * Remove the vcli shell command symlink.
 */
export function uninstallVcliCommand(log?: MainLogger): { success: boolean; error?: string } {
  try {
    if (!fs.existsSync(INSTALL_PATH)) {
      return { success: true }; // Already gone
    }

    const stat = fs.lstatSync(INSTALL_PATH);
    if (!stat.isSymbolicLink()) {
      return { success: false, error: `${INSTALL_PATH} is not a symlink — refusing to remove` };
    }

    fs.unlinkSync(INSTALL_PATH);
    log?.info('vcli command uninstalled', { path: INSTALL_PATH });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('EACCES') || message.includes('permission')) {
      return {
        success: false,
        error: `Permission denied. Run this in your terminal:\n  sudo rm ${INSTALL_PATH}`,
      };
    }
    return { success: false, error: message };
  }
}
