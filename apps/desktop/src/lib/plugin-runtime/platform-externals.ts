/**
 * Platform Externals — Single source of truth for modules provided to plugins at runtime.
 *
 * These modules are NOT bundled into plugin code by esbuild. Instead, the host
 * provides them via custom require() at runtime. This list is consumed by:
 * - PluginBundler (esbuild externals config)
 * - evaluator.ts (main process module map)
 * - shared-modules.ts (renderer process module map)
 * - vite.main.config.ts (Vite externals to keep them available at runtime)
 *
 * To add a new platform module:
 * 1. Add the module ID to PLATFORM_MODULE_IDS below
 * 2. Add the import + mapping in evaluator.ts getPlatformModules()
 * 3. Add the import + mapping in shared-modules.ts SHARED_MODULES
 * 4. If it's a non-@vienna package, add it to vite.main.config.ts external list
 */

/**
 * Module IDs that plugins can require() at runtime.
 * These are the exact strings that appear in plugin import statements.
 */
export const PLATFORM_MODULE_IDS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  '@tryvienna/sdk',
  '@tryvienna/sdk/react',
  '@tryvienna/sdk/graphql',
  '@vienna/graphql',
  '@tryvienna/ui',
  '@apollo/client',
  'graphql',
  'graphql-tag',
  'zod',
  'lucide-react',
] as const;

export type PlatformModuleId = (typeof PLATFORM_MODULE_IDS)[number];

/**
 * Glob patterns for esbuild externals (covers sub-path imports like @tryvienna/sdk/something).
 * Used by PluginBundler to tell esbuild which modules to externalize.
 */
export const PLATFORM_EXTERNAL_PATTERNS = [
  ...PLATFORM_MODULE_IDS,
  '@tryvienna/sdk/*',
  '@vienna/graphql/*',
  '@tryvienna/ui/*',
  '@apollo/client/*',
] as const;
