/**
 * EventRepository — Append-only event log
 *
 * Events are the source of truth for replay. Each event is stored as
 * a JSON payload alongside its type for indexed lookups.
 *
 * Performance: prepared statements, single indexed query for replay.
 *
 * @module agent-db/events
 */

import type { Database, Statement } from 'better-sqlite3';
import type { AgentEvent } from '@vienna/agent-core';
import { AgentEventSchema } from '@vienna/agent-core';
import type { EventRecord } from '@vienna/agent-core';

// ─────────────────────────────────────────────────────────────────────────────
// Lightweight shape for user message history (no full event payload)
// ─────────────────────────────────────────────────────────────────────────────

/** A single user-sent message extracted from the event log. */
export interface UserMessageHistoryItem {
  /** Event row ID — used as cursor for pagination. */
  eventId: number;
  /** The application-level message ID (used in chat UI for scroll targeting). */
  messageId: string | null;
  /** The plain-text message the user sent. */
  text: string;
  /** Millisecond timestamp of when the message was sent. */
  timestamp: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class EventRepository {
  private readonly insertStmt: Statement;
  private readonly getBySessionStmt: Statement;
  private readonly getBySessionTailStmt: Statement;
  private readonly getBySessionAndTypeStmt: Statement;
  private readonly countBySessionStmt: Statement;
  private readonly getByWorkstreamTailStmt: Statement;
  private readonly getByWorkstreamBeforeStmt: Statement;
  private readonly deleteAfterForWorkstreamStmt: Statement;
  private readonly getCheckpointsByWorkstreamStmt: Statement;
  private readonly getRewindContextByWorkstreamStmt: Statement;
  private readonly deleteByIdStmt: Statement;
  private readonly getUserMessagesTailStmt: Statement;
  private readonly getUserMessagesBeforeStmt: Statement;

  constructor(private readonly db: Database) {
    this.insertStmt = db.prepare(`
      INSERT INTO events (session_id, event_type, payload, created_at)
      VALUES (?, ?, ?, ?)
    `);

    this.getBySessionStmt = db.prepare('SELECT * FROM events WHERE session_id = ? ORDER BY id ASC');

    // Subquery grabs the last N rows by id DESC, outer query re-orders ASC for chronological replay
    this.getBySessionTailStmt = db.prepare(
      `SELECT * FROM (
         SELECT * FROM events WHERE session_id = ? ORDER BY id DESC LIMIT ?
       ) sub ORDER BY id ASC`
    );

    this.getBySessionAndTypeStmt = db.prepare(
      'SELECT * FROM events WHERE session_id = ? AND event_type = ? ORDER BY id ASC'
    );

    this.countBySessionStmt = db.prepare(
      'SELECT COUNT(*) as count FROM events WHERE session_id = ?'
    );

    // Last N events across all sessions for a workstream, in chronological order
    this.getByWorkstreamTailStmt = db.prepare(
      `SELECT * FROM (
         SELECT e.* FROM events e
         JOIN sessions s ON e.session_id = s.id
         WHERE s.workstream_id = ?
         ORDER BY e.id DESC LIMIT ?
       ) sub ORDER BY id ASC`
    );

    // N events before a cursor (e.id < ?) for a workstream, in chronological order
    this.getByWorkstreamBeforeStmt = db.prepare(
      `SELECT * FROM (
         SELECT e.* FROM events e
         JOIN sessions s ON e.session_id = s.id
         WHERE s.workstream_id = ? AND e.id < ?
         ORDER BY e.id DESC LIMIT ?
       ) sub ORDER BY id ASC`
    );

    // Delete all events after a given event ID for a workstream's sessions
    this.deleteAfterForWorkstreamStmt = db.prepare(
      `DELETE FROM events WHERE id > ? AND session_id IN (
         SELECT id FROM sessions WHERE workstream_id = ?
       )`
    );

    // Get checkpoint events for a workstream, newest first
    this.getCheckpointsByWorkstreamStmt = db.prepare(
      `SELECT e.* FROM events e
       JOIN sessions s ON e.session_id = s.id
       WHERE s.workstream_id = ? AND e.event_type = 'checkpoint'
       ORDER BY e.id DESC`
    );

    // Get the most recent rewind_context event for a workstream
    this.getRewindContextByWorkstreamStmt = db.prepare(
      `SELECT e.* FROM events e
       JOIN sessions s ON e.session_id = s.id
       WHERE s.workstream_id = ? AND e.event_type = 'rewind_context'
       ORDER BY e.id DESC LIMIT 1`
    );

    // Delete a single event by ID
    this.deleteByIdStmt = db.prepare('DELETE FROM events WHERE id = ?');

    // Last N user_message events for a workstream, newest first (for input history)
    this.getUserMessagesTailStmt = db.prepare(
      `SELECT e.id, e.payload, e.created_at FROM events e
       JOIN sessions s ON e.session_id = s.id
       WHERE s.workstream_id = ? AND e.event_type = 'user_message'
       ORDER BY e.id DESC LIMIT ?`
    );

    // N user_message events before a cursor for a workstream, newest first
    this.getUserMessagesBeforeStmt = db.prepare(
      `SELECT e.id, e.payload, e.created_at FROM events e
       JOIN sessions s ON e.session_id = s.id
       WHERE s.workstream_id = ? AND e.event_type = 'user_message' AND e.id < ?
       ORDER BY e.id DESC LIMIT ?`
    );
  }

  /**
   * Append an event to the log.
   *
   * No Zod validation here — events should already be validated at the
   * provider boundary. JSON.stringify is the only cost.
   */
  insert(sessionId: string, event: AgentEvent): number {
    const result = this.insertStmt.run(sessionId, event.type, JSON.stringify(event), Date.now());
    return Number(result.lastInsertRowid);
  }

  /**
   * Bulk insert events in a transaction (used for batch imports).
   */
  insertBatch(sessionId: string, events: AgentEvent[]): void {
    const tx = this.db.transaction(() => {
      const now = Date.now();
      for (const event of events) {
        this.insertStmt.run(sessionId, event.type, JSON.stringify(event), now);
      }
    });
    tx();
  }

  /**
   * Get all events for a session, ordered by insertion order.
   * This is the primary query for replay.
   */
  getBySession(sessionId: string): EventRecord[] {
    return this.getBySessionStmt.all(sessionId) as EventRecord[];
  }

  /**
   * Get the last N events for a session, in chronological order.
   * Used for bounded replay to avoid loading entire session history.
   */
  getBySessionTail(sessionId: string, limit: number): EventRecord[] {
    return this.getBySessionTailStmt.all(sessionId, limit) as EventRecord[];
  }

  /**
   * Get events for a session filtered by type.
   */
  getBySessionAndType(sessionId: string, eventType: string): EventRecord[] {
    return this.getBySessionAndTypeStmt.all(sessionId, eventType) as EventRecord[];
  }

  /**
   * Parse stored event records back into AgentEvents.
   *
   * Re-validates through Zod to catch schema evolution issues.
   * Invalid events are returned as error events (never crash).
   */
  parseEvents(records: EventRecord[]): AgentEvent[] {
    return records.map((record) => {
      const result = AgentEventSchema.safeParse(JSON.parse(record.payload));
      if (result.success) {
        const event = result.data;
        // Inject DB created_at as timestamp for events that don't carry one,
        // so they sort correctly during history replay.
        // Note: raw SQLite rows use snake_case (created_at), not camelCase.
        if (!('timestamp' in event) || event.timestamp == null) {
          (event as any).timestamp = (record as any).created_at;
        }
        return event;
      }
      // Schema evolved — wrap as error so replay doesn't crash
      return {
        type: 'error' as const,
        code: 'schema_evolution',
        message: `Stored event (type: ${record.eventType}) failed validation: ${result.error.message}`,
        retryable: false,
      };
    });
  }

  /**
   * Get the last N events across all sessions for a workstream, in chronological order.
   * Single SQL query replaces per-session budget allocation.
   */
  getByWorkstreamTail(workstreamId: string, limit: number): EventRecord[] {
    return this.getByWorkstreamTailStmt.all(workstreamId, limit) as EventRecord[];
  }

  /**
   * Get N events before a cursor across all sessions for a workstream, in chronological order.
   * Used for scroll-back pagination (lazy loading older history).
   */
  getByWorkstreamBefore(workstreamId: string, beforeId: number, limit: number): EventRecord[] {
    return this.getByWorkstreamBeforeStmt.all(workstreamId, beforeId, limit) as EventRecord[];
  }

  /**
   * Count events in a session (for progress indicators).
   */
  countBySession(sessionId: string): number {
    const row = this.countBySessionStmt.get(sessionId) as { count: number };
    return row.count;
  }

  /**
   * Delete all events after a given event ID for a workstream's sessions.
   * Used by conversation rewind to truncate history at a specific point.
   * Returns the number of deleted rows.
   */
  deleteAfterForWorkstream(workstreamId: string, afterEventId: number): number {
    const result = this.deleteAfterForWorkstreamStmt.run(afterEventId, workstreamId);
    return result.changes;
  }

  /**
   * Get checkpoint events for a workstream, newest first.
   * Used to find the checkpoint UUID for file rewind.
   */
  getCheckpointsByWorkstream(workstreamId: string): EventRecord[] {
    return this.getCheckpointsByWorkstreamStmt.all(workstreamId) as EventRecord[];
  }

  /**
   * Get the most recent rewind_context event for a workstream (if any).
   * Returns null if no rewind context exists.
   */
  getRewindContextByWorkstream(workstreamId: string): EventRecord | null {
    return (this.getRewindContextByWorkstreamStmt.get(workstreamId) as EventRecord) ?? null;
  }

  /**
   * Delete a single event by its DB ID.
   * Used to consume one-time events like rewind_context after they've been read.
   */
  deleteById(id: number): void {
    this.deleteByIdStmt.run(id);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // User message history — lightweight queries for input history navigation
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get the last N user-sent messages for a workstream, newest first.
   *
   * Returns only the text + cursor metadata (no full event parsing).
   * Used to seed the chat input's up-arrow message history.
   */
  getUserMessagesByWorkstreamTail(workstreamId: string, limit: number): UserMessageHistoryItem[] {
    const rows = this.getUserMessagesTailStmt.all(workstreamId, limit) as Array<{
      id: number;
      payload: string;
      created_at: number;
    }>;
    return this.extractUserMessages(rows);
  }

  /**
   * Get N user-sent messages before a cursor for a workstream, newest first.
   *
   * Used for paginated loading as the user navigates further back in history.
   */
  getUserMessagesByWorkstreamBefore(
    workstreamId: string,
    beforeEventId: number,
    limit: number,
  ): UserMessageHistoryItem[] {
    const rows = this.getUserMessagesBeforeStmt.all(workstreamId, beforeEventId, limit) as Array<{
      id: number;
      payload: string;
      created_at: number;
    }>;
    return this.extractUserMessages(rows);
  }

  /**
   * Parse lightweight user message rows into UserMessageHistoryItem[].
   * Extracts only the `text` field from each event payload.
   */
  private extractUserMessages(
    rows: Array<{ id: number; payload: string; created_at: number }>,
  ): UserMessageHistoryItem[] {
    const items: UserMessageHistoryItem[] = [];
    for (const row of rows) {
      try {
        const parsed = JSON.parse(row.payload);
        if (typeof parsed.text === 'string' && parsed.text.trim()) {
          items.push({
            eventId: row.id,
            messageId: typeof parsed.messageId === 'string' ? parsed.messageId : null,
            text: parsed.text,
            timestamp: parsed.timestamp ?? row.created_at,
          });
        }
      } catch {
        // Skip malformed payloads — never crash for display-only data
      }
    }
    return items;
  }
}
