import { z } from 'zod';
import { defineApi, method } from '@vienna/ipc';

export const shellApi = defineApi({
  shell: {
    openExternal: method({
      input: z.object({ url: z.string().url() }),
      output: z.object({ success: z.boolean() }),
    }),
    pickDirectory: method({
      input: z.object({
        title: z.string().optional(),
        defaultPath: z.string().optional(),
      }),
      output: z.object({ path: z.string().nullable() }),
    }),
    execute: method({
      input: z.object({
        command: z.string().min(1),
        cwd: z.string().min(1),
        timeoutMs: z.number().int().positive().max(60_000).optional(),
      }),
      output: z.object({
        stdout: z.string(),
        stderr: z.string(),
        exitCode: z.number().nullable(),
        durationMs: z.number(),
      }),
    }),
    showItemInFolder: method({
      input: z.object({ path: z.string() }),
      output: z.object({ success: z.boolean() }),
    }),
  },
});
