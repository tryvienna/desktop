/**
 * Keybindings IPC Contract
 *
 * @ai-context
 * Type-safe IPC contract for keybindings operations. Safe to import from
 * any process (main, preload, renderer, tests). Contains only Zod schemas.
 *
 * @module ipc/keybindings/contract
 */

import { z } from 'zod';
import { defineApi, defineEvents, method, event } from '@vienna/ipc';
import { KeyboardShortcutSchema, KeybindingsMapSchema } from '../../keybindings/schemas';

export const keybindingsApi = defineApi({
  keybindings: {
    get: method({
      input: z.object({}),
      output: z.object({ keybindings: KeybindingsMapSchema }),
    }),
    getDefaults: method({
      input: z.object({}),
      output: z.object({ keybindings: KeybindingsMapSchema }),
    }),
    update: method({
      input: z.object({
        commandId: z.string().min(1),
        shortcut: KeyboardShortcutSchema,
      }),
      output: z.object({ success: z.boolean() }),
    }),
    resetOne: method({
      input: z.object({ commandId: z.string().min(1) }),
      output: z.object({ success: z.boolean() }),
    }),
    resetAll: method({
      input: z.object({}),
      output: z.object({ success: z.boolean() }),
    }),
  },
});

export const keybindingsEvents = defineEvents({
  keybindings: {
    onChanged: event({
      payload: z.object({ keybindings: KeybindingsMapSchema }),
    }),
  },
});
