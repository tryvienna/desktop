/**
 * SchemaBuilder — Typed interface for plugin GraphQL schema extensions.
 *
 * This provides a typed subset of the Pothos SchemaBuilder API that plugins
 * can use to extend the GraphQL schema. The real Pothos builder satisfies
 * this interface at runtime, so plugins get type checking without depending
 * on @vienna/graphql or pothos directly.
 *
 * Two high-level helpers reduce boilerplate for entity-backed types:
 *
 * - `entityObjectType()` — creates a Pothos object type from an EntityDefinition,
 *   auto-generates base queries (single + search), and registers resolve/search
 *   handlers in the EntityRegistry.
 *
 * - `entityPayload()` — creates a standard mutation payload type with
 *   `success`, `message`, a typed entity field, and optional `data`.
 *
 * Usage in plugins:
 * ```ts
 * import type { SchemaBuilder } from '@tryvienna/sdk';
 *
 * export function registerSchema(b: SchemaBuilder): void {
 *   const GitHubPR = b.entityObjectType<PRData>(githubPrEntity, {
 *     integrations: { github: githubIntegration },
 *     fields: (t) => ({
 *       number: t.exposeInt('number'),
 *       state: t.exposeString('state'),
 *     }),
 *     resolve: async (id, ctx) => { ... },
 *     search: async (query, ctx) => { ... },
 *   });
 *
 *   const MergePayload = b.entityPayload('MergeGitHubPr', GitHubPR, 'githubPr');
 *   b.mutationFields((t) => ({
 *     mergeGitHubPr: t.field({
 *       type: MergePayload,
 *       args: { uri: t.arg.string({ required: true }) },
 *       resolve: async (_, args, ctx) => { ... },
 *     }),
 *   }));
 * }
 * ```
 */

import type { EntityDefinition } from './define-entity';
import type { IntegrationDefinition, EntityContext, SearchQuery } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Object References (opaque handles for type registration)
// ─────────────────────────────────────────────────────────────────────────────

/** Opaque reference to a GraphQL object type. */
export interface ObjectRef<_Shape = unknown> {
  readonly __objectRefBrand: unique symbol;
}

/** Opaque reference to an input type. */
export interface InputRef<_Shape = unknown> {
  readonly __inputRefBrand: unique symbol;
}

/** Opaque reference to an enum type. */
export interface EnumRef<_Values = unknown> {
  readonly __enumRefBrand: unique symbol;
}

// ─────────────────────────────────────────────────────────────────────────────
// Field Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Union of types that can be passed as a field's `type` property.
 *
 * - `string` — a built-in scalar name like `'String'`, `'Int'`, `'Boolean'`, `'ID'`, `'JSON'`
 * - `ObjectRef` — a reference to an object type created via `objectRef()` or `entityObjectType()`
 * - `EnumRef` — a reference to an enum type created via `enumType()`
 * - `InputRef` — a reference to an input type created via `inputType()`
 * - `[ObjectRef]` / `[EnumRef]` / `[string]` — list variants of the above
 */
export type FieldType =
  | string
  | ObjectRef
  | EnumRef
  | InputRef
  | [ObjectRef]
  | [EnumRef]
  | [string];

// ─────────────────────────────────────────────────────────────────────────────
// Field Builder (available inside objectType and queryFields/mutationFields)
// ─────────────────────────────────────────────────────────────────────────────

/** Arg builder available on field builders. */
export interface ArgBuilder {
  /** Define an ID argument. */
  id(config?: { required?: boolean; description?: string }): unknown;
  /** Define a String argument. */
  string(config?: { required?: boolean; description?: string; defaultValue?: string }): unknown;
  /** Define an Int argument. */
  int(config?: { required?: boolean; description?: string; defaultValue?: number }): unknown;
  /** Define a Boolean argument. */
  boolean(config?: { required?: boolean; description?: string; defaultValue?: boolean }): unknown;
  /** Define a custom-typed argument (e.g. an InputRef or named scalar). */
  (config: { type: InputRef | string; required?: boolean; description?: string }): unknown;
}

/** Field builder available inside objectType fields. */
export interface ObjectFieldBuilder {
  /** Expose an ID field from the object shape. The key must match a property on the object. */
  exposeID(key: string, config?: { nullable?: boolean; description?: string }): unknown;
  /** Expose a String field from the object shape. The key must match a property on the object. */
  exposeString(key: string, config?: { nullable?: boolean; description?: string }): unknown;
  /** Expose an Int field from the object shape. The key must match a property on the object. */
  exposeInt(key: string, config?: { nullable?: boolean; description?: string }): unknown;
  /** Expose a Boolean field from the object shape. The key must match a property on the object. */
  exposeBoolean(key: string, config?: { nullable?: boolean; description?: string }): unknown;
  /** Expose a list-of-strings field from the object shape. The key must match a property on the object. */
  exposeStringList(key: string, config?: { nullable?: boolean; description?: string }): unknown;
  /** Expose a field with a custom type from the object shape. The key must match a property on the object. */
  expose(key: string, config: { type: FieldType; nullable?: boolean; description?: string }): unknown;
  /** Define a computed field with a resolver function. */
  field(config: FieldConfig): unknown;
  arg: ArgBuilder;
}

/** Field builder available inside queryFields/mutationFields. */
export interface RootFieldBuilder {
  /** Define a root-level field (query or mutation) with a resolver function. */
  field(config: FieldConfig): unknown;
  arg: ArgBuilder;
}

