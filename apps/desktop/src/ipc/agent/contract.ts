/**
 * Agent IPC Contract — Methods + Events
 *
 * Defines the type-safe boundary between renderer and main process
 * for the agent/chat system. All schemas are Zod-based and validated
 * automatically by the IPC framework.
 *
 * Safe to import from ANY process (main, preload, renderer, tests).
 */

import { z } from 'zod';
import { defineApi, defineEvents, method, event } from '@vienna/ipc';
import {
  AgentEventSchema,
  ProviderStateSchema,
  SessionConfigSchema,
  PermissionResponseSchema,
  ProviderInfoSchema,
  ContentBlockSchema,
} from '@vienna/agent-core';

// ─────────────────────────────────────────────────────────────────────────────
// API Methods (renderer → main, request/response)
// ─────────────────────────────────────────────────────────────────────────────

export const agentApi = defineApi({
  agent: {
    /** Start a new agent session (or resume an existing one) */
    startSession: method({
      input: z.object({
        sessionId: z.string().optional(),
        providerId: z.string(),
        config: SessionConfigSchema,
      }),
      output: z.object({ sessionId: z.string() }),
    }),

    /** Stop a running agent session */
    stopSession: method({
      input: z.object({ sessionId: z.string() }),
      output: z.object({ stopped: z.boolean() }),
    }),

    /** Send a user message to the running agent */
    sendMessage: method({
      input: z.object({
        sessionId: z.string(),
        text: z.string(),
        contentBlocks: z.array(ContentBlockSchema).optional(),
      }),
      output: z.object({ accepted: z.boolean() }),
    }),

    /** Respond to a tool permission request */
    respondPermission: method({
      input: z.object({
        sessionId: z.string(),
        requestId: z.string(),
        response: PermissionResponseSchema,
      }),
      output: z.object({ accepted: z.boolean() }),
    }),

    /** Interrupt the current agent generation */
    interrupt: method({
      input: z.object({ sessionId: z.string() }),
      output: z.object({ interrupted: z.boolean() }),
    }),

    /** Get event history for a session (for replay) */
    getHistory: method({
      input: z.object({ sessionId: z.string() }),
      output: z.object({ events: z.array(AgentEventSchema) }),
    }),

    /** List all available providers */
    listProviders: method({
      input: z.object({}),
      output: z.object({ providers: z.array(ProviderInfoSchema) }),
    }),

    /** Check if a specific provider is available */
    checkProvider: method({
      input: z.object({ providerId: z.string() }),
      output: z.object({
        available: z.boolean(),
        version: z.string().optional(),
        error: z.string().optional(),
      }),
    }),

    /** Switch the model for a running session */
    switchModel: method({
      input: z.object({ sessionId: z.string(), toModel: z.string() }),
      output: z.object({ restarted: z.boolean() }),
    }),

    /** Link an entity to a session */
    linkEntity: method({
      input: z.object({
        sessionId: z.string(),
        entityUri: z.string(),
        entityType: z.string(),
        entityTitle: z.string(),
      }),
      output: z.object({ linked: z.boolean() }),
    }),

    /** Unlink an entity from a session */
    unlinkEntity: method({
      input: z.object({ sessionId: z.string(), entityUri: z.string() }),
      output: z.object({ unlinked: z.boolean() }),
    }),

    /** Trigger context compaction */
    compactConversation: method({
      input: z.object({
        sessionId: z.string(),
        instructions: z.string().optional(),
      }),
      output: z.object({ accepted: z.boolean() }),
    }),
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Events (main → renderer, streaming)
// ─────────────────────────────────────────────────────────────────────────────

export const agentEvents = defineEvents({
  agent: {
    /** Agent event stream (same for live and replay) */
    onEvent: event({
      payload: z.object({
        sessionId: z.string(),
        event: AgentEventSchema,
        isFromHistory: z.boolean().optional(),
        timestamp: z.number().optional(),
      }),
    }),

    /** Provider state changes */
    onStateChange: event({
      payload: z.object({
        sessionId: z.string(),
        state: ProviderStateSchema,
      }),
    }),

    /** Fatal errors */
    onError: event({
      payload: z.object({
        sessionId: z.string(),
        error: z.string(),
      }),
    }),
  },
});
