/**
 * Profile Isolation Integration Tests
 *
 * Simulates the full lifecycle: anonymous → authenticated → logout → anonymous.
 * Verifies that user data is never leaked between profiles at any stage.
 */

import { describe, it, expect, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { resolveProfile, listProfiles } from './ProfileManager';
import { createPaths } from '@vienna/paths/main';

let tmpDir: string;

afterEach(() => {
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
});

function makeTmpDir(): string {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vienna-integration-'));
  return tmpDir;
}

/**
 * Simulate writing user data to a profile (databases, settings, logs).
 * Returns the data written for later verification.
 */
function writeUserData(profileDir: string, label: string): Record<string, string> {
  const paths = createPaths({ baseDir: path.dirname(path.dirname(profileDir)), profileDir });
  const data: Record<string, string> = {};

  // Write settings
  data['settings'] = JSON.stringify({ user: label, theme: 'dark' });
  fs.writeFileSync(paths.settings, data['settings'], 'utf-8');

  // Write keybindings
  data['keybindings'] = JSON.stringify({ bindings: [label] });
  fs.writeFileSync(paths.keybindings, data['keybindings'], 'utf-8');

  // Write a log entry
  fs.mkdirSync(paths.logs.dir, { recursive: true });
  const logFile = path.join(paths.logs.dir, 'test.log');
  data['log'] = `[${label}] log entry\n`;
  fs.writeFileSync(logFile, data['log'], 'utf-8');

  return data;
}

/**
 * Verify that a profile's data matches what was written.
 */
function verifyUserData(profileDir: string, expected: Record<string, string>): void {
  const paths = createPaths({ baseDir: path.dirname(path.dirname(profileDir)), profileDir });

  expect(fs.readFileSync(paths.settings, 'utf-8')).toBe(expected['settings']);
  expect(fs.readFileSync(paths.keybindings, 'utf-8')).toBe(expected['keybindings']);
  expect(fs.readFileSync(path.join(paths.logs.dir, 'test.log'), 'utf-8')).toBe(expected['log']);
}

/**
 * Verify that a profile directory does NOT contain another user's data.
 */
function verifyNoDataLeak(profileDir: string, otherLabel: string): void {
  const paths = createPaths({ baseDir: path.dirname(path.dirname(profileDir)), profileDir });

  // If settings exist, they must NOT contain other user's label
  if (fs.existsSync(paths.settings)) {
    const content = fs.readFileSync(paths.settings, 'utf-8');
    expect(content).not.toContain(otherLabel);
  }

  // Same for keybindings
  if (fs.existsSync(paths.keybindings)) {
    const content = fs.readFileSync(paths.keybindings, 'utf-8');
    expect(content).not.toContain(otherLabel);
  }

  // Same for logs
  const logFile = path.join(paths.logs.dir, 'test.log');
  if (fs.existsSync(logFile)) {
    const content = fs.readFileSync(logFile, 'utf-8');
    expect(content).not.toContain(otherLabel);
  }
}

describe('Profile isolation lifecycle', () => {
  it('full lifecycle: anon → auth → logout → anon preserves isolation', () => {
    const base = makeTmpDir();

    // ── Phase 1: Anonymous user ──
    const anon1 = resolveProfile(base, null);
    const anonData = writeUserData(anon1.profileDir, 'ANON-USER');
    verifyUserData(anon1.profileDir, anonData);

    // ── Phase 2: User logs in (authenticated) ──
    const auth = resolveProfile(base, 'user-real');
    const authData = writeUserData(auth.profileDir, 'AUTH-USER');
    verifyUserData(auth.profileDir, authData);

    // Auth profile must NOT contain anonymous data
    verifyNoDataLeak(auth.profileDir, 'ANON-USER');
    // Anon profile must NOT contain auth data
    verifyNoDataLeak(anon1.profileDir, 'AUTH-USER');

    // ── Phase 3: User logs out (back to anonymous) ──
    const anon2 = resolveProfile(base, null);

    // Must be the same anonymous profile
    expect(anon2.profileId).toBe(anon1.profileId);

    // Anonymous data must be preserved
    verifyUserData(anon2.profileDir, anonData);

    // Must NOT contain auth data
    verifyNoDataLeak(anon2.profileDir, 'AUTH-USER');

    // Auth data must also be preserved (separate profile)
    verifyUserData(auth.profileDir, authData);
  });

  it('multiple authenticated users are fully isolated', () => {
    const base = makeTmpDir();

    const userA = resolveProfile(base, 'alice');
    const userB = resolveProfile(base, 'bob');
    const userC = resolveProfile(base, 'charlie');

    const dataA = writeUserData(userA.profileDir, 'ALICE');
    const dataB = writeUserData(userB.profileDir, 'BOB');
    const dataC = writeUserData(userC.profileDir, 'CHARLIE');

    // Each user's data is correct
    verifyUserData(userA.profileDir, dataA);
    verifyUserData(userB.profileDir, dataB);
    verifyUserData(userC.profileDir, dataC);

    // No cross-contamination
    verifyNoDataLeak(userA.profileDir, 'BOB');
    verifyNoDataLeak(userA.profileDir, 'CHARLIE');
    verifyNoDataLeak(userB.profileDir, 'ALICE');
    verifyNoDataLeak(userB.profileDir, 'CHARLIE');
    verifyNoDataLeak(userC.profileDir, 'ALICE');
    verifyNoDataLeak(userC.profileDir, 'BOB');
  });

  it('profile paths use ViennaPaths consistently', () => {
    const base = makeTmpDir();
    const profile = resolveProfile(base, 'test-user');
    const paths = createPaths({ baseDir: base, profileDir: profile.profileDir });

    // Every path must be under the profile directory
    const allPaths = [
      paths.appDb,
      paths.agentDb,
      paths.settings,
      paths.keybindings,
      paths.secureStorage,
      paths.registryCache,
      paths.logs.dir,
      paths.logs.currentSession,
      paths.logs.session('any-session'),
      paths.logs.sessionLog('any-session'),
    ];

    for (const p of allPaths) {
      expect(p.startsWith(profile.profileDir)).toBe(true);
    }

    // None should be under baseDir directly (must be inside profiles/)
    for (const p of allPaths) {
      const relativePath = path.relative(base, p);
      expect(relativePath.startsWith('profiles' + path.sep)).toBe(true);
    }
  });

  it('root baseDir only contains bootstrap files', () => {
    const base = makeTmpDir();

    // Create profiles and write data
    resolveProfile(base, null);
    resolveProfile(base, 'user-abc');

    // Check what's at the root level
    const rootEntries = fs.readdirSync(base);

    // Only allowed root-level entries:
    // - anonymous-id (bootstrap file)
    // - profiles/ (directory containing all user profiles)
    // - secure-storage/ (auth bootstrap - by design)
    const allowedRootEntries = new Set(['anonymous-id', 'profiles']);

    for (const entry of rootEntries) {
      expect(
        allowedRootEntries.has(entry),
        `Unexpected root-level entry: "${entry}" — user data must be inside profiles/`
      ).toBe(true);
    }
  });

  it('profile listing reflects all created profiles', () => {
    const base = makeTmpDir();

    resolveProfile(base, null);
    resolveProfile(base, 'user-1');
    resolveProfile(base, 'user-2');

    const profiles = listProfiles(base);
    expect(profiles).toHaveLength(3);

    // Every profile should have a valid, unique directory
    const dirs = profiles.map((p) => p.profileDir);
    expect(new Set(dirs).size).toBe(3);

    // Every profile directory must exist
    for (const p of profiles) {
      expect(fs.existsSync(p.profileDir)).toBe(true);
    }
  });
});
