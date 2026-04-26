import type { TemplateContext } from '../types.ts';

export function renderSchema(ctx: TemplateContext): string {
  const { naming, entities } = ctx;
  const pascal = naming.pascalName;
  const id = naming.pluginId;

  const entityImports = entities.length > 0
    ? `import { ${entities.map((e) => `${naming.camelName}${e.entityPascal}Entity`).join(', ')} } from './entities';\n`
    : '';

  const integrationImport = `import { ${naming.camelName}Integration } from './integration';\n`;

  const entityShapes = entities
    .map(
      (e) => `
export interface ${pascal}${e.entityPascal}Shape {
  id: string;
  title: string;
  status?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  // TODO: Add fields matching your API response
}`,
    )
    .join('\n');

  const entityTypes = entities
    .map(
      (e) => `
  // ── ${e.entityDisplayName} ──────────────────────────────────────────────────

  const ${e.entityPascal}Type = builder.entityObjectType<${pascal}${e.entityPascal}Shape>(${naming.camelName}${e.entityPascal}Entity, {
    integrations: { ${id}: ${naming.camelName}Integration },
    description: '${e.entityDisplayName} from ${naming.displayName}',
    fields: (t) => ({
      id: t.exposeString('id'),
      title: t.exposeString('title'),
      status: t.exposeString('status', { nullable: true }),
      description: t.exposeString('description', { nullable: true }),
      createdAt: t.exposeString('createdAt', { nullable: true }),
      updatedAt: t.exposeString('updatedAt', { nullable: true }),
      // TODO: Add more fields
    }),
    resolve: async (entityId, ctx) => {
      // TODO: Fetch single ${e.entityDisplayName.toLowerCase()} by ID
      // const client = await ctx.integrations.${id}.client;
      // return api.get${e.entityPascal}(client, entityId);
      throw new Error('Not implemented: resolve ${e.entityType}');
    },
    search: async (query, ctx) => {
      // TODO: Search/list ${e.entityDisplayName.toLowerCase()} items
      // const client = await ctx.integrations.${id}.client;
      // return api.search${e.entityPascal}s(client, query);
      return [];
    },
    resolveContext: async (entity) => {
      return \`# \${entity.title}\\nStatus: \${entity.status ?? 'unknown'}\`;
    },
  });`,
    )
    .join('\n');

  return `/**
 * ${naming.displayName} integration GraphQL schema registration.
 *
 * Registers all ${naming.displayName}-specific GraphQL types, queries, and mutations
 * on the Pothos builder. Called via the integration's \`schema\` callback
 * during plugin loading.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SchemaBuilder } from '@tryvienna/sdk';
${entityImports}${integrationImport}import * as api from './api';

// ─────────────────────────────────────────────────────────────────────────────
// Backing shapes — match what API methods return
// ─────────────────────────────────────────────────────────────────────────────
${entityShapes}

// ─────────────────────────────────────────────────────────────────────────────
// Schema Registration
// ─────────────────────────────────────────────────────────────────────────────

export function register${pascal}Schema(builder: SchemaBuilder) {
${entityTypes || '  // TODO: Define your GraphQL types, queries, and mutations here'}
}
`;
}
