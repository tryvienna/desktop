/**
 * Print the GraphQL schema as SDL.
 *
 * Run with: pnpm schema:print        (stdout)
 * Run with: pnpm schema:print --write (writes to schema.graphql)
 *
 * Used by codegen to generate typed operations.
 *
 * Set VIENNA_PLUGINS_DIR to include plugin-defined GraphQL types:
 *   VIENNA_PLUGINS_DIR=~/Documents/dev/vienna-plugins pnpm codegen
 */

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { printSchema } from 'graphql';
import { registerPluginSchemas } from './plugin-schemas';
import { getSchema, invalidateSchema } from './index';

// Register plugin schemas so the printed SDL includes plugin-defined types.
// At runtime this happens via IntegrationLoader; here we do it explicitly.
await registerPluginSchemas();
invalidateSchema();

const sdl = printSchema(getSchema());

if (process.argv.includes('--write')) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const dest = resolve(root, 'schema.graphql');
  writeFileSync(dest, sdl);
  // eslint-disable-next-line no-console
  console.log(`Schema written to ${dest}`);
} else {
  process.stdout.write(sdl + '\n');
}
