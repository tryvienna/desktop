/**
 * ClientManager — Integration client lifecycle management.
 *
 * Handles client creation, lazy initialization, refresh on credential change,
 * and concurrency-safe deduplication of createClient() calls.
 */

import type { IntegrationDefinition, AuthContext, PluginLogger } from '@tryvienna/sdk';

export type ClientStatus = 'ready' | 'needs_setup' | 'error';

export interface ManagedClient {
  integrationId: string;
  client: unknown | null;
  status: ClientStatus;
  definition: IntegrationDefinition;
  context: AuthContext;
}

export interface ClientManagerDeps {
  logger: PluginLogger;
}

export class ClientManager {
  private clients = new Map<string, ManagedClient>();
  private creationLocks = new Map<string, Promise<void>>();
  private readonly logger: PluginLogger;

  constructor(deps: ClientManagerDeps) {
    this.logger = deps.logger;
  }

  /**
   * Create a client for an integration definition.
   * If createClient fails, the client is stored as null with status 'needs_setup'.
   */
  async createClient(
    definition: IntegrationDefinition,
    context: AuthContext,
  ): Promise<ManagedClient> {
    let client: unknown | null = null;
    let status: ClientStatus = 'needs_setup';

    try {
      client = await definition.createClient(context);
      status = client != null ? 'ready' : 'needs_setup';
    } catch (err) {
      this.logger.warn(`Failed to create client for '${definition.id}' (will retry on credential change)`, {
        error: err instanceof Error ? err.message : String(err),
      });
      status = 'needs_setup';
    }

    const managed: ManagedClient = {
      integrationId: definition.id,
      client,
      status,
      definition,
      context,
    };

    this.clients.set(definition.id, managed);
    return managed;
  }

  /**
   * Recreate the client after credential change.
   * Uses a dedup lock to prevent concurrent createClient calls.
   */
  async refreshClient(integrationId: string): Promise<void> {
    const managed = this.clients.get(integrationId);
    if (!managed) return;

    // Dedup: if already refreshing, wait for that to finish then verify status
    const existingLock = this.creationLocks.get(integrationId);
    if (existingLock) {
      await existingLock;
      if (managed.status !== 'ready') {
        throw new Error(`Client refresh failed for '${integrationId}'`);
      }
      return;
    }

    const lockPromise = (async () => {
      try {
        managed.client = await managed.definition.createClient(managed.context);
        managed.status = managed.client != null ? 'ready' : 'needs_setup';
        this.logger.info(`Refreshed client for '${integrationId}'`, {
          status: managed.status,
        });
      } catch (err) {
        this.logger.warn(`Client refresh failed for '${integrationId}'`, {
          error: err instanceof Error ? err.message : String(err),
        });
        managed.client = null;
        managed.status = 'needs_setup';
      }
    })();

    this.creationLocks.set(integrationId, lockPromise);
    try {
      await lockPromise;
    } finally {
      this.creationLocks.delete(integrationId);
    }
  }

  /**
   * Ensure a client exists, performing lazy creation if needed.
   * Uses a dedup lock to prevent thundering herd on first use.
   * Throws if client cannot be created.
   */
  async ensureClient(integrationId: string): Promise<unknown> {
    const managed = this.clients.get(integrationId);
    if (!managed) {
      throw new Error(`Integration '${integrationId}' is not loaded`);
    }

    if (managed.client != null) return managed.client;

    // Lazy creation with dedup lock
    const existingLock = this.creationLocks.get(integrationId);
    if (existingLock) {
      await existingLock;
      if (managed.client != null) return managed.client;
      throw new Error(`Integration '${integrationId}' is not configured — no client available`);
    }

    const lockPromise = (async () => {
      try {
        if (managed.client == null) {
          managed.client = await managed.definition.createClient(managed.context);
          managed.status = managed.client != null ? 'ready' : 'needs_setup';
        }
      } catch {
        // Will throw below
      } finally {
        this.creationLocks.delete(integrationId);
      }
    })();

    this.creationLocks.set(integrationId, lockPromise);
    await lockPromise;

    if (managed.client == null) {
      throw new Error(`Integration '${integrationId}' is not configured — no client available`);
    }

    return managed.client;
  }

  /** Get the current client for an integration (may be null). */
  getClient(integrationId: string): unknown | null {
    return this.clients.get(integrationId)?.client ?? null;
  }

  /** Get the managed client entry. */
  getManagedClient(integrationId: string): ManagedClient | undefined {
    return this.clients.get(integrationId);
  }

  /** Remove a client from management. */
  removeClient(integrationId: string): boolean {
    return this.clients.delete(integrationId);
  }

  /** Remove all clients. */
  clear(): void {
    this.clients.clear();
    this.creationLocks.clear();
  }
}
