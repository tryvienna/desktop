/**
 * Feed IPC Contract — Methods for the home feed system.
 *
 * The feed system uses a dedicated workstream to process feed.md
 * instructions and generate json-render specs for the home feed UI.
 */

import { z } from 'zod';
import { defineApi, method } from '@vienna/ipc';

export const feedApi = defineApi({
  feed: {
    /** Get the feed workstream ID for a project (creates if needed). */
    getFeedWorkstreamId: method({
      input: z.object({
        projectId: z.string(),
      }),
      output: z.object({
        workstreamId: z.string().nullable(),
      }),
    }),
    /** Trigger feed processing (re-reads feed.md and sends to workstream). */
    refreshFeed: method({
      input: z.object({
        projectId: z.string(),
      }),
      output: z.object({
        success: z.boolean(),
        error: z.string().optional(),
      }),
    }),
    /** Get cached feed content (last AI response + timestamp). */
    getFeedContent: method({
      input: z.object({
        projectId: z.string(),
      }),
      output: z.object({
        responseText: z.string().nullable(),
        lastActivityAt: z.number().nullable(),
      }),
    }),
    /** Check if feed.md exists for a project. */
    hasFeedConfig: method({
      input: z.object({
        projectId: z.string(),
      }),
      output: z.object({
        hasFeed: z.boolean(),
      }),
    }),
    /** List all feed.md file locations (global + project) with existence info. */
    listFeedFiles: method({
      input: z.object({
        projectId: z.string(),
      }),
      output: z.object({
        files: z.array(
          z.object({
            tier: z.enum(['profile', 'global', 'project']),
            path: z.string(),
            exists: z.boolean(),
            label: z.string(),
          }),
        ),
      }),
    }),
    /** Read a specific feed.md file. Returns empty string if file doesn't exist. */
    readFeedFile: method({
      input: z.object({
        filePath: z.string(),
        projectId: z.string(),
      }),
      output: z.object({
        content: z.string(),
        exists: z.boolean(),
      }),
    }),
    /** Get inline specs and segment metadata parsed from feed.md. */
    getInlineSpecs: method({
      input: z.object({
        projectId: z.string(),
      }),
      output: z.object({
        inlineSpecs: z.array(
          z.object({
            index: z.number(),
            spec: z.object({
              id: z.string(),
              spec: z.object({
                root: z.string(),
                elements: z.record(z.string(), z.object({
                  type: z.string().optional(),
                  props: z.record(z.string(), z.unknown()).optional(),
                  children: z.array(z.string()).optional(),
                }).passthrough()),
              }),
            }),
          }),
        ),
        segments: z.array(
          z.discriminatedUnion('type', [
            z.object({ type: z.literal('prompt'), index: z.number(), text: z.string() }),
            z.object({
              type: z.literal('inline-spec'),
              index: z.number(),
              spec: z.object({
                id: z.string(),
                spec: z.object({
                  root: z.string(),
                  elements: z.record(z.string(), z.object({
                    type: z.string().optional(),
                    props: z.record(z.string(), z.unknown()).optional(),
                    children: z.array(z.string()).optional(),
                  }).passthrough()),
                }),
              }),
            }),
            z.object({
              type: z.literal('plugin-feed'),
              index: z.number(),
              pluginId: z.string(),
              props: z.record(z.string(), z.unknown()).optional(),
            }),
            z.object({
              type: z.literal('entity-feed'),
              index: z.number(),
              uri: z.string(),
              entityType: z.string(),
              props: z.record(z.string(), z.unknown()).optional(),
            }),
          ]),
        ),
      }),
    }),
    /** Write content to a specific feed.md file. Creates parent dirs if needed. */
    writeFeedFile: method({
      input: z.object({
        filePath: z.string(),
        content: z.string(),
        projectId: z.string(),
      }),
      output: z.object({
        success: z.boolean(),
        error: z.string().optional(),
      }),
    }),
  },
});

