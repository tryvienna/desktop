/**
 * RelayClient — connects the desktop app to the web relay server.
 *
 * Handles registration, SSE connection for receiving requests,
 * and posting results back. Replaces ngrok as the tunneling mechanism.
 */

import type { Logger } from '@vienna/logger';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RelayClientOptions {
  relayUrl: string;
  getSessionToken: () => string | null;
  logger: Logger;
  /** Called when all reconnect attempts have been exhausted. */
  onReconnectFailed?: () => void;
}

export interface RelayRequest {
  requestId: string;
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
}

export type RequestHandler = (req: RelayRequest) => Promise<{
  data?: unknown;
  errors?: unknown[];
}>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;
const MAX_RECONNECT_ATTEMPTS = 20;
const MAX_BUFFER_SIZE = 1_048_576; // 1MB

// ---------------------------------------------------------------------------
// Zod schema for SSE relay requests
// ---------------------------------------------------------------------------

const RelayRequestSchema = z.object({
  requestId: z.string(),
  query: z.string(),
  variables: z.record(z.unknown()).optional(),
  operationName: z.string().optional(),
});

const RegisterResponseSchema = z.object({
  tunnelId: z.string(),
  apiKey: z.string(),
});

const BlobResponseSchema = z.object({
  blobId: z.string(),
});

// ---------------------------------------------------------------------------
// RelayClient
// ---------------------------------------------------------------------------

