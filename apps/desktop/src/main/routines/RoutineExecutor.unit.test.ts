import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { RoutineRepository, RoutineRecord, RoutineRunRecord } from '@vienna/app-db';
import type { WorkstreamManager } from '../workstream/WorkstreamManager';
import { RoutineExecutor, type RoutineExecutorDeps } from './RoutineExecutor';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const ROUTINE: RoutineRecord = {
  id: 'routine-1',
  name: 'Daily Check',
  description: 'Check system health',
  prompt: 'Run health checks',
  workstreamId: 'ws-1',
  status: 'active',
  schedule: { type: 'interval', expression: '3600000' },
  preferences: {},
  runCount: 5,
  lastRunAt: null,
  nextRunAt: null,
  createdAt: 1000,
  updatedAt: 1000,
};

/** Fixed timestamp so stale-detection assertions are deterministic */
const NOW = 1_700_000_000_000;

const RUN_RECORD: RoutineRunRecord = {
  id: 'run-1',
  routineId: 'routine-1',
  status: 'running',
  triggeredBy: 'manual',
  startedAt: NOW,
  completedAt: null,
  summary: null,
  error: null,
  metadata: {},
  createdAt: NOW,
};

// ─── Mock factories ─────────────────────────────────────────────────────────

function createDeps(): RoutineExecutorDeps {
  return {
    routineRepo: {
      getById: vi.fn().mockReturnValue(ROUTINE),
      getLatestRun: vi.fn().mockReturnValue(null),
      createRun: vi.fn().mockReturnValue(RUN_RECORD),
      completeRun: vi.fn(),
      incrementRunCount: vi.fn(),
    } as unknown as RoutineRepository,
    workstreamManager: {
      sendMessage: vi.fn().mockResolvedValue(undefined),
    } as unknown as WorkstreamManager,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('RoutineExecutor', () => {
  let deps: RoutineExecutorDeps;
  let executor: RoutineExecutor;

  beforeEach(() => {
    vi.useFakeTimers({ now: NOW });
    deps = createDeps();
    executor = new RoutineExecutor(deps);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('execute', () => {
    it('creates a run and sends prompt to workstream', async () => {
      await executor.execute('routine-1', 'manual');

      expect(deps.routineRepo.createRun).toHaveBeenCalledWith('routine-1', 'manual');
      expect(deps.workstreamManager.sendMessage).toHaveBeenCalledWith(
        'ws-1',
        expect.stringContaining('Daily Check'),
      );
      expect(deps.routineRepo.incrementRunCount).toHaveBeenCalledWith('routine-1');
    });

    it('includes run number and time in prompt', async () => {
      await executor.execute('routine-1', 'manual');

      const prompt = vi.mocked(deps.workstreamManager.sendMessage).mock.calls[0][1];
      expect(prompt).toContain('[Routine: Daily Check]');
      expect(prompt).toContain('run #6');
      expect(prompt).toContain('Run health checks');
    });

    it('throws if routine not found', async () => {
      vi.mocked(deps.routineRepo.getById).mockReturnValue(null as never);
      await expect(executor.execute('missing', 'manual')).rejects.toThrow(
        'Routine missing not found',
      );
    });

    it('skips inactive routines for scheduled triggers', async () => {
      vi.mocked(deps.routineRepo.getById).mockReturnValue({
        ...ROUTINE,
        status: 'paused',
      } as never);

      await executor.execute('routine-1', 'schedule');

      expect(deps.routineRepo.createRun).not.toHaveBeenCalled();
    });

    it('allows inactive routines for manual triggers', async () => {
      vi.mocked(deps.routineRepo.getById).mockReturnValue({
        ...ROUTINE,
        status: 'paused',
      } as never);

      await executor.execute('routine-1', 'manual');

      expect(deps.routineRepo.createRun).toHaveBeenCalled();
    });

    it('skips if a recent run is still active', async () => {
      vi.mocked(deps.routineRepo.getLatestRun).mockReturnValue({
        ...RUN_RECORD,
        startedAt: NOW,
      } as never);

      await executor.execute('routine-1', 'manual');

      expect(deps.routineRepo.createRun).not.toHaveBeenCalled();
    });

    it('marks stale running runs as failed', async () => {
      const staleRun = {
        ...RUN_RECORD,
        id: 'stale-run',
        startedAt: NOW - 15 * 60 * 1000, // 15 min ago
      };
      vi.mocked(deps.routineRepo.getLatestRun).mockReturnValue(staleRun as never);

      await executor.execute('routine-1', 'manual');

      expect(deps.routineRepo.completeRun).toHaveBeenCalledWith(
        'stale-run',
        'failed',
        undefined,
        'Stale run timeout',
      );
      expect(deps.routineRepo.createRun).toHaveBeenCalled();
    });

    it('marks run as failed if sendMessage throws', async () => {
      vi.mocked(deps.workstreamManager.sendMessage).mockRejectedValue(new Error('send failed'));

      await expect(executor.execute('routine-1', 'manual')).rejects.toThrow('send failed');

      expect(deps.routineRepo.completeRun).toHaveBeenCalledWith(
        'run-1',
        'failed',
        undefined,
        'send failed',
      );
    });
  });

  describe('onWorkstreamEvent', () => {
    it('completes run on turn_end', async () => {
      await executor.execute('routine-1', 'manual');

      executor.onWorkstreamEvent('ws-1', 'turn_end');

      expect(deps.routineRepo.completeRun).toHaveBeenCalledWith(
        'run-1',
        'completed',
        'Agent turn completed',
      );
    });

    it('fails run on error', async () => {
      await executor.execute('routine-1', 'manual');

      executor.onWorkstreamEvent('ws-1', 'error', 'something broke');

      expect(deps.routineRepo.completeRun).toHaveBeenCalledWith(
        'run-1',
        'failed',
        undefined,
        'something broke',
      );
    });

    it('uses default error message if none provided', async () => {
      await executor.execute('routine-1', 'manual');

      executor.onWorkstreamEvent('ws-1', 'error');

      expect(deps.routineRepo.completeRun).toHaveBeenCalledWith(
        'run-1',
        'failed',
        undefined,
        'Agent error',
      );
    });

    it('ignores events for workstreams without active runs', () => {
      executor.onWorkstreamEvent('ws-1', 'turn_end');
      expect(deps.routineRepo.completeRun).not.toHaveBeenCalled();
    });

    it('ignores events that are not turn_end or error', async () => {
      await executor.execute('routine-1', 'manual');

      executor.onWorkstreamEvent('ws-1', 'text');

      expect(deps.routineRepo.completeRun).not.toHaveBeenCalled();
    });
  });
});
