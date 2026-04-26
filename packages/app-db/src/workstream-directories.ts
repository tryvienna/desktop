/**
 * WorkstreamDirectoryRepository — CRUD for workstream working directories
 *
 * Each workstream can have multiple working directories that define which
 * filesystem paths the agent can access. Directories can be inherited from
 * the parent project or added directly.
 *
 * All paths are normalized (absolute, no trailing slash) and deduplicated
 * via a UNIQUE(workstream_id, path) constraint.
 *
 * @module app-db/workstream-directories
 */

import type { Database, Statement } from 'better-sqlite3';
import type { WorkstreamDirectoryRecord } from './schemas';
import { normalizeDirPath } from './path-utils';

// ─────────────────────────────────────────────────────────────────────────────
// Row mapping (SQLite snake_case → camelCase)
// ─────────────────────────────────────────────────────────────────────────────

interface DirectoryRow {
  id: number;
  workstream_id: string;
  path: string;
  label: string | null;
  is_inherited: number;
  created_at: number;
}

function rowToRecord(row: DirectoryRow): WorkstreamDirectoryRecord {
  return {
    id: row.id,
    workstreamId: row.workstream_id,
    path: row.path,
    label: row.label,
    isInherited: row.is_inherited === 1,
    createdAt: row.created_at,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class WorkstreamDirectoryRepository {
  private readonly insertStmt: Statement;
  private readonly getByWorkstreamStmt: Statement;
  private readonly existsStmt: Statement;
  private readonly updateLabelStmt: Statement;
  private readonly removeStmt: Statement;
  private readonly removeAllStmt: Statement;

  constructor(private readonly db: Database) {
    this.insertStmt = db.prepare(`
      INSERT OR IGNORE INTO workstream_directories (workstream_id, path, label, is_inherited, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    this.getByWorkstreamStmt = db.prepare(
      'SELECT * FROM workstream_directories WHERE workstream_id = ? ORDER BY created_at ASC'
    );

    this.existsStmt = db.prepare(
      'SELECT 1 FROM workstream_directories WHERE workstream_id = ? AND path = ? LIMIT 1'
    );

    this.updateLabelStmt = db.prepare(
      'UPDATE workstream_directories SET label = ? WHERE workstream_id = ? AND path = ?'
    );

    this.removeStmt = db.prepare(
      'DELETE FROM workstream_directories WHERE workstream_id = ? AND path = ?'
    );

    this.removeAllStmt = db.prepare('DELETE FROM workstream_directories WHERE workstream_id = ?');
  }

  /**
   * Add a directory. Path is normalized and deduplicated (silently skips duplicates).
   * Returns true if a new row was inserted.
   */
  add(workstreamId: string, path: string, label?: string, isInherited = false): boolean {
    const normalized = normalizeDirPath(path);
    const result = this.insertStmt.run(
      workstreamId, normalized, label ?? null, isInherited ? 1 : 0, Date.now()
    );
    return result.changes > 0;
  }

  /**
   * Batch-add directories in a transaction. Paths are normalized and deduplicated.
   */
  addMany(workstreamId: string, paths: string[]): void {
    const insertMany = this.db.transaction(() => {
      const now = Date.now();
      for (const p of paths) {
        const normalized = normalizeDirPath(p);
        this.insertStmt.run(workstreamId, normalized, null, 0, now);
      }
    });
    insertMany();
  }

  /** Check if a directory exists for a workstream. */
  exists(workstreamId: string, path: string): boolean {
    const normalized = normalizeDirPath(path);
    return this.existsStmt.get(workstreamId, normalized) !== undefined;
  }

  /** Get all directories for a workstream, ordered by creation time. */
  getByWorkstream(workstreamId: string): WorkstreamDirectoryRecord[] {
    const rows = this.getByWorkstreamStmt.all(workstreamId) as DirectoryRow[];
    return rows.map(rowToRecord);
  }

  /** Update the label for a directory. Returns true if the row was found. */
  updateLabel(workstreamId: string, path: string, label: string | null): boolean {
    const normalized = normalizeDirPath(path);
    const result = this.updateLabelStmt.run(label, workstreamId, normalized);
    return result.changes > 0;
  }

  /** Remove a specific directory. Returns true if a row was deleted. */
  remove(workstreamId: string, path: string): boolean {
    const normalized = normalizeDirPath(path);
    const result = this.removeStmt.run(workstreamId, normalized);
    return result.changes > 0;
  }

  /** Remove all directories for a workstream. */
  removeAll(workstreamId: string): void {
    this.removeAllStmt.run(workstreamId);
  }
}
