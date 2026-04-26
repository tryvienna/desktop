/**
 * PluginLoader — Thin orchestrator for loading plugins into the system.
 *
 * Coordinates PluginSystem (registry), CredentialManager, ClientManager,
 * and OAuthManager to fully load a plugin definition
 * with all its integrations and entities.
 *
 * Every plugin gets a structured logger scoped with `{ plugin: pluginId }`.
 * Integration and entity handlers get further scoped loggers.
 */

import type {
  PluginDefinition,
  IntegrationDefinition,
  IntegrationAccessor,
  EntityContext,
  AuthContext,
  PluginLogger,
} from '@tryvienna/sdk';
import type { PluginSystem, SchemaBuilder } from '@tryvienna/sdk';
import type { CredentialManager } from './CredentialManager';
import type { ClientManager } from './ClientManager';
import type { OAuthManager } from './OAuthManager';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface LoadResult {
  pluginId: string;
  integrationIds: string[];
  errors: Array<{ id: string; error: Error }>;
}

export interface PluginLoaderDeps {
  system: PluginSystem;
  credentials: CredentialManager;
  clients: ClientManager;
  oauth: OAuthManager;
  logger: PluginLogger;
  schemaBuilder?: SchemaBuilder;
  /** Invalidate the cached GraphQL schema so it rebuilds on next query. */
  invalidateSchema?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// PluginLoader
// ─────────────────────────────────────────────────────────────────────────────

export class PluginLoader {
  private readonly system: PluginSystem;
  private readonly credentials: CredentialManager;
  private readonly clients: ClientManager;
  private readonly oauth: OAuthManager;
  private readonly logger: PluginLogger;
  private readonly schemaBuilder?: SchemaBuilder;
  private readonly invalidateSchema?: () => void;
  private loadedIntegrations = new Set<string>();
  /** Integrations whose schema has been registered on the Pothos builder (persists across reloads). */
  private registeredSchemas = new Set<string>();
  /** Per-plugin scoped loggers — reused across entity context creation. */
  private pluginLoggers = new Map<string, PluginLogger>();

  constructor(deps: PluginLoaderDeps) {
    this.system = deps.system;
    this.credentials = deps.credentials;
    this.clients = deps.clients;
    this.oauth = deps.oauth;
    this.logger = deps.logger;
    this.schemaBuilder = deps.schemaBuilder;
    this.invalidateSchema = deps.invalidateSchema;

    // Wire credential changes to client refresh
    this.credentials.onCredentialChanged(async (integrationId) => {
      await this.clients.refreshClient(integrationId);
    });

    // Wire OAuth flow completion to client refresh
    this.oauth.onFlowCompleted(async (integrationId) => {
      await this.clients.refreshClient(integrationId);
    });
  }

