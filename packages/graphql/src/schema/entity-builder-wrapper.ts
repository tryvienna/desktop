/**
 * Entity Builder Wrapper — Implements SchemaBuilder with entity-aware helpers.
 *
 * Wraps the real Pothos builder to provide:
 * - `entityObjectType()` — creates a typed Pothos object type from an EntityDefinition,
 *   auto-generates base queries (single + search), and registers resolve/search/resolveContext
 *   handlers in the EntityRegistry.
 * - `entityPayload()` — creates a standard mutation payload type.
 *
 * All other SchemaBuilder methods delegate to the real Pothos builder.
 *
 * @module graphql/schema/entity-builder-wrapper
 */

import { GraphQLError } from 'graphql';
import type {
  SchemaBuilder,
  ObjectRef,
  InputRef,
  EnumRef,
  ObjectFieldBuilder,
  RootFieldBuilder,
  InputFieldBuilder,
  EntityObjectTypeConfig,
  EntityHandlerConfig,
  EntityPayloadShape,
  EntityDefinition,
} from '@tryvienna/sdk';
import { EntityRegistry } from '@tryvienna/sdk';
import type { GraphQLContext } from './builder';
import { builder as pothosBuilder } from './builder';

// ─────────────────────────────────────────────────────────────────────────────
// Naming Utilities
// ─────────────────────────────────────────────────────────────────────────────

