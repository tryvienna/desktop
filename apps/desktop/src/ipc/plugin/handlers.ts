/**
 * Plugin IPC Handlers — Main process implementation
 *
 * Wires plugin IPC methods to PluginDevServer, PluginSystem, and SecureStorage.
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ApiHandlers } from '@vienna/ipc';
import type { PluginSystem } from '@tryvienna/sdk';
import type { SecureStorage } from '@vienna/secure-storage';
import type { CredentialManager } from '../../main/integrations/CredentialManager';
import type { PluginDevServer } from '../../main/plugins/PluginDevServer';
import type { pluginApi, PluginInfo } from './contract';

export interface PluginErrorRecord {
  pluginId: string;
  error: string;
  phase: 'bundle' | 'evaluate' | 'renderer' | 'dependencies' | 'register';
  timestamp: number;
  missingDependencies?: boolean;
  packageManager?: 'npm' | 'pnpm' | 'yarn' | 'bun';
  pluginDir?: string;
}

export interface PluginInstallFromSourceDeps {
  install(registryPlugin: { id: string; name: string; description: string; source: 'github'; repo: string; path?: string; tags: string[] }, opts?: { override?: boolean }): Promise<{ id: string }>;
  getRegistryPlugins(): Promise<Array<{ id: string; [k: string]: unknown }>>;
}

export interface PluginHandlerDeps {
  pluginSystem: PluginSystem;
  devServer?: PluginDevServer;
  rendererBundleCache?: Map<string, string>;
  secureStorage?: SecureStorage;
  /** CredentialManager for integration credential operations (scoped storage + change notifications). */
  credentialManager?: CredentialManager;
  getPluginErrors: () => PluginErrorRecord[];
  /** Return candidate directories to search for README.md (install dir, registry cache, etc.). */
  getReadmeDirs?: (pluginId: string) => Promise<string[]>;
  /** Plugin installer + registry for deep-link install-from-source. */
  installFromSource?: PluginInstallFromSourceDeps;
  /** Dev callback server port (null in production). */
  devInstallPort?: number | null;
}

/** Namespace prefix for integration credentials in secure storage (legacy fallback). */
const CREDENTIAL_NAMESPACE = 'integration';

/**
 * Serialize PluginSystem's loaded plugins into IPC-safe PluginInfo objects.
 * Strips all functions (handlers, resolve, search, createClient) and
 * keeps only the data fields needed by the renderer store UI.
 */
function serializePlugins(system: PluginSystem, devServer?: PluginDevServer): PluginInfo[] {
  return system.getPlugins().map((plugin) => {
    const isLocal = devServer?.isLocalPlugin(plugin.id) ?? false;
    const isCustomized = !isLocal && (devServer?.isLoaded(plugin.id) ?? false);
    const source = isLocal ? 'local' as const : isCustomized ? 'customized' as const : 'builtin' as const;

    return {
      id: plugin.id,
      name: plugin.name,
      description: plugin.description,
      icon: plugin.icon,
      integrations: plugin.integrations.map((integration) => ({
        id: integration.id,
        name: integration.name,
        description: integration.description,
        credentialCount: integration.credentials?.length ?? 0,
      })),
      entities: plugin.entities.map((entity) => ({
        type: entity.type,
        name: entity.name,
      })),
      canvases: {
        'nav-sidebar': !!plugin.canvases['nav-sidebar'],
        drawer: !!plugin.canvases.drawer,
        'menu-bar': !!plugin.canvases['menu-bar'],
        feed: !!plugin.canvases.feed,
        'workstream-widget': plugin.entities.some((e) => !!e.ui?.workstreamWidget),
      },
      source,
      localPath: isLocal ? devServer?.getLocalPluginPath(plugin.id) : undefined,
    };
  });
}

