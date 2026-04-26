import { describe, it, expect, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { createPaths } from '../main';

const BASE = '/mock/userData';
const PROFILE = '/mock/userData/profiles/anon-abc123';

describe('createPaths', () => {
  it('should expose baseDir and profileDir', () => {
    const paths = createPaths({ baseDir: BASE, profileDir: PROFILE });
    expect(paths.baseDir).toBe(BASE);
    expect(paths.profileDir).toBe(PROFILE);
  });

  it('should return profile-scoped database paths', () => {
    const paths = createPaths({ baseDir: BASE, profileDir: PROFILE });
    expect(paths.appDb).toBe(path.join(PROFILE, 'app.db'));
    expect(paths.agentDb).toBe(path.join(PROFILE, 'agent.db'));
  });

  it('should return profile-scoped config paths', () => {
    const paths = createPaths({ baseDir: BASE, profileDir: PROFILE });
    expect(paths.settings).toBe(path.join(PROFILE, 'settings.json'));
    expect(paths.keybindings).toBe(path.join(PROFILE, 'keybindings.json'));
  });

  it('should return profile-scoped storage paths', () => {
    const paths = createPaths({ baseDir: BASE, profileDir: PROFILE });
    expect(paths.secureStorage).toBe(path.join(PROFILE, 'secure-storage'));
    expect(paths.registryCache).toBe(path.join(PROFILE, 'registry-cache'));
  });

  it('should return whisperModels under baseDir (shared across profiles)', () => {
    const paths = createPaths({ baseDir: BASE, profileDir: PROFILE });
    expect(paths.whisperModels).toBe(path.join(BASE, 'whisper-models'));
  });

  describe('logs', () => {
    it('should return log dir under profileDir', () => {
      const paths = createPaths({ baseDir: BASE, profileDir: PROFILE });
      expect(paths.logs.dir).toBe(path.join(PROFILE, 'logs'));
    });

    it('should return session directory for a given ID', () => {
      const paths = createPaths({ baseDir: BASE, profileDir: PROFILE });
      expect(paths.logs.session('abc-123')).toBe(path.join(PROFILE, 'logs', 'abc-123'));
    });

    it('should return session log file path', () => {
      const paths = createPaths({ baseDir: BASE, profileDir: PROFILE });
      expect(paths.logs.sessionLog('abc-123')).toBe(
        path.join(PROFILE, 'logs', 'abc-123', 'vienna.log')
      );
    });

    it('should return current-session pointer path', () => {
      const paths = createPaths({ baseDir: BASE, profileDir: PROFILE });
      expect(paths.logs.currentSession).toBe(path.join(PROFILE, 'logs', 'current-session'));
    });

    it('should handle timestamp-style session IDs', () => {
      const paths = createPaths({ baseDir: BASE, profileDir: PROFILE });
      const id = '2026-02-28T16-06-43-123Z_a3f1b2';
      expect(paths.logs.session(id)).toBe(path.join(PROFILE, 'logs', id));
      expect(paths.logs.sessionLog(id)).toBe(path.join(PROFILE, 'logs', id, 'vienna.log'));
    });
  });

  describe('different base directories', () => {
    it('should handle paths with spaces', () => {
      const base = '/Users/test user/Library/Application Support/Vienna';
      const profile = path.join(base, 'profiles', 'anon-123');
      const paths = createPaths({ baseDir: base, profileDir: profile });
      expect(paths.logs.dir).toBe(path.join(profile, 'logs'));
    });
  });
});

describe('createPaths integration', () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should produce paths valid for directory creation and file writes', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vienna-paths-'));
    const profileDir = path.join(tmpDir, 'profiles', 'anon-test');
    fs.mkdirSync(profileDir, { recursive: true });
    const paths = createPaths({ baseDir: tmpDir, profileDir });

    // Create log directory
    fs.mkdirSync(paths.logs.dir, { recursive: true });
    expect(fs.existsSync(paths.logs.dir)).toBe(true);

    // Create a session directory and write a log file
    const sessionId = 'test-session';
    fs.mkdirSync(paths.logs.session(sessionId), { recursive: true });
    fs.writeFileSync(paths.logs.sessionLog(sessionId), '{"level":"info","msg":"hello"}\n');
    expect(fs.readFileSync(paths.logs.sessionLog(sessionId), 'utf8')).toContain('hello');

    // Write current-session pointer
    fs.writeFileSync(paths.logs.currentSession, sessionId);
    expect(fs.readFileSync(paths.logs.currentSession, 'utf8')).toBe(sessionId);

    // Verify database paths
    fs.writeFileSync(paths.appDb, '');
    expect(fs.existsSync(paths.appDb)).toBe(true);
    expect(paths.appDb).toContain('profiles/anon-test/app.db');
  });
});
