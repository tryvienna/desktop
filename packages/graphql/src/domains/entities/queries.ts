/**
 * Entity Queries — Generic query fields for all entity types.
 *
 * These queries resolve against the EntityRegistry, which is injected
 * into the GraphQL context at runtime. If no registry is available,
 * queries return null/empty gracefully.
 *
 * Entity resolve/search operations require an EntityContext with live
 * integration clients (e.g. Octokit for GitHub entities). The context
 * is created per-entity-type via `ctx.entityContextFactory`, falling
 * back to a static mock for builtin entities that don't need clients.
 *
 * @module graphql/domains/entities/queries
 */

import {
  isObjectType,
  isListType,
  isNonNullType,
  type GraphQLOutputType,
} from 'graphql';
import { createMockEntityContext, getEntityTypeFromURI } from '@tryvienna/sdk';
import type { EntityContext, BaseEntity } from '@tryvienna/sdk';
import type { GraphQLContext } from '../../schema/builder';
import { builder } from '../../schema/builder';
import { getSchema } from '../../schema';
import { EntityRef, EntityTypeInfoRef, IntegrationInfoRef, EntityMutationGroupRef } from './types';

const { ctx: fallbackCtx } = createMockEntityContext();

/** Get the right EntityContext for an entity type — real clients if available, mock otherwise. */
function getEntityCtx(ctx: GraphQLContext, entityType: string): EntityContext {
  return ctx.entityContextFactory?.(entityType) ?? fallbackCtx;
}

