/**
 * initializePluginSystem() — One-call setup for the entire plugin/integration system.
 *
 * Creates all managers (PluginSystem, CredentialManager, ClientManager,
 * OAuthManager, PluginLoader, PluginDevServer) and wires them together.
 * Returns a handle with references needed by main.ts for IPC handlers,
 * GraphQL context, and shutdown.
 */

import { PluginSystem } from '@tryvienna/sdk';
import type { PluginLogger, SchemaBuilder } from '@tryvienna/sdk';
import type { ScopedStorageOptions, ScopedStorage } from '@vienna/secure-storage';
import { CredentialManager } from './CredentialManager';
import { ClientManager } from './ClientManager';
import { OAuthManager } from './OAuthManager';
import { PluginLoader } from './PluginLoader';
import { PluginBundler } from '../plugins/PluginBundler';
import { PluginDevServer, type PluginSourceSettings } from '../plugins/PluginDevServer';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface InitializePluginSystemDeps {
  /** Factory for creating scoped secure storage instances. */
  createScopedStorage: (opts: ScopedStorageOptions) => ScopedStorage;
  /** Logger instance for the plugin system. */
  logger: PluginLogger;
  /** GraphQL schema builder for plugin schema extensions. */
  schemaBuilder?: SchemaBuilder;
  /** Invalidate the cached GraphQL schema so it rebuilds on next query. */
  invalidateSchema?: () => void;
  /** Absolute path to the customizations directory. */
  customizationsDir: string;
  /** Settings repository for plugin source tracking. */
  settings?: PluginSourceSettings;
  /** Forward plugin change events to the renderer via IPC. */
  onPluginChangedIpc?: (pluginId: string, action: 'loaded' | 'reloaded' | 'unloaded') => void;
  /** Forward customization progress to the renderer via IPC. */
  onCustomizationProgressIpc?: (pluginId: string, step: string, message: string) => void;
  /** Forward plugin errors to the renderer via IPC. */
  onPluginErrorIpc?: (pluginId: string, error: string, phase: 'bundle' | 'evaluate' | 'renderer' | 'dependencies' | 'register') => void;
  /** Current git branch name — used to resolve local plugin paths through worktrees. */
  branch?: string;
}

export interface PluginSystemHandle {
  /** Unified registry for plugins, integrations, and entities. */
  system: PluginSystem;
  /** Plugin loader for loading/unloading plugins. */
  pluginLoader: PluginLoader;
  /** OAuth manager for IPC handlers. */
  oauth: OAuthManager;
  /** Credential manager for IPC handlers. */
  credentials: CredentialManager;
  /** Dev server for customized plugins (hot-reload). */
  devServer: PluginDevServer;
  /** Client manager for direct client access (used by getIntegrationClient). */
  clients: ClientManager;
  /** Shut down the plugin system (stop watchers, clean up). */
  shutdown: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Initializer
// ─────────────────────────────────────────────────────────────────────────────

export async function initializePluginSystem(
  deps: InitializePluginSystemDeps,
): Promise<PluginSystemHandle> {
  const { createScopedStorage, logger, schemaBuilder, customizationsDir, settings } = deps;

  // 1. Create the unified registry
  const system = new PluginSystem();
  system.setLogger(logger);

  // 2. Create managers
  const credentials = new CredentialManager({ createScopedStorage, logger });
  const clients = new ClientManager({ logger });
  const oauth = new OAuthManager({ logger });

  // 3. Create the plugin loader (orchestrator)
  const pluginLoader = new PluginLoader({
    system,
    credentials,
    clients,
    oauth,
    logger,
    schemaBuilder,
    invalidateSchema: deps.invalidateSchema,
  });

  // 4. Create the dev server for customized plugins
  const bundler = new PluginBundler({ logger });
  const devServer = new PluginDevServer({
    bundler,
    logger,
    customizationsDir,
    settings,
    branch: deps.branch,
    onPluginChanged: async (pluginId, action, definition) => {
      try {
        if (action === 'loaded' || action === 'reloaded') {
          if (definition) {
            await pluginLoader.reloadPlugin(pluginId, definition);
          }
        } else if (action === 'unloaded') {
          pluginLoader.unloadPlugin(pluginId);
        }
        deps.onPluginChangedIpc?.(pluginId, action);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`Plugin '${pluginId}' failed during ${action}`, { error: message });
        deps.onPluginErrorIpc?.(pluginId, message, action === 'unloaded' ? 'register' : 'bundle');
      }
    },
    onPluginError: (pluginId, error, phase) => {
      logger.error(`Plugin error in '${pluginId}' during ${phase}`, { error });
      deps.onPluginErrorIpc?.(pluginId, error, phase);
    },
    onProgress: (pluginId, step, message) => {
      deps.onCustomizationProgressIpc?.(pluginId, step, message);
    },
  });

  // 6. Return the handle
  return {
    system,
    pluginLoader,
    oauth,
    credentials,
    devServer,
    clients,
    shutdown: () => {
      devServer.close();
      oauth.cleanup();
      clients.clear();
    },
  };
}
