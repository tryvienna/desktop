/**
 * SessionRepository — CRUD for agent sessions
 *
 * All data flows through Zod schemas from @vienna/agent-core.
 * Prepared statements are created once and reused.
 *
 * @module agent-db/sessions
 */

import type { Database, Statement } from 'better-sqlite3';
import { SessionRecordSchema } from '@vienna/agent-core';
import type { SessionRecord, SessionStatus } from '@vienna/agent-core';

// ─────────────────────────────────────────────────────────────────────────────
// Row mapping (SQLite snake_case → camelCase)
// ─────────────────────────────────────────────────────────────────────────────

interface SessionRow {
  id: string;
  provider_id: string;
  model: string | null;
  cwd: string;
  provider_session_id: string | null;
  workstream_id: string | null;
  status: string;
  created_at: number;
  last_activity_at: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_cents: number;
}

function rowToRecord(row: SessionRow): SessionRecord {
  return SessionRecordSchema.parse({
    id: row.id,
    providerId: row.provider_id,
    model: row.model,
    cwd: row.cwd,
    providerSessionId: row.provider_session_id,
    workstreamId: row.workstream_id,
    status: row.status,
    createdAt: row.created_at,
    lastActivityAt: row.last_activity_at,
    totalInputTokens: row.total_input_tokens,
    totalOutputTokens: row.total_output_tokens,
    totalCostCents: row.total_cost_cents,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class SessionRepository {
  private readonly insertStmt: Statement;
  private readonly getByIdStmt: Statement;
  private readonly listActiveStmt: Statement;
  private readonly updateStatusStmt: Statement;
  private readonly updateActivityStmt: Statement;
  private readonly updateUsageStmt: Statement;
  private readonly updateProviderSessionStmt: Statement;
  private readonly getActiveByWorkstreamStmt: Statement;
  private readonly getResumableByWorkstreamStmt: Statement;
  private readonly getByWorkstreamStmt: Statement;
  private readonly updateWorkstreamStmt: Statement;

  constructor(db: Database) {
    this.insertStmt = db.prepare(`
      INSERT INTO sessions (id, provider_id, model, cwd, provider_session_id, workstream_id, status, created_at, last_activity_at, total_input_tokens, total_output_tokens, total_cost_cents)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.getByIdStmt = db.prepare('SELECT * FROM sessions WHERE id = ?');

    this.listActiveStmt = db.prepare(
      'SELECT * FROM sessions WHERE status = ? ORDER BY last_activity_at DESC'
    );

    this.updateStatusStmt = db.prepare('UPDATE sessions SET status = ? WHERE id = ?');

    this.updateActivityStmt = db.prepare('UPDATE sessions SET last_activity_at = ? WHERE id = ?');

    this.updateUsageStmt = db.prepare(`
      UPDATE sessions
      SET total_input_tokens = total_input_tokens + ?,
          total_output_tokens = total_output_tokens + ?,
          total_cost_cents = total_cost_cents + ?,
          last_activity_at = ?
      WHERE id = ?
    `);

    this.updateProviderSessionStmt = db.prepare(
      'UPDATE sessions SET provider_session_id = ? WHERE id = ?'
    );

    this.getActiveByWorkstreamStmt = db.prepare(
      "SELECT * FROM sessions WHERE workstream_id = ? AND status = 'active' ORDER BY last_activity_at DESC LIMIT 1"
    );

    // Any status — must have a provider session ID to be resumable
    this.getResumableByWorkstreamStmt = db.prepare(
      'SELECT * FROM sessions WHERE workstream_id = ? AND provider_session_id IS NOT NULL ORDER BY last_activity_at DESC LIMIT 1'
    );

    this.getByWorkstreamStmt = db.prepare(
      'SELECT * FROM sessions WHERE workstream_id = ? ORDER BY created_at DESC'
    );

    this.updateWorkstreamStmt = db.prepare('UPDATE sessions SET workstream_id = ? WHERE id = ?');
  }

  create(record: SessionRecord): void {
    this.insertStmt.run(
      record.id,
      record.providerId,
      record.model,
      record.cwd,
      record.providerSessionId,
      record.workstreamId,
      record.status,
      record.createdAt,
      record.lastActivityAt,
      record.totalInputTokens,
      record.totalOutputTokens,
      record.totalCostCents
    );
  }

  getById(id: string): SessionRecord | null {
    const row = this.getByIdStmt.get(id) as SessionRow | undefined;
    return row ? rowToRecord(row) : null;
  }

  listActive(): SessionRecord[] {
    const rows = this.listActiveStmt.all('active') as SessionRow[];
    return rows.map(rowToRecord);
  }

  updateStatus(id: string, status: SessionStatus): void {
    this.updateStatusStmt.run(status, id);
  }

  updateActivity(id: string, timestamp: number): void {
    this.updateActivityStmt.run(timestamp, id);
  }

  /** Atomically increment usage counters */
  addUsage(id: string, inputTokens: number, outputTokens: number, costCents: number): void {
    this.updateUsageStmt.run(inputTokens, outputTokens, costCents, Date.now(), id);
  }

  /** Set the provider's internal session ID (for resume support) */
  setProviderSessionId(id: string, providerSessionId: string): void {
    this.updateProviderSessionStmt.run(providerSessionId, id);
  }

  /** Clear the provider session ID so this session is no longer resumable */
  clearProviderSessionId(id: string): void {
    this.updateProviderSessionStmt.run(null, id);
  }

  /** Get the active session for a workstream */
  getActiveByWorkstream(workstreamId: string): SessionRecord | null {
    const row = this.getActiveByWorkstreamStmt.get(workstreamId) as SessionRow | undefined;
    return row ? rowToRecord(row) : null;
  }

  /** Get the most recent resumable session for a workstream (has a provider session ID, any status) */
  getResumableByWorkstream(workstreamId: string): SessionRecord | null {
    const row = this.getResumableByWorkstreamStmt.get(workstreamId) as SessionRow | undefined;
    return row ? rowToRecord(row) : null;
  }

  /** Get all sessions for a workstream (newest first) */
  getByWorkstream(workstreamId: string): SessionRecord[] {
    const rows = this.getByWorkstreamStmt.all(workstreamId) as SessionRow[];
    return rows.map(rowToRecord);
  }

  /** Bind a session to a workstream */
  setWorkstreamId(id: string, workstreamId: string | null): void {
    this.updateWorkstreamStmt.run(workstreamId, id);
  }
}
