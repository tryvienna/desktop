/**
 * CliProviderBase — Shared subprocess lifecycle for CLI-based agent providers.
 *
 * Handles process spawning, graceful shutdown (SIGTERM → SIGKILL), NDJSON I/O,
 * exit classification, event dispatch, and availability checks. Subclasses
 * provide only their CLI-specific argument building, message formatting, and
 * normalizer.
 *
 * @module agent-providers/cli-provider-base
 */

import { spawn, execFile } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import type {
  AgentProvider,
  AgentEvent,
  ProviderState,
  SessionConfig,
  UserMessage,
  PermissionResponse,
  AvailabilityResult,
} from '@vienna/agent-core';
import { getEnrichedEnv } from '@vienna/shell-env';

// ─────────────────────────────────────────────────────────────────────────────
// Normalizer contract — all CLI normalizers implement this shape
// ─────────────────────────────────────────────────────────────────────────────

export interface CliNormalizer {
  normalize(line: string): AgentEvent[];
  reset(): void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers (exported for unit testing)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine whether an exit represents a signal-based termination rather than
 * a real crash. SIGTERM (143) and SIGINT (130) are standard graceful exits.
 */
export function isSignalExit(
  code: number | null,
  signal?: string | null,
): boolean {
  if (signal === 'SIGTERM' || signal === 'SIGINT') return true;
  if (code === 143 || code === 130) return true; // 128 + signal number
  return false;
}

/**
 * Classify a process exit into one of three outcomes.
 *
 * - `'clean'`   — code 0, null (no code), or signal-based exit
 * - `'stopped'` — non-zero exit but provider was already stopping
 * - `'crashed'` — unexpected non-zero exit while provider was running
 */
export function classifyExit(
  code: number | null,
  signal: string | null | undefined,
  providerState: ProviderState,
): 'clean' | 'stopped' | 'crashed' {
  if (code === 0 || code === null) return 'clean';
  if (isSignalExit(code, signal)) return 'clean';
  if (providerState === 'stopping') return 'stopped';
  return 'crashed';
}

/**
 * Split a buffer on newlines, returning complete lines and the remaining
 * partial buffer. Used for NDJSON line-splitting on stdout.
 */
export function splitLines(buffer: string): { lines: string[]; remainder: string } {
  const parts = buffer.split('\n');
  const remainder = parts.pop() || '';
  const lines = parts.filter((l) => l.length > 0);
  return { lines, remainder };
}

// ─────────────────────────────────────────────────────────────────────────────
// Base class
// ─────────────────────────────────────────────────────────────────────────────

/** Max bytes of stderr to buffer for crash diagnostics. */
const MAX_STDERR_BYTES = 4096;

/** Timeout (ms) for SIGTERM → SIGKILL escalation. */
const SIGKILL_TIMEOUT_MS = 5000;

export abstract class CliProviderBase implements AgentProvider {
  abstract readonly id: string;
  abstract readonly displayName: string;

  // ── Process state ────────────────────────────────────────────────────────

  protected _state: ProviderState = 'idle';
  protected proc: ChildProcess | null = null;
  private buffer = '';
  private stderrBuffer = '';
  private eventListeners: Set<(event: AgentEvent) => void> = new Set();
  private debugListeners: Set<(data: string) => void> = new Set();
  private timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  constructor(
    protected readonly cliPath: string,
    protected readonly normalizer: CliNormalizer,
  ) {}

  // ── AgentProvider interface ──────────────────────────────────────────────

  get state(): ProviderState {
    if (this._state === 'running' && !this.checkProcessHealth()) {
      this.handleExit(null, null);
    }
    return this._state;
  }

  async start(config: SessionConfig): Promise<void> {
    if (this._state !== 'idle' && this._state !== 'stopped' && this._state !== 'crashed') {
      throw new Error(`Cannot start provider in state: ${this._state}`);
    }

    this._state = 'starting';
    this.normalizer.reset();
    this.buffer = '';
    this.stderrBuffer = '';
    this.onStartReset();

    const args = this.buildArgs(config);
    const env = getEnrichedEnv({
      ...config.env,
      // Required for the CLI to create file checkpoints on each user message,
      // enabling --rewind-files to restore files to a prior state.
      CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING: '1',
    });

    try {
      this.proc = spawn(this.cliPath, args, {
        cwd: config.cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        env,
      });

      this.proc.stdout?.on('data', (data: Buffer) => this.handleStdout(data));

      this.proc.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        this.stderrBuffer += text;
        if (this.stderrBuffer.length > MAX_STDERR_BYTES) {
          this.stderrBuffer = this.stderrBuffer.slice(-MAX_STDERR_BYTES);
        }
        for (const listener of this.debugListeners) {
          listener(text);
        }
      });

      this.proc.on('exit', (code, signal) => {
        this.handleExit(code, signal);
      });

      this.proc.on('error', (err) => {
        this.emitEvent({
          type: 'error',
          code: 'process_error',
          message: err.message,
          retryable: false,
          timestamp: Date.now(),
        });
        this.handleExit(-1, null);
      });

