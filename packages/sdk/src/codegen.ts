/**
 * Plugin Codegen Configuration Factory
 *
 * Creates a standard @graphql-codegen/client-preset configuration for plugins.
 * Plugins use this to generate TypedDocumentNode types from their operations.
 *
 * Usage in plugin's codegen.ts:
 * ```ts
 * import { createPluginCodegenConfig } from '@tryvienna/sdk/codegen';
 * export default createPluginCodegenConfig();
 * ```
 *
 * @module sdk/codegen
 */

export interface PluginCodegenOptions {
  /** Path to the shared schema.graphql (default: '../graphql/schema.graphql') */
  schemaPath?: string;
  /** Glob pattern for operation documents (default: 'src/client/operations.ts') */
  documentsGlob?: string;
  /** Output directory for generated types (default: './src/client/generated/') */
  outputDir?: string;
}

/**
 * Minimal codegen config shape — avoids requiring @graphql-codegen/cli as a dependency.
 * Consumers import the full CodegenConfig type from their own @graphql-codegen/cli devDep.
 */
interface CodegenConfigShape {
  schema: string;
  documents: string[];
  generates: Record<string, { preset: string; config: Record<string, unknown> }>;
}

export function createPluginCodegenConfig(options?: PluginCodegenOptions): CodegenConfigShape {
  return {
    schema: options?.schemaPath ?? '../graphql/schema.graphql',
    documents: [options?.documentsGlob ?? 'src/client/operations.ts'],
    generates: {
      [options?.outputDir ?? './src/client/generated/']: {
        preset: 'client',
        config: {
          useTypeImports: true,
          enumsAsTypes: true,
          scalars: {
            DateTime: 'string | number',
            JSON: 'Record<string, unknown>',
          },
        },
      },
    },
  };
}
