/**
 * TaskRepository — CRUD for tasks
 *
 * Tasks are project-scoped work items with status, priority, assignee,
 * labels (via join table), subtasks (via parent_id), and entity links.
 * Prepared statements are created once and reused.
 *
 * @module app-db/tasks
 */

import type { Database, Statement } from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { TaskRecordSchema } from './schemas';
import type { TaskRecord, CreateTaskInput, UpdateTaskInput } from './schemas';

// ─────────────────────────────────────────────────────────────────────────────
// Row mapping (SQLite snake_case → camelCase)
// ─────────────────────────────────────────────────────────────────────────────

interface TaskRow {
  id: string;
  project_id: string;
  identifier: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignee_type: string | null;
  assignee_workstream_id: string | null;
  due_date: string | null;
  parent_id: string | null;
  links: string;
  created_at: number;
  updated_at: number;
}

function rowToRecord(row: TaskRow): TaskRecord {
  return TaskRecordSchema.parse({
    id: row.id,
    projectId: row.project_id,
    identifier: row.identifier,
    title: row.title,
    description: row.description ?? null,
    status: row.status,
    priority: row.priority,
    assigneeType: row.assignee_type ?? null,
    assigneeWorkstreamId: row.assignee_workstream_id ?? null,
    dueDate: row.due_date ?? null,
    parentId: row.parent_id ?? null,
    links: (() => {
      try { return JSON.parse(row.links); }
      catch { throw new Error(`Corrupt links JSON for task ${row.id}`); }
    })(),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class TaskRepository {
  private readonly db: Database;
  private readonly insertStmt: Statement;
  private readonly getByIdStmt: Statement;
  private readonly getByProjectStmt: Statement;
  private readonly getByParentStmt: Statement;
  private readonly updateStmt: Statement;
  private readonly deleteStmt: Statement;
  private readonly allocateIdentifierStmt: Statement;
  private readonly getLabelIdsStmt: Statement;
  private readonly clearLabelsStmt: Statement;
  private readonly addLabelStmt: Statement;

  constructor(db: Database) {
    this.db = db;

    this.insertStmt = db.prepare(`
      INSERT INTO tasks (id, project_id, identifier, title, description, status, priority, assignee_type, assignee_workstream_id, due_date, parent_id, links, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.getByIdStmt = db.prepare('SELECT * FROM tasks WHERE id = ?');

    this.getByProjectStmt = db.prepare(`
      SELECT * FROM tasks
      WHERE project_id = ?
      ORDER BY created_at DESC
    `);

    this.getByParentStmt = db.prepare(`
      SELECT * FROM tasks
      WHERE parent_id = ?
      ORDER BY created_at ASC
    `);

    this.updateStmt = db.prepare(`
      UPDATE tasks
      SET title = ?, description = ?, status = ?, priority = ?,
          assignee_type = ?, assignee_workstream_id = ?,
          due_date = ?, parent_id = ?, links = ?, updated_at = ?
      WHERE id = ?
    `);

    this.deleteStmt = db.prepare('DELETE FROM tasks WHERE id = ?');

    this.allocateIdentifierStmt = db.prepare(`
      UPDATE projects SET next_task_number = next_task_number + 1 WHERE id = ?
    `);

    this.getLabelIdsStmt = db.prepare(
      'SELECT label_id FROM task_label_assignments WHERE task_id = ?',
    );

    this.clearLabelsStmt = db.prepare(
      'DELETE FROM task_label_assignments WHERE task_id = ?',
    );

    this.addLabelStmt = db.prepare(
      'INSERT OR IGNORE INTO task_label_assignments (task_id, label_id) VALUES (?, ?)',
    );
  }

  create(input: CreateTaskInput): TaskRecord {
    const doCreate = this.db.transaction(() => {
      const now = Date.now();
      const id = randomUUID();

      // Allocate a project-scoped identifier (TASK-N) — atomic within transaction
      const numberRow = this.db
        .prepare('SELECT next_task_number FROM projects WHERE id = ?')
        .get(input.projectId) as { next_task_number: number } | undefined;
      const num = numberRow?.next_task_number ?? 1;
      this.allocateIdentifierStmt.run(input.projectId);
      const identifier = `TASK-${num}`;

      this.insertStmt.run(
        id,
        input.projectId,
        identifier,
        input.title,
        input.description ?? null,
        input.status ?? 'todo',
        input.priority ?? 'none',
        input.assigneeType ?? null,
        input.assigneeWorkstreamId ?? null,
        input.dueDate ?? null,
        input.parentId ?? null,
        JSON.stringify(input.links ?? []),
        now,
        now,
      );

      if (input.labelIds && input.labelIds.length > 0) {
        for (const labelId of input.labelIds) {
          this.addLabelStmt.run(id, labelId);
        }
      }

      return this.getById(id)!;
    });

    return doCreate();
  }

  getById(id: string): TaskRecord | null {
    const row = this.getByIdStmt.get(id) as TaskRow | undefined;
    return row ? rowToRecord(row) : null;
  }

  getByProject(projectId: string): TaskRecord[] {
    const rows = this.getByProjectStmt.all(projectId) as TaskRow[];
    return rows.map(rowToRecord);
  }

  /** Get tasks matching optional filters within a project. */
  getByProjectFiltered(
    projectId: string,
    filters?: {
      status?: string;
      priority?: string;
      assigneeType?: string;
      labelId?: string;
      parentId?: string | null;
      query?: string;
      limit?: number;
    },
  ): TaskRecord[] {
    const conditions = ['project_id = ?'];
    const params: unknown[] = [projectId];

    if (filters?.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }
    if (filters?.priority) {
      conditions.push('priority = ?');
      params.push(filters.priority);
    }
    if (filters?.assigneeType) {
      conditions.push('assignee_type = ?');
      params.push(filters.assigneeType);
    }
    if (filters?.parentId !== undefined) {
      if (filters.parentId === null) {
        conditions.push('parent_id IS NULL');
      } else {
        conditions.push('parent_id = ?');
        params.push(filters.parentId);
      }
    }
    if (filters?.labelId) {
      conditions.push(
        'id IN (SELECT task_id FROM task_label_assignments WHERE label_id = ?)',
      );
      params.push(filters.labelId);
    }
    if (filters?.query) {
      conditions.push('(title LIKE ? OR identifier LIKE ? OR description LIKE ?)');
      const q = `%${filters.query}%`;
      params.push(q, q, q);
    }

    let sql = `SELECT * FROM tasks WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`;
    if (filters?.limit) {
      sql += ` LIMIT ?`;
      params.push(filters.limit);
    }

    const rows = this.db.prepare(sql).all(...params) as TaskRow[];
    return rows.map(rowToRecord);
  }

  getByParent(parentId: string): TaskRecord[] {
    const rows = this.getByParentStmt.all(parentId) as TaskRow[];
    return rows.map(rowToRecord);
  }

  update(id: string, input: UpdateTaskInput): TaskRecord | null {
    const existing = this.getById(id);
    if (!existing) return null;

    this.updateStmt.run(
      input.title ?? existing.title,
      input.description !== undefined ? input.description : existing.description,
      input.status ?? existing.status,
      input.priority ?? existing.priority,
      input.assigneeType !== undefined ? input.assigneeType : existing.assigneeType,
      input.assigneeWorkstreamId !== undefined ? input.assigneeWorkstreamId : existing.assigneeWorkstreamId,
      input.dueDate !== undefined ? input.dueDate : existing.dueDate,
      input.parentId !== undefined ? input.parentId : existing.parentId,
      input.links !== undefined ? JSON.stringify(input.links) : JSON.stringify(existing.links),
      Date.now(),
      id,
    );

    if (input.labelIds !== undefined) {
      this.setLabelIds(id, input.labelIds);
    }

    return this.getById(id);
  }

  delete(id: string): boolean {
    const result = this.deleteStmt.run(id);
    return result.changes > 0;
  }

  // ── Label assignments ──────────────────────────────────────────────────────

  getLabelIds(taskId: string): string[] {
    const rows = this.getLabelIdsStmt.all(taskId) as Array<{ label_id: string }>;
    return rows.map((r) => r.label_id);
  }

  setLabelIds(taskId: string, labelIds: string[]): void {
    this.clearLabelsStmt.run(taskId);
    for (const labelId of labelIds) {
      this.addLabelStmt.run(taskId, labelId);
    }
  }
}
