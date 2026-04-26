/**
 * Plugin IPC Contract — Methods + Events
 *
 * Defines the type-safe boundary between renderer and main process
 * for customized plugin loading operations.
 *
 * Safe to import from ANY process (main, preload, renderer, tests).
 */

import { z } from 'zod';
import { defineApi, defineEvents, method, event } from '@vienna/ipc';

// ─────────────────────────────────────────────────────────────────────────────
// Serializable Plugin Info Schemas (for renderer consumption)
// ─────────────────────────────────────────────────────────────────────────────

export const PluginInfoIconSchema = z.union([
  z.object({ svg: z.string() }),
  z.object({ png: z.string() }),
  z.object({ path: z.string() }),
]);

export const PluginInfoIntegrationSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  credentialCount: z.number(),
});

export const PluginInfoEntitySchema = z.object({
  type: z.string(),
  name: z.string(),
});

export const PluginInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  icon: PluginInfoIconSchema,
  integrations: z.array(PluginInfoIntegrationSchema),
  entities: z.array(PluginInfoEntitySchema),
  canvases: z.object({
    'nav-sidebar': z.boolean(),
    drawer: z.boolean(),
    'menu-bar': z.boolean(),
    feed: z.boolean(),
    'workstream-widget': z.boolean(),
  }),
  /** Where this plugin was loaded from. */
  source: z.enum(['builtin', 'customized', 'local']),
  /** Absolute path on disk for locally loaded plugins. */
  localPath: z.string().optional(),
});

export type PluginInfo = z.infer<typeof PluginInfoSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// API Methods (renderer → main, request/response)
// ─────────────────────────────────────────────────────────────────────────────

