/**
 * SessionTracker — Per-session state machine for tool correlation and plan detection.
 *
 * Each JSONL file corresponds to one Claude Code session. The tracker
 * maintains state needed to:
 * - Correlate tool_result records with their preceding tool_use requests
 * - Detect plan acceptance (ExitPlanMode → user tool_result)
 * - Track the most recent cwd (may change mid-session)
 * - Track whether session.started has been emitted
 */

export interface PendingTool {
  readonly name: string;
  readonly input: unknown;
}

export interface PendingPlan {
  readonly plan: string;
  readonly planFilePath: string;
  readonly planName: string;
}

export interface SessionState {
  /** Absolute path to the JSONL file. */
  readonly filePath: string;
  /** Session UUID extracted from filename. */
  readonly sessionId: string;
  /** Decoded project path from the parent directory name. */
  readonly projectPath: string;
  /** Actual working directory from the most recent user record. */
  cwd: string | null;
  /** Whether we've emitted session.started for this session. */
  hasEmittedStarted: boolean;
  /** Timestamp of the last turn start (for duration tracking). */
  lastTurnStartedAt: string | null;
  /** Stashed plan from an ExitPlanMode tool_use, awaiting user acceptance. */
  pendingPlan: PendingPlan | null;
  /** Pending tool uses awaiting their results (keyed by tool_use_id). */
  pendingTools: Map<string, PendingTool>;
}

export class SessionTracker {
  private sessions = new Map<string, SessionState>();

  /** Get or create a session state entry keyed by file path. */
  getOrCreate(filePath: string, sessionId: string, projectPath: string): SessionState {
    let state = this.sessions.get(filePath);
    if (!state) {
      state = {
        filePath,
        sessionId,
        projectPath,
        cwd: null,
        hasEmittedStarted: false,
        lastTurnStartedAt: null,
        pendingPlan: null,
        pendingTools: new Map(),
      };
      this.sessions.set(filePath, state);
    }
    return state;
  }

  /** Remove a session from tracking (e.g., file deleted). */
  remove(filePath: string): void {
    this.sessions.delete(filePath);
  }

  /** Get all tracked sessions. */
  getAll(): SessionState[] {
    return [...this.sessions.values()];
  }

  /** Number of tracked sessions. */
  get size(): number {
    return this.sessions.size;
  }

  /** Clear all sessions. */
  clear(): void {
    this.sessions.clear();
  }
}
