/**
 * RoutineRepository — CRUD for routines and routine runs
 *
 * A routine is a scheduled workstream — it owns a dedicated workstream
 * and sends its prompt on a cron schedule. Run history is tracked
 * in the routine_runs table.
 *
 * @module app-db/routines
 */

import type { Database, Statement } from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import type {
  RoutineRecord,
  RoutineRunRecord,
  CreateRoutineInput,
  UpdateRoutineInput,
  RoutineStatus,
  RoutineRunStatus,
  RoutineSchedule,
} from './schemas';
import type { WorkstreamRepository } from './workstreams';

// ─────────────────────────────────────────────────────────────────────────────
// Row mapping
// ─────────────────────────────────────────────────────────────────────────────

interface RoutineRow {
  id: string;
  name: string;
  description: string | null;
  prompt: string;
  workstream_id: string;
  status: string;
  schedule: string;
  preferences: string;
  run_count: number;
  last_run_at: number | null;
  next_run_at: number | null;
  created_at: number;
  updated_at: number;
}

interface RoutineRunRow {
  id: string;
  routine_id: string;
  status: string;
  triggered_by: string;
  started_at: number;
  completed_at: number | null;
  summary: string | null;
  error: string | null;
  metadata: string;
  created_at: number;
}

function rowToRoutine(row: RoutineRow): RoutineRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    prompt: row.prompt,
    workstreamId: row.workstream_id,
    status: row.status as RoutineStatus,
    schedule: JSON.parse(row.schedule) as RoutineSchedule,
    preferences: JSON.parse(row.preferences) as Record<string, unknown>,
    runCount: row.run_count,
    lastRunAt: row.last_run_at,
    nextRunAt: row.next_run_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToRun(row: RoutineRunRow): RoutineRunRecord {
  return {
    id: row.id,
    routineId: row.routine_id,
    status: row.status as RoutineRunStatus,
    triggeredBy: row.triggered_by as 'schedule' | 'manual' | 'retry',
    startedAt: row.started_at,
    completedAt: row.completed_at,
    summary: row.summary,
    error: row.error,
    metadata: JSON.parse(row.metadata) as Record<string, unknown>,
    createdAt: row.created_at,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

/** Callback to notify the scheduler when a routine's schedule state changes */
export type ScheduleChangeCallback = (routineId: string, action: 'scheduled' | 'unscheduled' | 'refreshed') => void;

export class RoutineRepository {
  // Routine statements
  private readonly insertRoutineStmt: Statement;
  private readonly getByIdStmt: Statement;
  private readonly getByWorkstreamIdStmt: Statement;
  private readonly listAllStmt: Statement;
  private readonly listByProjectStmt: Statement;
  private readonly listActiveStmt: Statement;
  private readonly updateRoutineStmt: Statement;
  private readonly deleteRoutineStmt: Statement;
  private readonly updateStatusStmt: Statement;
  private readonly incrementRunCountStmt: Statement;
  private readonly updateNextRunAtStmt: Statement;

  // Run statements
  private readonly insertRunStmt: Statement;
  private readonly updateRunStmt: Statement;
  private readonly getRunHistoryStmt: Statement;
  private readonly getLatestRunStmt: Statement;

  /**
   * Optional callback invoked whenever a routine's schedule state changes.
   * Set by the main process to keep the RoutineScheduler in sync,
   * regardless of which entry point (IPC, GraphQL, entity action) triggers the change.
   */
  onScheduleChange: ScheduleChangeCallback | null = null;

  constructor(
    private readonly db: Database,
    private readonly workstreams: WorkstreamRepository,
  ) {
    this.insertRoutineStmt = db.prepare(`
      INSERT INTO routines (id, name, description, prompt, workstream_id, status, schedule, preferences, run_count, last_run_at, next_run_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.getByIdStmt = db.prepare('SELECT * FROM routines WHERE id = ?');
    this.getByWorkstreamIdStmt = db.prepare('SELECT * FROM routines WHERE workstream_id = ?');
    this.listAllStmt = db.prepare('SELECT * FROM routines ORDER BY created_at DESC');
    this.listByProjectStmt = db.prepare(
      'SELECT r.* FROM routines r INNER JOIN workstreams w ON r.workstream_id = w.id WHERE w.project_id = ? ORDER BY r.created_at DESC'
    );
    this.listActiveStmt = db.prepare(
      "SELECT * FROM routines WHERE status = 'active' ORDER BY next_run_at ASC"
    );

    this.updateRoutineStmt = db.prepare(`
      UPDATE routines
      SET name = ?, description = ?, prompt = ?, schedule = ?, preferences = ?, updated_at = ?
      WHERE id = ?
    `);

    this.deleteRoutineStmt = db.prepare('DELETE FROM routines WHERE id = ?');
    this.updateStatusStmt = db.prepare('UPDATE routines SET status = ?, updated_at = ? WHERE id = ?');
    this.incrementRunCountStmt = db.prepare(
      'UPDATE routines SET run_count = run_count + 1, last_run_at = ?, updated_at = ? WHERE id = ?'
    );
    this.updateNextRunAtStmt = db.prepare(
      'UPDATE routines SET next_run_at = ?, updated_at = ? WHERE id = ?'
    );

    // Run statements
    this.insertRunStmt = db.prepare(`
      INSERT INTO routine_runs (id, routine_id, status, triggered_by, started_at, completed_at, summary, error, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.updateRunStmt = db.prepare(`
      UPDATE routine_runs SET status = ?, completed_at = ?, summary = ?, error = ? WHERE id = ?
    `);

    this.getRunHistoryStmt = db.prepare(
      'SELECT * FROM routine_runs WHERE routine_id = ? ORDER BY started_at DESC LIMIT ?'
    );

    this.getLatestRunStmt = db.prepare(
      'SELECT * FROM routine_runs WHERE routine_id = ? ORDER BY started_at DESC LIMIT 1'
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Routine CRUD
  // ─────────────────────────────────────────────────────────────────────────

  /** Create a routine and its dedicated workstream (transactional) */
  create(input: CreateRoutineInput): RoutineRecord {
    const id = randomUUID();
    const now = Date.now();

    const createTransaction = this.db.transaction(() => {
      // Create dedicated workstream
      const ws = this.workstreams.create({
        projectId: input.projectId,
        title: input.name,
        isRoutineWorkstream: true,
      });

      // Create routine
      this.insertRoutineStmt.run(
        id,
        input.name,
        input.description ?? null,
        input.prompt,
        ws.id,
        'active',
        JSON.stringify(input.schedule),
        JSON.stringify(input.preferences ?? {}),
        0,
        null,
        null,
        now,
        now
      );
    });

    createTransaction();
    const routine = this.getById(id)!;
    this.onScheduleChange?.(routine.id, 'scheduled');
    return routine;
  }

  getById(id: string): RoutineRecord | null {
    const row = this.getByIdStmt.get(id) as RoutineRow | undefined;
    return row ? rowToRoutine(row) : null;
  }

  getByWorkstreamId(workstreamId: string): RoutineRecord | null {
    const row = this.getByWorkstreamIdStmt.get(workstreamId) as RoutineRow | undefined;
    return row ? rowToRoutine(row) : null;
  }

  listAll(): RoutineRecord[] {
    const rows = this.listAllStmt.all() as RoutineRow[];
    return rows.map(rowToRoutine);
  }

  listByProject(projectId: string): RoutineRecord[] {
    const rows = this.listByProjectStmt.all(projectId) as RoutineRow[];
    return rows.map(rowToRoutine);
  }

  listActive(): RoutineRecord[] {
    const rows = this.listActiveStmt.all() as RoutineRow[];
    return rows.map(rowToRoutine);
  }

  update(id: string, input: UpdateRoutineInput): RoutineRecord | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const now = Date.now();

    const doUpdate = this.db.transaction(() => {
      this.updateRoutineStmt.run(
        input.name ?? existing.name,
        input.description !== undefined ? input.description : existing.description,
        input.prompt ?? existing.prompt,
        input.schedule ? JSON.stringify(input.schedule) : JSON.stringify(existing.schedule),
        input.preferences ? JSON.stringify(input.preferences) : JSON.stringify(existing.preferences),
        now,
        id
      );

      // Sync workstream title if name changed
      if (input.name) {
        this.workstreams.update(existing.workstreamId, {
          title: input.name,
        });
      }
    });

    doUpdate();
    this.onScheduleChange?.(id, 'refreshed');
    return this.getById(id);
  }

  /** Delete routine and its dedicated workstream */
  delete(id: string): boolean {
    this.onScheduleChange?.(id, 'unscheduled');
    const routine = this.getById(id);
    const result = this.deleteRoutineStmt.run(id);
    if (result.changes > 0 && routine) {
      // Clean up the orphaned workstream (FK cascade goes the wrong direction)
      this.workstreams.delete(routine.workstreamId);
    }
    return result.changes > 0;
  }

  pause(id: string): void {
    this.updateStatusStmt.run('paused' satisfies RoutineStatus, Date.now(), id);
    this.onScheduleChange?.(id, 'unscheduled');
  }

  resume(id: string): void {
    this.updateStatusStmt.run('active' satisfies RoutineStatus, Date.now(), id);
    this.onScheduleChange?.(id, 'scheduled');
  }

  incrementRunCount(id: string): void {
    const now = Date.now();
    this.incrementRunCountStmt.run(now, now, id);
  }

  updateNextRunAt(id: string, nextRunAt: number | null): void {
    this.updateNextRunAtStmt.run(nextRunAt, Date.now(), id);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Routine Runs
  // ─────────────────────────────────────────────────────────────────────────

  createRun(routineId: string, triggeredBy: 'schedule' | 'manual' | 'retry'): RoutineRunRecord {
    const id = randomUUID();
    const now = Date.now();
    this.insertRunStmt.run(id, routineId, 'running', triggeredBy, now, null, null, null, '{}', now);
    return this.getLatestRun(routineId)!;
  }

  completeRun(
    runId: string,
    status: RoutineRunStatus,
    summary?: string,
    error?: string,
  ): void {
    this.updateRunStmt.run(status, Date.now(), summary ?? null, error ?? null, runId);
  }

  getRunHistory(routineId: string, limit = 20): RoutineRunRecord[] {
    const rows = this.getRunHistoryStmt.all(routineId, limit) as RoutineRunRow[];
    return rows.map(rowToRun);
  }

  getLatestRun(routineId: string): RoutineRunRecord | null {
    const row = this.getLatestRunStmt.get(routineId) as RoutineRunRow | undefined;
    return row ? rowToRun(row) : null;
  }
}
