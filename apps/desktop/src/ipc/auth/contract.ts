/**
 * Auth IPC Contract — Methods + Events
 *
 * Defines the type-safe boundary between renderer and main process
 * for authentication operations. Renderer triggers auth flows,
 * main process manages tokens and browser-based login.
 *
 * Safe to import from ANY process (main, preload, renderer, tests).
 */

import { z } from 'zod';
import { defineApi, defineEvents, method, event } from '@vienna/ipc';

// ─────────────────────────────────────────────────────────────────────────────
// Shared Schemas
// ─────────────────────────────────────────────────────────────────────────────

const AuthStateSchema = z.object({
  isAuthenticated: z.boolean(),
  userId: z.string().nullable(),
  email: z.string().nullable(),
});

// ─────────────────────────────────────────────────────────────────────────────
// API Methods (renderer → main, request/response)
// ─────────────────────────────────────────────────────────────────────────────

export const authApi = defineApi({
  auth: {
    /** Open system browser for login or signup */
    openBrowserAuth: method({
      input: z.object({
        type: z.enum(['login', 'signup']),
      }),
      output: z.object({
        success: z.boolean(),
        error: z.string().optional(),
      }),
    }),

    /** Get current auth state (cached in main process memory) */
    getAuthState: method({
      input: z.object({}),
      output: AuthStateSchema,
    }),

    /** Logout: revoke session on server + clear local token */
    logout: method({
      input: z.object({}),
      output: z.object({ success: z.boolean() }),
    }),
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Events (main → renderer, push notifications)
// ─────────────────────────────────────────────────────────────────────────────

export const authEvents = defineEvents({
  auth: {
    /** Fired when auth state changes (login success, logout, token expiry) */
    onAuthStateChanged: event({
      payload: AuthStateSchema,
    }),
  },
});
