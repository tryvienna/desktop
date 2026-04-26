/**
 * ProfileManager — Resolves and manages per-user data profiles.
 *
 * Each user (authenticated or anonymous) gets an isolated data directory
 * under `<baseDir>/profiles/<profileId>/`. This ensures total data isolation
 * between different users on the same machine.
 *
 * Profile IDs:
 *   - Authenticated users: the user's server-assigned ID (e.g. "clx1abc...")
 *   - Anonymous users: "anon-<uuid>" — a stable, locally-generated identifier
 *
 * The anonymous ID is persisted at `<baseDir>/anonymous-id` so it survives
 * app restarts and remains stable until the user logs in.
 *
 * SECURITY NOTE: Auth tokens are stored at `<baseDir>/secure-storage/` (root level)
 * because they're needed BEFORE profile resolution (chicken-and-egg). This is the
 * only root-level user data. Only one session exists at a time; it's cleared on logout.
 */

import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';

export interface ProfileInfo {
  /** The resolved profile ID (e.g. "anon-abc123" or "user_abc123") */
  profileId: string;

  /** Absolute path to the profile's data directory */
  profileDir: string;

  /** Whether this is an anonymous (unauthenticated) profile */
  isAnonymous: boolean;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Characters allowed in profile IDs. Rejects path traversal, null bytes,
 * and any character that could escape the profiles/ directory.
 */
const SAFE_PROFILE_ID = /^[a-zA-Z0-9_-]+$/;

/**
 * Validate and sanitize a profile ID to prevent path traversal attacks.
 * Throws if the ID contains dangerous characters.
 */
export function validateProfileId(id: string): void {
  if (!id || id.length === 0) {
    throw new Error('Profile ID must not be empty');
  }
  if (id.length > 128) {
    throw new Error(`Profile ID too long (${id.length} chars, max 128)`);
  }
  if (!SAFE_PROFILE_ID.test(id)) {
    throw new Error(
      `Profile ID contains invalid characters: "${id}". Only alphanumeric, hyphens, and underscores are allowed.`
    );
  }
  // Extra defense: reject anything that resolves differently than expected
  if (id === '.' || id === '..' || id.includes('/') || id.includes('\\')) {
    throw new Error(`Profile ID is a path traversal attempt: "${id}"`);
  }
}

/**
 * Assert that a resolved path is strictly inside the expected parent directory.
 * Prevents symlink attacks and path traversal.
 */
export function assertPathContainment(childPath: string, parentPath: string): void {
  const resolvedChild = path.resolve(childPath);
  const resolvedParent = path.resolve(parentPath);

  // Must start with parent + separator (prevents prefix attacks like /profiles/abc matching /profiles/abcdef)
  if (!resolvedChild.startsWith(resolvedParent + path.sep)) {
    throw new Error(
      `Path containment violation: "${resolvedChild}" is not inside "${resolvedParent}"`
    );
  }
}

// ---------------------------------------------------------------------------
// Profile resolution
// ---------------------------------------------------------------------------

/**
 * Resolve which profile to use based on authentication state.
 *
 * - If `authenticatedUserId` is provided, uses that as the profile ID.
 * - Otherwise, loads or creates a stable anonymous profile ID.
 *
 * Also ensures the profile directory exists on disk.
 *
 * @throws If the profile ID fails validation (path traversal, invalid chars).
 */
export function resolveProfile(baseDir: string, authenticatedUserId: string | null): ProfileInfo {
  const profileId = authenticatedUserId ?? getOrCreateAnonymousId(baseDir);
  const isAnonymous = authenticatedUserId === null;

  // Validate the profile ID before using it in a filesystem path
  validateProfileId(profileId);

  const profilesDir = path.join(baseDir, 'profiles');
  const profileDir = path.join(profilesDir, profileId);

  // Assert the resolved path is inside the profiles directory
  assertPathContainment(profileDir, profilesDir);

  // Ensure the profile directory exists
  fs.mkdirSync(profileDir, { recursive: true });

  return { profileId, profileDir, isAnonymous };
}

// ---------------------------------------------------------------------------
// Anonymous ID management
// ---------------------------------------------------------------------------

/**
 * Read the stable anonymous profile ID from disk, or create one if it doesn't exist.
 */
function getOrCreateAnonymousId(baseDir: string): string {
  const idFile = path.join(baseDir, 'anonymous-id');

  try {
    const existing = fs.readFileSync(idFile, 'utf-8').trim();
    if (existing) {
      // Validate the stored ID — if it was tampered with, reject it
      validateProfileId(existing);
      return existing;
    }
  } catch {
    // File doesn't exist or contents are invalid — create a new one
  }

  const id = `anon-${randomUUID()}`;
  fs.mkdirSync(baseDir, { recursive: true });
  fs.writeFileSync(idFile, id, 'utf-8');
  return id;
}

// ---------------------------------------------------------------------------
// Profile listing
// ---------------------------------------------------------------------------

/**
 * List all profile directories that exist on disk.
 */
export function listProfiles(baseDir: string): ProfileInfo[] {
  const profilesDir = path.join(baseDir, 'profiles');

  try {
    const entries = fs.readdirSync(profilesDir, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => ({
        profileId: e.name,
        profileDir: path.join(profilesDir, e.name),
        isAnonymous: e.name.startsWith('anon-'),
      }));
  } catch {
    return [];
  }
}
