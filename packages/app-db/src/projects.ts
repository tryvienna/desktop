/**
 * ProjectRepository — CRUD for projects
 *
 * Projects are top-level containers that group workstreams.
 * Prepared statements are created once and reused.
 *
 * @module app-db/projects
 */

import type { Database, Statement } from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { ProjectRecordSchema } from './schemas';
import type { ProjectRecord, CreateProjectInput, UpdateProjectInput } from './schemas';

// ─────────────────────────────────────────────────────────────────────────────
// Row mapping (SQLite snake_case → camelCase)
// ─────────────────────────────────────────────────────────────────────────────

interface ProjectRow {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
}

function rowToRecord(row: ProjectRow): ProjectRecord {
  return ProjectRecordSchema.parse({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class ProjectRepository {
  private readonly insertStmt: Statement;
  private readonly getByIdStmt: Statement;
  private readonly listAllStmt: Statement;
  private readonly updateStmt: Statement;
  private readonly deleteStmt: Statement;

  constructor(db: Database) {
    this.insertStmt = db.prepare(`
      INSERT INTO projects (id, name, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `);

    this.getByIdStmt = db.prepare('SELECT * FROM projects WHERE id = ?');

    this.listAllStmt = db.prepare('SELECT * FROM projects ORDER BY created_at DESC');

    this.updateStmt = db.prepare(`
      UPDATE projects SET name = ?, updated_at = ? WHERE id = ?
    `);

    this.deleteStmt = db.prepare('DELETE FROM projects WHERE id = ?');
  }

  create(input: CreateProjectInput): ProjectRecord {
    const now = Date.now();
    const id = randomUUID();
    this.insertStmt.run(id, input.name, now, now);
    return this.getById(id)!;
  }

  getById(id: string): ProjectRecord | null {
    const row = this.getByIdStmt.get(id) as ProjectRow | undefined;
    return row ? rowToRecord(row) : null;
  }

  listAll(): ProjectRecord[] {
    const rows = this.listAllStmt.all() as ProjectRow[];
    return rows.map(rowToRecord);
  }

  update(id: string, input: UpdateProjectInput): ProjectRecord | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const name = input.name ?? existing.name;
    this.updateStmt.run(name, Date.now(), id);
    return this.getById(id);
  }

  delete(id: string): boolean {
    const result = this.deleteStmt.run(id);
    return result.changes > 0;
  }
}
