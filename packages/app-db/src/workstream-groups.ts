/**
 * WorkstreamGroupRepository — CRUD for workstream groups
 *
 * Groups are named collections of related workstreams within a project.
 * They provide shared context (entities, directories) and organizational
 * structure in the navigation sidebar.
 *
 * Workstreams optionally belong to a group via group_id (nullable FK).
 * Deleting a group sets group_id to NULL on its workstreams (ON DELETE SET NULL).
 *
 * @ai-context
 * - Follows same Repository pattern as ProjectRepository / WorkstreamRepository
 * - getByProject returns pinned groups first, then by updatedAt DESC
 * - See also: GroupLinkedEntityRepository, GroupDirectoryRepository for shared context
 *
 * @module app-db/workstream-groups
 */

import type { Database, Statement } from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { WorkstreamGroupRecordSchema } from './schemas';
import type {
  WorkstreamGroupRecord,
  CreateWorkstreamGroupInput,
  UpdateWorkstreamGroupInput,
} from './schemas';

// ─────────────────────────────────────────────────────────────────────────────
// Row mapping (SQLite snake_case → camelCase)
// ─────────────────────────────────────────────────────────────────────────────

interface WorkstreamGroupRow {
  id: string;
  project_id: string;
  name: string;
  emoji: string | null;
  is_pinned: number;
  auto_create_worktrees: number;
  created_at: number;
  updated_at: number;
}

function rowToRecord(row: WorkstreamGroupRow): WorkstreamGroupRecord {
  return WorkstreamGroupRecordSchema.parse({
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    emoji: row.emoji ?? null,
    isPinned: row.is_pinned === 1,
    autoCreateWorktrees: row.auto_create_worktrees === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class WorkstreamGroupRepository {
  private readonly insertStmt: Statement;
  private readonly getByIdStmt: Statement;
  private readonly getByProjectStmt: Statement;
  private readonly updateStmt: Statement;
  private readonly deleteStmt: Statement;

  constructor(db: Database) {
    this.insertStmt = db.prepare(`
      INSERT INTO workstream_groups (id, project_id, name, emoji, is_pinned, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    this.getByIdStmt = db.prepare('SELECT * FROM workstream_groups WHERE id = ?');

    this.getByProjectStmt = db.prepare(`
      SELECT * FROM workstream_groups
      WHERE project_id = ?
      ORDER BY is_pinned DESC, updated_at DESC
    `);

    this.updateStmt = db.prepare(`
      UPDATE workstream_groups
      SET name = ?, emoji = ?, is_pinned = ?, auto_create_worktrees = ?, updated_at = ?
      WHERE id = ?
    `);

    this.deleteStmt = db.prepare('DELETE FROM workstream_groups WHERE id = ?');
  }

  create(input: CreateWorkstreamGroupInput): WorkstreamGroupRecord {
    const now = Date.now();
    const id = randomUUID();
    this.insertStmt.run(id, input.projectId, input.name, input.emoji ?? null, 0, now, now);
    return this.getById(id)!;
  }

  getById(id: string): WorkstreamGroupRecord | null {
    const row = this.getByIdStmt.get(id) as WorkstreamGroupRow | undefined;
    return row ? rowToRecord(row) : null;
  }

  /** Get all groups for a project, pinned first, then by most recent update. */
  getByProject(projectId: string): WorkstreamGroupRecord[] {
    const rows = this.getByProjectStmt.all(projectId) as WorkstreamGroupRow[];
    return rows.map(rowToRecord);
  }

  update(id: string, input: UpdateWorkstreamGroupInput): WorkstreamGroupRecord | null {
    const existing = this.getById(id);
    if (!existing) return null;

    this.updateStmt.run(
      input.name ?? existing.name,
      input.emoji !== undefined ? input.emoji : existing.emoji,
      input.isPinned !== undefined ? (input.isPinned ? 1 : 0) : existing.isPinned ? 1 : 0,
      input.autoCreateWorktrees !== undefined ? (input.autoCreateWorktrees ? 1 : 0) : existing.autoCreateWorktrees ? 1 : 0,
      Date.now(),
      id,
    );
    return this.getById(id);
  }

  delete(id: string): boolean {
    const result = this.deleteStmt.run(id);
    return result.changes > 0;
  }
}
