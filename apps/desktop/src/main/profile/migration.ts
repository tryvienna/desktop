/**
 * One-time migration from flat ~/.vienna/ layout to ~/.vienna/profiles/default/.
 *
 * Before this change, ~/.vienna/ was a flat directory with skills/, quick-actions/,
 * plugins/, and config.json at the root. The new layout uses ~/.vienna/profiles/<name>/
 * to support multiple content profiles.
 *
 * This migration moves existing content into profiles/default/ and writes a sentinel
 * file to prevent re-running. Fresh installs skip the move and create the default
 * profile structure directly.
 *
 * @module main/profile/migration
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const SENTINEL = '.profiles-migrated';
const ACTIVE_PROFILE_FILE = 'active-profile';
const DEFAULT_PROFILE = 'default';

/** Directories and files to migrate from flat layout into profiles/default/. */
const MIGRATABLE = ['skills', 'quick-actions', 'plugins', 'config.json'];

/** Standard subdirectories every profile should have. */
const PROFILE_DIRS = ['skills', 'quick-actions', 'plugins'];

/**
 * Migrate a flat ~/.vienna/ directory to the profiles layout.
 *
 * Safe to call multiple times — uses a sentinel file to skip if already done.
 * Runs synchronously because it must complete before RegistryManager starts.
 */
export function migrateToProfileLayout(viennaDir: string): void {
  const sentinelPath = path.join(viennaDir, SENTINEL);

  // Already migrated — nothing to do
  if (fileExists(sentinelPath)) {
    ensureDefaultProfile(viennaDir);
    return;
  }

  const defaultDir = path.join(viennaDir, 'profiles', DEFAULT_PROFILE);
  fs.mkdirSync(defaultDir, { recursive: true });

  // Move existing content from flat layout into profiles/default/
  for (const item of MIGRATABLE) {
    const src = path.join(viennaDir, item);
    const dest = path.join(defaultDir, item);

    if (!pathExists(src)) continue;
    if (pathExists(dest)) continue; // already moved (partial migration recovery)

    try {
      fs.renameSync(src, dest);
    } catch {
      // Cross-device rename fails — fall back to copy + delete
      copyRecursiveSync(src, dest);
      rmRecursiveSync(src);
    }
  }

  // Ensure standard subdirectories exist in the default profile
  for (const dir of PROFILE_DIRS) {
    fs.mkdirSync(path.join(defaultDir, dir), { recursive: true });
  }

  // Write active profile indicator
  fs.writeFileSync(path.join(viennaDir, ACTIVE_PROFILE_FILE), DEFAULT_PROFILE, 'utf-8');

  // Write sentinel so we don't re-run
  fs.writeFileSync(sentinelPath, new Date().toISOString(), 'utf-8');
}

/**
 * Ensure the default profile directory exists with standard structure.
 * Called on every startup after migration is complete.
 */
function ensureDefaultProfile(viennaDir: string): void {
  const defaultDir = path.join(viennaDir, 'profiles', DEFAULT_PROFILE);
  for (const dir of PROFILE_DIRS) {
    fs.mkdirSync(path.join(defaultDir, dir), { recursive: true });
  }

  // Ensure active-profile file exists
  const activeFile = path.join(viennaDir, ACTIVE_PROFILE_FILE);
  if (!fileExists(activeFile)) {
    fs.writeFileSync(activeFile, DEFAULT_PROFILE, 'utf-8');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fileExists(p: string): boolean {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function pathExists(p: string): boolean {
  try {
    fs.statSync(p);
    return true;
  } catch {
    return false;
  }
}

function copyRecursiveSync(src: string, dest: string): void {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursiveSync(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function rmRecursiveSync(p: string): void {
  fs.rmSync(p, { recursive: true, force: true });
}