  /**
   * Load a complete plugin: register in system, initialize all integrations,
   * create scoped storage, OAuth accessors, clients, and schema extensions.
   */
  async loadPlugin(plugin: PluginDefinition): Promise<LoadResult> {
    const errors: Array<{ id: string; error: Error }> = [];
    const integrationIds: string[] = [];
    const pluginLog = this.getPluginLogger(plugin.id);

    // 1. Register plugin in the unified registry (entities + integrations)
    try {
      this.system.registerPlugin(plugin);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      pluginLog.error(`Failed to register plugin`, { error: error.message });
      return { pluginId: plugin.id, integrationIds: [], errors: [{ id: plugin.id, error }] };
    }

    // 2. Initialize each integration
    for (const integration of plugin.integrations) {
      try {
        await this.initializeIntegration(plugin.id, integration);
        integrationIds.push(integration.id);
      } catch (err) {
        errors.push({
          id: integration.id,
          error: err instanceof Error ? err : new Error(String(err)),
        });
        pluginLog.error(`Failed to initialize integration '${integration.id}'`, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    pluginLog.info(`Loaded plugin`, {
      integrations: integrationIds.length,
      entities: plugin.entities.length,
      errors: errors.length,
    });

    return { pluginId: plugin.id, integrationIds, errors };
  }

  /** Unload a plugin: clean up all its integrations and remove from system. */
  unloadPlugin(pluginId: string): boolean {
    const plugin = this.system.getPlugin(pluginId);
    if (!plugin) return false;

    // Clean up each integration
    for (const integration of plugin.integrations) {
      this.cleanupIntegration(integration.id);
    }

    // Remove scoped logger
    this.pluginLoggers.delete(pluginId);

    // Remove from unified registry
    return this.system.unregisterPlugin(pluginId);
  }

  /** Reload a plugin: unload old, load new. */
  async reloadPlugin(pluginId: string, newPlugin: PluginDefinition): Promise<LoadResult> {
    this.unloadPlugin(pluginId);
    return this.loadPlugin(newPlugin);
  }

  /**
   * Create an EntityContext for a specific entity's integration dependencies.
   * Maps local integration names to IntegrationAccessor instances.
   * The context logger is scoped to the entity type for structured output.
   */
  createEntityContext(
    integrationDeps: Readonly<Record<string, string>>,
    entityType?: string,
  ): EntityContext {
    const integrations: Record<string, IntegrationAccessor> = {};

    // Determine the plugin ID for logger scoping
    let pluginId: string | undefined;
    for (const [localName, integrationId] of Object.entries(integrationDeps)) {
      const clients = this.clients;

      // Use a getter so the client is resolved lazily at access time.
      // This handles the case where the client was null at context creation
      // but became available later (e.g., after OAuth token refresh).
      const accessor: IntegrationAccessor = {
        get client() {
          return clients.getClient(integrationId);
        },
      };
      integrations[localName] = accessor;

      // Infer plugin ID from integration's parent plugin
      if (!pluginId) {
        pluginId = this.system.getPluginForIntegration(integrationId);
      }
    }

    // Build a scoped logger: plugin → entity type
    let entityLogger: PluginLogger = pluginId
      ? this.getPluginLogger(pluginId)
      : this.logger;
    if (entityType) {
      entityLogger = entityLogger.child({ entity: entityType });
    }

    return {
      storage: { get: async () => null, set: async () => {}, delete: async () => {}, has: async () => false },
      logger: entityLogger,
      integrations,
    } as EntityContext;
  }

  // ── Private ──────────────────────────────────────────────────────────

  /** Get or create a scoped logger for a plugin. */
  private getPluginLogger(pluginId: string): PluginLogger {
    let log = this.pluginLoggers.get(pluginId);
    if (!log) {
      log = this.logger.child({ plugin: pluginId });
      this.pluginLoggers.set(pluginId, log);
    }
    return log;
  }

  private async initializeIntegration(pluginId: string, definition: IntegrationDefinition): Promise<void> {
    if (this.loadedIntegrations.has(definition.id)) {
      this.logger.info(`Integration '${definition.id}' already initialized, skipping`);
      return;
    }

    const integrationLog = this.getPluginLogger(pluginId).child({ integration: definition.id });

    // 1. Create scoped credential storage
    const storage = this.credentials.createScope(definition);

    // 2. Set up OAuth if configured
    let oauth = undefined;
    if (definition.oauth) {
      this.oauth.register(definition.id, definition.oauth, storage);
      oauth = this.oauth.createAccessor(definition.id);
    }

    // 3. Build auth context with scoped logger
    const context: AuthContext = {
      storage,
      logger: integrationLog,
      oauth,
    };

    // 4. Create client
    await this.clients.createClient(definition, context);

    // 5. Register GraphQL schema extensions
    if (definition.schema && this.schemaBuilder) {
      const isReload = this.registeredSchemas.has(definition.id);
      try {
        definition.schema(this.schemaBuilder);
        this.registeredSchemas.add(definition.id);
        this.invalidateSchema?.();
        integrationLog.info(`Registered GraphQL schema`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (isReload && msg.includes('Duplicate typename')) {
          // Expected on hot-reload — Pothos types persist across reloads.
          // New queryFields/mutationFields still registered successfully.
          this.registeredSchemas.add(definition.id);
          this.invalidateSchema?.();
          integrationLog.debug(`Schema types already registered (hot-reload)`, { error: msg });
        } else {
          integrationLog.error(`Failed to register schema`, { error: msg });
          throw err;
        }
      }
    }

    this.loadedIntegrations.add(definition.id);
  }

  private cleanupIntegration(integrationId: string): void {
    this.clients.removeClient(integrationId);
    this.credentials.removeScope(integrationId);
    this.oauth.unregister(integrationId);
    this.loadedIntegrations.delete(integrationId);
  }
}
