/**
 * GroupBranchSelectionRepository — Default branch selections at the group level.
 *
 * When a directory in a group has a branch selection, new workstreams
 * inherit that branch as their default. Combined with autoCreateWorktrees,
 * each workstream can get its own unique worktree branch.
 *
 * @ai-context
 * - Mirrors BranchSelectionRepository but scoped to groups (no worktreePath)
 * - inheritToWorkstream() copies selections to a workstream's branch_selections
 * - Used during workstream creation to set default branches
 *
 * @module app-db/group-branch-selections
 */

import { randomUUID } from 'node:crypto';
import type { Database, Statement } from 'better-sqlite3';
import type { GroupBranchSelectionRecord } from './schemas';
import { normalizeDirPath } from './path-utils';

// ─────────────────────────────────────────────────────────────────────────────
// Row mapping
// ─────────────────────────────────────────────────────────────────────────────

interface GroupBranchSelectionRow {
  id: string;
  group_id: string;
  directory_path: string;
  branch: string;
  base_branch: string;
  created_at: number;
  updated_at: number;
}

function rowToRecord(row: GroupBranchSelectionRow): GroupBranchSelectionRecord {
  return {
    id: row.id,
    groupId: row.group_id,
    directoryPath: row.directory_path,
    branch: row.branch,
    baseBranch: row.base_branch,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class GroupBranchSelectionRepository {
  private readonly listStmt: Statement;
  private readonly getStmt: Statement;
  private readonly upsertStmt: Statement;
  private readonly removeStmt: Statement;
  private readonly clearStmt: Statement;
  private readonly inheritStmt: Statement;

  constructor(private readonly db: Database) {
    this.listStmt = db.prepare(`
      SELECT * FROM workstream_group_branch_selections
      WHERE group_id = ?
      ORDER BY directory_path
    `);

    this.getStmt = db.prepare(`
      SELECT * FROM workstream_group_branch_selections
      WHERE group_id = ? AND directory_path = ?
    `);

    this.upsertStmt = db.prepare(`
      INSERT INTO workstream_group_branch_selections
        (id, group_id, directory_path, branch, base_branch, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(group_id, directory_path) DO UPDATE SET
        branch = excluded.branch,
        base_branch = excluded.base_branch,
        updated_at = excluded.updated_at
    `);

    this.removeStmt = db.prepare(
      'DELETE FROM workstream_group_branch_selections WHERE group_id = ? AND directory_path = ?'
    );

    this.clearStmt = db.prepare(
      'DELETE FROM workstream_group_branch_selections WHERE group_id = ?'
    );

    // Copy group branch selections into workstream branch selections
    this.inheritStmt = db.prepare(`
      INSERT OR IGNORE INTO workstream_branch_selections
        (id, workstream_id, directory_path, branch, worktree_path, base_branch, created_at, updated_at)
      VALUES (?, ?, ?, ?, NULL, ?, ?, ?)
    `);
  }

  /** List all branch selections for a group. */
  list(groupId: string): GroupBranchSelectionRecord[] {
    const rows = this.listStmt.all(groupId) as GroupBranchSelectionRow[];
    return rows.map(rowToRecord);
  }

  /** Get a branch selection for a specific directory in a group. */
  get(groupId: string, directoryPath: string): GroupBranchSelectionRecord | null {
    const normalized = normalizeDirPath(directoryPath);
    const row = this.getStmt.get(groupId, normalized) as GroupBranchSelectionRow | undefined;
    return row ? rowToRecord(row) : null;
  }

  /** Create or update a group branch selection (UPSERT). */
  set(groupId: string, directoryPath: string, branch: string, baseBranch?: string): GroupBranchSelectionRecord {
    const normalized = normalizeDirPath(directoryPath);
    const now = Date.now();
    const base = baseBranch ?? 'main';

    this.upsertStmt.run(randomUUID(), groupId, normalized, branch, base, now, now);

    const result = this.get(groupId, normalized);
    if (!result) {
      throw new Error('Group branch selection not found after upsert');
    }
    return result;
  }

  /** Remove a branch selection for a specific directory. */
  remove(groupId: string, directoryPath: string): boolean {
    const normalized = normalizeDirPath(directoryPath);
    const result = this.removeStmt.run(groupId, normalized);
    return result.changes > 0;
  }

  /** Clear all branch selections for a group. */
  clear(groupId: string): number {
    const result = this.clearStmt.run(groupId);
    return result.changes;
  }

  /**
   * Inherit all group branch selections into a workstream.
   * Called when creating a new workstream within a group.
   * Copies each group branch selection as a workstream branch selection
   * (without worktree — worktree creation is handled separately).
   */
  inheritToWorkstream(groupId: string, workstreamId: string): void {
    const selections = this.list(groupId);
    const now = Date.now();
    const inherit = this.db.transaction(() => {
      for (const sel of selections) {
        this.inheritStmt.run(
          randomUUID(),
          workstreamId,
          sel.directoryPath,
          sel.branch,
          sel.baseBranch,
          now,
          now,
        );
      }
    });
    inherit();
  }
}