      // Optional inactivity timeout
      if (config.timeout && config.timeout > 0) {
        this.timeoutHandle = setTimeout(() => {
          if (this._state === 'running') {
            this.emitEvent({
              type: 'error',
              code: 'timeout',
              message: `Process timeout after ${config.timeout}ms`,
              retryable: false,
              timestamp: Date.now(),
            });
            this.stop();
          }
        }, config.timeout);
      }

      this._state = 'running';
    } catch (error) {
      this._state = 'crashed';
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.proc || this._state === 'stopped' || this._state === 'stopping') {
      return;
    }

    this._state = 'stopping';
    this.clearTimeout();

    // Graceful shutdown: close stdin first, then SIGTERM
    this.proc.stdin?.end();
    this.proc.kill('SIGTERM');

    // Wait for exit with a safety net
    await new Promise<void>((resolve) => {
      const safetyTimeout = setTimeout(() => {
        if (this.proc && !this.proc.killed) {
          this.proc.kill('SIGKILL');
        }
        resolve();
      }, SIGKILL_TIMEOUT_MS);

      const onExit = () => {
        clearTimeout(safetyTimeout);
        resolve();
      };

      if (this.proc) {
        this.proc.once('exit', onExit);
      } else {
        clearTimeout(safetyTimeout);
        resolve();
      }
    });
  }

  async checkAvailability(): Promise<AvailabilityResult> {
    return new Promise((resolve) => {
      let env: Record<string, string>;
      try {
        env = getEnrichedEnv();
      } catch {
        resolve({ available: false, error: 'Failed to resolve shell environment' });
        return;
      }
      execFile(this.cliPath, ['--version'], { env, timeout: 10_000 }, (error, stdout) => {
        if (error) {
          resolve({ available: false, error: error.message });
        } else {
          resolve({ available: true, version: stdout.trim() });
        }
      });
    });
  }

  abstract sendMessage(message: UserMessage): void;
  abstract respondPermission(requestId: string, response: PermissionResponse): void;

  interrupt(): void {
    if (this.proc && this._state === 'running') {
      this.proc.kill('SIGINT');
    }
  }

  onEvent(callback: (event: AgentEvent) => void): () => void {
    this.eventListeners.add(callback);
    return () => {
      this.eventListeners.delete(callback);
    };
  }

  onDebug(callback: (data: string) => void): () => void {
    this.debugListeners.add(callback);
    return () => {
      this.debugListeners.delete(callback);
    };
  }

  isHealthy(): boolean {
    return this._state === 'running' && this.checkProcessHealth();
  }

  // ── Protected helpers for subclasses ─────────────────────────────────────

  /** Build CLI arguments from session config. Provider-specific. */
  protected abstract buildArgs(config: SessionConfig): string[];

  /** Called at the start of `start()` for subclass-specific reset. Override if needed. */
  protected onStartReset(): void {
    /* no-op by default */
  }

  protected ensureRunning(): void {
    if (this._state !== 'running') {
      throw new Error(`Provider is not running (state: ${this._state})`);
    }
  }

  protected writeToStdin(msg: unknown): void {
    if (this.proc?.stdin && !this.proc.stdin.destroyed) {
      this.proc.stdin.write(JSON.stringify(msg) + '\n');
    }
  }

  protected emitEvent(event: AgentEvent): void {
    this.onEvent_internal(event);
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch {
        // Never let a listener error kill the event pipeline
      }
    }
  }

  /** Hook for subclasses to intercept events before dispatch (e.g., capture permission inputs). */
  protected onEvent_internal(_event: AgentEvent): void {
    /* no-op by default */
  }

  // ── Private internals ────────────────────────────────────────────────────

  private handleStdout(data: Buffer): void {
    this.buffer += data.toString();
    const { lines, remainder } = splitLines(this.buffer);
    this.buffer = remainder;

    for (const line of lines) {
      const events = this.normalizer.normalize(line);
      for (const event of events) {
        this.emitEvent(event);
      }
    }
  }

  private handleExit(code: number | null, signal: string | null | undefined): void {
    if (this._state === 'stopped') return; // Guard double invocation

    this.clearTimeout();

    const outcome = classifyExit(code, signal, this._state);
    if (outcome === 'crashed') {
      const stderr = this.stderrBuffer.trim();
      this.emitEvent({
        type: 'error',
        code: 'process_crash',
        message: stderr
          ? `CLI exited with code ${code}: ${stderr}`
          : `CLI exited with code ${code} (no stderr output)`,
        retryable: false,
        timestamp: Date.now(),
      });
      this._state = 'crashed';
    } else {
      this._state = 'stopped';
    }

    this.stderrBuffer = '';
    this.proc = null;
  }

  private checkProcessHealth(): boolean {
    if (!this.proc) return false;
    // Note: Do NOT check this.proc.killed here. Node.js sets killed=true
    // when kill() is called, NOT when the process actually exits.
    if (this.proc.exitCode !== null) return false;
    if (this.proc.signalCode !== null) return false;
    return true;
  }

  private clearTimeout(): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }
}