export function createPluginHandlers(
  deps: PluginHandlerDeps,
): ApiHandlers<typeof pluginApi> {
  const { pluginSystem, devServer, rendererBundleCache, secureStorage, credentialManager, getPluginErrors } = deps;

  return {
    plugin: {
      getRendererBundle: async ({ pluginId }) => {
        // Check customized (devServer) first, then fall back to builtin cache
        if (devServer) {
          const code = await devServer.getRendererBundle(pluginId);
          if (code) return { code };
        }
        const cached = rendererBundleCache?.get(pluginId) ?? null;
        return { code: cached };
      },

      getRendererBundles: async ({ pluginIds }) => {
        const bundles: Record<string, string | null> = {};
        for (const pluginId of pluginIds) {
          if (devServer) {
            const code = await devServer.getRendererBundle(pluginId);
            if (code) { bundles[pluginId] = code; continue; }
          }
          bundles[pluginId] = rendererBundleCache?.get(pluginId) ?? null;
        }
        return { bundles };
      },

      getLoadedPlugins: async () => {
        return { plugins: serializePlugins(pluginSystem, devServer) };
      },

      getCustomizedPlugins: async () => {
        if (!devServer) return { plugins: [] };
        const loaded = devServer.getAllLoaded();
        return {
          plugins: loaded.map((p) => ({
            pluginId: p.pluginId,
            customizationPath: p.customizationPath,
          })),
        };
      },

      getPluginErrors: async () => {
        return { errors: getPluginErrors() };
      },

      setCredential: async ({ integrationId, key, value }) => {
        // Use CredentialManager when available — ensures credentials go to the
        // same scoped storage that createClient reads from, AND triggers client refresh.
        if (credentialManager) {
          await credentialManager.setCredential(integrationId, key, value);
          return { success: true };
        }
        if (!secureStorage) return { success: false };
        await secureStorage.set(CREDENTIAL_NAMESPACE, `${integrationId}:${key}`, value);
        return { success: true };
      },

      getCredential: async ({ integrationId, key }) => {
        // Read through CredentialManager's scoped storage when available
        if (credentialManager) {
          const scope = credentialManager.getScope(integrationId);
          if (!scope) return { value: null };
          const value = await scope.get(key);
          return { value: value ?? null };
        }
        if (!secureStorage) return { value: null };
        const value = await secureStorage.get<string>(CREDENTIAL_NAMESPACE, `${integrationId}:${key}`);
        return { value: value ?? null };
      },

      removeCredential: async ({ integrationId, key }) => {
        if (credentialManager) {
          await credentialManager.removeCredential(integrationId, key);
          return { success: true };
        }
        if (!secureStorage) return { success: false };
        await secureStorage.delete(CREDENTIAL_NAMESPACE, `${integrationId}:${key}`);
        return { success: true };
      },

      getCredentialStatus: async ({ integrationId }) => {
        const integration = pluginSystem.getIntegration(integrationId);
        if (!integration) return { keys: [] };
        const declaredKeys = integration.credentials ?? [];

        // Use CredentialManager's scoped storage when available
        if (credentialManager) {
          const scope = credentialManager.getScope(integrationId);
          if (!scope) return { keys: declaredKeys.map((key) => ({ key, isSet: false })) };
          const results = await Promise.all(
            declaredKeys.map(async (key) => ({
              key,
              isSet: await scope.has(key),
            })),
          );
          return { keys: results };
        }

        if (!secureStorage) return { keys: [] };
        const results = await Promise.all(
          declaredKeys.map(async (key) => ({
            key,
            isSet: await secureStorage.has(CREDENTIAL_NAMESPACE, `${integrationId}:${key}`),
          })),
        );
        return { keys: results };
      },

      customizePlugin: async ({ pluginId }) => {
        if (!devServer) return { success: false, error: 'Dev server not available' };
        const result = await devServer.customize(pluginId);
        if (result.success) {
          const customizationPath = devServer.getCustomizationPath(pluginId);
          devServer.watch(pluginId, customizationPath);
        }
        return { success: result.success, error: result.error };
      },

      resetPlugin: async ({ pluginId }) => {
        if (!devServer) return { success: false, error: 'Dev server not available' };
        return devServer.resetToBuiltin(pluginId);
      },

      getCustomizationPath: async ({ pluginId }) => {
        if (!devServer) return { path: null };
        const loaded = devServer.getLoaded(pluginId);
        return { path: loaded?.customizationPath ?? null };
      },

      getPluginReadme: async ({ pluginId }) => {
        // Collect candidate directories: devServer root, then installer/registry fallbacks
        const dirs: string[] = [];
        if (devServer) {
          const rootDir = devServer.getPluginRootDir(pluginId);
          if (rootDir) dirs.push(rootDir);
        }
        if (deps.getReadmeDirs) {
          dirs.push(...await deps.getReadmeDirs(pluginId));
        }

        for (const dir of dirs) {
          const readmePath = path.join(dir, 'README.md');
          if (!existsSync(readmePath)) continue;
          try {
            const content = await readFile(readmePath, 'utf-8');
            return { content };
          } catch {
            continue;
          }
        }
        return { content: null };
      },

      loadLocalPlugin: async ({ directoryPath }) => {
        if (!devServer) return { success: false, error: 'Dev server not available' };
        const result = await devServer.loadLocalPlugin(directoryPath);
        return {
          success: result.success,
          pluginId: result.pluginId,
          error: result.error,
          missingDependencies: result.missingDependencies,
          packageManager: result.packageManager,
          pluginDir: result.pluginDir,
        };
      },

      installPluginDependencies: async ({ directoryPath, packageManager }) => {
        if (!devServer) return { success: false, error: 'Dev server not available' };
        return devServer.installDependencies(directoryPath, packageManager);
      },

      unloadLocalPlugin: async ({ pluginId }) => {
        if (!devServer) return { success: false, error: 'Dev server not available' };
        return devServer.unloadLocalPlugin(pluginId);
      },

      getDevInstallPort: async () => {
        return { port: deps.devInstallPort ?? null };
      },

      installFromSource: async ({ slug, name, repo, dir, override }) => {
        const installer = deps.installFromSource;
        if (!installer) return { success: false, error: 'Plugin installer not available' };

        try {
          // Check registry for richer metadata
          let registryPlugin: Record<string, unknown> | undefined;
          try {
            const registryPlugins = await installer.getRegistryPlugins();
            registryPlugin = registryPlugins.find(
              (p) => p.id === slug || p.id === slug.replace(/-/g, '_'),
            );
          } catch { /* registry unavailable */ }

          let result: { id: string };
          if (registryPlugin) {
            // Extract known fields from the registry plugin to satisfy the install() signature
            result = await installer.install({
              id: String(registryPlugin.id),
              name: String(registryPlugin.name ?? name),
              description: String(registryPlugin.description ?? ''),
              source: 'github' as const,
              repo: String(registryPlugin.repo ?? repo),
              path: registryPlugin.path ? String(registryPlugin.path) : dir || undefined,
              tags: Array.isArray(registryPlugin.tags) ? registryPlugin.tags.map(String) : [],
            }, { override });
          } else {
            result = await installer.install({
              id: slug,
              name,
              description: '',
              source: 'github',
              repo,
              path: dir || undefined,
              tags: [],
            }, { override });
          }
          return { success: true, pluginId: result.id };
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
      },

      fetch: async ({ pluginId, url, method, headers, body }) => {
        // Resolve plugin and validate domain
        const plugin = pluginSystem.getPlugin(pluginId);
        if (!plugin) {
          return { ok: false, status: 403, statusText: 'Unknown plugin', headers: {}, body: '' };
        }

        const allowedDomains = plugin.allowedDomains ?? [];
        const parsedUrl = new URL(url);
        if (!allowedDomains.includes(parsedUrl.hostname)) {
          return {
            ok: false,
            status: 403,
            statusText: `Domain "${parsedUrl.hostname}" is not in plugin "${pluginId}" allowedDomains`,
            headers: {},
            body: '',
          };
        }

        const res = await fetch(url, {
          method: method ?? 'GET',
          headers: headers ?? {},
          body: body ?? undefined,
        });

        const responseHeaders: Record<string, string> = {};
        res.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        const responseBody = await res.text();

        return {
          ok: res.ok,
          status: res.status,
          statusText: res.statusText,
          headers: responseHeaders,
          body: responseBody,
        };
      },
    },
  };
}
