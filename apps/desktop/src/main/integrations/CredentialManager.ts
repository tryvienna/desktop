/**
 * CredentialManager — Scoped secure storage for integrations.
 *
 * Creates namespaced, key-whitelisted storage scopes for each integration
 * and notifies subscribers when credentials change (triggering client refresh).
 */

import type { ScopedStorage, ScopedStorageOptions } from '@vienna/secure-storage';
import type { SecureStorage as EntitySecureStorage } from '@tryvienna/sdk';
import type { IntegrationDefinition, PluginLogger } from '@tryvienna/sdk';

export interface CredentialManagerDeps {
  createScopedStorage: (opts: ScopedStorageOptions) => ScopedStorage;
  logger: PluginLogger;
}

type CredentialChangeListener = (integrationId: string) => void | Promise<void>;

export class CredentialManager {
  private scopes = new Map<string, ScopedStorage>();
  private listeners: CredentialChangeListener[] = [];
  private readonly createScopedStorage: (opts: ScopedStorageOptions) => ScopedStorage;
  private readonly logger: PluginLogger;

  constructor(deps: CredentialManagerDeps) {
    this.createScopedStorage = deps.createScopedStorage;
    this.logger = deps.logger;
  }

  /**
   * Create a scoped storage for an integration based on its credential config.
   * Automatically adds OAuth token keys to the allowed set.
   */
  createScope(definition: IntegrationDefinition): EntitySecureStorage {
    const allowedKeys = this.computeAllowedKeys(definition);
    const scope = `integration:${definition.id}`;

    const scoped = this.createScopedStorage({ scope, allowedKeys });
    this.scopes.set(definition.id, scoped);

    // Wrap with change notification
    return this.wrapWithChangeNotification(definition.id, scoped);
  }

  /** Remove the scope for an integration. */
  removeScope(integrationId: string): void {
    this.scopes.delete(integrationId);
  }

  /** Get the raw scoped storage for an integration (without change notification). */
  getScope(integrationId: string): ScopedStorage | undefined {
    return this.scopes.get(integrationId);
  }

  /** Subscribe to credential changes. */
  onCredentialChanged(listener: CredentialChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /** Set a credential and notify listeners. */
  async setCredential(integrationId: string, key: string, value: string): Promise<void> {
    const scope = this.scopes.get(integrationId);
    if (!scope) throw new Error(`No credential scope for integration '${integrationId}'`);
    await scope.set(key, value);
    await this.notifyChange(integrationId);
  }

  /** Remove a credential and notify listeners. */
  async removeCredential(integrationId: string, key: string): Promise<void> {
    const scope = this.scopes.get(integrationId);
    if (!scope) throw new Error(`No credential scope for integration '${integrationId}'`);
    await scope.delete(key);
    await this.notifyChange(integrationId);
  }

  private computeAllowedKeys(definition: IntegrationDefinition): string[] {
    const keys = new Set<string>(definition.credentials ?? []);

    // Auto-add OAuth token storage keys
    if (definition.oauth) {
      for (const provider of definition.oauth.providers) {
        keys.add(`oauth_${provider.providerId}_tokens`);
      }
    }

    return Array.from(keys);
  }

  private wrapWithChangeNotification(
    integrationId: string,
    scoped: ScopedStorage,
  ): EntitySecureStorage {
    return {
      get: (key: string) => scoped.get(key),
      set: async (key: string, value: string) => {
        await scoped.set(key, value);
        await this.notifyChange(integrationId);
      },
      delete: async (key: string) => {
        await scoped.delete(key);
        await this.notifyChange(integrationId);
      },
      has: (key: string) => scoped.has(key),
    };
  }

  private async notifyChange(integrationId: string): Promise<void> {
    for (const listener of this.listeners) {
      try {
        await listener(integrationId);
      } catch (err) {
        this.logger.error(`Credential change listener threw for integration '${integrationId}'`, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
}
