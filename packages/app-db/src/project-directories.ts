/**
 * ProjectDirectoryRepository — CRUD for project-level working directories
 *
 * Project directories are global to a project and automatically inherited
 * by all workstreams. When a project directory is added, it cascades to
 * every non-archived workstream as an inherited directory. When removed,
 * inherited copies are cleaned up.
 *
 * @module app-db/project-directories
 */

import type { Database, Statement } from 'better-sqlite3';
import type { ProjectDirectoryRecord } from './schemas';
import { normalizeDirPath } from './path-utils';

// ─────────────────────────────────────────────────────────────────────────────
// Row mapping
// ─────────────────────────────────────────────────────────────────────────────

interface ProjectDirectoryRow {
  id: number;
  project_id: string;
  path: string;
  label: string | null;
  created_at: number;
}

function rowToRecord(row: ProjectDirectoryRow): ProjectDirectoryRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    path: row.path,
    label: row.label,
    createdAt: row.created_at,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class ProjectDirectoryRepository {
  private readonly insertStmt: Statement;
  private readonly getByProjectStmt: Statement;
  private readonly existsStmt: Statement;
  private readonly removeStmt: Statement;
  // Cascade statements — operate on workstream_directories
  private readonly cascadeInsertStmt: Statement;
  private readonly cascadeRemoveStmt: Statement;
  private readonly cascadeRemoveBranchSelStmt: Statement;
  private readonly getWorkstreamIdsStmt: Statement;

  constructor(private readonly db: Database) {
    this.insertStmt = db.prepare(`
      INSERT OR IGNORE INTO project_directories (project_id, path, label, created_at)
      VALUES (?, ?, ?, ?)
    `);

    this.getByProjectStmt = db.prepare(
      'SELECT * FROM project_directories WHERE project_id = ? ORDER BY created_at ASC'
    );

    this.existsStmt = db.prepare(
      'SELECT 1 FROM project_directories WHERE project_id = ? AND path = ? LIMIT 1'
    );

    this.removeStmt = db.prepare(
      'DELETE FROM project_directories WHERE project_id = ? AND path = ?'
    );

    // Cascade: add inherited directory to a single workstream
    this.cascadeInsertStmt = db.prepare(`
      INSERT OR IGNORE INTO workstream_directories (workstream_id, path, label, is_inherited, created_at)
      VALUES (?, ?, ?, 1, ?)
    `);

    // Cascade: remove inherited directory from all workstreams in a project
    this.cascadeRemoveStmt = db.prepare(`
      DELETE FROM workstream_directories
      WHERE workstream_id IN (SELECT id FROM workstreams WHERE project_id = ?)
        AND path = ?
        AND is_inherited = 1
    `);

    // Cascade: remove branch selections for a path across all workstreams in a project
    this.cascadeRemoveBranchSelStmt = db.prepare(`
      DELETE FROM workstream_branch_selections
      WHERE workstream_id IN (SELECT id FROM workstreams WHERE project_id = ?)
        AND directory_path = ?
    `);

    // Get non-archived workstream IDs for a project
    this.getWorkstreamIdsStmt = db.prepare(
      "SELECT id FROM workstreams WHERE project_id = ? AND archived_at IS NULL"
    );
  }

  /**
   * Add a directory to a project. Automatically cascades to all
   * non-archived workstreams as an inherited directory.
   * Returns true if a new row was inserted.
   */
  add(projectId: string, path: string, label?: string): boolean {
    const normalized = normalizeDirPath(path);
    const now = Date.now();

    const addWithCascade = this.db.transaction(() => {
      const result = this.insertStmt.run(projectId, normalized, label ?? null, now);
      if (result.changes === 0) return false; // already exists

      // Cascade to all non-archived workstreams
      const workstreamIds = this.getWorkstreamIdsStmt.all(projectId) as Array<{ id: string }>;
      for (const { id } of workstreamIds) {
        this.cascadeInsertStmt.run(id, normalized, label ?? null, now);
      }
      return true;
    });

    return addWithCascade();
  }

  /**
   * Remove a directory from a project. Cascades: removes inherited copies
   * and associated branch selections from all workstreams.
   */
  remove(projectId: string, path: string): boolean {
    const normalized = normalizeDirPath(path);

    const removeWithCascade = this.db.transaction(() => {
      // Remove branch selections first (before workstream directory rows)
      this.cascadeRemoveBranchSelStmt.run(projectId, normalized);
      // Remove inherited copies from workstreams
      this.cascadeRemoveStmt.run(projectId, normalized);
      // Remove from project_directories
      const result = this.removeStmt.run(projectId, normalized);
      return result.changes > 0;
    });

    return removeWithCascade();
  }

  /** Check if a directory exists for a project. */
  exists(projectId: string, path: string): boolean {
    const normalized = normalizeDirPath(path);
    return this.existsStmt.get(projectId, normalized) !== undefined;
  }

  /** Get all directories for a project, ordered by creation time. */
  getByProject(projectId: string): ProjectDirectoryRecord[] {
    const rows = this.getByProjectStmt.all(projectId) as ProjectDirectoryRow[];
    return rows.map(rowToRecord);
  }

  /**
   * Inherit all project directories into a workstream.
   * Called when creating a new workstream.
   */
  inheritToWorkstream(projectId: string, workstreamId: string): void {
    const dirs = this.getByProject(projectId);
    const now = Date.now();
    const inherit = this.db.transaction(() => {
      for (const dir of dirs) {
        this.cascadeInsertStmt.run(workstreamId, dir.path, dir.label, now);
      }
    });
    inherit();
  }
}
