import { z } from 'zod';
import { defineApi, method } from '@vienna/ipc';

export const cliApi = defineApi({
  cli: {
    getVcliCommand: method({
      input: z.object({}),
      output: z.object({
        command: z.string().nullable(),
        strategy: z.string(),
      }),
    }),
    installVcli: method({
      input: z.object({}),
      output: z.object({
        success: z.boolean(),
        path: z.string().optional(),
        error: z.string().optional(),
      }),
    }),
    uninstallVcli: method({
      input: z.object({}),
      output: z.object({
        success: z.boolean(),
        error: z.string().optional(),
      }),
    }),
    isVcliInstalled: method({
      input: z.object({}),
      output: z.object({
        installed: z.boolean(),
        path: z.string().optional(),
      }),
    }),
  },
});
