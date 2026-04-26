import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRendererLogger, setupGlobalErrorCapture } from '../renderer';
import type { Logger } from '../index';

// Mock window.api.logger for IPC tests
function installMockIpc() {
  const calls: Array<{ level: string; msg: string; context?: Record<string, unknown> }> = [];
  (globalThis as Record<string, unknown>)['window'] = globalThis;
  (globalThis as Record<string, unknown>)['api'] = {
    logger: {
      log: async (input: { level: string; msg: string; context?: Record<string, unknown> }) => {
        calls.push(input);
        return { logged: true };
      },
    },
  };
  return { calls };
}

function uninstallMockIpc() {
  delete (globalThis as Record<string, unknown>)['api'];
}

describe('createRendererLogger', () => {
  afterEach(() => {
    uninstallMockIpc();
    vi.restoreAllMocks();
  });

  it('should create a logger with all methods', () => {
    const logger = createRendererLogger();
    expect(logger.trace).toBeInstanceOf(Function);
    expect(logger.debug).toBeInstanceOf(Function);
    expect(logger.info).toBeInstanceOf(Function);
    expect(logger.warn).toBeInstanceOf(Function);
    expect(logger.error).toBeInstanceOf(Function);
    expect(logger.fatal).toBeInstanceOf(Function);
    expect(logger.child).toBeInstanceOf(Function);
    expect(logger.flush).toBeInstanceOf(Function);
  });

  it('should send logs to IPC when available', async () => {
    const { calls } = installMockIpc();
    // Re-import to pick up the mock (renderer caches the missing-IPC warning)
    // Just create a fresh logger — getIpcClient() is called lazily per log
    const logger = createRendererLogger({ level: 'trace' });

    logger.info('hello', { userId: '123' });

    // IPC is fire-and-forget, give it a tick
    await new Promise((r) => setTimeout(r, 10));

    expect(calls).toHaveLength(1);
    expect(calls[0].level).toBe('info');
    expect(calls[0].msg).toBe('hello');
    expect(calls[0].context).toEqual({ userId: '123' });
  });

  it('should respect log level filtering', async () => {
    const { calls } = installMockIpc();
    const logger = createRendererLogger({ level: 'warn' });

    logger.debug('nope');
    logger.info('nope');
    logger.warn('yes');
    logger.error('yes');

    await new Promise((r) => setTimeout(r, 10));

    expect(calls).toHaveLength(2);
    expect(calls[0].level).toBe('warn');
    expect(calls[1].level).toBe('error');
  });

  it('should support child loggers that merge bindings', async () => {
    const { calls } = installMockIpc();
    const logger = createRendererLogger({ level: 'trace' });
    const child = logger.child({ service: 'auth' });

    child.info('login', { userId: '1' });
    await new Promise((r) => setTimeout(r, 10));

    expect(calls).toHaveLength(1);
    expect(calls[0].context).toEqual({ service: 'auth', userId: '1' });
  });

  it('should support nested child loggers', async () => {
    const { calls } = installMockIpc();
    const logger = createRendererLogger({ level: 'trace' });
    const grandchild = logger.child({ a: 1 }).child({ b: 2 });

    grandchild.info('deep');
    await new Promise((r) => setTimeout(r, 10));

    expect(calls).toHaveLength(1);
    expect(calls[0].context).toEqual({ a: 1, b: 2 });
  });

  it('should fall back to console-only when IPC is unavailable', async () => {
    // No mock installed — IPC unavailable. Logger should not throw.
    const logger = createRendererLogger({ level: 'trace' });
    expect(() => logger.info('console only')).not.toThrow();

    // Give fire-and-forget IPC a tick to confirm no unhandled rejection
    await new Promise((r) => setTimeout(r, 10));
  });

  it('should resolve flush() immediately (no buffer in renderer)', async () => {
    const logger = createRendererLogger();
    await expect(logger.flush()).resolves.toBeUndefined();
  });
});

describe('setupGlobalErrorCapture', () => {
  let logger: Logger;
  let logged: Array<{ level: string; msg: string; ctx?: Record<string, unknown> }>;
  let cleanup: () => void;

  beforeEach(() => {
    logged = [];
    // Minimal logger that records calls
    logger = {
      trace: () => {},
      debug: () => {},
      info: () => {},
      warn: (msg, ctx) => logged.push({ level: 'warn', msg, ctx }),
      error: (msg, ctx) => logged.push({ level: 'error', msg, ctx }),
      fatal: (msg, ctx) => logged.push({ level: 'fatal', msg, ctx }),
      child: () => logger,
      flush: () => Promise.resolve(),
    };
  });

  afterEach(() => {
    cleanup?.();
  });

  it('should return a cleanup function', () => {
    cleanup = setupGlobalErrorCapture(logger);
    expect(cleanup).toBeInstanceOf(Function);
  });

  it('should intercept console.error', () => {
    cleanup = setupGlobalErrorCapture(logger);
    console.error('test error');

    expect(logged.some((l) => l.level === 'error' && l.msg === 'console.error')).toBe(true);
  });

  it('should intercept console.warn', () => {
    cleanup = setupGlobalErrorCapture(logger);
    console.warn('test warn');

    expect(logged.some((l) => l.level === 'warn' && l.msg === 'console.warn')).toBe(true);
  });

  it('should restore console methods on cleanup', () => {
    const origError = console.error;
    const origWarn = console.warn;

    cleanup = setupGlobalErrorCapture(logger);
    expect(console.error).not.toBe(origError);
    expect(console.warn).not.toBe(origWarn);

    cleanup();
    expect(console.error).toBe(origError);
    expect(console.warn).toBe(origWarn);
  });

  it('should not cause infinite loops from interception', () => {
    cleanup = setupGlobalErrorCapture(logger);
    // This would infinite-loop if the guard is broken
    console.error('trigger');
    console.error('trigger again');

    expect(logged.filter((l) => l.msg === 'console.error')).toHaveLength(2);
  });
});
