import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMainLogger } from '../main';
import type { MainLogger } from '../main';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('createMainLogger', () => {
  let tmpDir: string;
  let logger: MainLogger;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vienna-logger-'));
  });

  afterEach(async () => {
    await logger?.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should create a logger with all methods', () => {
    logger = createMainLogger({ baseLogDir: tmpDir, enableConsole: false });
    expect(logger.trace).toBeInstanceOf(Function);
    expect(logger.debug).toBeInstanceOf(Function);
    expect(logger.info).toBeInstanceOf(Function);
    expect(logger.warn).toBeInstanceOf(Function);
    expect(logger.error).toBeInstanceOf(Function);
    expect(logger.fatal).toBeInstanceOf(Function);
    expect(logger.child).toBeInstanceOf(Function);
    expect(logger.flush).toBeInstanceOf(Function);
    expect(logger.close).toBeInstanceOf(Function);
  });

  it('should generate a session ID and create session directory', () => {
    logger = createMainLogger({ baseLogDir: tmpDir, enableConsole: false });
    const sessionId = logger.getSessionId();
    expect(sessionId).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z_[0-9a-f]{6}$/);
    expect(fs.existsSync(logger.getSessionDir())).toBe(true);
    expect(logger.getSessionDir()).toBe(path.join(tmpDir, sessionId));
  });

  it('should accept a custom session ID', () => {
    logger = createMainLogger({
      baseLogDir: tmpDir,
      sessionId: 'custom-session',
      enableConsole: false,
    });
    expect(logger.getSessionId()).toBe('custom-session');
    expect(logger.getSessionDir()).toBe(path.join(tmpDir, 'custom-session'));
  });

  it('should write the log file path correctly', () => {
    logger = createMainLogger({ baseLogDir: tmpDir, enableConsole: false });
    expect(logger.getLogFile()).toBe(path.join(logger.getSessionDir(), 'vienna.log'));
  });

  it('should write current-session pointer file', () => {
    logger = createMainLogger({ baseLogDir: tmpDir, enableConsole: false });
    const pointer = fs.readFileSync(path.join(tmpDir, 'current-session'), 'utf8');
    expect(pointer).toBe(logger.getSessionId());
  });

  it('should write NDJSON log entries to disk', async () => {
    logger = createMainLogger({ baseLogDir: tmpDir, enableConsole: false });
    logger.info('hello world', { userId: 'abc' });
    await logger.flush();

    // Give streams a moment
    await new Promise((r) => setTimeout(r, 100));

    const content = fs.readFileSync(logger.getLogFile(), 'utf8').trim();
    expect(content.length).toBeGreaterThan(0);

    const entry = JSON.parse(content.split('\n').at(-1)!);
    expect(entry.msg).toBe('hello world');
    expect(entry.level).toBe('info');
    expect(entry.userId).toBe('abc');
    expect(entry.processType).toBe('main');
    expect(entry.time).toBeTypeOf('number');
    expect(entry.pid).toBeTypeOf('number');
  });

  it('should respect log level filtering', async () => {
    logger = createMainLogger({
      baseLogDir: tmpDir,
      level: 'error',
      enableConsole: false,
    });
    logger.debug('should not appear');
    logger.info('should not appear either');
    logger.error('should appear');
    await logger.flush();
    await new Promise((r) => setTimeout(r, 100));

    const content = fs.readFileSync(logger.getLogFile(), 'utf8').trim();
    const lines = content.split('\n').filter(Boolean);
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]).msg).toBe('should appear');
  });

  it('should support child loggers with bindings', async () => {
    logger = createMainLogger({ baseLogDir: tmpDir, enableConsole: false });
    const child = logger.child({ service: 'auth' });

    child.info('user login', { userId: '123' });
    await child.flush();
    await new Promise((r) => setTimeout(r, 100));

    const content = fs.readFileSync(logger.getLogFile(), 'utf8').trim();
    const entry = JSON.parse(content.split('\n').at(-1)!);
    expect(entry.msg).toBe('user login');
    expect(entry.service).toBe('auth');
    expect(entry.userId).toBe('123');
  });

  it('should support nested child loggers', async () => {
    logger = createMainLogger({ baseLogDir: tmpDir, enableConsole: false });
    const child = logger.child({ service: 'auth' });
    const grandchild = child.child({ requestId: 'req-1' });

    grandchild.info('deep log');
    await grandchild.flush();
    await new Promise((r) => setTimeout(r, 100));

    const content = fs.readFileSync(logger.getLogFile(), 'utf8').trim();
    const entry = JSON.parse(content.split('\n').at(-1)!);
    expect(entry.service).toBe('auth');
    expect(entry.requestId).toBe('req-1');
    expect(entry.msg).toBe('deep log');
  });

  it('should include custom processType', async () => {
    logger = createMainLogger({
      baseLogDir: tmpDir,
      processType: 'worker',
      enableConsole: false,
    });
    logger.info('from worker');
    await logger.flush();
    await new Promise((r) => setTimeout(r, 100));

    const content = fs.readFileSync(logger.getLogFile(), 'utf8').trim();
    const entry = JSON.parse(content.split('\n').at(-1)!);
    expect(entry.processType).toBe('worker');
  });

  it('should handle close() gracefully', async () => {
    logger = createMainLogger({ baseLogDir: tmpDir, enableConsole: false });
    logger.info('before close');
    await logger.close();

    const content = fs.readFileSync(logger.getLogFile(), 'utf8').trim();
    expect(content).toContain('before close');
  });
});