/** `github_pr` → `GitHubPr` */
function toPascalCase(snakeCase: string): string {
  return snakeCase
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/** `github_pr` → `githubPr` */
function toCamelCase(snakeCase: string): string {
  const parts = snakeCase.split('_');
  return parts
    .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// Wrapper
// ─────────────────────────────────────────────────────────────────────────────

export function createEntitySchemaBuilder(
  entityRegistry: EntityRegistry,
): SchemaBuilder {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pb = pothosBuilder as any;

  const wrapper: SchemaBuilder = {
    // ── Delegated methods ───────────────────────────────────────────────

    objectRef<Shape>(name: string): ObjectRef<Shape> {
      return pb.objectRef(name);
    },

    objectType<Shape>(
      ref: ObjectRef<Shape>,
      config: {
        description?: string;
        fields: (t: ObjectFieldBuilder) => Record<string, unknown>;
      },
    ): void {
      pb.objectType(ref, config);
    },

    queryFields(
      fields: (t: RootFieldBuilder) => Record<string, unknown>,
    ): void {
      pb.queryFields(fields);
    },

    mutationFields(
      fields: (t: RootFieldBuilder) => Record<string, unknown>,
    ): void {
      pb.mutationFields(fields);
    },

    inputType(
      name: string,
      config: {
        description?: string;
        fields: (t: InputFieldBuilder) => Record<string, unknown>;
      },
    ): InputRef {
      return pb.inputType(name, config);
    },

    enumType<Values extends readonly string[]>(
      name: string,
      config: {
        description?: string;
        values: Values;
      },
    ): EnumRef<Values[number]> {
      return pb.enumType(name, { ...config, values: Object.fromEntries(config.values.map((v) => [v, { value: v }])) });
    },

    // ── Entity Helpers ──────────────────────────────────────────────────

    entityObjectType<TData>(
      entityDef: EntityDefinition,
      config: EntityObjectTypeConfig<TData>,
    ): ObjectRef<TData> {
      const typeName = toPascalCase(entityDef.type);
      const camelName = toCamelCase(entityDef.type);

      // 1. Register the entity definition in the registry (if not already)
      if (!entityRegistry.getDefinition(entityDef.type)) {
        entityRegistry.register(entityDef);
      }

      // 2. Register handlers
      entityRegistry.registerHandlers<TData>(entityDef.type, {
        resolve: config.resolve,
        search: config.search,
        resolveContext: config.resolveContext,
        integrationDeps: config.integrations
          ? Object.fromEntries(
              Object.entries(config.integrations).map(([key, def]) => [key, (def as { id: string }).id]),
            )
          : undefined,
      });

      // 3. Create the Pothos object type
      const typeRef = pb.objectRef(typeName);
      pb.objectType(typeRef, {
        description: config.description ?? `${entityDef.name} entity`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fields: (t: any) => {
          // Base entity fields (id, type, uri, title, description, createdAt, updatedAt)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const baseFields: Record<string, any> = {
            id: t.exposeID('id'),
            type: t.exposeString('type'),
            uri: t.exposeString('uri'),
            title: t.exposeString('title'),
            description: t.exposeString('description', { nullable: true }),
            createdAt: t.expose('createdAt', { type: 'DateTime', nullable: true }),
            updatedAt: t.expose('updatedAt', { type: 'DateTime', nullable: true }),
          };

          // Merge with custom fields from the plugin
          const customFields = config.fields(t);

          return { ...baseFields, ...customFields };
        },
      });

      // 4. Auto-generate queries
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pb.queryFields((t: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const queries: Record<string, any> = {};

        // Single entity: githubPr(uri: String!)
        if (config.resolve) {
          queries[camelName] = t.field({
            type: typeRef,
            nullable: true,
            description: `Get a single ${entityDef.name} by URI`,
            args: {
              uri: t.arg.string({ required: true }),
            },
            resolve: async (_root: unknown, args: { uri: string }, ctx: GraphQLContext) => {
              if (!ctx.entityRegistry) {
                throw new GraphQLError('Entity registry not available', {
                  extensions: { code: 'SERVICE_UNAVAILABLE' },
                });
              }
              const entityCtx = ctx.entityContextFactory?.(entityDef.type);
              if (!entityCtx) {
                throw new GraphQLError('Entity context factory not available', {
                  extensions: { code: 'SERVICE_UNAVAILABLE' },
                });
              }
              return ctx.entityRegistry.getByURI(args.uri, entityCtx);
            },
          });
        }

        // Search: githubPrs(query: String, limit: Int)
        if (config.search) {
          queries[`${camelName}s`] = t.field({
            type: [typeRef],
            description: `Search ${entityDef.name} entities`,
            args: {
              query: t.arg.string(),
              limit: t.arg.int({ defaultValue: 20 }),
            },
            resolve: async (
              _root: unknown,
              args: { query?: string | null; limit?: number | null },
              ctx: GraphQLContext,
            ) => {
              if (!ctx.entityRegistry) {
                throw new GraphQLError('Entity registry not available', {
                  extensions: { code: 'SERVICE_UNAVAILABLE' },
                });
              }
              const entityCtx = ctx.entityContextFactory?.(entityDef.type);
              if (!entityCtx) {
                throw new GraphQLError('Entity context factory not available', {
                  extensions: { code: 'SERVICE_UNAVAILABLE' },
                });
              }
              return ctx.entityRegistry.search(
                args.query ?? '',
                entityCtx,
                [entityDef.type],
                args.limit ?? 20,
              );
            },
          });
        }

        return queries;
      });

      return typeRef as unknown as ObjectRef<TData>;
    },

    registerEntityHandlers<TData>(
      entityDef: EntityDefinition,
      config: EntityHandlerConfig<TData>,
    ): void {
      // Register the entity definition in the registry (if not already)
      if (!entityRegistry.getDefinition(entityDef.type)) {
        entityRegistry.register(entityDef);
      }

      // Register handlers only — no Pothos type creation
      entityRegistry.registerHandlers<TData>(entityDef.type, {
        resolve: config.resolve,
        search: config.search,
        resolveContext: config.resolveContext,
        integrationDeps: config.integrations
          ? Object.fromEntries(
              Object.entries(config.integrations).map(([key, def]) => [key, (def as { id: string }).id]),
            )
          : undefined,
      });
    },

    entityPayload<TData>(
      name: string,
      entityRef: ObjectRef<TData>,
      entityFieldName: string,
    ): ObjectRef<EntityPayloadShape<TData>> {
      const payloadName = `${name}Payload`;

      const payloadRef = pb.objectRef(payloadName);
      pb.objectType(payloadRef, {
        description: `Payload for ${name} mutation`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fields: (t: any) => ({
          success: t.exposeBoolean('success'),
          message: t.exposeString('message', { nullable: true }),
          [entityFieldName]: t.field({
            type: entityRef,
            nullable: true,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            resolve: (result: any) => result.entity ?? null,
          }),
          data: t.expose('data', { type: 'JSON', nullable: true }),
        }),
      });

      return payloadRef as unknown as ObjectRef<EntityPayloadShape<TData>>;
    },
  };

  return wrapper;
}
