import type { ApiHandlers } from '@vienna/ipc';
import type { LogLevel } from '@vienna/logger';
import type { MainLogger } from '@vienna/logger/main';
import type { loggerApi } from './contract';

/**
 * Create logger IPC handlers.
 *
 * Unlike system handlers (which are static), logger handlers depend on the
 * MainLogger instance created at app startup — so we use a factory.
 */
export function createLoggerHandlers(logger: MainLogger): ApiHandlers<typeof loggerApi> {
  return {
    logger: {
      log: (input) => {
        const level = input.level as LogLevel;
        logger[level](input.msg, {
          ...input.context,
          processType: 'renderer',
        });
        return { logged: true };
      },
      getSessionId: () => ({
        sessionId: logger.getSessionId(),
        sessionDir: logger.getSessionDir(),
      }),
      setEnabled: (input) => {
        logger.setEnabled(input.enabled);
        return { enabled: input.enabled };
      },
    },
  };
}
