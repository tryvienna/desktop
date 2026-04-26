/**
 * TunnelManager — main-process relay tunnel lifecycle manager.
 *
 * Manages GraphQL tunnels through the self-hosted web relay.
 * Desktop connects to the relay via SSE, mobile sends GraphQL
 * requests through the relay, and the desktop executes them locally.
 */

import { readFileSync, writeFileSync, mkdirSync, unlinkSync, renameSync } from 'node:fs';
import path from 'node:path';
import type { Logger } from '@vienna/logger';
import { z } from 'zod';
import { TunnelError } from './index';
import type { TunnelInfo, TunnelStatus, GraphQLTunnelInfo, GraphQLExecuteFn } from './index';
import { RelayClient } from './relay-client';
import type { RequestHandler } from './relay-client';

// ---------------------------------------------------------------------------
// Internal tunnel entry
// ---------------------------------------------------------------------------

interface TunnelEntry {
  tunnelId: string;
  relayClient: RelayClient;
  url: string;
  apiKey: string;
  metadata?: string;
  status: TunnelStatus;
  error?: string;
}

// ---------------------------------------------------------------------------
// TunnelManager options
// ---------------------------------------------------------------------------

/** Persisted tunnel credentials for reconnection across restarts. */
interface PersistedTunnel {
  tunnelId: string;
  apiKey: string;
  relayUrl: string;
  createdAt: number;
}

const PERSIST_FILENAME = 'tunnel-credentials.json';

const PersistedTunnelSchema = z.object({
  tunnelId: z.string(),
  apiKey: z.string(),
  relayUrl: z.string().url(),
  createdAt: z.number(),
});

export interface TunnelManagerOptions {
  /** Base URL of the relay server (e.g., https://relay.tryvienna.dev). */
  relayUrl: string;
  /** Returns the current desktop session JWT, or null if not authenticated. */
  getSessionToken: () => string | null;
  /** Logger instance (from @vienna/logger). */
  logger: Logger;
  /** Called on every tunnel status transition. Wire to IPC event emitter. */
  onStatusChange?: (info: TunnelInfo) => void;
  /** Directory to persist tunnel credentials for reconnection. If not set, no persistence. */
  persistDir?: string;
}

// ---------------------------------------------------------------------------
// TunnelManager
// ---------------------------------------------------------------------------

export class TunnelManager {
  private readonly relayUrl: string;
  private readonly getSessionToken: () => string | null;
  private readonly logger: Logger;
  private readonly onStatusChange?: (info: TunnelInfo) => void;
  private readonly persistDir?: string;
  private readonly tunnels = new Map<string, TunnelEntry>();

  constructor(options: TunnelManagerOptions) {
    this.relayUrl = options.relayUrl;
    this.getSessionToken = options.getSessionToken;
    this.logger = options.logger.child({ service: 'TunnelManager' });
    this.onStatusChange = options.onStatusChange;
    this.persistDir = options.persistDir;
  }

  // ── GraphQL tunnel lifecycle ────────────────────────────────────────

