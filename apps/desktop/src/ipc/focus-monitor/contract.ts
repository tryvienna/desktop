/**
 * Focus Monitor IPC Contract — Methods + Events
 *
 * Safe to import from ANY process (main, preload, renderer, tests).
 */

import { z } from 'zod';
import { defineApi, defineEvents, method, event } from '@vienna/ipc';

const TerminalSessionSchema = z.object({
  name: z.string().nullable(),
  profileName: z.string().nullable(),
  tty: z.string().nullable(),
  cwd: z.string().nullable(),
  runningCommand: z.string().nullable(),
  isActive: z.boolean(),
  sessionId: z.string().nullable(),
});

const TerminalTabSchema = z.object({
  index: z.number(),
  title: z.string().nullable(),
  isActive: z.boolean(),
  sessions: z.array(TerminalSessionSchema),
});

const TerminalWindowSchema = z.object({
  index: z.number(),
  title: z.string().nullable(),
  isActive: z.boolean(),
  tabs: z.array(TerminalTabSchema),
});

const FocusDetailsSchema = z.object({
  detectorId: z.string(),
  tabTitle: z.string().nullable(),
  cwd: z.string().nullable(),
  runningCommand: z.string().nullable(),
  filePath: z.string().nullable(),
  gitBranch: z.string().nullable(),
  profileName: z.string().nullable(),
  windows: z.array(TerminalWindowSchema),
  extra: z.record(z.unknown()),
});

const FocusInfoSchema = z.object({
  bundleId: z.string().nullable(),
  appName: z.string(),
  windowTitle: z.string().nullable(),
  details: FocusDetailsSchema.nullable(),
  timestamp: z.string(),
});

// Inferred types — use these instead of duplicating interfaces elsewhere.
export type TerminalSession = z.infer<typeof TerminalSessionSchema>;
export type TerminalTab = z.infer<typeof TerminalTabSchema>;
export type TerminalWindow = z.infer<typeof TerminalWindowSchema>;
export type FocusDetails = z.infer<typeof FocusDetailsSchema>;
export type FocusInfo = z.infer<typeof FocusInfoSchema>;

const DetectorInfoSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  matchPatterns: z.array(z.string()),
});

// ─────────────────────────────────────────────────────────────────────────────
// API Methods (renderer → main)
// ─────────────────────────────────────────────────────────────────────────────

export const focusMonitorApi = defineApi({
  focusMonitor: {
    /** Get the current focus snapshot (or null if not running). */
    getCurrentFocus: method({
      input: z.object({}),
      output: FocusInfoSchema.nullable(),
    }),

    /** Get all registered detectors. */
    getDetectors: method({
      input: z.object({}),
      output: z.array(DetectorInfoSchema),
    }),

    /** Check if the monitor is running. */
    getStatus: method({
      input: z.object({}),
      output: z.object({
        running: z.boolean(),
        intervalMs: z.number(),
        detectorCount: z.number(),
      }),
    }),

    /** Start or stop the monitor, and optionally update the interval. */
    configure: method({
      input: z.object({
        enabled: z.boolean(),
        intervalMs: z.number().int().min(500).max(60000).optional(),
      }),
      output: z.object({ running: z.boolean() }),
    }),

    /** Activate (focus) a specific app window and tab. */
    activateWindow: method({
      input: z.object({
        /** App name (e.g. 'iTerm2', 'Terminal') */
        appName: z.string(),
        /** Window index (0-based) */
        windowIndex: z.number().int().min(0),
        /** Tab index (0-based). If omitted, just raises the window. */
        tabIndex: z.number().int().min(0).optional(),
      }),
      output: z.object({ success: z.boolean() }),
    }),
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Events (main → renderer, push)
// ─────────────────────────────────────────────────────────────────────────────

export const focusMonitorEvents = defineEvents({
  focusMonitor: {
    /** Emitted on every focus poll with the latest snapshot. */
    onFocusChanged: event({
      payload: FocusInfoSchema,
    }),
  },
});
