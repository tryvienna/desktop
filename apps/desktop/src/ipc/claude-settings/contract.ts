/**
 * Claude Settings IPC Contract — Discovers Claude Code config files.
 *
 * Safe to import from ANY process (main, preload, renderer, tests).
 */

import { z } from 'zod';
import { defineApi, method } from '@vienna/ipc';

const claudeConfigFileSchema = z.object({
  path: z.string(),
  scope: z.enum(['enterprise', 'global', 'project', 'local']),
  category: z.enum(['instructions', 'settings', 'rules', 'skills', 'agents', 'commands', 'memory', 'mcp', 'plans']),
  label: z.string(),
  exists: z.boolean(),
  isDirectory: z.boolean(),
  sourceDirectory: z.string().optional(),
});

export const claudeSettingsApi = defineApi({
  claudeSettings: {
    /** Discover all Claude Code config files for the given directories */
    discover: method({
      input: z.object({
        directories: z.array(z.string()),
      }),
      output: z.object({
        files: z.array(claudeConfigFileSchema),
      }),
    }),

    /** List contents of a Claude config directory (rules/, skills/, etc.) */
    listDirectory: method({
      input: z.object({ path: z.string() }),
      output: z.object({
        entries: z.array(z.object({
          name: z.string(),
          path: z.string(),
          type: z.enum(['file', 'directory']),
        })),
      }),
    }),

    /** Create a Claude config file or directory with sensible defaults */
    create: method({
      input: z.object({
        path: z.string(),
        isDirectory: z.boolean(),
      }),
      output: z.object({ success: z.boolean() }),
    }),

    /** Read a Claude config file's content */
    readFile: method({
      input: z.object({ path: z.string() }),
      output: z.object({ content: z.string() }),
    }),

    /** Write content to a Claude config file */
    writeFile: method({
      input: z.object({ path: z.string(), content: z.string() }),
      output: z.object({ success: z.boolean() }),
    }),
  },
});
