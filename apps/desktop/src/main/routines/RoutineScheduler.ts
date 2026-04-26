/**
 * RoutineScheduler — Timer-based scheduling for routines
 *
 * Uses cron-parser for cron expressions and setTimeout for timer management.
 * Catches up overdue routines on startup to prevent missed executions.
 *
 * @module main/routines/RoutineScheduler
 */

import { CronExpressionParser } from 'cron-parser';
import type { RoutineRepository, RoutineRecord } from '@vienna/app-db';
import type { RoutineExecutor } from './RoutineExecutor';

const MIN_INTERVAL_MS = 60_000; // 60 seconds minimum

interface ScheduledRoutine {
  routineId: string;
  nextRunTime: number;
  timeoutId: ReturnType<typeof setTimeout>;
}

export interface RoutineSchedulerDeps {
  routineRepo: RoutineRepository;
  executor: RoutineExecutor;
}

export class RoutineScheduler {
  private timers = new Map<string, ScheduledRoutine>();
  private deps: RoutineSchedulerDeps;
  private running = false;

  constructor(deps: RoutineSchedulerDeps) {
    this.deps = deps;
  }

  /** Load active routines, catch up overdue, and schedule all */
  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    const activeRoutines = this.deps.routineRepo.listActive();

    for (const routine of activeRoutines) {
      // Catch up overdue routines
      if (routine.nextRunAt && routine.nextRunAt <= Date.now()) {
        // Execute in background (don't await — continue scheduling)
        this.deps.executor.execute(routine.id, 'schedule').catch(() => {
          // Errors handled inside executor
        });
      }

      this.scheduleRoutine(routine.id);
    }
  }

  /** Clear all timers and stop scheduling */
  stop(): void {
    this.running = false;
    for (const timer of this.timers.values()) {
      clearTimeout(timer.timeoutId);
    }
    this.timers.clear();
  }

  /** Schedule (or reschedule) a routine */
  scheduleRoutine(routineId: string): void {
    // Clear existing timer
    this.unscheduleRoutine(routineId);

    const routine = this.deps.routineRepo.getById(routineId);
    if (!routine || routine.status !== 'active') return;

    const nextRun = this.computeNextRun(routine);
    if (!nextRun) return;

    const delay = Math.max(nextRun - Date.now(), MIN_INTERVAL_MS);

    const timeoutId = setTimeout(() => {
      this.onTimerFire(routineId);
    }, delay);

    this.timers.set(routineId, {
      routineId,
      nextRunTime: nextRun,
      timeoutId,
    });

    // Persist next run time
    this.deps.routineRepo.updateNextRunAt(routineId, nextRun);
  }

  /** Remove a routine from the schedule */
  unscheduleRoutine(routineId: string): void {
    const timer = this.timers.get(routineId);
    if (timer) {
      clearTimeout(timer.timeoutId);
      this.timers.delete(routineId);
    }
  }

  /** Update schedule after routine config change */
  refreshSchedule(routineId: string): void {
    this.scheduleRoutine(routineId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Internal
  // ─────────────────────────────────────────────────────────────────────────

  private async onTimerFire(routineId: string): Promise<void> {
    this.timers.delete(routineId);

    if (!this.running) return;

    try {
      await this.deps.executor.execute(routineId, 'schedule');
    } catch {
      // Errors handled inside executor
    }

    // Reschedule for next occurrence
    if (this.running) {
      this.scheduleRoutine(routineId);
    }
  }

  private computeNextRun(routine: RoutineRecord): number | null {
    const { schedule } = routine;

    if (schedule.type === 'interval') {
      const intervalMs = parseInt(schedule.expression, 10);
      if (isNaN(intervalMs) || intervalMs < MIN_INTERVAL_MS) return null;
      return Date.now() + intervalMs;
    }

    if (schedule.type === 'cron') {
      try {
        const expr = CronExpressionParser.parse(schedule.expression, {
          tz: schedule.timezone,
        });
        return expr.next().toDate().getTime();
      } catch {
        return null;
      }
    }

    return null;
  }
}
