/**
 * Files IPC Contract — File search indexing methods + events
 *
 * Defines the type-safe boundary between renderer and main process
 * for file index search and status operations.
 *
 * Safe to import from ANY process (main, preload, renderer, tests).
 *
 * @ai-context
 * - searchFiles: fuzzy file search against the in-memory index
 * - indexDirectories: trigger indexing of additional directories (additive)
 * - setDirectories: replace the full indexed set (removes old worktree dirs)
 * - getIndexStatus: poll current index status (file count, isIndexing)
 * - onIndexStatusChanged: pushed from main when indexing starts/completes
 */

import { z } from 'zod';
import { defineApi, defineEvents, method, event } from '@vienna/ipc';

const IndexStatusSchema = z.object({
  totalFiles: z.number(),
  directories: z.number(),
  isIndexing: z.boolean(),
  indexingDirectories: z.array(z.string()),
});

export const filesApi = defineApi({
  files: {
    searchFiles: method({
      input: z.object({
        query: z.string(),
        limit: z.number().optional(),
        extensions: z.array(z.string()).optional(),
      }),
      output: z.object({
        results: z.array(z.object({
          path: z.string(),
          name: z.string(),
          relativePath: z.string(),
          projectRoot: z.string(),
          extension: z.string().optional(),
          score: z.number(),
        })),
      }),
    }),
    indexDirectories: method({
      input: z.object({ directories: z.array(z.string()) }),
      output: z.object({ success: z.boolean() }),
    }),
    setDirectories: method({
      input: z.object({ directories: z.array(z.string()) }),
      output: z.object({ success: z.boolean() }),
    }),
    getIndexStatus: method({
      input: z.object({}),
      output: IndexStatusSchema,
    }),
    searchContent: method({
      input: z.object({
        query: z.string(),
        directories: z.array(z.string()),
        limit: z.number().optional(),
        maxMatchesPerFile: z.number().optional(),
        caseSensitive: z.boolean().optional(),
        regex: z.boolean().optional(),
        glob: z.string().optional(),
        includeIgnored: z.boolean().optional(),
      }),
      output: z.object({
        results: z.array(z.object({
          path: z.string(),
          relativePath: z.string(),
          projectRoot: z.string(),
          matches: z.array(z.object({
            line: z.number(),
            text: z.string(),
            matchStart: z.number(),
            matchEnd: z.number(),
          })),
        })),
        totalMatches: z.number(),
        truncated: z.boolean(),
      }),
    }),
  },
});

export const filesEvents = defineEvents({
  files: {
    onIndexStatusChanged: event({
      payload: IndexStatusSchema,
    }),
  },
});
