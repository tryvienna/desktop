/**
 * Unit tests for EventRepository.getUserMessagesByWorkstream* methods.
 *
 * Validates that user message history queries return the correct messages
 * in newest-first order with proper cursor-based pagination.
 */

import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import type { Database } from 'better-sqlite3';
import { openDatabase, closeDatabase } from '../database';
import { SessionRepository } from '../sessions';
import { EventRepository } from '../events';
import type { AgentEvent, SessionRecord } from '@vienna/agent-core';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

let db: Database;
let sessions: SessionRepository;
let events: EventRepository;

function createTestDb(): Database {
  db = openDatabase({ path: ':memory:' });
  sessions = new SessionRepository(db);
  events = new EventRepository(db);
  return db;
}

afterEach(() => {
  if (db) closeDatabase(db);
});

const WORKSTREAM_A = 'ws-a';
const WORKSTREAM_B = 'ws-b';

function makeSession(overrides: Partial<SessionRecord> = {}): SessionRecord {
  const now = Date.now();
  return {
    id: `sess-${Math.random().toString(36).slice(2, 8)}`,
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

function insertUserMessage(sessionId: string, text: string, timestamp?: number): void {
  const event: AgentEvent = {
    type: 'user_message',
    messageId: `msg-${Math.random().toString(36).slice(2, 8)}`,
    text,
    timestamp: timestamp ?? Date.now(),
  };
  events.insert(sessionId, event);
}

function insertAssistantEvent(sessionId: string): void {
  const event: AgentEvent = {
    type: 'message_start',
    messageId: `msg-${Math.random().toString(36).slice(2, 8)}`,
  } as AgentEvent;
  events.insert(sessionId, event);
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('EventRepository.getUserMessagesByWorkstreamTail', () => {
  beforeEach(() => {
    createTestDb();
  });

  it('returns an empty array when no messages exist', () => {
    const session = makeSession({ workstreamId: WORKSTREAM_A });
    sessions.create(session);

    const result = events.getUserMessagesByWorkstreamTail(WORKSTREAM_A, 10);
    expect(result).toEqual([]);
  });

  it('returns user messages in newest-first order', () => {
    const session = makeSession({ workstreamId: WORKSTREAM_A });
    sessions.create(session);

    insertUserMessage(session.id, 'first message', 1000);
    insertUserMessage(session.id, 'second message', 2000);
    insertUserMessage(session.id, 'third message', 3000);

    const result = events.getUserMessagesByWorkstreamTail(WORKSTREAM_A, 10);

    expect(result).toHaveLength(3);
    expect(result[0].text).toBe('third message');
    expect(result[1].text).toBe('second message');
    expect(result[2].text).toBe('first message');
  });

  it('respects the limit parameter', () => {
    const session = makeSession({ workstreamId: WORKSTREAM_A });
    sessions.create(session);

    for (let i = 0; i < 15; i++) {
      insertUserMessage(session.id, `message ${i}`, 1000 + i);
    }

    const result = events.getUserMessagesByWorkstreamTail(WORKSTREAM_A, 5);

    expect(result).toHaveLength(5);
    // Should be the 5 most recent
    expect(result[0].text).toBe('message 14');
    expect(result[4].text).toBe('message 10');
  });

  it('only returns user_message events, not other event types', () => {
    const session = makeSession({ workstreamId: WORKSTREAM_A });
    sessions.create(session);

    insertUserMessage(session.id, 'user says hello', 1000);
    insertAssistantEvent(session.id);
    insertUserMessage(session.id, 'user follows up', 2000);

    const result = events.getUserMessagesByWorkstreamTail(WORKSTREAM_A, 10);

    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('user follows up');
    expect(result[1].text).toBe('user says hello');
  });

  it('only returns messages for the specified workstream', () => {
    const sessionA = makeSession({ workstreamId: WORKSTREAM_A });
    const sessionB = makeSession({ workstreamId: WORKSTREAM_B });
    sessions.create(sessionA);
    sessions.create(sessionB);

    insertUserMessage(sessionA.id, 'message in A', 1000);
    insertUserMessage(sessionB.id, 'message in B', 2000);
    insertUserMessage(sessionA.id, 'another in A', 3000);

    const resultA = events.getUserMessagesByWorkstreamTail(WORKSTREAM_A, 10);
    const resultB = events.getUserMessagesByWorkstreamTail(WORKSTREAM_B, 10);

    expect(resultA).toHaveLength(2);
    expect(resultA[0].text).toBe('another in A');
    expect(resultA[1].text).toBe('message in A');

    expect(resultB).toHaveLength(1);
    expect(resultB[0].text).toBe('message in B');
  });

  it('spans multiple sessions for the same workstream', () => {
    const session1 = makeSession({ workstreamId: WORKSTREAM_A });
    const session2 = makeSession({ workstreamId: WORKSTREAM_A });
    sessions.create(session1);
    sessions.create(session2);

    insertUserMessage(session1.id, 'old session msg', 1000);
    insertUserMessage(session2.id, 'new session msg', 2000);

    const result = events.getUserMessagesByWorkstreamTail(WORKSTREAM_A, 10);

    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('new session msg');
    expect(result[1].text).toBe('old session msg');
  });

  it('returns eventId and timestamp for cursor support', () => {
    const session = makeSession({ workstreamId: WORKSTREAM_A });
    sessions.create(session);

    insertUserMessage(session.id, 'hello', 42000);

    const result = events.getUserMessagesByWorkstreamTail(WORKSTREAM_A, 10);

    expect(result).toHaveLength(1);
    expect(result[0].eventId).toBeGreaterThan(0);
    expect(result[0].timestamp).toBe(42000);
    expect(result[0].text).toBe('hello');
  });

  it('skips messages with empty text', () => {
    const session = makeSession({ workstreamId: WORKSTREAM_A });
    sessions.create(session);

    // Insert a user_message with empty text directly
    events.insert(session.id, {
      type: 'user_message',
      messageId: 'msg-empty',
      text: '   ',
      timestamp: 1000,
    } as AgentEvent);
    insertUserMessage(session.id, 'real message', 2000);

    const result = events.getUserMessagesByWorkstreamTail(WORKSTREAM_A, 10);

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('real message');
  });
});

describe('EventRepository.getUserMessagesByWorkstreamBefore', () => {
  beforeEach(() => {
    createTestDb();
  });

  it('returns messages before the specified cursor', () => {
    const session = makeSession({ workstreamId: WORKSTREAM_A });
    sessions.create(session);

    insertUserMessage(session.id, 'msg 1', 1000);
    insertUserMessage(session.id, 'msg 2', 2000);
    insertUserMessage(session.id, 'msg 3', 3000);
    insertUserMessage(session.id, 'msg 4', 4000);

    // Get all messages to find the cursor
    const all = events.getUserMessagesByWorkstreamTail(WORKSTREAM_A, 10);
    expect(all).toHaveLength(4);

    // Use the second item's eventId as cursor (msg 3)
    const cursor = all[1].eventId; // msg 3
    const before = events.getUserMessagesByWorkstreamBefore(WORKSTREAM_A, cursor, 10);

    // Should return msg 1 and msg 2 (everything before msg 3)
    expect(before).toHaveLength(2);
    expect(before[0].text).toBe('msg 2');
    expect(before[1].text).toBe('msg 1');
  });

  it('respects limit when paginating', () => {
    const session = makeSession({ workstreamId: WORKSTREAM_A });
    sessions.create(session);

    for (let i = 0; i < 20; i++) {
      insertUserMessage(session.id, `msg ${i}`, 1000 + i);
    }

    const all = events.getUserMessagesByWorkstreamTail(WORKSTREAM_A, 5);
    const cursor = all[all.length - 1].eventId; // oldest of the first page

    const page2 = events.getUserMessagesByWorkstreamBefore(WORKSTREAM_A, cursor, 5);

    expect(page2).toHaveLength(5);
    // Each page should return different messages
    const page1Texts = all.map((m) => m.text);
    const page2Texts = page2.map((m) => m.text);
    expect(page1Texts).not.toEqual(page2Texts);
  });

  it('returns empty array when no messages exist before cursor', () => {
    const session = makeSession({ workstreamId: WORKSTREAM_A });
    sessions.create(session);

    insertUserMessage(session.id, 'only message', 1000);

    const all = events.getUserMessagesByWorkstreamTail(WORKSTREAM_A, 10);
    const cursor = all[0].eventId;

    const before = events.getUserMessagesByWorkstreamBefore(WORKSTREAM_A, cursor, 10);
    expect(before).toEqual([]);
  });

  it('supports full pagination through all messages', () => {
    const session = makeSession({ workstreamId: WORKSTREAM_A });
    sessions.create(session);

    const totalMessages = 12;
    for (let i = 0; i < totalMessages; i++) {
      insertUserMessage(session.id, `msg ${i}`, 1000 + i);
    }

    // Page 1: latest 5
    const page1 = events.getUserMessagesByWorkstreamTail(WORKSTREAM_A, 5);
    expect(page1).toHaveLength(5);

    // Page 2: next 5 before the oldest of page 1
    const cursor1 = page1[page1.length - 1].eventId;
    const page2 = events.getUserMessagesByWorkstreamBefore(WORKSTREAM_A, cursor1, 5);
    expect(page2).toHaveLength(5);

    // Page 3: remaining 2
    const cursor2 = page2[page2.length - 1].eventId;
    const page3 = events.getUserMessagesByWorkstreamBefore(WORKSTREAM_A, cursor2, 5);
    expect(page3).toHaveLength(2);

    // All texts should be unique and cover all messages
    const allTexts = [...page1, ...page2, ...page3].map((m) => m.text);
    expect(new Set(allTexts).size).toBe(totalMessages);
  });
});