builder.queryFields((t) => ({
  /** Get a single entity by URI */
  entity: t.field({
    type: EntityRef,
    nullable: true,
    description: 'Resolve a single entity by its URI',
    args: { uri: t.arg.string({ required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.entityRegistry) return null;
      try {
        const entityType = getEntityTypeFromURI(args.uri);
        return ctx.entityRegistry.getByURI(args.uri, getEntityCtx(ctx, entityType));
      } catch (err) {
        // Errors are already logged by EntityRegistry.getByURI via ctx.logger
        // Re-log at GraphQL level for visibility in the request path
        const entityCtx = getEntityCtx(ctx, 'unknown');
        entityCtx.logger.error(`GraphQL entity resolver failed for URI '${args.uri}'`, { error: String(err) });
        return null;
      }
    },
  }),

  /** List entities of a specific type */
  entities: t.field({
    type: [EntityRef],
    description: 'List entities of a specific type with optional filters',
    args: {
      type: t.arg.string({ required: true }),
      query: t.arg.string(),
      filters: t.arg({ type: 'JSON' }),
      limit: t.arg.int({ defaultValue: 20 }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.entityRegistry) return [];
      return ctx.entityRegistry.search(
        args.query ?? '',
        getEntityCtx(ctx, args.type),
        [args.type],
        args.limit ?? 20,
      );
    },
  }),

  /** Search across all entity types */
  entitySearch: t.field({
    type: [EntityRef],
    description: 'Search across all (or specified) entity types',
    args: {
      query: t.arg.string({ required: true }),
      types: t.arg.stringList(),
      limit: t.arg.int({ defaultValue: 20 }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.entityRegistry) return [];
      const registry = ctx.entityRegistry;
      const targetTypes = args.types ?? registry.getTypes();
      if (targetTypes.length === 0) return [];
      const limit = args.limit ?? 20;
      const perTypeLimit = Math.max(1, Math.ceil(limit / targetTypes.length));

      // Search in batches to avoid overwhelming external APIs with unbounded parallel requests
      const concurrency = 5;
      const allResults: BaseEntity[] = [];
      for (let i = 0; i < targetTypes.length; i += concurrency) {
        const batch = targetTypes.slice(i, i + concurrency);
        const results = await Promise.allSettled(
          batch.map((type: string) => registry.search(args.query, getEntityCtx(ctx, type), [type], perTypeLimit)),
        );
        for (const r of results) {
          if (r.status === 'fulfilled') allResults.push(...r.value);
        }
      }
      return allResults.slice(0, limit);
    },
  }),

  /** Discover registered entity types */
  entityTypes: t.field({
    type: [EntityTypeInfoRef],
    description: 'List all registered entity types with their metadata',
    resolve: (_root, _args, ctx) => {
      if (!ctx.entityRegistry) return [];
      return ctx.entityRegistry.getTypeSummaries();
    },
  }),

  /** Discover registered integrations */
  integrations: t.field({
    type: [IntegrationInfoRef],
    description: 'List all registered integrations',
    resolve: (_root, _args, ctx) => {
      if (!ctx.integrationRegistry) return [];
      return ctx.integrationRegistry.getAllDefinitions().map((def: { id: string; name: string; icon: unknown }) => ({
        id: def.id,
        displayName: def.name,
        icon: typeof def.icon === 'object' && def.icon && 'svg' in def.icon ? (def.icon as { svg: string }).svg : '🔌',
      }));
    },
  }),

  /** Discover mutations grouped by entity type (for permission UI) */
  entityMutationCatalog: t.field({
    type: [EntityMutationGroupRef],
    description: 'List all GraphQL mutations grouped by the entity type they operate on',
    resolve: (_root, _args, ctx) => {
      if (!ctx.entityRegistry) return [];
      return buildEntityMutationCatalog(ctx);
    },
  }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Mutation Catalog Builder (for entityMutationCatalog query)
// ─────────────────────────────────────────────────────────────────────────────

/** Convert snake_case to PascalCase (mirrors entity-builder-wrapper) */
function toPascalCase(s: string): string {
  return s.split('_').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');
}

/** Convert snake_case to camelCase for name-prefix matching */
function toCamelCase(s: string): string {
  const parts = s.split('_');
  return parts.map((p, i) => (i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1))).join('');
}

/** Unwrap NonNull/List wrappers and return the named type string */
function unwrapTypeName(type: GraphQLOutputType): string {
  let unwrapped: GraphQLOutputType = type;
  while (isNonNullType(unwrapped) || isListType(unwrapped)) {
    unwrapped = unwrapped.ofType;
  }
  return unwrapped.toString();
}

function buildEntityMutationCatalog(ctx: GraphQLContext) {
  const schema = getSchema();
  const mutationType = schema.getMutationType();
  if (!mutationType || !ctx.entityRegistry) return [];

  const registry = ctx.entityRegistry;
  const entityTypes = registry.getTypeSummaries();

  // Build lookup: GraphQL type name → entity type
  const graphqlToEntity = new Map<string, string>();
  const camelPrefixes: Array<[string, string]> = [];
  const displayNames = new Map<string, string>();

  for (const et of entityTypes) {
    graphqlToEntity.set(toPascalCase(et.type), et.type);
    camelPrefixes.push([toCamelCase(et.type), et.type]);
    displayNames.set(et.type, et.displayName);
  }
  // Longer prefixes first for accurate matching
  camelPrefixes.sort((a, b) => b[0].length - a[0].length);

  const groups = new Map<string, Array<{ name: string; description: string; entityType: string }>>();
  const fields = mutationType.getFields();

  for (const [name, field] of Object.entries(fields)) {
    if (name.startsWith('__')) continue;

    let entityType: string | null = null;

    // 1. Direct return type match
    const returnTypeName = unwrapTypeName(field.type);
    if (graphqlToEntity.has(returnTypeName)) {
      entityType = graphqlToEntity.get(returnTypeName)!;
    }

    // 2. Payload field match — check if return type has an entity-typed field
    if (!entityType) {
      let unwrapped: GraphQLOutputType = field.type;
      while (isNonNullType(unwrapped) || isListType(unwrapped)) {
        unwrapped = unwrapped.ofType;
      }
      if (isObjectType(unwrapped)) {
        for (const pf of Object.values(unwrapped.getFields())) {
          const pfTypeName = unwrapTypeName(pf.type);
          if (graphqlToEntity.has(pfTypeName)) {
            entityType = graphqlToEntity.get(pfTypeName)!;
            break;
          }
        }
      }
    }

    // 3. Name prefix fallback
    if (!entityType) {
      const lowerName = name.toLowerCase();
      for (const [prefix, et] of camelPrefixes) {
        if (lowerName.startsWith(prefix.toLowerCase())) {
          entityType = et;
          break;
        }
      }
    }

    if (!entityType) continue;

    if (!groups.has(entityType)) groups.set(entityType, []);
    groups.get(entityType)!.push({ name, description: field.description ?? '', entityType });
  }

  return Array.from(groups.entries())
    .map(([et, mutations]) => ({
      entityType: et,
      entityDisplayName: displayNames.get(et) ?? et,
      mutations: mutations.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.entityDisplayName.localeCompare(b.entityDisplayName));
}
