/**
 * Assembled GraphQL Schema
 *
 * Imports all domain modules (which register types/queries/mutations
 * on the shared builder) then builds the final schema.
 *
 * Import order doesn't matter — Pothos handles dependency resolution.
 * Main process only — do NOT import in renderer or preload.
 *
 * Schema building is lazy — `getSchema()` builds on first call,
 * and `invalidateSchema()` forces a rebuild on the next call.
 * This allows plugin schema extensions to be registered after
 * the base domain modules load.
 *
 * @module graphql/schema
 */

import { execute, parse, type DocumentNode, type ExecutionResult, type GraphQLSchema } from 'graphql';
import { builder, type GraphQLContext } from './builder';

// Register scalars
import './scalars';

// Register domain types, queries, and mutations
import '../domains/projects/types';
import '../domains/projects/queries';
import '../domains/projects/mutations';
import '../domains/workstreams/types';
import '../domains/workstreams/queries';
import '../domains/workstreams/mutations';
import '../domains/workstream-groups/types';
import '../domains/workstream-groups/queries';
import '../domains/workstream-groups/mutations';
import '../domains/entities/types';
import '../domains/entities/queries';
import '../domains/entities/mutations';
import '../domains/routines/types';
import '../domains/routines/queries';
import '../domains/routines/mutations';
import '../domains/git/types';
import '../domains/git/queries';
import '../domains/git/diff-types';
import '../domains/git/diff-queries';
import '../domains/registry/types';
import '../domains/registry/queries';
import '../domains/registry/mutations';
import '../domains/skills/types';
import '../domains/skills/queries';
import '../domains/skills/mutations';
import '../domains/plugins/types';
import '../domains/plugins/queries';
import '../domains/plugins/mutations';
import '../domains/events/types';
import '../domains/events/queries';
import '../domains/settings/types';
import '../domains/settings/queries';
import '../domains/settings/mutations';
import '../domains/permissions/types';
import '../domains/permissions/queries';
import '../domains/permissions/mutations';
import '../domains/permission-templates/types';
import '../domains/permission-templates/queries';
import '../domains/permission-templates/mutations';
import '../domains/lsp/types';
import '../domains/lsp/queries';
import '../domains/commands/types';
import '../domains/commands/queries';
import '../domains/commands/mutations';
import '../domains/tags/types';
import '../domains/tags/queries';
import '../domains/tags/mutations';
import '../domains/project-config/types';
import '../domains/project-config/queries';
import '../domains/profiles/types';
import '../domains/profiles/queries';
import '../domains/profiles/mutations';
import '../domains/tasks/types';
import '../domains/tasks/queries';
import '../domains/tasks/mutations';
import '../domains/inbox/types';
import '../domains/inbox/queries';
import '../domains/inbox/mutations';
import '../domains/notifications/types';
import '../domains/notifications/queries';
import '../domains/notifications/mutations';
import '../domains/entity-tool/types';
import '../domains/entity-tool/queries';
import '../domains/entity-tool/mutations';

// Register root query/mutation types eagerly — Pothos needs these
// to exist before toSchema(), but plugin queryFields/mutationFields
// can be added after this point and before getSchema() is called.
builder.queryType({});
builder.mutationType({});

// ─────────────────────────────────────────────────────────────────────────────
// Lazy schema building
// ─────────────────────────────────────────────────────────────────────────────

let _schema: GraphQLSchema | null = null;

/**
 * Get the assembled GraphQL schema. Built lazily on first call.
 * After invalidation, the next call rebuilds it.
 */
export function getSchema(): GraphQLSchema {
  if (!_schema) {
    _schema = builder.toSchema();
  }
  return _schema;
}

/**
 * Invalidate the cached schema so it's rebuilt on next `getSchema()`.
 * Call this after registering plugin schema extensions.
 */
export function invalidateSchema(): void {
  _schema = null;
}

/**
 * Backwards-compatible static schema export.
 * Uses a Proxy to delegate to the lazily-built schema so existing
 * consumers (`import { schema }`) continue to work without changes.
 */
export const schema = new Proxy({} as GraphQLSchema, {
  get(_target, prop, receiver) {
    return Reflect.get(getSchema(), prop, receiver);
  },
});

// Re-export for convenience
export { builder } from './builder';
export type { GraphQLContext } from './builder';
export { createEntitySchemaBuilder } from './entity-builder-wrapper';

// Re-export graphql-js utilities so consumers use the same `graphql` instance
// that built the schema (avoids "Cannot use GraphQLSchema from another module" errors).
export { execute, parse, type DocumentNode } from 'graphql';

// ─────────────────────────────────────────────────────────────────────────────
// Pre-bound execute — guarantees schema + execute share the same graphql module
// ─────────────────────────────────────────────────────────────────────────────

const queryCache = new Map<string, DocumentNode>();

function getParsedDocument(query: string): DocumentNode {
  let doc = queryCache.get(query);
  if (!doc) {
    doc = parse(query);
    queryCache.set(query, doc);
  }
  return doc;
}

/**
 * Execute a GraphQL query/mutation against the built schema.
 *
 * Uses the same `graphql` module instance that built the schema,
 * avoiding "Cannot use GraphQLSchema from another module" errors
 * in monorepo test environments.
 */
export async function executeGraphQL(
  contextValue: GraphQLContext,
  query: string,
  variables?: Record<string, unknown>,
): Promise<ExecutionResult> {
  return execute({
    schema: getSchema(),
    document: getParsedDocument(query),
    contextValue,
    variableValues: variables,
  });
}
