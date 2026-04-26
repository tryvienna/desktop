/**
 * WorkstreamRepository — CRUD for workstreams
 *
 * Workstreams are conversations within a project. They track agent sessions,
 * message counts, pinning, and archival status.
 * Workstreams optionally belong to a group via group_id (nullable FK).
 * Prepared statements are created once and reused.
 *
 * @module app-db/workstreams
 */

import type { Database, Statement } from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { WorkstreamRecordSchema } from './schemas';
import type { WorkstreamRecord, CreateWorkstreamInput, UpdateWorkstreamInput } from './schemas';

// ─────────────────────────────────────────────────────────────────────────────
// Row mapping (SQLite snake_case → camelCase)
// ─────────────────────────────────────────────────────────────────────────────

interface WorkstreamRow {
  id: string;
  project_id: string;
  group_id: string | null;
  title: string;
  status: string;
  model: string | null;
  is_pinned: number;
  is_routine_workstream: number;
  is_feed_workstream: number;
  active_session_id: string | null;
  message_count: number;
  last_activity_at: number | null;
  archived_at: number | null;
  forked_from_workstream_id: string | null;
  forked_at_message_id: string | null;
  created_at: number;
  updated_at: number;
}

function rowToRecord(row: WorkstreamRow): WorkstreamRecord {
  return WorkstreamRecordSchema.parse({
    id: row.id,
    projectId: row.project_id,
    groupId: row.group_id ?? null,
    title: row.title,
    status: row.status,
    model: row.model,
    isPinned: row.is_pinned === 1,
    isRoutineWorkstream: row.is_routine_workstream === 1,
    isFeedWorkstream: row.is_feed_workstream === 1,
    activeSessionId: row.active_session_id,
    messageCount: row.message_count,
    lastActivityAt: row.last_activity_at,
    archivedAt: row.archived_at ?? null,
    forkedFromWorkstreamId: row.forked_from_workstream_id ?? null,
    forkedAtMessageId: row.forked_at_message_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class WorkstreamRepository {
  private readonly insertStmt: Statement;
  private readonly getByIdStmt: Statement;
  private readonly listAllStmt: Statement;
  private readonly getByProjectStmt: Statement;
  private readonly getArchivedByProjectStmt: Statement;
  private readonly getByGroupStmt: Statement;
  private readonly updateStmt: Statement;
  private readonly setGroupStmt: Statement;
  private readonly deleteStmt: Statement;
  private readonly incrementMessageCountStmt: Statement;
  private readonly getFeedByProjectStmt: Statement;

  constructor(db: Database) {
    this.insertStmt = db.prepare(`
      INSERT INTO workstreams (id, project_id, group_id, title, status, model, is_pinned, is_routine_workstream, is_feed_workstream, active_session_id, message_count, last_activity_at, archived_at, forked_from_workstream_id, forked_at_message_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.getByIdStmt = db.prepare('SELECT * FROM workstreams WHERE id = ?');

    this.listAllStmt = db.prepare(`
      SELECT * FROM workstreams
      ORDER BY is_pinned DESC, last_activity_at DESC NULLS LAST, created_at DESC
    `);

    this.getByProjectStmt = db.prepare(`
      SELECT * FROM workstreams
      WHERE project_id = ? AND archived_at IS NULL
      ORDER BY is_pinned DESC, last_activity_at DESC NULLS LAST, created_at DESC
    `);

    this.getArchivedByProjectStmt = db.prepare(`
      SELECT * FROM workstreams
      WHERE project_id = ? AND archived_at IS NOT NULL
      ORDER BY archived_at DESC
    `);

    this.getByGroupStmt = db.prepare(`
      SELECT * FROM workstreams
      WHERE group_id = ? AND archived_at IS NULL
      ORDER BY is_pinned DESC, last_activity_at DESC NULLS LAST, created_at DESC
    `);

    this.updateStmt = db.prepare(`
      UPDATE workstreams
      SET title = ?, status = ?, model = ?, is_pinned = ?,
          group_id = ?, active_session_id = ?, message_count = ?, last_activity_at = ?,
          archived_at = ?, updated_at = ?
      WHERE id = ?
    `);

    this.setGroupStmt = db.prepare(`
      UPDATE workstreams SET group_id = ?, updated_at = ? WHERE id = ?
    `);

    this.deleteStmt = db.prepare('DELETE FROM workstreams WHERE id = ?');

    this.incrementMessageCountStmt = db.prepare(`
      UPDATE workstreams
      SET message_count = message_count + 1, last_activity_at = ?, updated_at = ?
      WHERE id = ?
    `);

    this.getFeedByProjectStmt = db.prepare(`
      SELECT * FROM workstreams
      WHERE project_id = ? AND is_feed_workstream = 1
      LIMIT 1
    `);
  }

  create(input: CreateWorkstreamInput): WorkstreamRecord {
    const now = Date.now();
    const id = randomUUID();
    this.insertStmt.run(
      id,
      input.projectId,
      input.groupId ?? null,
      input.title,
      'idle',
      input.model ?? null,
      0,                                          // is_pinned
      input.isRoutineWorkstream ? 1 : 0,          // is_routine_workstream
      input.isFeedWorkstream ? 1 : 0,             // is_feed_workstream
      null,                                       // active_session_id
      0,                                          // message_count
      null,                                       // last_activity_at
      null,                                       // archived_at
      input.forkedFromWorkstreamId ?? null,
      input.forkedAtMessageId ?? null,
      now,
      now
    );
    return this.getById(id)!;
  }

  getById(id: string): WorkstreamRecord | null {
    const row = this.getByIdStmt.get(id) as WorkstreamRow | undefined;
    return row ? rowToRecord(row) : null;
  }

  /** Get all workstreams across all projects (including archived). */
  listAll(): WorkstreamRecord[] {
    const rows = this.listAllStmt.all() as WorkstreamRow[];
    return rows.map(rowToRecord);
  }

  /** Get non-archived workstreams for a project, pinned first, then by activity. */
  getByProject(projectId: string): WorkstreamRecord[] {
    const rows = this.getByProjectStmt.all(projectId) as WorkstreamRow[];
    return rows.map(rowToRecord);
  }

  /** Get archived workstreams for a project, most recently archived first. */
  getArchivedByProject(projectId: string): WorkstreamRecord[] {
    const rows = this.getArchivedByProjectStmt.all(projectId) as WorkstreamRow[];
    return rows.map(rowToRecord);
  }

  /** Get non-archived workstreams belonging to a group. */
  getByGroup(groupId: string): WorkstreamRecord[] {
    const rows = this.getByGroupStmt.all(groupId) as WorkstreamRow[];
    return rows.map(rowToRecord);
  }

  update(id: string, input: UpdateWorkstreamInput): WorkstreamRecord | null {
    const existing = this.getById(id);
    if (!existing) return null;

    this.updateStmt.run(
      input.title ?? existing.title,
      input.status ?? existing.status,
      input.model !== undefined ? input.model : existing.model,
      input.isPinned !== undefined ? (input.isPinned ? 1 : 0) : existing.isPinned ? 1 : 0,
      input.groupId !== undefined ? input.groupId : existing.groupId,
      input.activeSessionId !== undefined ? input.activeSessionId : existing.activeSessionId,
      input.messageCount ?? existing.messageCount,
      input.lastActivityAt !== undefined ? input.lastActivityAt : existing.lastActivityAt,
      input.archivedAt !== undefined ? input.archivedAt : existing.archivedAt,
      Date.now(),
      id
    );
    return this.getById(id);
  }

  /** Move a workstream into or out of a group. Pass null to ungroup. */
  setGroup(id: string, groupId: string | null): WorkstreamRecord | null {
    const result = this.setGroupStmt.run(groupId, Date.now(), id);
    if (result.changes === 0) return null;
    return this.getById(id);
  }

  /** Atomically increment message count and update activity timestamp */
  incrementMessageCount(id: string): void {
    const now = Date.now();
    this.incrementMessageCountStmt.run(now, now, id);
  }

  /** Get the feed workstream for a project (at most one per project). */
  getFeedByProject(projectId: string): WorkstreamRecord | null {
    const row = this.getFeedByProjectStmt.get(projectId) as WorkstreamRow | undefined;
    return row ? rowToRecord(row) : null;
  }

  delete(id: string): boolean {
    const result = this.deleteStmt.run(id);
    return result.changes > 0;
  }
}
