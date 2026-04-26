import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { RoutineRepository, RoutineRecord } from '@vienna/app-db';
import type { RoutineExecutor } from './RoutineExecutor';
import { RoutineScheduler, type RoutineSchedulerDeps } from './RoutineScheduler';

// ─── Fixtures ───────────────────────────────────────────────────────────────

function makeRoutine(overrides?: Partial<RoutineRecord>): RoutineRecord {
  return {
    id: 'routine-1',
    name: 'Test Routine',
    description: null,
    prompt: 'do things',
    workstreamId: 'ws-1',
    status: 'active',
    schedule: { type: 'interval', expression: '120000' },
    preferences: {},
    runCount: 0,
    lastRunAt: null,
    nextRunAt: null,
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

// ─── Mock factories ─────────────────────────────────────────────────────────

function createDeps(): RoutineSchedulerDeps {
  return {
    routineRepo: {
      listActive: vi.fn().mockReturnValue([]),
      getById: vi.fn().mockReturnValue(null),
      updateNextRunAt: vi.fn(),
    } as unknown as RoutineRepository,
    executor: {
      execute: vi.fn().mockResolvedValue(undefined),
    } as unknown as RoutineExecutor,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('RoutineScheduler', () => {
  let deps: RoutineSchedulerDeps;
  let scheduler: RoutineScheduler;

  beforeEach(() => {
    vi.useFakeTimers();
    deps = createDeps();
    scheduler = new RoutineScheduler(deps);
  });

  afterEach(() => {
    scheduler.stop();
    vi.useRealTimers();
  });

  describe('start', () => {
    it('loads active routines and schedules them', async () => {
      const routine = makeRoutine();
      vi.mocked(deps.routineRepo.listActive).mockReturnValue([routine]);
      vi.mocked(deps.routineRepo.getById).mockReturnValue(routine);

      await scheduler.start();

      expect(deps.routineRepo.listActive).toHaveBeenCalled();
      expect(deps.routineRepo.updateNextRunAt).toHaveBeenCalledWith(
        'routine-1',
        expect.any(Number),
      );
    });

    it('catches up overdue routines', async () => {
      const routine = makeRoutine({ nextRunAt: Date.now() - 60000 });
      vi.mocked(deps.routineRepo.listActive).mockReturnValue([routine]);
      vi.mocked(deps.routineRepo.getById).mockReturnValue(routine);

      await scheduler.start();

      expect(deps.executor.execute).toHaveBeenCalledWith('routine-1', 'schedule');
    });

    it('does not catch up future routines', async () => {
      const routine = makeRoutine({ nextRunAt: Date.now() + 60000 });
      vi.mocked(deps.routineRepo.listActive).mockReturnValue([routine]);
      vi.mocked(deps.routineRepo.getById).mockReturnValue(routine);

      await scheduler.start();

      expect(deps.executor.execute).not.toHaveBeenCalled();
    });

    it('is idempotent', async () => {
      await scheduler.start();
      await scheduler.start();

      expect(deps.routineRepo.listActive).toHaveBeenCalledTimes(1);
    });
  });

  describe('stop', () => {
    it('clears all timers', async () => {
      const routine = makeRoutine();
      vi.mocked(deps.routineRepo.listActive).mockReturnValue([routine]);
      vi.mocked(deps.routineRepo.getById).mockReturnValue(routine);

      await scheduler.start();
      scheduler.stop();

      // Advancing past the delay should not trigger execution
      vi.advanceTimersByTime(200_000);
      expect(deps.executor.execute).not.toHaveBeenCalled();
    });
  });

  describe('scheduleRoutine', () => {
    it('schedules an interval routine', () => {
      const routine = makeRoutine();
      vi.mocked(deps.routineRepo.getById).mockReturnValue(routine);

      scheduler.scheduleRoutine('routine-1');

      expect(deps.routineRepo.updateNextRunAt).toHaveBeenCalled();
    });

    it('does nothing for missing or inactive routines', () => {
      vi.mocked(deps.routineRepo.getById).mockReturnValue(null);
      scheduler.scheduleRoutine('missing');

      expect(deps.routineRepo.updateNextRunAt).not.toHaveBeenCalled();
    });

    it('skips routines with invalid interval', () => {
      const routine = makeRoutine({
        schedule: { type: 'interval', expression: 'not-a-number' },
      });
      vi.mocked(deps.routineRepo.getById).mockReturnValue(routine);

      scheduler.scheduleRoutine('routine-1');

      expect(deps.routineRepo.updateNextRunAt).not.toHaveBeenCalled();
    });

    it('skips intervals below minimum (60s)', () => {
      const routine = makeRoutine({
        schedule: { type: 'interval', expression: '1000' },
      });
      vi.mocked(deps.routineRepo.getById).mockReturnValue(routine);

      scheduler.scheduleRoutine('routine-1');

      expect(deps.routineRepo.updateNextRunAt).not.toHaveBeenCalled();
    });

    it('schedules a cron routine', () => {
      const routine = makeRoutine({
        schedule: { type: 'cron', expression: '0 9 * * *' },
      });
      vi.mocked(deps.routineRepo.getById).mockReturnValue(routine);

      scheduler.scheduleRoutine('routine-1');

      expect(deps.routineRepo.updateNextRunAt).toHaveBeenCalled();
    });

    it('handles invalid cron expression gracefully', () => {
      const routine = makeRoutine({
        schedule: { type: 'cron', expression: 'not-valid-cron' },
      });
      vi.mocked(deps.routineRepo.getById).mockReturnValue(routine);

      scheduler.scheduleRoutine('routine-1');

      expect(deps.routineRepo.updateNextRunAt).not.toHaveBeenCalled();
    });
  });

  describe('unscheduleRoutine', () => {
    it('clears the timer for a routine', () => {
      const routine = makeRoutine();
      vi.mocked(deps.routineRepo.getById).mockReturnValue(routine);

      scheduler.scheduleRoutine('routine-1');
      scheduler.unscheduleRoutine('routine-1');

      vi.advanceTimersByTime(200_000);
      expect(deps.executor.execute).not.toHaveBeenCalled();
    });

    it('is a no-op for unscheduled routines', () => {
      scheduler.unscheduleRoutine('missing');
      // Should not throw
    });
  });

  describe('timer firing', () => {
    it('executes routine when timer fires', async () => {
      const routine = makeRoutine();
      vi.mocked(deps.routineRepo.listActive).mockReturnValue([routine]);
      vi.mocked(deps.routineRepo.getById).mockReturnValue(routine);

      await scheduler.start();

      // Advance past the minimum interval (60s) + the routine interval (120s)
      await vi.advanceTimersByTimeAsync(120_000);

      expect(deps.executor.execute).toHaveBeenCalledWith('routine-1', 'schedule');
    });

    it('reschedules after firing', async () => {
      const routine = makeRoutine();
      vi.mocked(deps.routineRepo.listActive).mockReturnValue([routine]);
      vi.mocked(deps.routineRepo.getById).mockReturnValue(routine);

      await scheduler.start();
      const firstCallCount = vi.mocked(deps.routineRepo.updateNextRunAt).mock.calls.length;

      await vi.advanceTimersByTimeAsync(120_000);

      // Should have been called again for rescheduling
      expect(vi.mocked(deps.routineRepo.updateNextRunAt).mock.calls.length).toBeGreaterThan(
        firstCallCount,
      );
    });

    it('does not execute after stop', async () => {
      const routine = makeRoutine();
      vi.mocked(deps.routineRepo.listActive).mockReturnValue([routine]);
      vi.mocked(deps.routineRepo.getById).mockReturnValue(routine);

      await scheduler.start();
      scheduler.stop();

      await vi.advanceTimersByTimeAsync(200_000);

      expect(deps.executor.execute).not.toHaveBeenCalled();
    });
  });

  describe('refreshSchedule', () => {
    it('reschedules a routine', () => {
      const routine = makeRoutine();
      vi.mocked(deps.routineRepo.getById).mockReturnValue(routine);

      scheduler.scheduleRoutine('routine-1');
      scheduler.refreshSchedule('routine-1');

      // Should have been called twice (once for schedule, once for refresh)
      expect(deps.routineRepo.updateNextRunAt).toHaveBeenCalledTimes(2);
    });
  });
});
