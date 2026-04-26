/**
 * evaluator — Evaluates bundled plugin CJS in the main process.
 *
 * Takes a bundled CJS string (from PluginBundler) and evaluates it
 * in a sandboxed scope, providing platform modules via a custom require().
 * Returns the plugin's default export (expected to be a PluginDefinition).
 */

import { createRequire } from 'node:module';
import path from 'node:path';

// ─────────────────────────────────────────────────────────────────────────────
// Platform module map — modules provided to plugins at runtime
// ─────────────────────────────────────────────────────────────────────────────

let platformModules: Record<string, unknown> | null = null;

/**
 * Lazily initialize platform modules.
 * We import them dynamically to avoid circular dependency issues
 * and to ensure they're only loaded once.
 */
async function getPlatformModules(): Promise<Record<string, unknown>> {
  if (platformModules) return platformModules;

  // Import all platform externals that plugins may require.
  // Module IDs are defined in platform-externals.ts. This map provides the actual runtime values.
  const [
    viennaSdk, viennaSdkReact, viennaSdkGraphql, zod, graphql, graphqlTag,
    apolloClient, react, reactJsxRuntime, reactDom,
    viennaGraphql, viennaUi, viennaUiFeed, lucideReact,
  ] = await Promise.all([
    import('@tryvienna/sdk'),
    import('@tryvienna/sdk/react'),
    import('@tryvienna/sdk/graphql'),
    import('zod'),
    import('graphql'),
    import('graphql-tag'),
    import('@apollo/client'),
    import('react'),
    import('react/jsx-runtime'),
    import('react-dom'),
    import('@vienna/graphql'),
    import('@tryvienna/ui'),
    import('@tryvienna/ui/feed'),
    import('lucide-react'),
  ]);

  // Return raw ESM namespace objects from dynamic import().
  // Plugin bundles use platform: 'node' + format: 'cjs', so esbuild generates
  // __toESM(require(X), 1) with isNodeMode=1. In node mode, __toESM always
  // wraps: result.default = mod, then copies named exports via __copyProps.
  // This means plugins must use named imports (import { gql } from 'graphql-tag')
  // rather than default imports for these to resolve correctly.
  //
  platformModules = {
    '@tryvienna/sdk': viennaSdk,
    '@tryvienna/sdk/react': viennaSdkReact,
    '@tryvienna/sdk/graphql': viennaSdkGraphql,
    'zod': zod,
    'graphql': graphql,
    'graphql-tag': graphqlTag,
    '@apollo/client': apolloClient,
    'react': react,
    'react/jsx-runtime': reactJsxRuntime,
    'react-dom': reactDom,
    '@vienna/graphql': viennaGraphql,
    '@tryvienna/ui': viennaUi,
    '@tryvienna/ui/feed': viennaUiFeed,
    'lucide-react': lucideReact,
  };

  return platformModules;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface EvaluateOptions {
  /** Virtual file path for error messages and require resolution. */
  filePath: string;
  /** Additional modules to make available via require(). */
  extraModules?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core Evaluator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluate a CJS bundle string and return its default export.
 *
 * @param code — Bundled CJS code (from PluginBundler)
 * @param options — Evaluation options
 * @returns The module's default export
 */
export async function evaluateModule(
  code: string,
  options: EvaluateOptions,
): Promise<unknown> {
  const modules = await getPlatformModules();
  const allModules = { ...modules, ...options.extraModules };

  // Require rooted at the plugin's directory (for plugin-local deps in node_modules)
  const pluginRequire = createRequire(options.filePath);

  const requireFn = (id: string): unknown => {
    // Direct match in platform modules
    if (id in allModules) {
      return allModules[id];
    }

    // Scoped package paths (e.g., '@tryvienna/sdk/something')
    for (const key of Object.keys(allModules)) {
      if (id.startsWith(key + '/')) {
        const parent = allModules[key];
        if (parent && typeof parent === 'object') {
          const subPath = id.slice(key.length + 1);
          if (subPath in (parent as Record<string, unknown>)) {
            return (parent as Record<string, unknown>)[subPath];
          }
        }
        // Try the parent module itself (many packages re-export from root)
        return parent;
      }
    }

    // Fall through to Node.js require for plugin-local deps and Node built-ins
    try {
      return pluginRequire(id);
    } catch {
      throw new Error(
        `Cannot resolve module "${id}" in plugin. ` +
        `Available platform modules: ${Object.keys(allModules).join(', ')}`,
      );
    }
  };

  // Evaluate the CJS bundle
  const moduleObj: { exports: Record<string, unknown> } = { exports: {} };

  // eslint-disable-next-line no-new-func
  const fn = new Function(
    'module',
    'exports',
    'require',
    '__filename',
    '__dirname',
    `"use strict";\n${code}`,
  );

  fn(
    moduleObj,
    moduleObj.exports,
    requireFn,
    options.filePath,
    path.dirname(options.filePath),
  );

  // Return the default export (plugins use `export default definePlugin(...)`)
  return moduleObj.exports['default'] ?? moduleObj.exports;
}

// ─────────────────────────────────────────────────────────────────────────────
// Plugin Bundle Evaluator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluate a plugin bundle and validate it looks like a PluginDefinition.
 * Checks for the __brand discriminator set by definePlugin().
 */
export async function evaluatePluginBundle(
  code: string,
  options: EvaluateOptions,
): Promise<unknown> {
  const result = await evaluateModule(code, options);

  if (!result || typeof result !== 'object') {
    throw new Error('Plugin bundle did not export an object');
  }

  const def = result as Record<string, unknown>;

  // Direct default export of definePlugin() — check __brand
  if (def['__brand'] === 'PluginDefinition') {
    return result;
  }

  // Also accept legacy shape: has id + name fields
  if (typeof def['id'] === 'string' && typeof def['name'] === 'string') {
    return result;
  }

  // Search named exports for a PluginDefinition (branded by definePlugin())
  for (const value of Object.values(def)) {
    if (
      value && typeof value === 'object' &&
      (value as Record<string, unknown>)['__brand'] === 'PluginDefinition'
    ) {
      return value;
    }
  }

  throw new Error(
    'Plugin bundle does not export a PluginDefinition (no export with __brand or id + name found)',
  );
}
