/**
 * @vienna/logger — Structured logging for Vienna.
 *
 * Entry points:
 *   @vienna/logger          — shared types (safe for all processes)
 *   @vienna/logger/main     — createMainLogger() (Node.js / Electron main)
 *   @vienna/logger/renderer — createRendererLogger() (browser / Electron renderer)
 *
 * The renderer logger sends structured entries to the main process via
 * @vienna/ipc, where the main logger writes them to disk.
 */

// ---------------------------------------------------------------------------
// Log levels
// ---------------------------------------------------------------------------

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/** Pino-compatible numeric values for comparison. */
export const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

// ---------------------------------------------------------------------------
// Logger interface
// ---------------------------------------------------------------------------

export interface Logger {
  trace(msg: string, context?: Record<string, unknown>): void;
  debug(msg: string, context?: Record<string, unknown>): void;
  info(msg: string, context?: Record<string, unknown>): void;
  warn(msg: string, context?: Record<string, unknown>): void;
  error(msg: string, context?: Record<string, unknown>): void;
  fatal(msg: string, context?: Record<string, unknown>): void;

  /** Create a child logger with additional bindings merged into every entry. */
  child(bindings: Record<string, unknown>): Logger;

  /** Flush buffered log data to its destination. */
  flush(): Promise<void>;
}
