import { z } from 'zod';
import { defineApi, method } from '@vienna/ipc';

export const feedbackApi = defineApi({
  feedback: {
    submit: method({
      input: z.object({
        message: z.string().min(1).max(5000),
        name: z.string().max(200).optional(),
        email: z.string().email().max(320).optional(),
        source: z.string().max(50).default('desktop'),
        metadata: z.record(z.unknown()).default({}),
      }),
      output: z.object({
        success: z.boolean(),
        id: z.string().optional(),
        error: z.string().optional(),
      }),
    }),
  },
});
