import { z } from 'zod';
import { defineApi, method } from '@vienna/ipc';

const logLevelSchema = z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']);

export const loggerApi = defineApi({
  logger: {
    /** Forward a structured log entry from the renderer to the main-process logger. */
    log: method({
      input: z.object({
        level: logLevelSchema,
        msg: z.string(),
        context: z.record(z.unknown()).optional(),
      }),
      output: z.object({
        logged: z.boolean(),
      }),
    }),

    /** Retrieve the current session info so the renderer knows where logs go. */
    getSessionId: method({
      input: z.object({}),
      output: z.object({
        sessionId: z.string(),
        sessionDir: z.string(),
      }),
    }),

    /** Enable or disable logging (controlled by developer mode). */
    setEnabled: method({
      input: z.object({ enabled: z.boolean() }),
      output: z.object({ enabled: z.boolean() }),
    }),
  },
});
