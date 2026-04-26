/**
 * Path Isolation Tests
 *
 * Verifies that ViennaPaths routes ALL user data paths through the profile
 * directory and never writes user data to the root baseDir.
 */

import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { createPaths } from '../main';

const BASE = '/app/data';
const PROFILE_A = '/app/data/profiles/user-aaa';
const PROFILE_B = '/app/data/profiles/user-bbb';
const PROFILE_ANON = '/app/data/profiles/anon-12345';

describe('path isolation', () => {
  describe('all user data paths are inside profileDir', () => {
    const paths = createPaths({ baseDir: BASE, profileDir: PROFILE_A });

    const userDataPaths = [
      ['appDb', paths.appDb],
      ['agentDb', paths.agentDb],
      ['settings', paths.settings],
      ['keybindings', paths.keybindings],
      ['secureStorage', paths.secureStorage],
      ['registryCache', paths.registryCache],
      ['logs.dir', paths.logs.dir],
      ['logs.currentSession', paths.logs.currentSession],
      ['logs.session(id)', paths.logs.session('test-session')],
      ['logs.sessionLog(id)', paths.logs.sessionLog('test-session')],
    ] as const;

    for (const [name, value] of userDataPaths) {
      it(`${name} is inside profileDir`, () => {
        expect(value.startsWith(PROFILE_A)).toBe(true);
      });

      it(`${name} is NOT directly under baseDir`, () => {
        // Must be inside profiles/ subdirectory, not directly under baseDir
        const relativeToBase = path.relative(BASE, value);
        expect(relativeToBase.startsWith('profiles')).toBe(true);
      });
    }
  });

  describe('different profiles produce different paths', () => {
    const pathsA = createPaths({ baseDir: BASE, profileDir: PROFILE_A });
    const pathsB = createPaths({ baseDir: BASE, profileDir: PROFILE_B });

    const pathPairs = [
      ['appDb', pathsA.appDb, pathsB.appDb],
      ['agentDb', pathsA.agentDb, pathsB.agentDb],
      ['settings', pathsA.settings, pathsB.settings],
      ['keybindings', pathsA.keybindings, pathsB.keybindings],
      ['secureStorage', pathsA.secureStorage, pathsB.secureStorage],
      ['registryCache', pathsA.registryCache, pathsB.registryCache],
      ['logs.dir', pathsA.logs.dir, pathsB.logs.dir],
    ] as const;

    for (const [name, valueA, valueB] of pathPairs) {
      it(`${name} differs between profiles`, () => {
        expect(valueA).not.toBe(valueB);
      });
    }
  });

  describe('anonymous and authenticated profiles are isolated', () => {
    const pathsAuth = createPaths({ baseDir: BASE, profileDir: PROFILE_A });
    const pathsAnon = createPaths({ baseDir: BASE, profileDir: PROFILE_ANON });

    it('databases are in completely different directories', () => {
      expect(path.dirname(pathsAuth.appDb)).not.toBe(path.dirname(pathsAnon.appDb));
    });

    it('no path from profile A is a prefix of profile B paths', () => {
      expect(pathsAuth.appDb.startsWith(PROFILE_ANON)).toBe(false);
      expect(pathsAnon.appDb.startsWith(PROFILE_A)).toBe(false);
    });
  });

  describe('baseDir is only used as root reference', () => {
    const paths = createPaths({ baseDir: BASE, profileDir: PROFILE_A });

    it('baseDir is exposed for reference', () => {
      expect(paths.baseDir).toBe(BASE);
    });

    it('no user data path equals baseDir', () => {
      expect(paths.appDb).not.toBe(BASE);
      expect(paths.agentDb).not.toBe(BASE);
      expect(paths.settings).not.toBe(BASE);
      expect(paths.logs.dir).not.toBe(BASE);
    });
  });

  describe('path structure is predictable', () => {
    const paths = createPaths({ baseDir: BASE, profileDir: PROFILE_A });

    it('databases are at profile root', () => {
      expect(paths.appDb).toBe(path.join(PROFILE_A, 'app.db'));
      expect(paths.agentDb).toBe(path.join(PROFILE_A, 'agent.db'));
    });

    it('config files are at profile root', () => {
      expect(paths.settings).toBe(path.join(PROFILE_A, 'settings.json'));
      expect(paths.keybindings).toBe(path.join(PROFILE_A, 'keybindings.json'));
    });

    it('subdirectories are under profile', () => {
      expect(paths.secureStorage).toBe(path.join(PROFILE_A, 'secure-storage'));
      expect(paths.registryCache).toBe(path.join(PROFILE_A, 'registry-cache'));
      expect(paths.logs.dir).toBe(path.join(PROFILE_A, 'logs'));
    });
  });
});
