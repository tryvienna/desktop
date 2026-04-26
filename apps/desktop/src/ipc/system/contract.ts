import { z } from 'zod';
import { defineApi, method } from '@vienna/ipc';
import { rendererEnvSchema } from '@vienna/env/renderer';

const updateStateSchema = z.object({
  available: z.boolean(),
  currentVersion: z.string(),
  latestVersion: z.string().nullable(),
  releaseNotes: z.string().nullable(),
  downloadUrl: z.string().nullable(),
  publishedAt: z.string().nullable(),
});

export const systemApi = defineApi({
  system: {
    getVersions: method({
      input: z.object({}),
      output: z.object({
        app: z.string(),
        commit: z.string(),
        electron: z.string(),
        node: z.string(),
        chrome: z.string(),
      }),
    }),
    getEnv: method({
      input: z.object({}),
      output: rendererEnvSchema,
    }),
    checkForUpdate: method({
      input: z.object({}),
      output: updateStateSchema,
    }),
    getUpdateState: method({
      input: z.object({}),
      output: updateStateSchema,
    }),
    downloadUpdate: method({
      input: z.object({}),
      output: z.object({
        success: z.boolean(),
        error: z.string().optional(),
      }),
    }),
    setTrayLabel: method({
      input: z.object({ label: z.string() }),
      output: z.object({ success: z.boolean() }),
    }),
  },
});
