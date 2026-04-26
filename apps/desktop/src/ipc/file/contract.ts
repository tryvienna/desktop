/**
 * File IPC Contract — Methods + Events
 *
 * Defines the type-safe boundary between renderer and main process
 * for file read/write/watch operations.
 *
 * Safe to import from ANY process (main, preload, renderer, tests).
 */

import { z } from 'zod';
import { defineApi, defineEvents, method, event } from '@vienna/ipc';

// ─────────────────────────────────────────────────────────────────────────────
// API Methods (renderer → main, request/response)
// ─────────────────────────────────────────────────────────────────────────────

export const fileApi = defineApi({
  file: {
    /** Read a file's content and detect its language */
    read: method({
      input: z.object({ path: z.string().describe('Absolute file path') }),
      output: z.object({
        content: z.string(),
        language: z.string().describe('Detected language ID'),
      }),
    }),

    /** Write content to a file */
    write: method({
      input: z.object({
        path: z.string().describe('Absolute file path'),
        content: z.string().describe('Content to write'),
      }),
      output: z.object({ success: z.boolean() }),
    }),

    /** Start watching a file for external changes */
    watch: method({
      input: z.object({ path: z.string() }),
      output: z.object({ watching: z.boolean() }),
    }),

    /** Stop watching a file */
    unwatch: method({
      input: z.object({ path: z.string() }),
      output: z.object({ success: z.boolean() }),
    }),

    /** List contents of a directory */
    listDirectory: method({
      input: z.object({ path: z.string().describe('Absolute directory path') }),
      output: z.object({
        entries: z.array(z.object({
          name: z.string(),
          path: z.string(),
          type: z.enum(['file', 'directory', 'symlink']),
          extension: z.string().optional(),
          size: z.number().optional(),
          modifiedTime: z.string(),
          isHidden: z.boolean(),
        })),
      }),
    }),

    /** Create a new directory */
    createDirectory: method({
      input: z.object({ path: z.string().describe('Absolute path for the new directory') }),
      output: z.object({ success: z.boolean() }),
    }),

    /** Create a new empty file */
    createFile: method({
      input: z.object({ path: z.string().describe('Absolute path for the new file') }),
      output: z.object({ success: z.boolean() }),
    }),

    /** Rename a file or directory */
    rename: method({
      input: z.object({
        oldPath: z.string().describe('Current absolute path'),
        newPath: z.string().describe('New absolute path'),
      }),
      output: z.object({ success: z.boolean() }),
    }),

    /** Delete a file or directory */
    deleteItem: method({
      input: z.object({ path: z.string().describe('Absolute path to delete') }),
      output: z.object({ success: z.boolean() }),
    }),
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Events (main → renderer, streaming)
// ─────────────────────────────────────────────────────────────────────────────

export const fileEvents = defineEvents({
  file: {
    /** File content changed externally (detected by watcher) */
    onChanged: event({
      payload: z.object({ path: z.string() }),
    }),
  },
});
