/**
 * TaskLabelRepository — CRUD for task labels
 *
 * Labels are project-scoped color-coded tags that can be assigned to tasks.
 * Prepared statements are created once and reused.
 *
 * @module app-db/task-labels
 */

import type { Database, Statement } from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { TaskLabelRecordSchema } from './schemas';
import type { TaskLabelRecord, CreateTaskLabelInput, UpdateTaskLabelInput } from './schemas';

// ─────────────────────────────────────────────────────────────────────────────
// Row mapping
// ─────────────────────────────────────────────────────────────────────────────

interface TaskLabelRow {
  id: string;
  project_id: string;
  name: string;
  color: string;
  created_at: number;
}

function rowToRecord(row: TaskLabelRow): TaskLabelRecord {
  return TaskLabelRecordSchema.parse({
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class TaskLabelRepository {
  private readonly insertStmt: Statement;
  private readonly getByIdStmt: Statement;
  private readonly getByProjectStmt: Statement;
  private readonly updateStmt: Statement;
  private readonly deleteStmt: Statement;

  constructor(db: Database) {
    this.insertStmt = db.prepare(`
      INSERT INTO task_labels (id, project_id, name, color, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    this.getByIdStmt = db.prepare('SELECT * FROM task_labels WHERE id = ?');

    this.getByProjectStmt = db.prepare(`
      SELECT * FROM task_labels
      WHERE project_id = ?
      ORDER BY name ASC
    `);

    this.updateStmt = db.prepare(`
      UPDATE task_labels SET name = ?, color = ? WHERE id = ?
    `);

    this.deleteStmt = db.prepare('DELETE FROM task_labels WHERE id = ?');
  }

  create(input: CreateTaskLabelInput): TaskLabelRecord {
    const id = randomUUID();
    const now = Date.now();
    this.insertStmt.run(id, input.projectId, input.name, input.color, now);
    return this.getById(id)!;
  }

  getById(id: string): TaskLabelRecord | null {
    const row = this.getByIdStmt.get(id) as TaskLabelRow | undefined;
    return row ? rowToRecord(row) : null;
  }

  getByProject(projectId: string): TaskLabelRecord[] {
    const rows = this.getByProjectStmt.all(projectId) as TaskLabelRow[];
    return rows.map(rowToRecord);
  }

  update(id: string, input: UpdateTaskLabelInput): TaskLabelRecord | null {
    const existing = this.getById(id);
    if (!existing) return null;

    this.updateStmt.run(
      input.name ?? existing.name,
      input.color ?? existing.color,
      id,
    );
    return this.getById(id);
  }

  delete(id: string): boolean {
    const result = this.deleteStmt.run(id);
    return result.changes > 0;
  }
}
