/**
 * @vienna/tunnel — self-hosted relay tunnel for remote GraphQL access.
 *
 * Entry points:
 *   @vienna/tunnel       — shared types and Zod schemas (safe for all processes)
 *   @vienna/tunnel/main  — TunnelManager class (Node.js / Electron main process only)
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Tunnel status
// ---------------------------------------------------------------------------

export const TunnelStatusValues = ['idle', 'connecting', 'connected', 'error', 'disconnecting'] as const;
export const TunnelStatusSchema = z.enum(TunnelStatusValues);
export type TunnelStatus = z.infer<typeof TunnelStatusSchema>;

// ---------------------------------------------------------------------------
// Tunnel info (status + metadata for a single tunnel)
// ---------------------------------------------------------------------------

export const TunnelInfoSchema = z.object({
  tunnelId: z.string(),
  status: TunnelStatusSchema,
  url: z.string().nullable(),
  port: z.number().optional(),
  apiKey: z.string().optional(),
  metadata: z.string().optional(),
  error: z.string().optional(),
});
export type TunnelInfo = z.infer<typeof TunnelInfoSchema>;

// ---------------------------------------------------------------------------
// GraphQL tunnel info (extends TunnelInfo with API key)
// ---------------------------------------------------------------------------

export const GraphQLTunnelInfoSchema = z.object({
  tunnelId: z.string(),
  status: TunnelStatusSchema,
  url: z.string(),
  port: z.number().optional(),
  apiKey: z.string(),
  metadata: z.string().optional(),
  error: z.string().optional(),
});
export type GraphQLTunnelInfo = z.infer<typeof GraphQLTunnelInfoSchema>;

// ---------------------------------------------------------------------------
// Push event (desktop → relay → mobile via WebSocket)
// ---------------------------------------------------------------------------

export const PushEventSchema = z.object({
  type: z.string(),
  payload: z.record(z.unknown()),
});
export type PushEvent = z.infer<typeof PushEventSchema>;

// ---------------------------------------------------------------------------
// GraphQL execute function type (generic, no graphql-js dependency)
// ---------------------------------------------------------------------------

/** Function signature for executing GraphQL operations. Injected by the caller. */
export type GraphQLExecuteFn = (
  query: string,
  variables?: Record<string, unknown>,
  operationName?: string,
) => Promise<{ data?: unknown; errors?: unknown[] }>;

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

export type TunnelErrorCode =
  | 'AUTH_FAILED'
  | 'AUTH_MISSING'
  | 'TUNNEL_FAILED'
  | 'RELAY_DISCONNECTED'
  | 'NOT_FOUND';

// ---------------------------------------------------------------------------
// Re-exports from gateway
// ---------------------------------------------------------------------------

export { TUNNEL_ACCESS_LEVELS, createTunnelGateway } from './gateway';
export type { TunnelAccessLevel, TunnelGatewayOptions } from './gateway';

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

export class TunnelError extends Error {
  constructor(
    public readonly code: TunnelErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'TunnelError';
  }
}
