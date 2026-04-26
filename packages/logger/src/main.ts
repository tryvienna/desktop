/**
 * Main Process Logger
 *
 * High-performance structured logging using Pino with session-based directories.
 * Each app run creates a unique session directory under `baseLogDir`.
 *
 * Output:
 *   <baseLogDir>/<session-id>/vienna.log       — NDJSON (all levels)
 *   <baseLogDir>/current-session               — text file with active session ID
 */

import pino from 'pino';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { LogLevel, Logger } from './index';

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface MainLoggerOptions {
  /** Minimum log level. Default: LOG_LEVEL env var, else 'info'. */
  level?: LogLevel;

  /** Base directory for log output. Session dirs are created inside. Required. */
  baseLogDir: string;

  /** Session ID. Default: auto-generated timestamp + random hex. */
  sessionId?: string;

  /** Write to stdout/stderr alongside files. Default: NODE_ENV !== 'production'. */
  enableConsole?: boolean;

  /** Label included in every log entry. Default: 'main'. */
  processType?: string;
}

// ---------------------------------------------------------------------------
// Extended interface
// ---------------------------------------------------------------------------

export interface MainLogger extends Logger {
  getSessionId(): string;
  getSessionDir(): string;
  getLogFile(): string;
  /** Enable or disable logging. When disabled, all log methods become no-ops. */
  setEnabled(enabled: boolean): void;
  /** Whether logging is currently enabled. */
  isEnabled(): boolean;
  /** Flush all streams and close the logger. Call on app quit. */
  close(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_LEVELS: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

function resolveLogLevel(): LogLevel {
  const env = process.env['LOG_LEVEL']?.toLowerCase();
  if (env && VALID_LEVELS.includes(env as LogLevel)) return env as LogLevel;
  return process.env['NODE_ENV'] === 'production' ? 'info' : 'debug';
}

function generateSessionId(): string {
  const ts = new Date()
    .toISOString()
    .replace(/:/g, '-')
    .replace(/\./g, '-')
    .slice(0, -1) + 'Z';
  const hex = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
  return `${ts}_${hex}`;
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const CONSOLE_METHOD: Record<string, 'debug' | 'info' | 'warn' | 'error'> = {
  trace: 'debug',
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
  fatal: 'error',
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createMainLogger(options: MainLoggerOptions): MainLogger {
  const {
    level = resolveLogLevel(),
    baseLogDir,
    sessionId = generateSessionId(),
    enableConsole = process.env['NODE_ENV'] !== 'production',
    processType = 'main',
  } = options;

  // Session directory
  const sessionDir = path.join(baseLogDir, sessionId);
  ensureDir(sessionDir);

  const logFilePath = path.join(sessionDir, 'vienna.log');

  // Write current-session pointer
  try {
    ensureDir(baseLogDir);
    fs.writeFileSync(path.join(baseLogDir, 'current-session'), sessionId, 'utf-8');
  } catch {
    // Non-critical
  }

  // NDJSON file stream
  const fileStream = fs.createWriteStream(logFilePath, { flags: 'a' });
  fileStream.on('error', (err) => {
    if (enableConsole) console.error('[Logger] File stream error:', err.message);
  });
  let closed = false;
  let enabled = true;

  // Pino instance
  const pinoInstance = pino(
    {
      level,
      base: { pid: process.pid, hostname: os.hostname() },
      timestamp: () => `,"time":${Date.now()}`,
      formatters: {
        level: (label) => ({ level: label }),
      },
    },
    fileStream,
  );

  // --- build wrappers ---

  function logAt(
    lvl: LogLevel,
    pinoFn: pino.LogFn,
    msg: string,
    context?: Record<string, unknown>,
  ): void {
    if (!enabled) return;
    const merged = context ? { ...context, processType } : { processType };
    pinoFn.call(pinoInstance, merged, msg);

    if (enableConsole) {
      const method = CONSOLE_METHOD[lvl] ?? 'log';
      console[method](`[${lvl.toUpperCase()}]`, msg, context ?? '');
    }
  }

  function createChild(
    parentPino: pino.Logger,
    bindings: Record<string, unknown>,
  ): Logger {
    const childPino = parentPino.child(bindings);

    function childLog(
      pinoFn: pino.LogFn,
      msg: string,
      context?: Record<string, unknown>,
    ): void {
      if (!enabled) return;
      const merged = context ? { ...context, processType } : { processType };
      pinoFn.call(childPino, merged, msg);
    }

    return {
      trace: (msg, ctx) => childLog(childPino.trace, msg, ctx),
      debug: (msg, ctx) => childLog(childPino.debug, msg, ctx),
      info: (msg, ctx) => childLog(childPino.info, msg, ctx),
      warn: (msg, ctx) => childLog(childPino.warn, msg, ctx),
      error: (msg, ctx) => childLog(childPino.error, msg, ctx),
      fatal: (msg, ctx) => childLog(childPino.fatal, msg, ctx),
      child: (b) => createChild(childPino, b),
      flush: () => new Promise<void>((resolve, reject) => childPino.flush((err) => err ? reject(err) : resolve())),
    };
  }

  const logger: MainLogger = {
    trace: (msg, ctx) => logAt('trace', pinoInstance.trace, msg, ctx),
    debug: (msg, ctx) => logAt('debug', pinoInstance.debug, msg, ctx),
    info: (msg, ctx) => logAt('info', pinoInstance.info, msg, ctx),
    warn: (msg, ctx) => logAt('warn', pinoInstance.warn, msg, ctx),
    error: (msg, ctx) => logAt('error', pinoInstance.error, msg, ctx),
    fatal: (msg, ctx) => logAt('fatal', pinoInstance.fatal, msg, ctx),

    child: (bindings) => createChild(pinoInstance, bindings),

    setEnabled(value: boolean) { enabled = value; },
    isEnabled: () => enabled,

    flush: () => new Promise<void>((resolve, reject) => pinoInstance.flush((err) => err ? reject(err) : resolve())),

    async close() {
      if (closed) return;
      closed = true;
      await logger.flush();
      await new Promise<void>((resolve, reject) => {
        fileStream.end((err?: Error | null) => (err ? reject(err) : resolve()));
      });
    },

    getSessionId: () => sessionId,
    getSessionDir: () => sessionDir,
    getLogFile: () => logFilePath,
  };

  return logger;
}
