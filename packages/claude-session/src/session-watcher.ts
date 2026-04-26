/**
 * ClaudeSessionWatcher — Watches Claude Code JSONL session files and emits typed events.
 *
 * Monitors ~/.claude/projects/ for JSONL file changes using @parcel/watcher.
 * When new lines are appended, parses them and emits session/turn/tool events
 * through the SessionEventBus.
 *
 * Lifecycle:
 * 1. start() — scan existing files (set offsets to EOF), subscribe to changes
 * 2. File change detected → debounce → read new bytes → parse → emit events
 * 3. stop() — unsubscribe, clear state
 *
 * Performance: Only reads new bytes (byte-offset tracking). Debounces file
 * system notifications to batch rapid writes. CPU-idle when no changes.
 */

import { readdir, stat } from 'node:fs/promises';
import { join, basename, dirname, extname } from 'node:path';
import type { AsyncSubscription, Event } from '@parcel/watcher';
import { SessionEventBus } from './event-bus';
import { JsonlTailer } from './jsonl-tailer';
import { SessionTracker } from './session-tracker';
import type { SessionState } from './session-tracker';
import { getClaudeProjectsDir, decodeProjectPath, extractSessionId } from './path-utils';
import type {
  SessionRecord,
  UserRecord,
  AssistantRecord,
  ToolUseContent,
  ToolResultContent,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Options
// ─────────────────────────────────────────────────────────────────────────────

export interface ClaudeSessionWatcherOptions {
  /** Debounce interval in ms. Default: 200. */
  debounceMs?: number;
  /** Override watch path for testing. Default: ~/.claude/projects. */
  watchPath?: string;
  /** Error callback. Errors in the watcher never throw — they're routed here. */
  onError?: (error: unknown) => void;
  /** Debug logging callback. */
  onLog?: (msg: string, data?: Record<string, unknown>) => void;
}

const DEFAULT_DEBOUNCE_MS = 50;
const MAX_PROMPT_LENGTH = 500;

// ─────────────────────────────────────────────────────────────────────────────
// Watcher
// ─────────────────────────────────────────────────────────────────────────────

export class ClaudeSessionWatcher {
  /** Public event bus — consumers subscribe here. */
  readonly events = new SessionEventBus();

  private subscription: AsyncSubscription | null = null;
  private readonly tailer = new JsonlTailer();
  private readonly tracker = new SessionTracker();
  private readonly watchPath: string;
  private readonly debounceMs: number;
  private readonly onError: (error: unknown) => void;
  private readonly log: (msg: string, data?: Record<string, unknown>) => void;

  private pendingFiles = new Set<string>();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options?: ClaudeSessionWatcherOptions) {
    this.watchPath = options?.watchPath ?? getClaudeProjectsDir();
    this.debounceMs = options?.debounceMs ?? DEFAULT_DEBOUNCE_MS;
    this.onError = options?.onError ?? (() => {});
    this.log = options?.onLog ?? (() => {});
  }

  /** Start watching. Scans existing files (offsets to EOF), subscribes to changes. */
  async start(): Promise<void> {
    if (this.subscription) return;

    await this.scanExisting();

    const watcher = await import('@parcel/watcher');
    this.subscription = await watcher.subscribe(
      this.watchPath,
      (err, events) => {
        if (err) {
          this.onError(err);
          return;
        }
        this.handleFsEvents(events);
      },
      { ignore: ['memory', '.git', 'node_modules'] },
    );

  }

  /** Stop watching. Clears all state and unsubscribes. */
  async stop(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.subscription) {
      await this.subscription.unsubscribe();
      this.subscription = null;
    }
    this.tracker.clear();
    this.events.clear();
    this.pendingFiles.clear();
  }

  /** Whether the watcher is currently active. */
  get isRunning(): boolean {
    return this.subscription !== null;
  }

  /** Number of sessions currently being tracked. */
  get trackedSessionCount(): number {
    return this.tracker.size;
  }

  // ── Startup scan ──────────────────────────────────────────────────────

  private async scanExisting(): Promise<void> {
    try {
      const projectDirs = await readdir(this.watchPath);

      await Promise.all(
        projectDirs.map(async (dir) => {
          const dirPath = join(this.watchPath, dir);
          try {
            const s = await stat(dirPath);
            if (!s.isDirectory()) return;
          } catch {
            return;
          }

          try {
            const files = await readdir(dirPath);
            await Promise.all(
              files
                .filter((f) => f.endsWith('.jsonl'))
                .map(async (f) => {
                  const filePath = join(dirPath, f);
                  try {
                    const s = await stat(filePath);
                    this.tailer.setInitialOffset(filePath, s.size);
                  } catch {
                    // File may have been deleted between readdir and stat
                  }
                }),
            );
          } catch {
            // Directory may have been deleted
          }
        }),
      );
    } catch {
      // ~/.claude/projects may not exist yet
    }
  }

  // ── File system event handling ────────────────────────────────────────

  private handleFsEvents(events: Event[]): void {
    for (const event of events) {
      if (event.type === 'delete') continue;
      if (extname(event.path) !== '.jsonl') continue;
      this.pendingFiles.add(event.path);
    }

    if (this.pendingFiles.size === 0) return;

    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.flush();
    }, this.debounceMs);
  }

  private flush(): void {
    const files = [...this.pendingFiles];
    this.pendingFiles.clear();

    Promise.all(files.map((f) => this.processFile(f))).catch((err) => {
      this.onError(err);
    });
  }

  // ── JSONL processing ──────────────────────────────────────────────────

  private async processFile(filePath: string): Promise<void> {
    const records = await this.tailer.readNewLines(filePath);
    if (records.length === 0) return;

    const dir = basename(dirname(filePath));
    const projectPath = decodeProjectPath(dir);
    const sessionId = extractSessionId(basename(filePath));
    const state = this.tracker.getOrCreate(filePath, sessionId, projectPath);

    this.log('Processing file', {
      file: basename(filePath),
      recordCount: records.length,
      sessionId,
    });

    for (const record of records) {
      try {
        this.processRecord(record, state);
      } catch (err) {
        this.onError(err);
      }
    }
  }

  private processRecord(record: SessionRecord, state: SessionState): void {
    switch (record.type) {
      case 'user':
        this.handleUserRecord(record as UserRecord, state);
        break;
      case 'assistant':
        this.handleAssistantRecord(record as AssistantRecord, state);
        break;
      case 'pr-link':
        this.handlePrLinkRecord(record, state);
        break;
      default:
        // Silently ignore other record types (queue-operation, attachment, etc.)
        break;
    }
  }

  // ── User record handling ──────────────────────────────────────────────

  private handleUserRecord(record: UserRecord, state: SessionState): void {
    if (record.cwd) state.cwd = record.cwd;

    // Array content = tool results or automated messages, not real human prompts
    if (typeof record.message.content !== 'string') {
      this.emitToolResults(record, state);
      this.checkPlanAccepted(record, state);
      return;
    }

    // Emit session.started on first real user message
    if (!state.hasEmittedStarted) {
      state.hasEmittedStarted = true;
      this.events.emit('session.started', {
        sessionId: record.sessionId,
        projectPath: state.projectPath,
        cwd: record.cwd,
        version: record.version,
        gitBranch: record.gitBranch,
        entrypoint: record.entrypoint,
        timestamp: record.timestamp,
      });
    }

    const prompt = record.message.content;
    state.lastTurnStartedAt = record.timestamp;

    this.events.emit('turn.started', {
      sessionId: record.sessionId,
      projectPath: state.projectPath,
      promptId: record.uuid,
      cwd: record.cwd,
      gitBranch: record.gitBranch,
      prompt: prompt.length > MAX_PROMPT_LENGTH
        ? prompt.slice(0, MAX_PROMPT_LENGTH) + '...'
        : prompt,
      timestamp: record.timestamp,
    });
  }

  // ── Assistant record handling ─────────────────────────────────────────

  private handleAssistantRecord(record: AssistantRecord, state: SessionState): void {
    const stopReason = record.message.stop_reason;

    // Skip streaming chunks (stop_reason: null)
    if (stopReason === null) return;

    const usage = record.message.usage;

    if (stopReason === 'end_turn') {
      const contentTypes = [...new Set(record.message.content.map((c) => c.type))];
      this.events.emit('turn.completed', {
        sessionId: record.sessionId,
        projectPath: state.projectPath,
        model: record.message.model,
        usage: {
          inputTokens: usage.input_tokens,
          outputTokens: usage.output_tokens,
          cacheCreationInputTokens: usage.cache_creation_input_tokens,
          cacheReadInputTokens: usage.cache_read_input_tokens,
        },
        contentTypes,
        timestamp: record.timestamp,
      });
      return;
    }

    if (stopReason === 'tool_use') {
      const toolUses = record.message.content
        .filter((c): c is ToolUseContent => c.type === 'tool_use');

      // Stash plan details if ExitPlanMode was called
      const exitPlan = toolUses.find((c) => c.name === 'ExitPlanMode');
      if (exitPlan) {
        const input = exitPlan.input as Record<string, unknown> | undefined;
        if (typeof input?.plan === 'string' && typeof input?.planFilePath === 'string') {
          const fileName = (input.planFilePath as string).split('/').pop() ?? '';
          const planName = fileName.replace(/\.md$/, '');
          state.pendingPlan = {
            plan: input.plan as string,
            planFilePath: input.planFilePath as string,
            planName,
          };
        }
      }

      const tools = toolUses.map((c) => ({ name: c.name, id: c.id, input: c.input }));

      // Stash tool uses for result correlation
      for (const t of toolUses) {
        state.pendingTools.set(t.id, { name: t.name, input: t.input });
      }

      this.events.emit('tool.used', {
        sessionId: record.sessionId,
        projectPath: state.projectPath,
        cwd: state.cwd ?? state.projectPath,
        branch: record.gitBranch || null,
        model: record.message.model,
        tools,
        usage: {
          inputTokens: usage.input_tokens,
          outputTokens: usage.output_tokens,
        },
        timestamp: record.timestamp,
      });

    }
  }

  // ── Tool result correlation ───────────────────────────────────────────

  private emitToolResults(record: UserRecord, state: SessionState): void {
    if (!Array.isArray(record.message.content)) return;
    if (state.pendingTools.size === 0) return;

    for (const item of record.message.content) {
      if (typeof item !== 'object' || item === null) continue;
      const block = item as ToolResultContent;
      if (block.type !== 'tool_result') continue;

      const toolUseId = block.tool_use_id;
      if (!toolUseId) continue;

      const pending = state.pendingTools.get(toolUseId);
      if (!pending) continue;
      state.pendingTools.delete(toolUseId);

      this.events.emit('tool.result', {
        sessionId: record.sessionId,
        projectPath: state.projectPath,
        cwd: state.cwd ?? state.projectPath,
        branch: record.gitBranch || null,
        toolUseId,
        toolName: pending.name,
        isError: block.is_error === true,
        output: typeof block.content === 'string' ? block.content : '',
        timestamp: record.timestamp,
      });
    }
  }

  // ── Plan acceptance detection ─────────────────────────────────────────

  private checkPlanAccepted(record: UserRecord, state: SessionState): void {
    if (!state.pendingPlan) return;
    if (!Array.isArray(record.message.content)) return;

    const hasToolResult = (record.message.content as readonly { type?: string }[])
      .some((c) => c.type === 'tool_result');

    if (hasToolResult) {
      const pending = state.pendingPlan;
      state.pendingPlan = null;

      this.events.emit('plan.accepted', {
        sessionId: record.sessionId,
        projectPath: state.cwd ?? state.projectPath,
        plan: pending.plan,
        planFilePath: pending.planFilePath,
        planName: pending.planName,
        timestamp: record.timestamp,
      });
    }
  }

  // ── PR link handling ──────────────────────────────────────────────────

  private handlePrLinkRecord(record: SessionRecord, state: SessionState): void {
    const r = record as Record<string, unknown>;
    const prNumber = typeof r['prNumber'] === 'number' ? r['prNumber'] : null;
    const prUrl = typeof r['prUrl'] === 'string' ? r['prUrl'] : null;
    const prRepository = typeof r['prRepository'] === 'string' ? r['prRepository'] : null;
    const sessionId = typeof r['sessionId'] === 'string' ? r['sessionId'] : state.sessionId;
    const timestamp = typeof r['timestamp'] === 'string' ? r['timestamp'] : new Date().toISOString();

    if (!prUrl) return;

    this.events.emit('pr.created', {
      sessionId,
      projectPath: state.projectPath,
      cwd: state.cwd ?? state.projectPath,
      branch: null,
      prNumber,
      prUrl,
      prRepository,
      timestamp,
    });
  }

}
