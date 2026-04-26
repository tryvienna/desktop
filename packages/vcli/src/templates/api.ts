import type { TemplateContext } from '../types.ts';

export function renderApi(ctx: TemplateContext): string {
  const { naming, entities } = ctx;

  const entityStubs = entities
    .map(
      (e) => `
// ── ${e.entityDisplayName} ──────────────────────────────────────────────────

export async function get${e.entityPascal}(client: unknown, id: Record<string, string>) {
  // TODO: Implement fetching a single ${e.entityDisplayName.toLowerCase()}
  throw new Error('Not implemented: get${e.entityPascal}');
}

export async function search${e.entityPascal}s(client: unknown, query: string) {
  // TODO: Implement searching/listing ${e.entityDisplayName.toLowerCase()} items
  return [];
}`,
    )
    .join('\n');

  return `/**
 * ${naming.displayName} API client methods.
 *
 * Raw API wrapper functions called from GraphQL resolvers.
 * These methods receive the integration client and return
 * data in the shape expected by the GraphQL schema.
 */
${entityStubs || '\n// TODO: Add API methods here'}
`;
}
