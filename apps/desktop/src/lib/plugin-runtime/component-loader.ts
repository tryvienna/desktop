/**
 * Component Loader — Evaluates customized plugin renderer bundles in the renderer process.
 *
 * Takes a CJS bundle string (produced by PluginBundler for the 'renderer' target)
 * and evaluates it in a sandboxed scope, returning the module's default export.
 * Platform modules (react, sdk, etc.) are provided via a custom require().
 */

import { SHARED_MODULES } from './shared-modules';

/**
 * Evaluate a CJS renderer bundle and return its default export.
 *
 * @param code — Bundled CJS code (from PluginBundler, renderer target)
 * @param pluginId — Plugin ID (for error messages)
 * @returns The module's default export (expected to be a PluginDefinition)
 */
export function evaluateRendererBundle(code: string, pluginId: string): unknown {
  const requireFn = (id: string): unknown => {
    // Direct match in shared modules
    if (id in SHARED_MODULES) {
      return SHARED_MODULES[id];
    }

    // Node built-in stubs — plugins share a single entry point for main and
    // renderer, so main-only code (schema resolvers) may import node:* modules.
    // These code paths are never called in the renderer, but the top-level
    // require() still executes during bundle evaluation. Return an empty proxy
    // that won't throw on property access but will fail loudly if actually called.
    if (id.startsWith('node:')) {
      return new Proxy({}, {
        get(_target, prop) {
          if (prop === '__esModule') return false;
          if (prop === 'default') return {};
          if (typeof prop === 'symbol') return undefined;
          return () => {
            throw new Error(`node:* module "${id}" is not available in the renderer`);
          };
        },
      });
    }

    // Scoped package sub-paths (e.g., '@tryvienna/sdk/something')
    for (const key of Object.keys(SHARED_MODULES)) {
      if (id.startsWith(key + '/')) {
        const parent = SHARED_MODULES[key];
        if (parent && typeof parent === 'object') {
          const subPath = id.slice(key.length + 1);
          if (subPath in (parent as Record<string, unknown>)) {
            return (parent as Record<string, unknown>)[subPath];
          }
        }
        return parent;
      }
    }

    throw new Error(
      `Cannot resolve module "${id}" in customized plugin "${pluginId}". ` +
      `Available modules: ${Object.keys(SHARED_MODULES).join(', ')}`,
    );
  };

  const moduleObj: { exports: Record<string, unknown> } = { exports: {} };

  // eslint-disable-next-line no-new-func
  const fn = new Function(
    'module',
    'exports',
    'require',
    `"use strict";\n${code}`,
  );

  fn(moduleObj, moduleObj.exports, requireFn);

  const result = moduleObj.exports['default'] ?? moduleObj.exports;

  // Check for __brand discriminator (from definePlugin())
  if (result && typeof result === 'object' && (result as Record<string, unknown>)['__brand'] === 'PluginDefinition') {
    return result;
  }

  // Check named exports for a branded PluginDefinition
  if (result && typeof result === 'object') {
    for (const value of Object.values(result as Record<string, unknown>)) {
      if (
        value && typeof value === 'object' &&
        (value as Record<string, unknown>)['__brand'] === 'PluginDefinition'
      ) {
        return value;
      }
    }
  }

  return result;
}