/** Configuration for a resolved field (used with `t.field()`). */
export interface FieldConfig {
  /** The GraphQL type of the field — a scalar name, ObjectRef, EnumRef, or list variant. */
  type: FieldType;
  /** Whether the field can return null. Defaults to false (non-nullable). */
  nullable?: boolean;
  /** Human-readable description shown in the GraphQL schema. */
  description?: string;
  /** Arguments accepted by this field, typically built via `t.arg`. */
  args?: Record<string, unknown>;
  /** Resolver function that produces the field value. */
  resolve: (root: unknown, args: Record<string, unknown>, ctx: unknown) => unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// SchemaBuilder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Typed subset of the Pothos SchemaBuilder API for plugin schema extensions.
 *
 * Plugins import this type from @tryvienna/sdk and use it in their
 * `schema: (builder: SchemaBuilder) => void` callbacks. The real Pothos
 * builder is a superset that satisfies this interface.
 */
export interface SchemaBuilder {
  /** Create a named reference to an object type (for use before type definition). */
  objectRef<Shape = unknown>(name: string): ObjectRef<Shape>;

  /** Register an object type with its fields. */
  objectType<Shape>(
    ref: ObjectRef<Shape>,
    config: {
      description?: string;
      fields: (t: ObjectFieldBuilder) => Record<string, unknown>;
    },
  ): void;

  /** Register query fields. */
  queryFields(
    fields: (t: RootFieldBuilder) => Record<string, unknown>,
  ): void;

  /** Register mutation fields. */
  mutationFields(
    fields: (t: RootFieldBuilder) => Record<string, unknown>,
  ): void;

  /** Define an input type. */
  inputType(
    name: string,
    config: {
      description?: string;
      fields: (t: InputFieldBuilder) => Record<string, unknown>;
    },
  ): InputRef;

  /** Define an enum type. */
  enumType<Values extends readonly string[]>(
    name: string,
    config: {
      description?: string;
      values: Values;
    },
  ): EnumRef<Values[number]>;

  // ── Entity Helpers ──────────────────────────────────────────────────────────

  /**
   * Create an entity-backed GraphQL object type with auto-generated base queries.
   *
   * This is the primary way plugins expose entities via GraphQL. It:
   * 1. Creates a Pothos object type with base entity fields + custom fields
   * 2. Auto-generates `{camelType}(uri: String!)` and `{camelType}s(query, limit)` queries
   * 3. Registers resolve/search/resolveContext handlers in the EntityRegistry
   *
   * @returns An ObjectRef for use in other type definitions and mutations.
   */
  entityObjectType<TData>(
    entityDef: EntityDefinition,
    config: EntityObjectTypeConfig<TData>,
  ): ObjectRef<TData>;

  /**
   * Register entity handlers (resolve/search/resolveContext) WITHOUT creating a new Pothos type.
   *
   * Use this when you've already defined the Pothos type manually but still need
   * the EntityRegistry to know how to resolve/search this entity for MCP tools.
   */
  registerEntityHandlers<TData>(
    entityDef: EntityDefinition,
    config: EntityHandlerConfig<TData>,
  ): void;

  /**
   * Create a standard mutation payload type for entity mutations.
   *
   * Creates `{name}Payload` with fields:
   * - `success: Boolean!`
   * - `message: String`
   * - `[entityFieldName]: EntityType` (typed, for cache invalidation)
   * - `data: JSON`
   */
  entityPayload<TData>(
    name: string,
    entityRef: ObjectRef<TData>,
    entityFieldName: string,
  ): ObjectRef<EntityPayloadShape<TData>>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Entity Helper Config Types
// ─────────────────────────────────────────────────────────────────────────────

/** Configuration for `entityObjectType()`. */
export interface EntityObjectTypeConfig<TData> {
  /** Integration dependencies — keys become typed accessors on `ctx.integrations`. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  integrations?: Record<string, IntegrationDefinition<any>>;
  /** Optional description override (defaults to entity name). */
  description?: string;
  /** Custom fields beyond the base entity fields (id, type, uri, title, etc.). */
  fields: (t: ObjectFieldBuilder) => Record<string, unknown>;
  /** Resolve a single entity by its URI ID segments. */
  resolve?: (id: Record<string, string>, ctx: EntityContext) => Promise<TData | null>;
  /** Search/list entities. */
  search?: (query: SearchQuery, ctx: EntityContext) => Promise<TData[]>;
  /** Generate context markdown for AI/MCP consumption. */
  resolveContext?: (entity: TData, ctx: EntityContext) => Promise<string>;
}

/** Configuration for `registerEntityHandlers()` — handler-only registration. */
export interface EntityHandlerConfig<TData> {
  /** Integration dependencies — keys become typed accessors on `ctx.integrations`. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  integrations?: Record<string, IntegrationDefinition<any>>;
  /** Resolve a single entity by its URI ID segments. */
  resolve?: (id: Record<string, string>, ctx: EntityContext) => Promise<TData | null>;
  /** Search/list entities. */
  search?: (query: SearchQuery, ctx: EntityContext) => Promise<TData[]>;
  /** Generate context markdown for AI/MCP consumption. */
  resolveContext?: (entity: TData, ctx: EntityContext) => Promise<string>;
}

/** Shape of an entity mutation payload. */
export interface EntityPayloadShape<_TData = unknown> {
  success: boolean;
  message?: string | null;
  entity?: _TData | null;
  data?: unknown;
}

/** Field builder for input types. */
export interface InputFieldBuilder {
  id(config?: { required?: boolean; description?: string }): unknown;
  string(config?: { required?: boolean; description?: string; defaultValue?: string }): unknown;
  int(config?: { required?: boolean; description?: string; defaultValue?: number }): unknown;
  boolean(config?: { required?: boolean; description?: string; defaultValue?: boolean }): unknown;
  /** Define a field with a custom type (e.g. a nested InputRef or enum). */
  field(config: { type: FieldType; required?: boolean; description?: string }): unknown;
}
