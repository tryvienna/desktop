/**
 * Entity and Integration Registries
 *
 * Runtime registries that hold entity definitions and integration definitions.
 * The GraphQL entity domain resolves operations against these registries.
 *
 * EntityRegistry supports two registration modes:
 * 1. `register(def)` — register a metadata-only EntityDefinition
 * 2. `registerHandlers(type, handlers)` — attach resolve/search/resolveContext
 *    callbacks (called by the SchemaBuilder's `entityObjectType()` helper)
 */

import type { BaseEntity, EntityTypeSummary } from './schemas';
import type { EntityDefinition } from './define-entity';
import type { IntegrationDefinition, EntityContext, SearchQuery } from './types';
import { buildEntityURI, parseEntityURI, getEntityTypeFromURI } from './uri';

// ─────────────────────────────────────────────────────────────────────────────
// Entity Handlers (registered by entityObjectType or manually)
// ─────────────────────────────────────────────────────────────────────────────

export interface EntityHandlers<TData = BaseEntity> {
  /** Resolve a single entity by its URI ID segments. */
  resolve?: (id: Record<string, string>, ctx: EntityContext) => Promise<TData | null>;
  /** Search/list entities. */
  search?: (query: SearchQuery, ctx: EntityContext) => Promise<TData[]>;
  /** Generate context markdown for AI/MCP consumption. */
  resolveContext?: (entity: TData, ctx: EntityContext) => Promise<string>;
  /** Integration dependencies — maps local names to integration IDs. */
  integrationDeps?: Record<string, string>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENTITY REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export class EntityRegistry {
  private definitions = new Map<string, EntityDefinition>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handlers = new Map<string, EntityHandlers<any>>();

  /** Register an entity definition. Throws if the type is already registered. */
  register(definition: EntityDefinition): void {
    if (this.definitions.has(definition.type)) {
      throw new Error(`Entity type '${definition.type}' is already registered`);
    }
    this.definitions.set(definition.type, definition);
  }

  /**
   * Register resolve/search/resolveContext handlers for an entity type.
   * Called by `entityObjectType()` in the schema builder wrapper.
   * The entity definition must already be registered.
   */
  registerHandlers<TData = BaseEntity>(type: string, entityHandlers: EntityHandlers<TData>): void {
    if (!this.definitions.has(type)) {
      throw new Error(`Cannot register handlers: entity type '${type}' is not registered`);
    }
    this.handlers.set(type, entityHandlers);
  }

  /** Unregister an entity type and its handlers. Returns true if it existed. */
  unregister(type: string): boolean {
    this.handlers.delete(type);
    return this.definitions.delete(type);
  }

  /** Get the definition for a type. */
  getDefinition(type: string): EntityDefinition | undefined {
    return this.definitions.get(type);
  }

  /** Get the handlers for a type. */
  getHandlers(type: string): EntityHandlers | undefined {
    return this.handlers.get(type);
  }

  /** Get all registered type names. */
  getTypes(): string[] {
    return Array.from(this.definitions.keys());
  }

  /** Get all definitions. */
  getAllDefinitions(): EntityDefinition[] {
    return Array.from(this.definitions.values());
  }

  /** Get type summaries for discovery (entityTypes query, MCP entity_types tool). */
  getTypeSummaries(): EntityTypeSummary[] {
    return Array.from(this.definitions.values()).map((def) => {
      const exampleId: Record<string, string> = {};
      const uriPath = { segments: def.uriSegments as readonly string[] };
      for (const seg of def.uriSegments) {
        exampleId[seg] = `<${seg}>`;
      }
      const uriExample = buildEntityURI(def.type, exampleId, uriPath);

      return {
        type: def.type,
        displayName: def.name,
        icon: 'svg' in def.icon ? def.icon.svg : def.display?.emoji ?? '🔌',
        source: def.source,
        uriExample,
        display: def.display,
      };
    });
  }

  /** Resolve a single entity by URI. */
  async getByURI(uri: string, ctx: EntityContext): Promise<BaseEntity | null> {
    try {
      const type = getEntityTypeFromURI(uri);
      const def = this.definitions.get(type);
      if (!def) return null;

      const entityHandlers = this.handlers.get(type);
      if (!entityHandlers?.resolve) return null;

      const uriPath = { segments: def.uriSegments as readonly string[] };
      const { id } = parseEntityURI(uri, uriPath);
      return entityHandlers.resolve(id, ctx) as Promise<BaseEntity | null>;
    } catch (err) {
      ctx.logger.error(`Failed to resolve entity by URI '${uri}'`, { error: String(err) });
      return null;
    }
  }

  /** Search across entity types. */
  async search(query: string, ctx: EntityContext, types?: string[], limit = 20): Promise<BaseEntity[]> {
    const targetTypes = types ?? this.getTypes();
    if (targetTypes.length === 0) return [];
    const perTypeLimit = Math.max(1, Math.ceil(limit / targetTypes.length));

    const results = await Promise.allSettled(
      targetTypes.map(async (type) => {
        const entityHandlers = this.handlers.get(type);
        if (!entityHandlers?.search) return [];
        return entityHandlers.search({ query, limit: perTypeLimit }, ctx) as Promise<BaseEntity[]>;
      }),
    );

    // Surface errors via the context logger so they don't silently vanish
    for (let i = 0; i < results.length; i++) {
      const r = results[i]!;
      if (r.status === 'rejected') {
        const type = targetTypes[i];
        ctx.logger.warn(`Entity search failed for type '${type}'`, { error: String(r.reason) });
      }
    }

    return results
      .filter((r): r is PromiseFulfilledResult<BaseEntity[]> => r.status === 'fulfilled')
      .flatMap((r) => r.value)
      .slice(0, limit);
  }

  /** Resolve context markdown for an entity (used by MCP/AI). */
  async resolveContext(uri: string, ctx: EntityContext): Promise<string | null> {
    try {
      const type = getEntityTypeFromURI(uri);
      const entityHandlers = this.handlers.get(type);
      if (!entityHandlers?.resolveContext) return null;

      const entity = await this.getByURI(uri, ctx);
      if (!entity) return null;

      return entityHandlers.resolveContext(entity, ctx);
    } catch (err) {
      ctx.logger.error(`Failed to resolve context for entity '${uri}'`, { error: String(err) });
      return null;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export class IntegrationRegistry {
  private definitions = new Map<string, IntegrationDefinition>();

  /** Register an integration definition. Throws if the ID is already registered. */
  register(definition: IntegrationDefinition): void {
    if (this.definitions.has(definition.id)) {
      throw new Error(`Integration '${definition.id}' is already registered`);
    }
    this.definitions.set(definition.id, definition);
  }

  /** Unregister an integration. Returns true if it existed. */
  unregister(id: string): boolean {
    return this.definitions.delete(id);
  }

  /** Get a specific integration definition. */
  getDefinition(id: string): IntegrationDefinition | undefined {
    return this.definitions.get(id);
  }

  /** Get all registered integration definitions. */
  getAllDefinitions(): IntegrationDefinition[] {
    return Array.from(this.definitions.values());
  }
}
