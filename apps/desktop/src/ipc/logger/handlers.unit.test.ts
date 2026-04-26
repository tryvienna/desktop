import { describe, it, expect, vi } from 'vitest';
import type { MainLogger } from '@vienna/logger/main';
import { createLoggerHandlers } from './handlers';

function createMockLogger(): MainLogger {
  return {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    getSessionId: vi.fn().mockReturnValue('session-abc'),
    getSessionDir: vi.fn().mockReturnValue('/tmp/logs/session-abc'),
  } as unknown as MainLogger;
}

describe('createLoggerHandlers', () => {
  describe('logger.log', () => {
    it('forwards log entry to the main logger at the specified level', () => {
      const logger = createMockLogger();
      const handlers = createLoggerHandlers(logger);

      const result = handlers.logger.log({
        level: 'info',
        msg: 'Hello from renderer',
        context: { component: 'App' },
      });

      expect(logger.info).toHaveBeenCalledWith('Hello from renderer', {
        component: 'App',
        processType: 'renderer',
      });
      expect(result).toEqual({ logged: true });
    });

    it('handles different log levels', () => {
      const logger = createMockLogger();
      const handlers = createLoggerHandlers(logger);

      handlers.logger.log({ level: 'error', msg: 'Error!', context: {} });
      expect(logger.error).toHaveBeenCalledWith('Error!', { processType: 'renderer' });

      handlers.logger.log({ level: 'warn', msg: 'Warning!', context: {} });
      expect(logger.warn).toHaveBeenCalledWith('Warning!', { processType: 'renderer' });
    });
  });

  describe('logger.getSessionId', () => {
    it('returns session ID and directory', () => {
      const logger = createMockLogger();
      const handlers = createLoggerHandlers(logger);

      const result = handlers.logger.getSessionId({});

      expect(result).toEqual({
        sessionId: 'session-abc',
        sessionDir: '/tmp/logs/session-abc',
      });
    });
  });
});
