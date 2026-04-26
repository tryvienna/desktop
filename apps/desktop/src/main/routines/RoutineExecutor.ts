/**
 * RoutineExecutor — Executes a routine by sending its prompt to a workstream
 *
 * Handles the full execution lifecycle: validation, run tracking,
 * prompt building, and message sending.
 *
 * Run completion is tracked via session events: when the agent's turn ends
 * (turn_end or error), the run is marked completed/failed accordingly.
 *
 * @module main/routines/RoutineExecutor
 */

import type { RoutineRepository, InboxItemRepository } from '@vienna/app-db';
import type { WorkstreamManager } from '../workstream/WorkstreamManager';

export interface RoutineExecutorDeps {
  routineRepo: RoutineRepository;
  workstreamManager: WorkstreamManager;
  inboxItems: InboxItemRepository;
}

/** Stale run threshold: runs older than this are ignored for concurrency checks */
const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

/** Truncate a string to maxLen, appending ellipsis if trimmed. */
function truncate(text: string, maxLen: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen - 1) + '…';
}

export class RoutineExecutor {
  private deps: RoutineExecutorDeps;
  /** Maps workstreamId → runId for active routine runs */
  private activeRuns = new Map<string, string>();

  constructor(deps: RoutineExecutorDeps) {
    this.deps = deps;
  }

  /**
   * Execute a routine: validate, create run record, send prompt.
   * The run stays in "running" status until the agent completes (via onTurnEnd).
   */
  async execute(
    routineId: string,
    triggeredBy: 'schedule' | 'manual' | 'retry',
  ): Promise<void> {
    const routine = this.deps.routineRepo.getById(routineId);
    if (!routine) throw new Error(`Routine ${routineId} not found`);
    if (routine.status !== 'active' && triggeredBy === 'schedule') return;

    // Check for stale concurrent runs
    const latestRun = this.deps.routineRepo.getLatestRun(routineId);
    if (latestRun && latestRun.status === 'running') {
      const age = Date.now() - latestRun.startedAt;
      if (age < STALE_THRESHOLD_MS) {
        return; // Skip — previous run still active
      }
      // Mark stale run as failed
      this.deps.routineRepo.completeRun(latestRun.id, 'failed', undefined, 'Stale run timeout');
    }

    // Create run record (status: running)
    const run = this.deps.routineRepo.createRun(routineId, triggeredBy);

    try {
      const prompt = this.buildPrompt(routine);

      // Track this run so we can complete it when the agent finishes
      this.activeRuns.set(routine.workstreamId, run.id);

      // Send to workstream (auto-starts agent if needed)
      await this.deps.workstreamManager.sendMessage(routine.workstreamId, prompt);

      this.deps.routineRepo.incrementRunCount(routineId);
      // Run stays "running" — will be completed by onWorkstreamEvent
    } catch (error) {
      this.activeRuns.delete(routine.workstreamId);
      const message = error instanceof Error ? error.message : String(error);
      this.deps.routineRepo.completeRun(run.id, 'failed', undefined, message);
      throw error;
    }
  }

  /**
   * Called by the main process when a workstream event indicates completion.
   * Completes the active run for this workstream if one exists.
   */
  onWorkstreamEvent(workstreamId: string, eventType: string, error?: string): void {
    const runId = this.activeRuns.get(workstreamId);
    if (!runId) return;

    if (eventType === 'turn_end') {
      this.activeRuns.delete(workstreamId);
      this.deps.routineRepo.completeRun(runId, 'completed', 'Agent turn completed');
      this.pushInboxNotification(workstreamId, 'completed');
    } else if (eventType === 'error') {
      this.activeRuns.delete(workstreamId);
      this.deps.routineRepo.completeRun(runId, 'failed', undefined, error ?? 'Agent error');
      this.pushInboxNotification(workstreamId, 'failed', error);
    }
  }

  private pushInboxNotification(
    workstreamId: string,
    status: 'completed' | 'failed',
    error?: string,
  ): void {
    const routine = this.deps.routineRepo.getByWorkstreamId(workstreamId);
    if (!routine) return;

    const succeeded = status === 'completed';
    const title = succeeded
      ? `Routine "${routine.name}" completed`
      : `Routine "${routine.name}" failed`;

    const description = succeeded
      ? truncate(routine.prompt, 120)
      : error
        ? truncate(error, 120)
        : 'An error occurred during execution.';

    this.deps.inboxItems.create({
      title,
      description,
      icon: succeeded ? '✅' : '❌',
      source: 'core',
      entityUri: `@vienna//workstream/${workstreamId}`,
      ctaLabel: 'Open',
    });
  }

  private buildPrompt(routine: { name: string; prompt: string; runCount: number }): string {
    const parts: string[] = [];

    parts.push(`[Routine: ${routine.name}]`);
    parts.push(`Current time: ${new Date().toISOString()}`);
    parts.push(`This is run #${routine.runCount + 1} of this routine.`);
    parts.push('');
    parts.push(routine.prompt);

    return parts.join('\n');
  }
}