export const pluginApi = defineApi({
  plugin: {
    /** Get the renderer bundle for a customized plugin. Returns null if not customized. */
    getRendererBundle: method({
      input: z.object({ pluginId: z.string() }),
      output: z.object({
        code: z.string().nullable(),
      }),
    }),

    /** Get renderer bundles for multiple plugins at once. */
    getRendererBundles: method({
      input: z.object({ pluginIds: z.array(z.string()) }),
      output: z.object({
        bundles: z.record(z.string(), z.string().nullable()),
      }),
    }),

    /** Get all loaded plugins with serializable metadata. */
    getLoadedPlugins: method({
      input: z.object({}),
      output: z.object({
        plugins: z.array(PluginInfoSchema),
      }),
    }),

    /** Get the list of currently customized (dynamically loaded) plugins. */
    getCustomizedPlugins: method({
      input: z.object({}),
      output: z.object({
        plugins: z.array(z.object({
          pluginId: z.string(),
          customizationPath: z.string(),
        })),
      }),
    }),

    /** Get any plugin errors that occurred during startup. */
    getPluginErrors: method({
      input: z.object({}),
      output: z.object({
        errors: z.array(z.object({
          pluginId: z.string(),
          error: z.string(),
          phase: z.enum(['bundle', 'evaluate', 'renderer', 'dependencies', 'register']),
          timestamp: z.number(),
          missingDependencies: z.boolean().optional(),
          packageManager: z.enum(['npm', 'pnpm', 'yarn', 'bun']).optional(),
          pluginDir: z.string().optional(),
        })),
      }),
    }),

    /** Set a credential for an integration (stored in OS-level encrypted storage). */
    setCredential: method({
      input: z.object({
        integrationId: z.string(),
        key: z.string(),
        value: z.string(),
      }),
      output: z.object({ success: z.boolean() }),
    }),

    /** Get a credential for an integration. Returns null if not set. */
    getCredential: method({
      input: z.object({
        integrationId: z.string(),
        key: z.string(),
      }),
      output: z.object({ value: z.string().nullable() }),
    }),

    /** Remove a credential for an integration. */
    removeCredential: method({
      input: z.object({
        integrationId: z.string(),
        key: z.string(),
      }),
      output: z.object({ success: z.boolean() }),
    }),

    /** Check which credentials are set for an integration. */
    getCredentialStatus: method({
      input: z.object({
        integrationId: z.string(),
      }),
      output: z.object({
        keys: z.array(z.object({
          key: z.string(),
          isSet: z.boolean(),
        })),
      }),
    }),

    /** Start customizing a plugin (copies source, installs deps, starts watching). */
    customizePlugin: method({
      input: z.object({ pluginId: z.string() }),
      output: z.object({ success: z.boolean(), error: z.string().optional() }),
    }),

    /** Reset a customized plugin back to builtin defaults. */
    resetPlugin: method({
      input: z.object({ pluginId: z.string() }),
      output: z.object({ success: z.boolean(), error: z.string().optional() }),
    }),

    /** Get the customization path for a plugin. Returns null if not customized. */
    getCustomizationPath: method({
      input: z.object({ pluginId: z.string() }),
      output: z.object({ path: z.string().nullable() }),
    }),

    /** Get the README.md content for a plugin. Returns null if not found. */
    getPluginReadme: method({
      input: z.object({ pluginId: z.string() }),
      output: z.object({ content: z.string().nullable() }),
    }),

    /** Load a plugin from an external directory on disk. Installs deps, bundles, and watches. */
    loadLocalPlugin: method({
      input: z.object({ directoryPath: z.string() }),
      output: z.object({
        success: z.boolean(),
        pluginId: z.string().optional(),
        error: z.string().optional(),
        /** True when the failure is caused by missing node_modules (deps not installed). */
        missingDependencies: z.boolean().optional(),
        /** Detected package manager for the plugin directory. */
        packageManager: z.enum(['npm', 'pnpm', 'yarn', 'bun']).optional(),
        /** The plugin directory path. */
        pluginDir: z.string().optional(),
      }),
    }),

    /** Install dependencies for a local plugin directory. */
    installPluginDependencies: method({
      input: z.object({
        directoryPath: z.string(),
        packageManager: z.enum(['npm', 'pnpm', 'yarn', 'bun']).optional(),
      }),
      output: z.object({ success: z.boolean(), error: z.string().optional() }),
    }),

    /** Unload a locally loaded plugin. */
    unloadLocalPlugin: method({
      input: z.object({ pluginId: z.string() }),
      output: z.object({ success: z.boolean(), error: z.string().optional() }),
    }),

    /** Get the dev callback server port for testing deep links locally. Returns null in production. */
    getDevInstallPort: method({
      input: z.object({}),
      output: z.object({ port: z.number().nullable() }),
    }),

    /** Install a plugin from a deep link source (GitHub repo). */
    installFromSource: method({
      input: z.object({
        slug: z.string(),
        name: z.string(),
        repo: z.string(),
        dir: z.string().optional(),
        override: z.boolean().optional(),
      }),
      output: z.object({
        success: z.boolean(),
        pluginId: z.string().optional(),
        error: z.string().optional(),
      }),
    }),

    /** Proxy fetch — executes an HTTP request from the main process on behalf of a plugin.
     *  Only domains listed in the plugin's `allowedDomains` are permitted. */
    fetch: method({
      input: z.object({
        pluginId: z.string(),
        url: z.string().url(),
        method: z.string().optional(),
        headers: z.record(z.string()).optional(),
        body: z.string().optional(),
      }),
      output: z.object({
        ok: z.boolean(),
        status: z.number(),
        statusText: z.string(),
        headers: z.record(z.string()),
        body: z.string(),
      }),
    }),
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Events (main → renderer, streaming)
// ─────────────────────────────────────────────────────────────────────────────

export const pluginEvents = defineEvents({
  plugin: {
    /** A customized plugin was loaded, reloaded, or unloaded. */
    onPluginChanged: event({
      payload: z.object({
        pluginId: z.string(),
        action: z.enum(['loaded', 'reloaded', 'unloaded']),
      }),
    }),

    /** Progress update during customization. */
    onCustomizationProgress: event({
      payload: z.object({
        pluginId: z.string(),
        step: z.enum(['copying', 'installing', 'done', 'error']),
        message: z.string(),
      }),
    }),

    /** A plugin install was requested via deep link — renderer should show confirmation UI. */
    onPluginInstallRequest: event({
      payload: z.object({
        slug: z.string(),
        name: z.string(),
        repo: z.string(),
        dir: z.string().optional(),
        alreadyInstalled: z.boolean(),
      }),
    }),

    /** A customized plugin failed to load or bundle. */
    onPluginError: event({
      payload: z.object({
        pluginId: z.string(),
        error: z.string(),
        phase: z.enum(['bundle', 'evaluate', 'renderer', 'dependencies', 'register']),
        timestamp: z.number(),
        /** Present when phase is 'dependencies' — the plugin dir that needs install. */
        missingDependencies: z.boolean().optional(),
        packageManager: z.enum(['npm', 'pnpm', 'yarn', 'bun']).optional(),
        pluginDir: z.string().optional(),
      }),
    }),
  },
});
