/**
 * BranchSelectionRepository — Per-directory branch overrides for workstreams
 *
 * When a user selects a non-default branch for a directory, a branch selection
 * record is created. The selection may include a worktree path — when present,
 * the agent uses the worktree instead of the original directory.
 *
 * Key concept: "effective path" = worktreePath ?? directoryPath
 * The agent always receives effective paths, never raw directory paths
 * that have an active branch selection with a worktree.
 *
 * @module app-db/branch-selections
 */

import { randomUUID } from 'node:crypto';
import type { Database, Statement } from 'better-sqlite3';
import type { BranchSelectionRecord, DirectoryWithBranchInfo } from './schemas';
import { normalizeDirPath } from './path-utils';

// ─────────────────────────────────────────────────────────────────────────────
// Row mapping (SQLite snake_case → camelCase)
// ─────────────────────────────────────────────────────────────────────────────

interface BranchSelectionRow {
  id: string;
  workstream_id: string;
  directory_path: string;
  branch: string;
  worktree_path: string | null;
  base_branch: string;
  created_at: number;
  updated_at: number;
}

function rowToRecord(row: BranchSelectionRow): BranchSelectionRecord {
  return {
    id: row.id,
    workstreamId: row.workstream_id,
    directoryPath: row.directory_path,
    branch: row.branch,
    worktreePath: row.worktree_path,
    baseBranch: row.base_branch,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Input type
// ─────────────────────────────────────────────────────────────────────────────

export interface SetBranchSelectionInput {
  workstreamId: string;
  directoryPath: string;
  branch: string;
  worktreePath?: string;
  baseBranch?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class BranchSelectionRepository {
  private readonly listStmt: Statement;
  private readonly getStmt: Statement;
  private readonly upsertStmt: Statement;
  private readonly removeStmt: Statement;
  private readonly clearStmt: Statement;
  private readonly directoriesStmt: Statement;

  constructor(db: Database) {
    this.listStmt = db.prepare(`
      SELECT * FROM workstream_branch_selections
      WHERE workstream_id = ?
      ORDER BY directory_path
    `);

    this.getStmt = db.prepare(`
      SELECT * FROM workstream_branch_selections
      WHERE workstream_id = ? AND directory_path = ?
    `);

    this.upsertStmt = db.prepare(`
      INSERT INTO workstream_branch_selections
        (id, workstream_id, directory_path, branch, worktree_path, base_branch, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(workstream_id, directory_path) DO UPDATE SET
        branch = excluded.branch,
        worktree_path = excluded.worktree_path,
        base_branch = excluded.base_branch,
        updated_at = excluded.updated_at
    `);

    this.removeStmt = db.prepare(
      'DELETE FROM workstream_branch_selections WHERE workstream_id = ? AND directory_path = ?'
    );

    this.clearStmt = db.prepare(
      'DELETE FROM workstream_branch_selections WHERE workstream_id = ?'
    );

    this.directoriesStmt = db.prepare(
      'SELECT * FROM workstream_directories WHERE workstream_id = ? ORDER BY created_at ASC'
    );
  }

  /** List all branch selections for a workstream. */
  list(workstreamId: string): BranchSelectionRecord[] {
    const rows = this.listStmt.all(workstreamId) as BranchSelectionRow[];
    return rows.map(rowToRecord);
  }

  /** Get a branch selection for a specific directory. */
  get(workstreamId: string, directoryPath: string): BranchSelectionRecord | null {
    const normalized = normalizeDirPath(directoryPath);
    const row = this.getStmt.get(workstreamId, normalized) as BranchSelectionRow | undefined;
    return row ? rowToRecord(row) : null;
  }

  /** Create or update a branch selection (UPSERT). */
  set(input: SetBranchSelectionInput): BranchSelectionRecord {
    const normalized = normalizeDirPath(input.directoryPath);
    const now = Date.now();
    const baseBranch = input.baseBranch ?? 'main';
    const worktreePath = input.worktreePath ?? null;

    this.upsertStmt.run(
      randomUUID(),
      input.workstreamId,
      normalized,
      input.branch,
      worktreePath,
      baseBranch,
      now,
      now,
    );

    const result = this.get(input.workstreamId, normalized);
    if (!result) {
      throw new Error('Branch selection not found after upsert');
    }
    return result;
  }

  /** Remove a branch selection for a specific directory. */
  remove(workstreamId: string, directoryPath: string): boolean {
    const normalized = normalizeDirPath(directoryPath);
    const result = this.removeStmt.run(workstreamId, normalized);
    return result.changes > 0;
  }

  /** Clear all branch selections for a workstream. */
  clear(workstreamId: string): number {
    const result = this.clearStmt.run(workstreamId);
    return result.changes;
  }

  /**
   * Get working directories with branch selection info for a workstream.
   *
   * Joins workstream_directories with workstream_branch_selections to compute
   * effective paths. When a branch is selected with a worktree, the effective
   * path is the worktree path; otherwise it's the original directory path.
   */
  getDirectoriesWithBranchInfo(workstreamId: string): DirectoryWithBranchInfo[] {
    // Fetch raw directory rows
    const dirRows = this.directoriesStmt.all(workstreamId) as Array<{
      path: string;
      label: string | null;
      is_inherited: number;
    }>;

    // Build a lookup map from branch selections
    const selections = this.list(workstreamId);
    const selectionMap = new Map(selections.map((s) => [s.directoryPath, s]));

    return dirRows.map((dir) => {
      const sel = selectionMap.get(dir.path);
      return {
        path: dir.path,
        effectivePath: sel?.worktreePath ?? dir.path,
        label: dir.label,
        branch: sel?.branch ?? null,
        baseBranch: sel?.baseBranch ?? 'main',
        worktreePath: sel?.worktreePath ?? null,
        isInherited: dir.is_inherited === 1,
      };
    });
  }

  /**
   * Get deduplicated effective directory paths for agent spawning.
   * Returns worktree paths where branches are selected, original paths otherwise.
   */
  getEffectiveDirectoryPaths(workstreamId: string): string[] {
    const dirs = this.getDirectoriesWithBranchInfo(workstreamId);
    return Array.from(new Set(dirs.map((d) => d.effectivePath)));
  }
}
