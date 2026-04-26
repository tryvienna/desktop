/**
 * Workstream IPC Events — Real-time streaming events from main → renderer.
 *
 * All request/response operations have been migrated to GraphQL mutations.
 * Only event subscriptions remain as IPC (no GraphQL subscriptions).
 *
 * Safe to import from ANY process (main, preload, renderer, tests).
 */

import { z } from 'zod';
import { defineEvents, event } from '@vienna/ipc';
import { AgentEventSchema } from '@vienna/agent-core';
import { WorkstreamStatusSchema, WorkstreamTagStatusSchema } from '@vienna/app-db/schemas';

export const workstreamEvents = defineEvents({
  workstream: {
    /** Agent event scoped to a workstream (live or replay) */
    onAgentEvent: event({
      payload: z.object({
        workstreamId: z.string(),
        event: AgentEventSchema,
        isFromHistory: z.boolean().optional(),
        /** DB event ID — set on history replay events for rewind targeting */
        dbEventId: z.number().optional(),
      }),
    }),

    /** Workstream status changed */
    onStatusChanged: event({
      payload: z.object({
        workstreamId: z.string(),
        status: WorkstreamStatusSchema,
        previousStatus: WorkstreamStatusSchema,
      }),
    }),

    /** Agent provider state changed for a workstream */
    onAgentStateChanged: event({
      payload: z.object({
        workstreamId: z.string(),
        state: z.string(),
      }),
    }),

    /** Tag execution status changed on a workstream */
    onTagStatusChanged: event({
      payload: z.object({
        workstreamId: z.string(),
        tagName: z.string(),
        status: WorkstreamTagStatusSchema,
        error: z.string().nullable().optional(),
      }),
    }),

  },
});