export class RelayClient {
  readonly relayUrl: string;
  private readonly getSessionToken: () => string | null;
  private readonly logger: Logger;
  private readonly onReconnectFailed?: () => void;
  private abortController: AbortController | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: RelayClientOptions) {
    this.relayUrl = options.relayUrl;
    this.getSessionToken = options.getSessionToken;
    this.logger = options.logger.child({ service: 'RelayClient' });
    this.onReconnectFailed = options.onReconnectFailed;
  }

  // ── Registration ────────────────────────────────────────────────────

  async register(): Promise<{ tunnelId: string; apiKey: string }> {
    const token = this.requireToken();

    const res = await fetch(`${this.relayUrl}/api/tunnel/register`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? `Registration failed: ${res.status}`);
    }

    const data = RegisterResponseSchema.parse(await res.json());
    this.logger.info('Tunnel registered', { tunnelId: data.tunnelId });
    return data;
  }

  async unregister(tunnelId: string): Promise<void> {
    const token = this.requireToken();

    const res = await fetch(`${this.relayUrl}/api/tunnel/${tunnelId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) {
      this.logger.warn('Tunnel unregister failed', { tunnelId, status: res.status });
    } else {
      this.logger.info('Tunnel unregistered', { tunnelId });
    }
  }

  // ── Probe ─────────────────────────────────────────────────────────

  /**
   * Check if a tunnel is still alive on the relay server.
   * Returns true if the tunnel exists and belongs to this user, false otherwise.
   */
  async probe(tunnelId: string): Promise<boolean> {
    const token = this.requireToken();

    try {
      const res = await fetch(`${this.relayUrl}/api/tunnel/${tunnelId}/probe`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // ── SSE Connection ──────────────────────────────────────────────────

  /**
   * Connect to the relay SSE stream. Incoming requests are forwarded to
   * the handler, and results are POSTed back to the relay.
   *
   * Automatically reconnects on disconnect with exponential backoff.
   */
  async connect(tunnelId: string, onRequest: RequestHandler): Promise<void> {
    this.disconnect();
    this.reconnectAttempts = 0;

    // Start SSE — fire and forget the stream consumption
    await this.startSSE(tunnelId, onRequest, false);
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  // ── Internal SSE logic ──────────────────────────────────────────────

  /**
   * Shared SSE connection logic used by both initial `connect` and reconnections.
   *
   * @param awaitStream - If true, awaits the full stream consumption (used by reconnections).
   *                      If false, fires and forgets (used by initial connect).
   */
  private async startSSE(tunnelId: string, onRequest: RequestHandler, awaitStream: boolean): Promise<void> {
    const token = this.requireToken();
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    const res = await fetch(`${this.relayUrl}/api/tunnel/${tunnelId}/connect`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
      signal,
    });

    if (!res.ok) {
      throw new Error(`SSE connect failed: ${res.status}`);
    }

    if (!res.body) {
      throw new Error('SSE response has no body');
    }

    this.reconnectAttempts = 0;
    this.logger.info('SSE connected', { tunnelId });

    const streamPromise = this.consumeSSE(res.body, tunnelId, onRequest, signal).catch((err) => {
      if (!signal.aborted) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn('SSE disconnected', { tunnelId, error: message });
        this.scheduleReconnect(tunnelId, onRequest);
      }
    });

    if (awaitStream) {
      await streamPromise;
    } else {
      void streamPromise;
    }
  }

  private async consumeSSE(
    body: ReadableStream<Uint8Array>,
    tunnelId: string,
    onRequest: RequestHandler,
    signal: AbortSignal,
  ): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (!signal.aborted) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        if (buffer.length > MAX_BUFFER_SIZE) {
          this.logger.error('SSE buffer exceeded max size, disconnecting', {
            tunnelId,
            bufferSize: buffer.length,
            maxBufferSize: MAX_BUFFER_SIZE,
          });
          reader.cancel();
          this.disconnect();
          return;
        }

        // Parse SSE events from buffer
        const events = this.parseSSEEvents(buffer);
        buffer = events.remaining;

        for (const event of events.parsed) {
          if (event.type === 'request') {
            // Handle request in background — don't block the SSE stream
            void this.handleRequest(tunnelId, event.data, onRequest);
          }
          // Ignore 'connected', keepalive comments, etc.
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Stream ended — try to reconnect unless aborted
    if (!signal.aborted) {
      this.scheduleReconnect(tunnelId, onRequest);
    }
  }

  private parseSSEEvents(buffer: string): {
    parsed: Array<{ type: string; data: string }>;
    remaining: string;
  } {
    const parsed: Array<{ type: string; data: string }> = [];
    let eventType = '';
    let dataLines: string[] = [];
    const lastNewlineIndex = buffer.lastIndexOf('\n\n');

    if (lastNewlineIndex === -1) {
      return { parsed: [], remaining: buffer };
    }

    // Only process complete events (before the last \n\n)
    const complete = buffer.substring(0, lastNewlineIndex + 2);
    const remaining = buffer.substring(lastNewlineIndex + 2);

    for (const line of complete.split('\n')) {
      if (line === '') {
        // End of event
        if (dataLines.length > 0) {
          parsed.push({ type: eventType || 'message', data: dataLines.join('\n') });
        }
        eventType = '';
        dataLines = [];
      } else if (line.startsWith('event: ')) {
        eventType = line.substring(7);
      } else if (line.startsWith('data: ')) {
        dataLines.push(line.substring(6));
      }
      // Ignore comments (lines starting with ':')
    }

    return { parsed, remaining };
  }

  private async handleRequest(
    tunnelId: string,
    rawData: string,
    onRequest: RequestHandler,
  ): Promise<void> {
    let request: RelayRequest;
    try {
      const parsed = JSON.parse(rawData);
      request = RelayRequestSchema.parse(parsed);
    } catch (err) {
      this.logger.warn('Failed to parse SSE request data', {
        tunnelId,
        error: err instanceof Error ? err.message : String(err),
      });
      return;
    }

    try {
      const result = await onRequest(request);
      await this.postResponse(tunnelId, request.requestId, result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Request handler failed', {
        tunnelId,
        requestId: request.requestId,
        error: message,
      });
      await this.postResponse(tunnelId, request.requestId, {
        errors: [{ message: 'Internal server error' }],
      });
    }
  }

  private async postResponse(
    tunnelId: string,
    requestId: string,
    result: { data?: unknown; errors?: unknown[] },
  ): Promise<void> {
    const token = this.getSessionToken();
    if (!token) {
      this.logger.error('No session token for response', { tunnelId, requestId });
      return;
    }

    try {
      const res = await fetch(`${this.relayUrl}/api/tunnel/${tunnelId}/response`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requestId, ...result }),
      });

      if (!res.ok) {
        this.logger.warn('Failed to post response', { tunnelId, requestId, status: res.status });
      }
    } catch (err) {
      this.logger.error('Error posting response', {
        tunnelId,
        requestId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── Push events ───────────────────────────────────────────────────

  async pushEvent(
    tunnelId: string,
    type: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const token = this.requireToken();

    try {
      const res = await fetch(`${this.relayUrl}/api/tunnel/${tunnelId}/push`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, payload }),
      });

      if (!res.ok) {
        this.logger.warn('Push event failed', { tunnelId, type, status: res.status });
      }
    } catch (err) {
      this.logger.warn('Push event error', {
        tunnelId,
        type,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Upload an image blob to the relay. Returns the blob ID.
   * Mobile can fetch it at GET /api/tunnel/:tunnelId/blob/:blobId?apiKey=...
   */
  async uploadBlob(
    tunnelId: string,
    base64Data: string,
    mimeType: string,
  ): Promise<string | null> {
    const token = this.requireToken();

    try {
      const res = await fetch(`${this.relayUrl}/api/tunnel/${tunnelId}/blob`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: base64Data, mimeType }),
      });

      if (!res.ok) {
        this.logger.warn('Blob upload failed', { tunnelId, status: res.status });
        return null;
      }

      const result = BlobResponseSchema.parse(await res.json());
      return result.blobId;
    } catch (err) {
      this.logger.warn('Blob upload error', {
        tunnelId,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  // ── Reconnection ───────────────────────────────────────────────────

  private scheduleReconnect(tunnelId: string, onRequest: RequestHandler): void {
    this.reconnectAttempts++;

    if (this.reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
      this.logger.error('Max reconnect attempts exhausted, giving up', {
        tunnelId,
        attempts: this.reconnectAttempts - 1,
      });
      this.onReconnectFailed?.();
      return;
    }

    const delay = Math.min(
      RECONNECT_BASE_MS * Math.pow(2, this.reconnectAttempts - 1),
      RECONNECT_MAX_MS,
    );

    this.logger.info('Scheduling SSE reconnect', {
      tunnelId,
      attempt: this.reconnectAttempts,
      maxAttempts: MAX_RECONNECT_ATTEMPTS,
      delayMs: delay,
    });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.startSSE(tunnelId, onRequest, true).catch((err) => {
        if (!this.abortController?.signal.aborted) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.warn('SSE reconnect failed', { tunnelId, error: message });
          this.scheduleReconnect(tunnelId, onRequest);
        }
      });
    }, delay);
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  private requireToken(): string {
    const token = this.getSessionToken();
    if (!token) {
      throw new Error('No session token available');
    }
    return token;
  }
}
