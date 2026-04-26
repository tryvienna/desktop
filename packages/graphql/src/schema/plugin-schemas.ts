/**
 * Plugin Schema Registration — Registers plugin-defined GraphQL types at codegen time.
 *
 * At runtime, plugin schemas are registered dynamically via IntegrationLoader.
 * But for codegen (schema:print → schema.graphql → graphql-codegen), we need
 * the complete schema including plugin types. This module dynamically imports
 * plugin schemas from the registry plugins directory.
 *
 * Point VIENNA_PLUGINS_DIR at the registry's plugins/ directory:
 *   VIENNA_PLUGINS_DIR=~/Documents/dev/registry/plugins pnpm codegen
 *
 * Missing plugins are silently skipped — codegen will succeed without them,
 * but the generated schema.graphql won't include their GraphQL types.
 */

import { EntityRegistry } from '@tryvienna/sdk';
import { createEntitySchemaBuilder } from './entity-builder-wrapper';

/**
 * Dynamically import a plugin schema, returning null if not found.
 */
async function tryImportSchema(
  modulePath: string,
  exportName: string,
): Promise<((builder: ReturnType<typeof createEntitySchemaBuilder>) => void) | null> {
  try {
    const mod = await import(modulePath);
    return mod[exportName] ?? null;
  } catch {
    return null;
  }
}

/** Plugins in the registry that define GraphQL schemas. */
const PLUGIN_SCHEMAS = [
  { dir: 'github', exportName: 'registerGitHubSchema' },
  { dir: 'weather', exportName: 'registerWeatherSchema' },
] as const;

export async function registerPluginSchemas(): Promise<void> {
  const pluginsDir = process.env.VIENNA_PLUGINS_DIR;
  if (!pluginsDir) {
    // eslint-disable-next-line no-console
    console.warn(
      'VIENNA_PLUGINS_DIR not set — skipping plugin schema registration.\n' +
      'Set it to the registry plugins/ directory to include plugin GraphQL types:\n' +
      '  VIENNA_PLUGINS_DIR=path/to/registry/plugins pnpm codegen',
    );
    return;
  }

  const codegenRegistry = new EntityRegistry();
  const schemaBuilder = createEntitySchemaBuilder(codegenRegistry);

  for (const { dir, exportName } of PLUGIN_SCHEMAS) {
    const fn = await tryImportSchema(`${pluginsDir}/${dir}/src/schema`, exportName);
    if (fn) {
      fn(schemaBuilder);
    }
  }
}
