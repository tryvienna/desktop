/**
 * In-memory tunnel registry.
 *
 * Manages the lifecycle of desktop ↔ mobile relay tunnels.
 * Each tunnel has an SSE connection (Express response) to the desktop
 * and accepts GraphQL requests from the mobile app.
 */

import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import type { WebSocket } from 'ws';
import { clearTunnelBlobs } from './blob-store.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PendingRequest {
  resolve: (result: GraphQLResult) => void;
  reject: (err: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export interface GraphQLResult {
  data?: unknown;
  errors?: Array<{ message: string; locations?: unknown[]; path?: unknown[] }>;
}

export interface TunnelRegistration {
  tunnelId: string;
  userId: string;
  apiKey: string;
  createdAt: number;
  lastActivityAt: number;
  sseResponse: Response | null;
  pendingRequests: Map<string, PendingRequest>;
  wsClients: Set<WebSocket>;
  pushSeq: number;
}

export interface GraphQLRequest {
  requestId: string;
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_PENDING_REQUESTS = 50;
const MAX_TUNNELS_PER_USER = 5;
/** Max tunnel lifetime: 24 hours */
const TUNNEL_TTL_MS = 24 * 60 * 60 * 1_000;
/** Idle timeout: no SSE connection and no activity for 1 hour */
const TUNNEL_IDLE_MS = 60 * 60 * 1_000;
/** How often to sweep for stale tunnels */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1_000;

// ---------------------------------------------------------------------------
// Registry (in-memory, survives hot-reload via globalThis)
// ---------------------------------------------------------------------------

const globalForTunnels = globalThis as unknown as {
  __tunnelRegistry?: Map<string, TunnelRegistration>;
  __tunnelsByUser?: Map<string, Set<string>>;
};

const registry: Map<string, TunnelRegistration> =
  globalForTunnels.__tunnelRegistry ??= new Map();

const tunnelsByUser: Map<string, Set<string>> =
  globalForTunnels.__tunnelsByUser ??= new Map();

// ---------------------------------------------------------------------------
// Registry operations
// ---------------------------------------------------------------------------

/**
 * Evict the oldest idle tunnel for a user (no SSE connection, no WS clients).
 * Returns true if a tunnel was evicted.
 */
function evictOldestIdleTunnel(userId: string): boolean {
  const userTunnelIds = tunnelsByUser.get(userId);
  if (!userTunnelIds) return false;

  let oldest: TunnelRegistration | null = null;
  for (const tid of userTunnelIds) {
    const t = registry.get(tid);
    if (!t) continue;
    // Only evict tunnels with no active connections
    if (t.sseResponse !== null || t.wsClients.size > 0) continue;
    if (!oldest || t.lastActivityAt < oldest.lastActivityAt) {
      oldest = t;
    }
  }

  if (oldest) {
    unregisterTunnel(oldest.tunnelId, userId);
    return true;
  }
  return false;
}

export function registerTunnel(userId: string): { tunnelId: string; apiKey: string } {
  const userTunnels = tunnelsByUser.get(userId);
  if (userTunnels && userTunnels.size >= MAX_TUNNELS_PER_USER) {
    // Try to evict the oldest idle tunnel (no SSE, no WS clients) before rejecting
    const evicted = evictOldestIdleTunnel(userId);
    if (!evicted) {
      throw new Error(`Maximum ${MAX_TUNNELS_PER_USER} tunnels per user`);
    }
  }

  const tunnelId = randomUUID();
  const apiKey = randomUUID();

  const now = Date.now();
  const tunnel: TunnelRegistration = {
    tunnelId,
    userId,
    apiKey,
    createdAt: now,
    lastActivityAt: now,
    sseResponse: null,
    pendingRequests: new Map(),
    wsClients: new Set(),
    pushSeq: 0,
  };

  registry.set(tunnelId, tunnel);

  if (!tunnelsByUser.has(userId)) {
    tunnelsByUser.set(userId, new Set());
  }
  tunnelsByUser.get(userId)!.add(tunnelId);

  return { tunnelId, apiKey };
}

export function unregisterTunnel(tunnelId: string, userId: string): boolean {
  const tunnel = registry.get(tunnelId);
  if (!tunnel || tunnel.userId !== userId) return false;

  // Reject all pending requests
  for (const [, pending] of tunnel.pendingRequests) {
    clearTimeout(pending.timeout);
    pending.reject(new Error('Tunnel closed'));
  }
  tunnel.pendingRequests.clear();

  // Close WebSocket clients
  for (const ws of tunnel.wsClients) {
    try { ws.close(1001, 'Tunnel closed'); } catch { /* ignore */ }
  }
  tunnel.wsClients.clear();

  // End SSE response
  if (tunnel.sseResponse) {
    try { tunnel.sseResponse.end(); } catch { /* already closed */ }
  }

  // Clear associated blobs to free memory
  clearTunnelBlobs(tunnelId);

  registry.delete(tunnelId);

  const userSet = tunnelsByUser.get(userId);
  if (userSet) {
    userSet.delete(tunnelId);
    if (userSet.size === 0) tunnelsByUser.delete(userId);
  }

  return true;
}

export function getTunnel(tunnelId: string): TunnelRegistration | undefined {
  return registry.get(tunnelId);
}

export function setSSEResponse(tunnelId: string, res: Response | null): boolean {
  const tunnel = registry.get(tunnelId);
  if (!tunnel) return false;
  tunnel.sseResponse = res;
  tunnel.lastActivityAt = Date.now();
  return true;
}

/**
 * Submit a GraphQL request to the desktop via SSE.
 * Returns a promise that resolves when the desktop posts the result back.
 */
export function submitRequest(
  tunnelId: string,
  request: Omit<GraphQLRequest, 'requestId'>,
): Promise<GraphQLResult> {
  const tunnel = registry.get(tunnelId);
  if (!tunnel) return Promise.reject(new Error('Tunnel not found'));
  if (!tunnel.sseResponse) return Promise.reject(new Error('Desktop not connected'));
  if (tunnel.pendingRequests.size >= MAX_PENDING_REQUESTS) {
    return Promise.reject(new Error('Too many pending requests'));
  }

  tunnel.lastActivityAt = Date.now();
  const requestId = randomUUID();

  return new Promise<GraphQLResult>((resolve, reject) => {
    const timeout = setTimeout(() => {
      tunnel.pendingRequests.delete(requestId);
      reject(new Error('Request timeout'));
    }, REQUEST_TIMEOUT_MS);

    tunnel.pendingRequests.set(requestId, { resolve, reject, timeout });

    // Push request to desktop via SSE
    const event: GraphQLRequest = { requestId, ...request };
    try {
      tunnel.sseResponse!.write(`event: request\ndata: ${JSON.stringify(event)}\n\n`);
    } catch {
      tunnel.pendingRequests.delete(requestId);
      clearTimeout(timeout);
      reject(new Error('Failed to send request to desktop'));
    }
  });
}

/**
 * Resolve a pending request with the desktop's result.
 */
export function resolveRequest(
  tunnelId: string,
  requestId: string,
  result: GraphQLResult,
): boolean {
  const tunnel = registry.get(tunnelId);
  if (!tunnel) return false;

  const pending = tunnel.pendingRequests.get(requestId);
  if (!pending) return false;

  clearTimeout(pending.timeout);
  tunnel.pendingRequests.delete(requestId);
  pending.resolve(result);
  return true;
}

// ---------------------------------------------------------------------------
// WebSocket push operations
// ---------------------------------------------------------------------------

export function addWsClient(tunnelId: string, ws: WebSocket): boolean {
  const tunnel = registry.get(tunnelId);
  if (!tunnel) return false;
  tunnel.wsClients.add(ws);
  return true;
}

export function removeWsClient(tunnelId: string, ws: WebSocket): boolean {
  const tunnel = registry.get(tunnelId);
  if (!tunnel) return false;
  tunnel.wsClients.delete(ws);
  return true;
}

export interface PushEnvelope {
  seq: number;
  timestamp: string;
  type: string;
  payload: Record<string, unknown>;
}

/**
 * Broadcast a push event to all WebSocket clients on a tunnel.
 * Returns the assigned sequence number and client count, or null if tunnel not found.
 */
export function broadcastPush(
  tunnelId: string,
  type: string,
  payload: Record<string, unknown>,
): { seq: number; clientCount: number } | null {
  const tunnel = registry.get(tunnelId);
  if (!tunnel) return null;

  tunnel.pushSeq += 1;
  const envelope: PushEnvelope = {
    seq: tunnel.pushSeq,
    timestamp: new Date().toISOString(),
    type,
    payload,
  };

  const message = JSON.stringify(envelope);
  let sent = 0;
  for (const ws of tunnel.wsClients) {
    try {
      ws.send(message);
      sent++;
    } catch { /* client may have disconnected */ }
  }

  return { seq: tunnel.pushSeq, clientCount: sent };
}

/**
 * Return all registered tunnels (for graceful shutdown iteration).
 */
export function getAllTunnels(): Array<{ tunnelId: string; userId: string }> {
  return Array.from(registry.values()).map((t) => ({ tunnelId: t.tunnelId, userId: t.userId }));
}

/**
 * Get registry stats for the health endpoint.
 */
export function getStats(): { tunnelCount: number; userCount: number } {
  return {
    tunnelCount: registry.size,
    userCount: tunnelsByUser.size,
  };
}

// ---------------------------------------------------------------------------
// Stale tunnel cleanup
// ---------------------------------------------------------------------------

/**
 * Sweep the registry and remove tunnels that:
 * 1. Exceeded their max TTL (24h from creation), OR
 * 2. Have no SSE connection and no activity for TUNNEL_IDLE_MS (1h)
 */
export function sweepStaleTunnels(): number {
  const now = Date.now();
  const toRemove: Array<{ tunnelId: string; userId: string }> = [];

  for (const [, tunnel] of registry) {
    const exceedsTTL = now - tunnel.createdAt > TUNNEL_TTL_MS;
    const isIdle =
      !tunnel.sseResponse &&
      tunnel.wsClients.size === 0 &&
      now - tunnel.lastActivityAt > TUNNEL_IDLE_MS;

    if (exceedsTTL || isIdle) {
      toRemove.push({ tunnelId: tunnel.tunnelId, userId: tunnel.userId });
    }
  }

  for (const { tunnelId, userId } of toRemove) {
    unregisterTunnel(tunnelId, userId);
  }

  return toRemove.length;
}

// Start cleanup interval (runs in-process, no external dependency)
const cleanupInterval = setInterval(sweepStaleTunnels, CLEANUP_INTERVAL_MS);
cleanupInterval.unref(); // Don't block process exit
