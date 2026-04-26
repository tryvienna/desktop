/**
 * GroupDirectoryRepository — CRUD for group-level working directories
 *
 * Group directories are shared across all workstreams in a group.
 * When a directory is added to a group, it cascades to all non-archived
 * workstreams in the group as an inherited directory. When removed,
 * inherited copies are cleaned up.
 *
 * Inheritance chain: Project → Group → Workstream
 * (each level can add its own directories; workstreams inherit from both)
 *
 * @ai-context
 * - add() cascades to all non-archived workstreams in the group (marks as inherited)
 * - remove() cascades removal of inherited copies + associated branch selections
 * - inheritToWorkstream() copies all group dirs to a specific workstream (used on ws creation)
 * - Mirrors ProjectDirectoryRepository cascade pattern
 *
 * @module app-db/group-directories
 */

import type { Database, Statement } from 'better-sqlite3';
import type { GroupDirectoryRecord } from './schemas';
import { normalizeDirPath } from './path-utils';

// ─────────────────────────────────────────────────────────────────────────────
// Row mapping
// ─────────────────────────────────────────────────────────────────────────────

interface GroupDirectoryRow {
  id: number;
  group_id: string;
  path: string;
  label: string | null;
  created_at: number;
}

function rowToRecord(row: GroupDirectoryRow): GroupDirectoryRecord {
  return {
    id: row.id,
    groupId: row.group_id,
    path: row.path,
    label: row.label,
    createdAt: row.created_at,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class GroupDirectoryRepository {
  private readonly insertStmt: Statement;
  private readonly getByGroupStmt: Statement;
  private readonly existsStmt: Statement;
  private readonly removeStmt: Statement;
  // Cascade statements — operate on workstream_directories
  private readonly cascadeInsertStmt: Statement;
  private readonly cascadeRemoveStmt: Statement;
  private readonly cascadeRemoveBranchSelStmt: Statement;
  private readonly getWorkstreamIdsStmt: Statement;

  constructor(private readonly db: Database) {
    this.insertStmt = db.prepare(`
      INSERT OR IGNORE INTO workstream_group_directories (group_id, path, label, created_at)
      VALUES (?, ?, ?, ?)
    `);

    this.getByGroupStmt = db.prepare(
      'SELECT * FROM workstream_group_directories WHERE group_id = ? ORDER BY created_at ASC'
    );

    this.existsStmt = db.prepare(
      'SELECT 1 FROM workstream_group_directories WHERE group_id = ? AND path = ? LIMIT 1'
    );

    this.removeStmt = db.prepare(
      'DELETE FROM workstream_group_directories WHERE group_id = ? AND path = ?'
    );

    // Cascade: add inherited directory to a single workstream
    this.cascadeInsertStmt = db.prepare(`
      INSERT OR IGNORE INTO workstream_directories (workstream_id, path, label, is_inherited, created_at)
      VALUES (?, ?, ?, 1, ?)
    `);

    // Cascade: remove inherited directory from all workstreams in a group
    this.cascadeRemoveStmt = db.prepare(`
      DELETE FROM workstream_directories
      WHERE workstream_id IN (SELECT id FROM workstreams WHERE group_id = ?)
        AND path = ?
        AND is_inherited = 1
    `);

    // Cascade: remove branch selections for a path across all workstreams in a group
    this.cascadeRemoveBranchSelStmt = db.prepare(`
      DELETE FROM workstream_branch_selections
      WHERE workstream_id IN (SELECT id FROM workstreams WHERE group_id = ?)
        AND directory_path = ?
    `);

    // Get non-archived workstream IDs for a group
    this.getWorkstreamIdsStmt = db.prepare(
      "SELECT id FROM workstreams WHERE group_id = ? AND archived_at IS NULL"
    );
  }

  /**
   * Add a directory to a group. Automatically cascades to all
   * non-archived workstreams in the group as an inherited directory.
   * Returns true if a new row was inserted.
   */
  add(groupId: string, path: string, label?: string): boolean {
    const normalized = normalizeDirPath(path);
    const now = Date.now();

    const addWithCascade = this.db.transaction(() => {
      const result = this.insertStmt.run(groupId, normalized, label ?? null, now);
      if (result.changes === 0) return false;

      const workstreamIds = this.getWorkstreamIdsStmt.all(groupId) as Array<{ id: string }>;
      for (const { id } of workstreamIds) {
        this.cascadeInsertStmt.run(id, normalized, label ?? null, now);
      }
      return true;
    });

    return addWithCascade();
  }

  /**
   * Remove a directory from a group. Cascades: removes inherited copies
   * and associated branch selections from all workstreams in the group.
   */
  remove(groupId: string, path: string): boolean {
    const normalized = normalizeDirPath(path);

    const removeWithCascade = this.db.transaction(() => {
      this.cascadeRemoveBranchSelStmt.run(groupId, normalized);
      this.cascadeRemoveStmt.run(groupId, normalized);
      const result = this.removeStmt.run(groupId, normalized);
      return result.changes > 0;
    });

    return removeWithCascade();
  }

  /** Check if a directory exists for a group. */
  exists(groupId: string, path: string): boolean {
    const normalized = normalizeDirPath(path);
    return this.existsStmt.get(groupId, normalized) !== undefined;
  }

  /** Get all directories for a group, ordered by creation time. */
  getByGroup(groupId: string): GroupDirectoryRecord[] {
    const rows = this.getByGroupStmt.all(groupId) as GroupDirectoryRow[];
    return rows.map(rowToRecord);
  }

  /**
   * Inherit all group directories into a workstream.
   * Called when creating a new workstream within a group.
   */
  inheritToWorkstream(groupId: string, workstreamId: string): void {
    const dirs = this.getByGroup(groupId);
    const now = Date.now();
    const inherit = this.db.transaction(() => {
      for (const dir of dirs) {
        this.cascadeInsertStmt.run(workstreamId, dir.path, dir.label, now);
      }
    });
    inherit();
  }
}
