/**
 * OAuth IPC Contract — Methods + Events
 *
 * Defines the type-safe boundary between renderer and main process
 * for OAuth flow operations. Renderer triggers flows and subscribes
 * to real-time status updates; main process manages the complete
 * OAuth lifecycle (callback server, token exchange, refresh).
 *
 * Safe to import from ANY process (main, preload, renderer, tests).
 */

import { z } from 'zod';
import { defineApi, defineEvents, method, event } from '@vienna/ipc';

// ─────────────────────────────────────────────────────────────────────────────
// Shared Schemas
// ─────────────────────────────────────────────────────────────────────────────

export const OAuthFlowStatusSchema = z.enum([
  'idle',
  'awaiting_callback',
  'awaiting_device_code',
  'awaiting_manual_code',
  'exchanging_token',
]);
export type OAuthFlowStatus = z.infer<typeof OAuthFlowStatusSchema>;

const OAuthProviderStatusSchema = z.object({
  providerId: z.string(),
  displayName: z.string().optional(),
  connected: z.boolean(),
  expiresAt: z.number().optional(),
  scopes: z.array(z.string()).optional(),
  flowStatus: OAuthFlowStatusSchema.optional(),
  required: z.boolean().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// API Methods (renderer → main, request/response)
// ─────────────────────────────────────────────────────────────────────────────

export const oauthApi = defineApi({
  oauth: {
    /** Start an OAuth flow for an integration provider. Opens browser. */
    startFlow: method({
      input: z.object({
        integrationId: z.string(),
        providerId: z.string(),
      }),
      output: z.object({
        success: z.boolean(),
        userCode: z.string().optional(),
        verificationUri: z.string().optional(),
        instructions: z.string().optional(),
        authorizationUrl: z.string().optional(),
        error: z.string().optional(),
      }),
    }),

    /** Get OAuth provider statuses for an integration. */
    getStatus: method({
      input: z.object({
        integrationId: z.string(),
      }),
      output: z.object({
        success: z.boolean(),
        providers: z.array(OAuthProviderStatusSchema),
        error: z.string().optional(),
      }),
    }),

    /** Revoke an OAuth token and disconnect a provider. */
    revokeToken: method({
      input: z.object({
        integrationId: z.string(),
        providerId: z.string(),
      }),
      output: z.object({
        success: z.boolean(),
        error: z.string().optional(),
      }),
    }),

    /** Submit a manually-entered authorization code (for manual_code flow). */
    submitCode: method({
      input: z.object({
        integrationId: z.string(),
        providerId: z.string(),
        code: z.string(),
      }),
      output: z.object({
        success: z.boolean(),
        error: z.string().optional(),
      }),
    }),

    /** Manually trigger a token refresh. */
    refreshToken: method({
      input: z.object({
        integrationId: z.string(),
        providerId: z.string(),
      }),
      output: z.object({
        success: z.boolean(),
        expiresAt: z.number().optional(),
        error: z.string().optional(),
      }),
    }),
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Events (main → renderer, push notifications)
// ─────────────────────────────────────────────────────────────────────────────

export const oauthEvents = defineEvents({
  oauth: {
    /** Flow status changed (e.g., awaiting_callback → exchanging_token). */
    onFlowUpdate: event({
      payload: z.object({
        integrationId: z.string(),
        providerId: z.string(),
        status: OAuthFlowStatusSchema,
        userCode: z.string().optional(),
        verificationUri: z.string().optional(),
        instructions: z.string().optional(),
      }),
    }),

    /** OAuth flow completed successfully — token stored. */
    onFlowComplete: event({
      payload: z.object({
        integrationId: z.string(),
        providerId: z.string(),
      }),
    }),

    /** OAuth flow failed. */
    onFlowError: event({
      payload: z.object({
        integrationId: z.string(),
        providerId: z.string(),
        error: z.string(),
      }),
    }),

    /** Token was refreshed (proactively or on 401). */
    onTokenRefreshed: event({
      payload: z.object({
        integrationId: z.string(),
        providerId: z.string(),
        expiresAt: z.number().optional(),
      }),
    }),
  },
});
