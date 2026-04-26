import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { Database } from 'better-sqlite3';
import type { SessionRecord } from '@vienna/agent-core';
import { openDatabase, closeDatabase } from './database';
import { SessionRepository } from './sessions';
import { DirectoryRepository } from './directories';

function makeSession(overrides: Partial<SessionRecord> = {}): SessionRecord {
  const now = Date.now();
  return {
    id: randomUUID(),
    providerId: 'claude-code',
    model: 'sonnet',
    cwd: '/tmp',
    providerSessionId: null,
    workstreamId: null,
    status: 'active',
    createdAt: now,
    lastActivityAt: now,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCostCents: 0,
    ...overrides,
  };
}

describe('DirectoryRepository', () => {
  let db: Database;
  let directories: DirectoryRepository;
  let sessions: SessionRepository;
  let sessionId: string;

  beforeEach(() => {
    db = openDatabase({ path: ':memory:' });
    directories = new DirectoryRepository(db);
    sessions = new SessionRepository(db);

    const record = makeSession();
    sessions.create(record);
    sessionId = record.id;
  });

  afterEach(() => {
    closeDatabase(db);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // add / getBySession
  // ─────────────────────────────────────────────────────────────────────────

  describe('add', () => {
    it('adds a directory to a session', () => {
      directories.add(sessionId, '/Users/test/project');
      const paths = directories.getBySession(sessionId);
      expect(paths).toEqual(['/Users/test/project']);
    });

    it('deduplicates: INSERT OR IGNORE on same path', () => {
      directories.add(sessionId, '/Users/test/project');
      directories.add(sessionId, '/Users/test/project');

      const paths = directories.getBySession(sessionId);
      expect(paths).toEqual(['/Users/test/project']);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // addMany
  // ─────────────────────────────────────────────────────────────────────────

  describe('addMany', () => {
    it('adds multiple directories in a transaction', () => {
      directories.addMany(sessionId, ['/path/a', '/path/b', '/path/c']);
      const paths = directories.getBySession(sessionId);
      expect(paths).toEqual(['/path/a', '/path/b', '/path/c']);
    });

    it('deduplicates within batch', () => {
      directories.addMany(sessionId, ['/path/a', '/path/a', '/path/b']);
      const paths = directories.getBySession(sessionId);
      expect(paths).toEqual(['/path/a', '/path/b']);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getBySession
  // ─────────────────────────────────────────────────────────────────────────

  describe('getBySession', () => {
    it('returns empty array for session with no directories', () => {
      expect(directories.getBySession(sessionId)).toEqual([]);
    });

    it('returns paths sorted alphabetically', () => {
      directories.addMany(sessionId, ['/z-path', '/a-path', '/m-path']);
      expect(directories.getBySession(sessionId)).toEqual(['/a-path', '/m-path', '/z-path']);
    });

    it('isolates directories between sessions', () => {
      const otherRecord = makeSession();
      sessions.create(otherRecord);

      directories.add(sessionId, '/path/mine');
      directories.add(otherRecord.id, '/path/theirs');

      expect(directories.getBySession(sessionId)).toEqual(['/path/mine']);
      expect(directories.getBySession(otherRecord.id)).toEqual(['/path/theirs']);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // deleteBySession
  // ─────────────────────────────────────────────────────────────────────────

  describe('deleteBySession', () => {
    it('removes all directories for a session', () => {
      directories.addMany(sessionId, ['/path/a', '/path/b']);
      directories.deleteBySession(sessionId);
      expect(directories.getBySession(sessionId)).toEqual([]);
    });

    it('does not affect other sessions', () => {
      const otherRecord = makeSession();
      sessions.create(otherRecord);

      directories.add(sessionId, '/path/a');
      directories.add(otherRecord.id, '/path/b');

      directories.deleteBySession(sessionId);

      expect(directories.getBySession(sessionId)).toEqual([]);
      expect(directories.getBySession(otherRecord.id)).toEqual(['/path/b']);
    });
  });
});