  async startGraphQL(options: {
    execute: GraphQLExecuteFn;
    metadata?: string;
  }): Promise<GraphQLTunnelInfo> {
    const token = this.getSessionToken();
    if (!token) {
      throw new TunnelError('AUTH_MISSING', 'Not authenticated. Sign in first.');
    }

    // Capture tunnelId in closure so onReconnectFailed can reference the right entry.
    // We'll set this once we know the actual tunnelId.
    let activeTunnelId: string | undefined;

    const relayClient = new RelayClient({
      relayUrl: this.relayUrl,
      getSessionToken: this.getSessionToken,
      logger: this.logger,
      onReconnectFailed: () => {
        if (activeTunnelId) {
          const entry = this.tunnels.get(activeTunnelId);
          if (entry) {
            entry.status = 'error';
            entry.error = 'Reconnect attempts exhausted';
            this.emitStatus(activeTunnelId);
          }
        }
      },
    });

    // Try to reconnect to a previously persisted tunnel first
    const persisted = this.loadPersistedTunnel();
    let tunnelId: string;
    let apiKey: string;
    let reconnected = false;

    if (persisted && persisted.relayUrl === this.relayUrl) {
      this.logger.info('Probing persisted tunnel', { tunnelId: persisted.tunnelId });
      const alive = await relayClient.probe(persisted.tunnelId);
      if (alive) {
        tunnelId = persisted.tunnelId;
        apiKey = persisted.apiKey;
        reconnected = true;
        this.logger.info('Persisted tunnel is alive, reconnecting', { tunnelId });
      } else {
        this.logger.info('Persisted tunnel is gone, registering new one', {
          oldTunnelId: persisted.tunnelId,
        });
        this.clearPersistedTunnel();
      }
    }

    // Register a new tunnel if we couldn't reconnect
    if (!reconnected) {
      try {
        const reg = await relayClient.register();
        tunnelId = reg.tunnelId;
        apiKey = reg.apiKey;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error('Tunnel registration failed', { error: message });
        throw new TunnelError('TUNNEL_FAILED', message);
      }
    }

    const url = `${this.relayUrl}/api/tunnel/${tunnelId!}/graphql`;
    activeTunnelId = tunnelId!;

    const entry: TunnelEntry = {
      tunnelId: tunnelId!,
      relayClient,
      url,
      apiKey: apiKey!,
      metadata: options.metadata,
      status: 'connecting',
    };
    this.tunnels.set(tunnelId!, entry);
    this.emitStatus(tunnelId!);

    // Create request handler that executes GraphQL locally
    const handler: RequestHandler = async (req) => {
      return options.execute(req.query, req.variables, req.operationName);
    };

    // Connect SSE stream
    try {
      await relayClient.connect(tunnelId!, handler);
      entry.status = 'connected';
      this.emitStatus(tunnelId!);

      // Persist credentials for next startup
      this.persistTunnel({ tunnelId: tunnelId!, apiKey: apiKey!, relayUrl: this.relayUrl, createdAt: Date.now() });

      this.logger.info('GraphQL tunnel started', {
        tunnelId: tunnelId!,
        url,
        reconnected,
      });

      return {
        tunnelId: tunnelId!,
        status: 'connected',
        url,
        apiKey: apiKey!,
        metadata: options.metadata,
      };
    } catch (err) {
      // Clean up on failure
      if (!reconnected) {
        await relayClient.unregister(tunnelId!).catch(() => {});
      }

      const message = err instanceof Error ? err.message : String(err);
      entry.status = 'error';
      entry.error = message;
      this.emitStatus(tunnelId!);

      this.tunnels.delete(tunnelId!);
      this.clearPersistedTunnel();

      this.logger.error('GraphQL tunnel start failed', { tunnelId: tunnelId!, error: message });
      throw new TunnelError('TUNNEL_FAILED', message);
    }
  }

