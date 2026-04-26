/**
 * Renderer Process Logger
 *
 * Logs to the browser console for immediate DevTools visibility, and forwards
 * structured entries to the main process via @vienna/ipc where they are
 * written to disk by the main logger.
 *
 * The IPC client is resolved lazily — if `window.api.logger` is not available
 * (e.g. Storybook, unit tests), logs fall back to console-only.
 *
 * Usage:
 *   import { createRendererLogger, setupGlobalErrorCapture } from '@vienna/logger/renderer';
 *
 *   const logger = createRendererLogger();
 *   setupGlobalErrorCapture(logger);
 *
 *   logger.info('Component mounted', { name: 'App' });
 */

import type { LogLevel, Logger } from './index';
import { LOG_LEVEL_VALUES } from './index';

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface RendererLoggerOptions {
  /** Minimum log level. Default: 'info' in prod, 'debug' in dev. */
  level?: LogLevel;
}

// ---------------------------------------------------------------------------
// IPC client type (matches the contract shape exposed by the preload)
// ---------------------------------------------------------------------------

interface LoggerIpcClient {
  log(input: {
    level: LogLevel;
    msg: string;
    context?: Record<string, unknown>;
  }): Promise<{ logged: boolean }>;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/** Original console methods — saved before any interception. */
const originalConsole = {
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

const CONSOLE_METHOD: Record<LogLevel, keyof typeof originalConsole> = {
  trace: 'debug',
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
  fatal: 'error',
};

let warnedMissingIpc = false;

function getIpcClient(): LoggerIpcClient | null {
  if (typeof window === 'undefined') return null;
  const client = (window as unknown as Record<string, unknown>)['api'] as
    | { logger?: LoggerIpcClient }
    | undefined;
  if (client?.logger) return client.logger;

  if (!warnedMissingIpc) {
    warnedMissingIpc = true;
    originalConsole.warn(
      '[RendererLogger] window.api.logger not available — falling back to console-only. '
      + 'Expected in Storybook or tests without IPC harness.',
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export interface RendererLogger extends Logger {
  /** Enable or disable logging. When disabled, all log methods become no-ops. */
  setEnabled(enabled: boolean): void;
  /** Whether logging is currently enabled. */
  isEnabled(): boolean;
}

export function createRendererLogger(options: RendererLoggerOptions = {}): RendererLogger {
  let enabled = true;

  const minLevel: LogLevel = options.level
    ?? (typeof process !== 'undefined' && process.env?.['NODE_ENV'] === 'development'
      ? 'debug'
      : 'info');

  function shouldLog(lvl: LogLevel): boolean {
    return LOG_LEVEL_VALUES[lvl] >= LOG_LEVEL_VALUES[minLevel];
  }

  function log(
    level: LogLevel,
    msg: string,
    context: Record<string, unknown> | undefined,
    extraBindings: Record<string, unknown>,
  ): void {
    if (!enabled || !shouldLog(level)) return;

    const mergedContext = Object.keys(extraBindings).length > 0
      ? { ...extraBindings, ...context }
      : context;

    // Console output (immediate, always)
    const method = CONSOLE_METHOD[level];
    originalConsole[method](`[${level.toUpperCase()}]`, msg, mergedContext ?? '');

    // IPC to main (fire-and-forget)
    const client = getIpcClient();
    if (client) {
      void client
        .log({ level, msg, context: mergedContext })
        .catch((err) => {
          originalConsole.error('[RendererLogger] IPC send failed:', err);
        });
    }
  }

  function buildLogger(bindings: Record<string, unknown>): Logger {
    return {
      trace: (msg, ctx) => log('trace', msg, ctx, bindings),
      debug: (msg, ctx) => log('debug', msg, ctx, bindings),
      info: (msg, ctx) => log('info', msg, ctx, bindings),
      warn: (msg, ctx) => log('warn', msg, ctx, bindings),
      error: (msg, ctx) => log('error', msg, ctx, bindings),
      fatal: (msg, ctx) => log('fatal', msg, ctx, bindings),
      child: (b) => buildLogger({ ...bindings, ...b }),
      flush: () => Promise.resolve(), // renderer has no buffer to flush
    };
  }

  const rootLogger = buildLogger({});
  return Object.assign(rootLogger, {
    setEnabled(value: boolean) { enabled = value; },
    isEnabled: () => enabled,
  });
}

// ---------------------------------------------------------------------------
// Global error capture
// ---------------------------------------------------------------------------

/**
 * Serialise an Error to a plain object safe for IPC.
 */
function serialiseError(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) {
    return { value: String(error), type: typeof error };
  }
  const obj: Record<string, unknown> = {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
  for (const key of Object.getOwnPropertyNames(error)) {
    if (!['name', 'message', 'stack'].includes(key)) {
      obj[key] = (error as unknown as Record<string, unknown>)[key];
    }
  }
  return obj;
}

/** Guard to prevent infinite loops when intercepted console methods log. */
let isIntercepting = false;

/**
 * Install global error handlers that log to the provided logger.
 * Returns a cleanup function that restores originals.
 *
 * Captures:
 *  - window.onerror (uncaught exceptions)
 *  - window.onunhandledrejection
 *  - console.error / console.warn interception
 */
export function setupGlobalErrorCapture(logger: Logger): () => void {
  if (typeof window === 'undefined') return () => {};

  const prevOnError = window.onerror;
  const prevOnRejection = window.onunhandledrejection;

  window.onerror = (message, source, lineno, colno, error) => {
    logger.fatal('Uncaught error', {
      message: String(message),
      source: source ?? undefined,
      lineno: lineno ?? undefined,
      colno: colno ?? undefined,
      error: error ? serialiseError(error) : undefined,
    });
    return false;
  };

  window.onunhandledrejection = (event) => {
    logger.error('Unhandled promise rejection', {
      reason: event.reason instanceof Error
        ? serialiseError(event.reason)
        : { value: String(event.reason) },
    });
  };

  console.error = (...args: unknown[]) => {
    originalConsole.error(...args);
    if (isIntercepting) return;
    isIntercepting = true;
    try {
      logger.error('console.error', {
        args: args.map((a) =>
          a instanceof Error ? serialiseError(a) : typeof a === 'object' && a !== null ? String(a) : a,
        ),
      });
    } finally {
      isIntercepting = false;
    }
  };

  console.warn = (...args: unknown[]) => {
    originalConsole.warn(...args);
    if (isIntercepting) return;
    isIntercepting = true;
    try {
      logger.warn('console.warn', {
        args: args.map((a) =>
          a instanceof Error ? serialiseError(a) : typeof a === 'object' && a !== null ? String(a) : a,
        ),
      });
    } finally {
      isIntercepting = false;
    }
  };

  return () => {
    window.onerror = prevOnError;
    window.onunhandledrejection = prevOnRejection;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
  };
}
