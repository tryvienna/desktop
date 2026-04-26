import { describe, it, expect, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {
  resolveProfile,
  listProfiles,
  validateProfileId,
  assertPathContainment,
} from './ProfileManager';

let tmpDir: string;

afterEach(() => {
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
});

function makeTmpDir(): string {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vienna-profile-'));
  return tmpDir;
}

// ─────────────────────────────────────────────────────────────────────────────
// validateProfileId
// ─────────────────────────────────────────────────────────────────────────────

describe('validateProfileId', () => {
  it('accepts valid UUIDs', () => {
    expect(() => validateProfileId('8bde76fb-a613-4940-b5be-6742b900a3e0')).not.toThrow();
  });

  it('accepts anon-prefixed IDs', () => {
    expect(() => validateProfileId('anon-8a3ee68e-c393-4bbf-8605-e1b752f66ffb')).not.toThrow();
  });

  it('accepts alphanumeric IDs', () => {
    expect(() => validateProfileId('user_abc123')).not.toThrow();
  });

  it('rejects empty string', () => {
    expect(() => validateProfileId('')).toThrow('must not be empty');
  });

  it('rejects IDs over 128 chars', () => {
    expect(() => validateProfileId('a'.repeat(129))).toThrow('too long');
  });

  // --- Path traversal attacks ---

  it('rejects dot-dot traversal', () => {
    expect(() => validateProfileId('..')).toThrow();
  });

  it('rejects single dot', () => {
    expect(() => validateProfileId('.')).toThrow();
  });

  it('rejects forward slashes', () => {
    expect(() => validateProfileId('../../etc/passwd')).toThrow();
  });

  it('rejects backslashes', () => {
    expect(() => validateProfileId('..\\..\\windows\\system32')).toThrow();
  });

  it('rejects null bytes', () => {
    expect(() => validateProfileId('valid\0malicious')).toThrow();
  });

  it('rejects spaces', () => {
    expect(() => validateProfileId('has spaces')).toThrow();
  });

  it('rejects colons (Windows drive letters)', () => {
    expect(() => validateProfileId('C:')).toThrow();
  });

  it('rejects tilde (home directory expansion)', () => {
    expect(() => validateProfileId('~root')).toThrow();
  });

  it('rejects dots embedded in otherwise valid IDs', () => {
    expect(() => validateProfileId('foo..bar')).toThrow();
  });

  it('rejects URL-encoded traversal', () => {
    expect(() => validateProfileId('%2e%2e%2f')).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// assertPathContainment
// ─────────────────────────────────────────────────────────────────────────────

describe('assertPathContainment', () => {
  it('passes for valid child paths', () => {
    expect(() =>
      assertPathContainment('/base/profiles/user-123', '/base/profiles')
    ).not.toThrow();
  });

  it('passes for deeply nested children', () => {
    expect(() =>
      assertPathContainment('/base/profiles/user-123/data/db.sqlite', '/base/profiles')
    ).not.toThrow();
  });

  it('rejects exact parent (no traversal into parent itself)', () => {
    expect(() =>
      assertPathContainment('/base/profiles', '/base/profiles')
    ).toThrow('containment violation');
  });

  it('rejects sibling directories', () => {
    expect(() =>
      assertPathContainment('/base/other-dir', '/base/profiles')
    ).toThrow('containment violation');
  });

  it('rejects parent directory traversal', () => {
    expect(() =>
      assertPathContainment('/base/profiles/../secrets', '/base/profiles')
    ).toThrow('containment violation');
  });

  it('rejects prefix attacks (abcdef matching abc)', () => {
    // /base/profiles-evil should NOT match /base/profiles
    expect(() =>
      assertPathContainment('/base/profiles-evil/data', '/base/profiles')
    ).toThrow('containment violation');
  });

  it('handles trailing separators', () => {
    expect(() =>
      assertPathContainment('/base/profiles/user/', '/base/profiles/')
    ).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// resolveProfile — core functionality
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveProfile', () => {
  it('creates an anonymous profile when userId is null', () => {
    const base = makeTmpDir();
    const profile = resolveProfile(base, null);

    expect(profile.isAnonymous).toBe(true);
    expect(profile.profileId).toMatch(/^anon-[a-f0-9-]+$/);
    expect(profile.profileDir).toBe(path.join(base, 'profiles', profile.profileId));
    expect(fs.existsSync(profile.profileDir)).toBe(true);
  });

  it('returns a stable anonymous ID across calls', () => {
    const base = makeTmpDir();
    const first = resolveProfile(base, null);
    const second = resolveProfile(base, null);

    expect(first.profileId).toBe(second.profileId);
    expect(first.profileDir).toBe(second.profileDir);
  });

  it('creates an authenticated profile when userId is provided', () => {
    const base = makeTmpDir();
    const profile = resolveProfile(base, 'user-abc123');

    expect(profile.isAnonymous).toBe(false);
    expect(profile.profileId).toBe('user-abc123');
    expect(profile.profileDir).toBe(path.join(base, 'profiles', 'user-abc123'));
    expect(fs.existsSync(profile.profileDir)).toBe(true);
  });

  it('creates separate directories for different users', () => {
    const base = makeTmpDir();
    const anon = resolveProfile(base, null);
    const userA = resolveProfile(base, 'user-aaa');
    const userB = resolveProfile(base, 'user-bbb');

    // All directories must be unique
    const dirs = new Set([anon.profileDir, userA.profileDir, userB.profileDir]);
    expect(dirs.size).toBe(3);

    // All must exist
    for (const dir of dirs) {
      expect(fs.existsSync(dir)).toBe(true);
    }
  });

  it('profile directories are inside profiles/ subdirectory', () => {
    const base = makeTmpDir();
    const profile = resolveProfile(base, 'test-user');
    const profilesDir = path.join(base, 'profiles');

    expect(profile.profileDir.startsWith(profilesDir + path.sep)).toBe(true);
  });

  // --- Security ---

  it('rejects path traversal in authenticated userId', () => {
    const base = makeTmpDir();
    expect(() => resolveProfile(base, '../../../etc')).toThrow();
  });

  it('rejects userId with slashes', () => {
    const base = makeTmpDir();
    expect(() => resolveProfile(base, 'users/admin')).toThrow();
  });

  it('rejects userId with null bytes', () => {
    const base = makeTmpDir();
    expect(() => resolveProfile(base, 'user\0evil')).toThrow();
  });

  it('rejects empty userId', () => {
    const base = makeTmpDir();
    expect(() => resolveProfile(base, '')).toThrow();
  });

  it('rejects extremely long userId', () => {
    const base = makeTmpDir();
    expect(() => resolveProfile(base, 'a'.repeat(256))).toThrow();
  });

  // --- Anonymous ID tamper resistance ---

  it('rejects tampered anonymous-id file with path traversal', () => {
    const base = makeTmpDir();
    // Write a tampered anonymous ID
    fs.writeFileSync(path.join(base, 'anonymous-id'), '../../etc/passwd', 'utf-8');

    // Should reject the tampered ID and create a fresh one
    const profile = resolveProfile(base, null);
    expect(profile.profileId).toMatch(/^anon-[a-f0-9-]+$/);
    expect(profile.profileId).not.toBe('../../etc/passwd');
  });

  it('rejects tampered anonymous-id file with special characters', () => {
    const base = makeTmpDir();
    fs.writeFileSync(path.join(base, 'anonymous-id'), 'anon-$(rm -rf /)', 'utf-8');

    const profile = resolveProfile(base, null);
    expect(profile.profileId).toMatch(/^anon-[a-f0-9-]+$/);
  });

  // --- Data isolation guarantees ---

  it('authenticated user cannot access anonymous profile directory', () => {
    const base = makeTmpDir();
    const anon = resolveProfile(base, null);
    const auth = resolveProfile(base, 'real-user');

    // Write data to anonymous profile
    fs.writeFileSync(path.join(anon.profileDir, 'secret.txt'), 'anonymous data');

    // Authenticated profile directory must NOT contain anonymous data
    expect(fs.existsSync(path.join(auth.profileDir, 'secret.txt'))).toBe(false);
  });

  it('different authenticated users cannot access each other data', () => {
    const base = makeTmpDir();
    const userA = resolveProfile(base, 'user-aaa');
    const userB = resolveProfile(base, 'user-bbb');

    // Write data to user A's profile
    fs.writeFileSync(path.join(userA.profileDir, 'private.txt'), 'user A data');

    // User B's profile must NOT contain user A's data
    expect(fs.existsSync(path.join(userB.profileDir, 'private.txt'))).toBe(false);

    // And the data IS in user A's profile
    expect(fs.readFileSync(path.join(userA.profileDir, 'private.txt'), 'utf-8')).toBe(
      'user A data'
    );
  });

  it('switching from anon to auth and back preserves separate data', () => {
    const base = makeTmpDir();

    // Start anonymous
    const anon1 = resolveProfile(base, null);
    fs.writeFileSync(path.join(anon1.profileDir, 'data.txt'), 'anon-session-1');

    // Switch to authenticated
    const auth = resolveProfile(base, 'user-xyz');
    fs.writeFileSync(path.join(auth.profileDir, 'data.txt'), 'auth-session');

    // Switch back to anonymous
    const anon2 = resolveProfile(base, null);

    // Anonymous data should be preserved (same profile)
    expect(anon1.profileId).toBe(anon2.profileId);
    expect(fs.readFileSync(path.join(anon2.profileDir, 'data.txt'), 'utf-8')).toBe(
      'anon-session-1'
    );

    // Auth data should be separate
    expect(fs.readFileSync(path.join(auth.profileDir, 'data.txt'), 'utf-8')).toBe(
      'auth-session'
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// listProfiles
// ─────────────────────────────────────────────────────────────────────────────

describe('listProfiles', () => {
  it('returns empty array when no profiles exist', () => {
    const base = makeTmpDir();
    expect(listProfiles(base)).toEqual([]);
  });

  it('returns empty array when profiles directory does not exist', () => {
    expect(listProfiles('/nonexistent/path')).toEqual([]);
  });

  it('lists all profiles that exist on disk', () => {
    const base = makeTmpDir();
    resolveProfile(base, null);
    resolveProfile(base, 'user-abc');
    resolveProfile(base, 'user-def');

    const profiles = listProfiles(base);
    expect(profiles).toHaveLength(3);

    const ids = profiles.map((p) => p.profileId);
    expect(ids).toContain('user-abc');
    expect(ids).toContain('user-def');
    expect(ids.some((id) => id.startsWith('anon-'))).toBe(true);
  });

  it('correctly identifies anonymous vs authenticated profiles', () => {
    const base = makeTmpDir();
    resolveProfile(base, null);
    resolveProfile(base, 'user-abc');

    const profiles = listProfiles(base);
    const anon = profiles.find((p) => p.isAnonymous);
    const auth = profiles.find((p) => !p.isAnonymous);

    expect(anon).toBeDefined();
    expect(anon!.profileId).toMatch(/^anon-/);
    expect(auth).toBeDefined();
    expect(auth!.profileId).toBe('user-abc');
  });

  it('ignores files in the profiles directory (only directories)', () => {
    const base = makeTmpDir();
    resolveProfile(base, 'user-abc');

    // Create a stray file in profiles/
    fs.writeFileSync(path.join(base, 'profiles', 'stray-file.txt'), 'noise');

    const profiles = listProfiles(base);
    expect(profiles).toHaveLength(1);
    expect(profiles[0].profileId).toBe('user-abc');
  });
});
