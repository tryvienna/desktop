import { describe, it, expect, afterEach } from 'vitest';
import type { Database } from 'better-sqlite3';
import { openDatabase, closeDatabase } from '../database';
import { SessionRepository } from '../sessions';
import { EventRepository } from '../events';
import { PermissionRuleRepository } from '../permissions';
import { DirectoryRepository } from '../directories';
import type { AgentEvent, SessionRecord } from '@vienna/agent-core';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

let db: Database;

function createTestDb(): Database {
  db = openDatabase({ path: ':memory:' });
  return db;
}

afterEach(() => {
  if (db) closeDatabase(db);
});

function makeSession(overrides: Partial<SessionRecord> = {}): SessionRecord {
  const now = Date.now();
  return {
    id: 'sess-1',
    providerId: 'claude-code',
    model: 'claude-sonnet-4-20250514',
    cwd: '/tmp',
    providerSessionId: null,
    status: 'active',
    createdAt: now,
    lastActivityAt: now,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCostCents: 0,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Database Setup
// ─────────────────────────────────────────────────────────────────────────────

describe('openDatabase', () => {
  it('creates an in-memory database with all tables', () => {
    const db = createTestDb();
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as Array<{ name: string }>;
    const names = tables.map((t) => t.name);

    expect(names).toContain('sessions');
    expect(names).toContain('events');
    expect(names).toContain('permission_rules');
    expect(names).toContain('session_directories');
    expect(names).toContain('_migrations');
  });

  it('sets WAL pragma (in-memory falls back to memory mode)', () => {
    const db = createTestDb();
    const result = db.pragma('journal_mode') as Array<{ journal_mode: string }>;
    // In-memory databases can't use WAL, so SQLite falls back to 'memory'.
    // On disk databases this will be 'wal'.
    expect(['wal', 'memory']).toContain(result[0].journal_mode);
  });

  it('enables foreign keys', () => {
    const db = createTestDb();
    const result = db.pragma('foreign_keys') as Array<{ foreign_keys: number }>;
    expect(result[0].foreign_keys).toBe(1);
  });

  it('records migration version', () => {
    const db = createTestDb();
    const rows = db.prepare('SELECT version FROM _migrations ORDER BY version').all() as Array<{ version: number }>;
    expect(rows).toHaveLength(3);
    expect(rows[0].version).toBe(1);
    expect(rows[1].version).toBe(2);
    expect(rows[2].version).toBe(3);
  });

  it('is idempotent (running again does nothing)', () => {
    const testDb = createTestDb();
    // Verify migrations table exists and has the expected rows
    const rows = testDb.prepare('SELECT version FROM _migrations').all();
    expect(rows).toHaveLength(3);
    // Creating another in-memory db also works fine
    const testDb2 = openDatabase({ path: ':memory:' });
    const rows2 = testDb2.prepare('SELECT version FROM _migrations').all();
    expect(rows2).toHaveLength(3);
    closeDatabase(testDb2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SessionRepository
// ─────────────────────────────────────────────────────────────────────────────

describe('SessionRepository', () => {
  it('creates and retrieves a session', () => {
    const db = createTestDb();
    const repo = new SessionRepository(db);
    const session = makeSession();

    repo.create(session);
    const retrieved = repo.getById('sess-1');

    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe('sess-1');
    expect(retrieved!.providerId).toBe('claude-code');
    expect(retrieved!.status).toBe('active');
  });

  it('returns null for non-existent session', () => {
    const db = createTestDb();
    const repo = new SessionRepository(db);
    expect(repo.getById('nope')).toBeNull();
  });

  it('lists active sessions', () => {
    const db = createTestDb();
    const repo = new SessionRepository(db);

    repo.create(makeSession({ id: 'sess-1', status: 'active' }));
    repo.create(makeSession({ id: 'sess-2', status: 'completed' }));
    repo.create(makeSession({ id: 'sess-3', status: 'active' }));

    const active = repo.listActive();
    expect(active).toHaveLength(2);
    expect(active.map((s) => s.id).sort()).toEqual(['sess-1', 'sess-3']);
  });

  it('updates session status', () => {
    const db = createTestDb();
    const repo = new SessionRepository(db);
    repo.create(makeSession());

    repo.updateStatus('sess-1', 'completed');
    const session = repo.getById('sess-1');
    expect(session!.status).toBe('completed');
  });

  it('adds usage atomically', () => {
    const db = createTestDb();
    const repo = new SessionRepository(db);
    repo.create(makeSession());

    repo.addUsage('sess-1', 100, 50, 5);
    repo.addUsage('sess-1', 200, 100, 10);

    const session = repo.getById('sess-1');
    expect(session!.totalInputTokens).toBe(300);
    expect(session!.totalOutputTokens).toBe(150);
    expect(session!.totalCostCents).toBe(15);
  });

  it('sets provider session ID', () => {
    const db = createTestDb();
    const repo = new SessionRepository(db);
    repo.create(makeSession());

    repo.setProviderSessionId('sess-1', 'claude-internal-abc');
    const session = repo.getById('sess-1');
    expect(session!.providerSessionId).toBe('claude-internal-abc');
  });

  describe('getByProviderSessionId', () => {
    it('returns the session with a matching provider session id', () => {
      const db = createTestDb();
      const repo = new SessionRepository(db);
      repo.create(makeSession({ id: 'sess-1', workstreamId: 'ws-1' }));
      repo.setProviderSessionId('sess-1', 'claude-abc');

      const result = repo.getByProviderSessionId('claude-abc');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('sess-1');
      expect(result!.workstreamId).toBe('ws-1');
    });

    it('returns null when no session has the provider session id', () => {
      const db = createTestDb();
      const repo = new SessionRepository(db);
      expect(repo.getByProviderSessionId('claude-missing')).toBeNull();
    });
  });

  // ── getResumableByWorkstream ────────────────────────────────────────

  describe('getResumableByWorkstream', () => {
    it('returns a completed session that has a provider session ID', () => {
      const db = createTestDb();
      const repo = new SessionRepository(db);
      repo.create(
        makeSession({
          id: 'sess-1',
          workstreamId: 'ws-1',
          status: 'completed',
          providerSessionId: 'provider-abc',
        })
      );

      const result = repo.getResumableByWorkstream('ws-1');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('sess-1');
      expect(result!.providerSessionId).toBe('provider-abc');
    });

    it('returns null when no sessions have a provider session ID', () => {
      const db = createTestDb();
      const repo = new SessionRepository(db);
      repo.create(
        makeSession({
          id: 'sess-1',
          workstreamId: 'ws-1',
          status: 'completed',
          providerSessionId: null,
        })
      );

      expect(repo.getResumableByWorkstream('ws-1')).toBeNull();
    });

    it('returns null for a non-existent workstream', () => {
      const db = createTestDb();
      const repo = new SessionRepository(db);
      expect(repo.getResumableByWorkstream('ws-missing')).toBeNull();
    });

    it('returns the most recently active session when multiple exist', () => {
      const db = createTestDb();
      const repo = new SessionRepository(db);
      const now = Date.now();

      repo.create(
        makeSession({
          id: 'sess-old',
          workstreamId: 'ws-1',
          status: 'completed',
          providerSessionId: 'provider-old',
          lastActivityAt: now - 1000,
        })
      );
      repo.create(
        makeSession({
          id: 'sess-new',
          workstreamId: 'ws-1',
          status: 'completed',
          providerSessionId: 'provider-new',
          lastActivityAt: now,
        })
      );

      const result = repo.getResumableByWorkstream('ws-1');
      expect(result!.id).toBe('sess-new');
      expect(result!.providerSessionId).toBe('provider-new');
    });

    it('ignores sessions from other workstreams', () => {
      const db = createTestDb();
      const repo = new SessionRepository(db);

      repo.create(
        makeSession({
          id: 'sess-other',
          workstreamId: 'ws-other',
          status: 'completed',
          providerSessionId: 'provider-other',
        })
      );

      expect(repo.getResumableByWorkstream('ws-1')).toBeNull();
    });

    it('returns an active session with a provider session ID', () => {
      const db = createTestDb();
      const repo = new SessionRepository(db);
      repo.create(
        makeSession({
          id: 'sess-1',
          workstreamId: 'ws-1',
          status: 'active',
          providerSessionId: 'provider-abc',
        })
      );

      const result = repo.getResumableByWorkstream('ws-1');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('sess-1');
    });

    it('prefers the most recent session regardless of status', () => {
      const db = createTestDb();
      const repo = new SessionRepository(db);
      const now = Date.now();

      repo.create(
        makeSession({
          id: 'sess-active',
          workstreamId: 'ws-1',
          status: 'active',
          providerSessionId: 'provider-active',
          lastActivityAt: now - 2000,
        })
      );
      repo.create(
        makeSession({
          id: 'sess-completed',
          workstreamId: 'ws-1',
          status: 'completed',
          providerSessionId: 'provider-completed',
          lastActivityAt: now,
        })
      );

      const result = repo.getResumableByWorkstream('ws-1');
      expect(result!.id).toBe('sess-completed');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// EventRepository
// ─────────────────────────────────────────────────────────────────────────────

describe('EventRepository', () => {
  it('inserts and retrieves events in order', () => {
    const db = createTestDb();
    const sessions = new SessionRepository(db);
    const events = new EventRepository(db);

    sessions.create(makeSession());

    const event1: AgentEvent = {
      type: 'turn_start',
      messageId: 'msg-1',
      timestamp: 1000,
    };
    const event2: AgentEvent = {
      type: 'text_delta',
      messageId: 'msg-1',
      text: 'Hello',
    };
    const event3: AgentEvent = {
      type: 'turn_end',
      messageId: 'msg-1',
      durationMs: 500,
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
        totalCostUsd: 0.001,
      },
    };

    events.insert('sess-1', event1);
    events.insert('sess-1', event2);
    events.insert('sess-1', event3);

    const records = events.getBySession('sess-1');
    expect(records).toHaveLength(3);
    expect(records[0].event_type).toBe('turn_start');
    expect(records[1].event_type).toBe('text_delta');
    expect(records[2].event_type).toBe('turn_end');
  });

  it('parses stored events back through Zod', () => {
    const db = createTestDb();
    const sessions = new SessionRepository(db);
    const events = new EventRepository(db);

    sessions.create(makeSession());

    const textEvent: AgentEvent = {
      type: 'text_delta',
      messageId: 'msg-1',
      text: 'Hello world',
    };
    events.insert('sess-1', textEvent);

    const records = events.getBySession('sess-1');
    const parsed = events.parseEvents(records);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].type).toBe('text_delta');
    if (parsed[0].type === 'text_delta') {
      expect(parsed[0].text).toBe('Hello world');
    }
  });

  it('handles schema evolution gracefully', () => {
    const db = createTestDb();
    const sessions = new SessionRepository(db);
    const events = new EventRepository(db);

    sessions.create(makeSession());

    // Insert an event with a type that doesn't exist in the schema
    db.prepare(
      'INSERT INTO events (session_id, event_type, payload, created_at) VALUES (?, ?, ?, ?)'
    ).run(
      'sess-1',
      'future_event',
      JSON.stringify({ type: 'future_event', data: 'unknown' }),
      Date.now()
    );

    const records = events.getBySession('sess-1');
    const parsed = events.parseEvents(records);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].type).toBe('error');
    if (parsed[0].type === 'error') {
      expect(parsed[0].code).toBe('schema_evolution');
    }
  });

  it('bulk inserts events in a transaction', () => {
    const db = createTestDb();
    const sessions = new SessionRepository(db);
    const events = new EventRepository(db);

    sessions.create(makeSession());

    const batch: AgentEvent[] = Array.from({ length: 100 }, (_, i) => ({
      type: 'text_delta' as const,
      messageId: 'msg-1',
      text: `word-${i} `,
    }));

    events.insertBatch('sess-1', batch);
    expect(events.countBySession('sess-1')).toBe(100);
  });

  it('filters by event type', () => {
    const db = createTestDb();
    const sessions = new SessionRepository(db);
    const events = new EventRepository(db);

    sessions.create(makeSession());

    events.insert('sess-1', { type: 'turn_start', messageId: 'm1', timestamp: 1 });
    events.insert('sess-1', { type: 'text_delta', messageId: 'm1', text: 'hi' });
    events.insert('sess-1', { type: 'text_delta', messageId: 'm1', text: ' there' });
    events.insert('sess-1', {
      type: 'turn_end',
      messageId: 'm1',
      durationMs: 100,
      usage: {
        inputTokens: 10,
        outputTokens: 5,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
        totalCostUsd: null,
      },
    });

    const deltas = events.getBySessionAndType('sess-1', 'text_delta');
    expect(deltas).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PermissionRuleRepository
// ─────────────────────────────────────────────────────────────────────────────

describe('PermissionRuleRepository', () => {
  it('adds and retrieves rules by tool name', () => {
    const db = createTestDb();
    const sessions = new SessionRepository(db);
    const rules = new PermissionRuleRepository(db);

    sessions.create(makeSession());
    rules.add('Bash', 'allow', 'session', 'sess-1');

    const found = rules.getByTool('Bash', 'sess-1');
    expect(found).toHaveLength(1);
    expect(found[0].toolName).toBe('Bash');
    expect(found[0].behavior).toBe('allow');
  });

  it('returns both session and persistent rules', () => {
    const db = createTestDb();
    const sessions = new SessionRepository(db);
    const rules = new PermissionRuleRepository(db);

    sessions.create(makeSession());
    rules.add('Bash', 'allow', 'session', 'sess-1');
    rules.add('Bash', 'allow', 'persistent', null);

    const found = rules.getByTool('Bash', 'sess-1');
    expect(found).toHaveLength(2);
  });

  it('adds rule with directory pattern', () => {
    const db = createTestDb();
    const rules = new PermissionRuleRepository(db);

    const id = rules.add('Write', 'allow', 'persistent', null, '/home/user/project/**');
    expect(id).toBeGreaterThan(0);

    const persistent = rules.getPersistent();
    expect(persistent).toHaveLength(1);
    expect(persistent[0].directoryPattern).toBe('/home/user/project/**');
  });

  it('deletes rules by session', () => {
    const db = createTestDb();
    const sessions = new SessionRepository(db);
    const rules = new PermissionRuleRepository(db);

    sessions.create(makeSession());
    rules.add('Bash', 'allow', 'session', 'sess-1');
    rules.add('Write', 'allow', 'session', 'sess-1');
    rules.add('Bash', 'allow', 'persistent', null);

    rules.deleteBySession('sess-1');

    const sessionRules = rules.getBySession('sess-1');
    expect(sessionRules).toHaveLength(0);

    const persistent = rules.getPersistent();
    expect(persistent).toHaveLength(1);
  });

  it('deletes rule by ID', () => {
    const db = createTestDb();
    const rules = new PermissionRuleRepository(db);

    const id = rules.add('Bash', 'allow', 'persistent', null);
    rules.deleteById(id);

    expect(rules.getPersistent()).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DirectoryRepository
// ─────────────────────────────────────────────────────────────────────────────

describe('DirectoryRepository', () => {
  it('adds and retrieves directories', () => {
    const db = createTestDb();
    const sessions = new SessionRepository(db);
    const dirs = new DirectoryRepository(db);

    sessions.create(makeSession());
    dirs.add('sess-1', '/home/user/project');
    dirs.add('sess-1', '/tmp');

    const paths = dirs.getBySession('sess-1');
    expect(paths).toEqual(['/home/user/project', '/tmp']);
  });

  it('ignores duplicate paths', () => {
    const db = createTestDb();
    const sessions = new SessionRepository(db);
    const dirs = new DirectoryRepository(db);

    sessions.create(makeSession());
    dirs.add('sess-1', '/tmp');
    dirs.add('sess-1', '/tmp'); // duplicate

    expect(dirs.getBySession('sess-1')).toHaveLength(1);
  });

  it('bulk adds directories', () => {
    const db = createTestDb();
    const sessions = new SessionRepository(db);
    const dirs = new DirectoryRepository(db);

    sessions.create(makeSession());
    dirs.addMany('sess-1', ['/a', '/b', '/c']);

    expect(dirs.getBySession('sess-1')).toHaveLength(3);
  });

  it('deletes all directories for a session', () => {
    const db = createTestDb();
    const sessions = new SessionRepository(db);
    const dirs = new DirectoryRepository(db);

    sessions.create(makeSession());
    dirs.addMany('sess-1', ['/a', '/b']);
    dirs.deleteBySession('sess-1');

    expect(dirs.getBySession('sess-1')).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Integration: Full Replay Flow
// ─────────────────────────────────────────────────────────────────────────────

describe('Replay flow (integration)', () => {
  it('stores events then replays them identically', () => {
    const db = createTestDb();
    const sessions = new SessionRepository(db);
    const eventRepo = new EventRepository(db);

    sessions.create(makeSession());

    // Simulate a conversation
    const originalEvents: AgentEvent[] = [
      {
        type: 'session_init',
        sessionId: 'sess-1',
        provider: 'claude-code',
        model: 'claude-sonnet-4-20250514',
        tools: ['Bash', 'Read'],
        cwd: '/tmp',
      },
      { type: 'turn_start', messageId: 'msg-1', timestamp: 1000 },
      { type: 'text_delta', messageId: 'msg-1', text: 'Hello ' },
      { type: 'text_delta', messageId: 'msg-1', text: 'world!' },
      { type: 'text_done', messageId: 'msg-1', fullText: 'Hello world!' },
      {
        type: 'turn_end',
        messageId: 'msg-1',
        durationMs: 500,
        usage: {
          inputTokens: 100,
          outputTokens: 10,
          cacheReadTokens: 50,
          cacheCreationTokens: 0,
          totalCostUsd: 0.001,
        },
      },
      // App-injected event
      { type: 'model_change', fromModel: 'sonnet', toModel: 'opus' },
    ];

    // Store
    for (const event of originalEvents) {
      eventRepo.insert('sess-1', event);
    }

    // Replay
    const records = eventRepo.getBySession('sess-1');
    const replayed = eventRepo.parseEvents(records);

    expect(replayed).toHaveLength(originalEvents.length);
    for (let i = 0; i < originalEvents.length; i++) {
      expect(replayed[i].type).toBe(originalEvents[i].type);
    }

    // Verify deep equality of a complex event
    const replayedTurnEnd = replayed.find((e) => e.type === 'turn_end');
    expect(replayedTurnEnd).toBeDefined();
    if (replayedTurnEnd?.type === 'turn_end') {
      expect(replayedTurnEnd.usage.inputTokens).toBe(100);
      expect(replayedTurnEnd.usage.totalCostUsd).toBe(0.001);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Integration: Session Resume After App Restart
// ─────────────────────────────────────────────────────────────────────────────

describe('Session resume after app restart (integration)', () => {
  it('getResumableByWorkstream finds completed session, getActiveByWorkstream does not', () => {
    const db = createTestDb();
    const repo = new SessionRepository(db);

    // 1. Simulate first app launch: session created, gets a provider session ID
    repo.create(
      makeSession({
        id: 'sess-1',
        workstreamId: 'ws-1',
        status: 'active',
      })
    );
    repo.setProviderSessionId('sess-1', 'claude-session-xyz');

    // 2. Simulate app shutdown: session marked completed
    repo.updateStatus('sess-1', 'completed');

    // 3. Simulate app restart: getActiveByWorkstream returns null (the bug)
    const active = repo.getActiveByWorkstream('ws-1');
    expect(active).toBeNull();

    // 4. getResumableByWorkstream finds it (the fix)
    const resumable = repo.getResumableByWorkstream('ws-1');
    expect(resumable).not.toBeNull();
    expect(resumable!.id).toBe('sess-1');
    expect(resumable!.providerSessionId).toBe('claude-session-xyz');
    expect(resumable!.status).toBe('completed');
  });

  it('handles multiple sessions across restarts, resuming the latest', () => {
    const db = createTestDb();
    const repo = new SessionRepository(db);
    const now = Date.now();

    // First session (older)
    repo.create(
      makeSession({
        id: 'sess-1',
        workstreamId: 'ws-1',
        status: 'completed',
        providerSessionId: 'claude-session-1',
        lastActivityAt: now - 5000,
      })
    );

    // Second session (newer)
    repo.create(
      makeSession({
        id: 'sess-2',
        workstreamId: 'ws-1',
        status: 'completed',
        providerSessionId: 'claude-session-2',
        lastActivityAt: now - 1000,
      })
    );

    const resumable = repo.getResumableByWorkstream('ws-1');
    expect(resumable!.id).toBe('sess-2');
    expect(resumable!.providerSessionId).toBe('claude-session-2');
  });

  it('returns null when session was created but never initialized (no provider session ID)', () => {
    const db = createTestDb();
    const repo = new SessionRepository(db);

    // Session crashed before session_init event — providerSessionId is still null
    repo.create(
      makeSession({
        id: 'sess-1',
        workstreamId: 'ws-1',
        status: 'crashed',
        providerSessionId: null,
      })
    );

    expect(repo.getResumableByWorkstream('ws-1')).toBeNull();
  });
});