  async stop(tunnelId: string): Promise<void> {
    const entry = this.tunnels.get(tunnelId);
    if (!entry) {
      throw new TunnelError('NOT_FOUND', `Tunnel ${tunnelId} not found`);
    }

    entry.status = 'disconnecting';
    this.emitStatus(tunnelId);

    // Disconnect SSE and unregister
    entry.relayClient.disconnect();
    try {
      await entry.relayClient.unregister(tunnelId);
    } catch (err) {
      this.logger.warn('Tunnel unregister failed', {
        tunnelId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    this.tunnels.delete(tunnelId);
    this.clearPersistedTunnel();

    this.logger.info('Tunnel stopped', { tunnelId });
  }

  async stopAll(): Promise<void> {
    const ids = [...this.tunnels.keys()];
    for (const id of ids) {
      await this.stop(id);
    }
  }

  getStatus(tunnelId: string): TunnelInfo | null {
    const entry = this.tunnels.get(tunnelId);
    if (!entry) return null;
    return this.toInfo(entry);
  }

  listTunnels(): TunnelInfo[] {
    return [...this.tunnels.values()].map((entry) => this.toInfo(entry));
  }

  // ── Push events ────────────────────────────────────────────────────

  async pushEvent(
    tunnelId: string,
    type: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const entry = this.tunnels.get(tunnelId);
    if (!entry) throw new TunnelError('NOT_FOUND', `Tunnel ${tunnelId} not found`);
    if (entry.status !== 'connected') {
      this.logger.warn('Cannot push to disconnected tunnel', { tunnelId, status: entry.status });
      return;
    }
    await entry.relayClient.pushEvent(tunnelId, type, payload);
  }

  async pushEventToAll(
    type: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const connected = [...this.tunnels.values()].filter((e) => e.status === 'connected');
    await Promise.allSettled(
      connected.map((e) => e.relayClient.pushEvent(e.tunnelId, type, payload)),
    );
  }

  /**
   * Upload an image blob to the relay and return the URL mobile can fetch.
   * Returns null if no tunnel is connected or the upload fails.
   */
  async uploadBlob(base64Data: string, mimeType: string): Promise<string | null> {
    const entry = [...this.tunnels.values()].find((e) => e.status === 'connected');
    if (!entry) return null;

    const blobId = await entry.relayClient.uploadBlob(entry.tunnelId, base64Data, mimeType);
    if (!blobId) return null;

    // TODO: Replace apiKey query param with short-lived blob tokens once relay supports it.
    // React Native Image cannot set Authorization headers, so we pass the apiKey in the URL.
    // The relay mitigates this with Content-Disposition: attachment and strict mime whitelisting.
    return `${entry.relayClient.relayUrl}/api/tunnel/${entry.tunnelId}/blob/${blobId}?apiKey=${entry.apiKey}`;
  }

  // ── Cleanup ─────────────────────────────────────────────────────────

  /**
   * Graceful shutdown: disconnect SSE streams but keep tunnels registered
   * on the relay so we can reconnect on next startup. Credentials are
   * preserved on disk.
   */
  async dispose(): Promise<void> {
    for (const entry of this.tunnels.values()) {
      entry.relayClient.disconnect();
    }
    this.tunnels.clear();
  }

  // ── Internal helpers ────────────────────────────────────────────────

  private toInfo(entry: TunnelEntry): TunnelInfo {
    return {
      tunnelId: entry.tunnelId,
      status: entry.status,
      url: entry.url,
      apiKey: entry.apiKey,
      metadata: entry.metadata,
      error: entry.error,
    };
  }

  private emitStatus(tunnelId: string): void {
    if (!this.onStatusChange) return;
    const entry = this.tunnels.get(tunnelId);
    if (entry) {
      this.onStatusChange(this.toInfo(entry));
    }
  }

  // ── Tunnel credential persistence ─────────────────────────────────

  private get persistPath(): string | null {
    if (!this.persistDir) return null;
    return path.join(this.persistDir, PERSIST_FILENAME);
  }

  private persistTunnel(data: PersistedTunnel): void {
    const filePath = this.persistPath;
    if (!filePath) return;
    try {
      mkdirSync(path.dirname(filePath), { recursive: true });
      const tmpPath = `${filePath}.tmp`;
      writeFileSync(tmpPath, JSON.stringify(data, null, 2), { mode: 0o600 });
      renameSync(tmpPath, filePath);
    } catch (err) {
      this.logger.warn('Failed to persist tunnel credentials', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private loadPersistedTunnel(): PersistedTunnel | null {
    const filePath = this.persistPath;
    if (!filePath) return null;
    try {
      const raw = readFileSync(filePath, 'utf-8');
      const result = PersistedTunnelSchema.safeParse(JSON.parse(raw));
      if (!result.success) {
        this.logger.warn('Invalid persisted tunnel data', {
          errors: result.error.issues.map((i) => i.message),
        });
        return null;
      }
      return result.data;
    } catch {
      return null;
    }
  }

  private clearPersistedTunnel(): void {
    const filePath = this.persistPath;
    if (!filePath) return;
    try {
      unlinkSync(filePath);
    } catch {
      // File may not exist — that's fine
    }
  }
}
