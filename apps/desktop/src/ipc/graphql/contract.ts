/**
 * GraphQL IPC Contract — Methods + Events
 *
 * Defines the type-safe boundary between renderer and main process
 * for GraphQL operations. Renderer sends operations via IPC,
 * main process executes them against the Pothos schema.
 *
 * Safe to import from ANY process (main, preload, renderer, tests).
 */

import { z } from 'zod';
import { defineApi, defineEvents, method, event } from '@vienna/ipc';

// ─────────────────────────────────────────────────────────────────────────────
// Shared Schemas
// ─────────────────────────────────────────────────────────────────────────────

const GraphQLErrorSchema = z.object({
  message: z.string(),
  locations: z.array(z.object({ line: z.number(), column: z.number() })).optional(),
  path: z.array(z.union([z.string(), z.number()])).optional(),
  extensions: z.record(z.unknown()).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// API Methods (renderer → main, request/response)
// ─────────────────────────────────────────────────────────────────────────────

export const graphqlApi = defineApi({
  graphql: {
    /** Execute a GraphQL operation (query or mutation) */
    execute: method({
      input: z.object({
        query: z.string(),
        variables: z.record(z.unknown()).optional(),
        operationName: z.string().optional(),
        /** Plugin ID of the caller — set automatically by the SDK, not user-controllable. */
        callerPluginId: z.string().optional(),
      }),
      output: z.object({
        data: z.unknown().nullable().optional(),
        errors: z.array(GraphQLErrorSchema).optional(),
      }),
    }),
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Events (main → renderer, cache invalidation)
// ─────────────────────────────────────────────────────────────────────────────

export const graphqlEvents = defineEvents({
  graphql: {
    /** Entity created/updated/deleted — evict from cache and refetch active queries */
    onInvalidate: event({
      payload: z.object({
        typename: z.string(),
        id: z.string().optional(),
        /** For types with non-standard keyFields (e.g., Entity uses 'uri') */
        keyFields: z.record(z.string()).optional(),
      }),
    }),

    /** Granular field update — modify cache directly without refetching */
    onCacheUpdate: event({
      payload: z.object({
        typename: z.string(),
        id: z.string(),
        fields: z.record(z.unknown()),
      }),
    }),
  },
});
