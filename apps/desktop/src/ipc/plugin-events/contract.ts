/**
 * Plugin Events IPC Contract — streaming event data from main → renderer.
 *
 * Used by the Event Monitor developer tool to display live events,
 * replay saved events, and query the event registry.
 *
 * Safe to import from ANY process (main, preload, renderer, tests).
 */

import { z } from 'zod';
import { defineApi, defineEvents, method, event } from '@vienna/ipc';

// ─────────────────────────────────────────────────────────────────────────────
// Serializable Event Schemas
// ─────────────────────────────────────────────────────────────────────────────

/** A single captured event for display in the Event Monitor. */
export const CapturedEventSchema = z.object({
  /** Unique ID for this capture (UUID). */
  id: z.string(),
  /** Fully-qualified event name (e.g., 'github_cli.commit.created'). */
  eventName: z.string(),
  /** Validated payload (JSON-serializable). */
  payload: z.unknown(),
  /** ISO timestamp when the event was emitted. */
  timestamp: z.string(),
  /** Number of listeners that received this event. */
  listenerCount: z.number(),
});

export type CapturedEvent = z.infer<typeof CapturedEventSchema>;

/** Event summary from the registry (for the Registry tab). */
export const EventSummarySchema = z.object({
  qualifiedName: z.string(),
  localName: z.string(),
  description: z.string(),
  ownerPluginId: z.string(),
  listenerCount: z.number(),
  payloadSchema: z.string().nullable(),
});

export type EventSummaryIpc = z.infer<typeof EventSummarySchema>;

/** A saved/bookmarked event. */
export const SavedEventSchema = CapturedEventSchema.extend({
  /** User-provided label (optional). */
  label: z.string().optional(),
  /** When it was saved. */
  savedAt: z.string(),
});

export type SavedEvent = z.infer<typeof SavedEventSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// API Methods (renderer → main)
// ─────────────────────────────────────────────────────────────────────────────

export const pluginEventsApi = defineApi({
  pluginEvents: {
    /** Get all registered events from the plugin system. */
    getRegisteredEvents: method({
      input: z.object({}),
      output: z.object({
        events: z.array(EventSummarySchema),
      }),
    }),

    /** Replay (re-emit) a captured event. */
    replayEvent: method({
      input: z.object({
        eventName: z.string(),
        payload: z.unknown(),
      }),
      output: z.object({
        success: z.boolean(),
        error: z.string().optional(),
        listenerCount: z.number().optional(),
      }),
    }),

    /** Save a captured event for later. */
    saveEvent: method({
      input: z.object({
        event: CapturedEventSchema,
        label: z.string().optional(),
      }),
      output: z.object({ success: z.boolean() }),
    }),

    /** Get all saved events. */
    getSavedEvents: method({
      input: z.object({}),
      output: z.object({
        events: z.array(SavedEventSchema),
      }),
    }),

    /** Delete a saved event by ID. */
    deleteSavedEvent: method({
      input: z.object({ id: z.string() }),
      output: z.object({ success: z.boolean() }),
    }),

    /** Clear all saved events. */
    clearSavedEvents: method({
      input: z.object({}),
      output: z.object({ success: z.boolean() }),
    }),
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Events (main → renderer, streaming)
// ─────────────────────────────────────────────────────────────────────────────

export const pluginEventsEvents = defineEvents({
  pluginEvents: {
    /** A plugin event was emitted — streamed to the Event Monitor. */
    onEventEmitted: event({
      payload: CapturedEventSchema,
    }),
  },
});
