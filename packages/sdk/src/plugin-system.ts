/**
 * PluginSystem — Unified registry for plugins, integrations, entities, and events.
 *
 * Replaces the separate EntityRegistry, IntegrationRegistry, and PluginRegistry
 * with a single class that manages all registered definitions and provides
 * query methods for the GraphQL layer, renderer, and IPC handlers.
 *
 * Entity registration, handler management, and operations (resolve, search,
 * resolveContext, getTypeSummaries) are delegated to an internal EntityRegistry.
 *
 * Event registration, dispatch, and lifecycle are delegated to an internal
 * EventRegistry, with a context factory that provides handlers with emit + logger.
 */

import type { ComponentType } from 'react';
import type { ZodType } from 'zod';
import type { BaseEntity, EntityTypeSummary } from './schemas';
import type { EntityDefinition, EntityMatcher, EntityDrawerProps, EntityCardProps, EntityFeedCardProps, WorkstreamWidgetProps } from './define-entity';
import type { PluginDefinition } from './define-plugin';
import type { IntegrationDefinition, EntityContext, PluginLogger } from './types';
import type { EventDefinition, EventListenerDeclaration } from './define-event';
import { EntityRegistry } from './registry';
import type { EntityHandlers } from './registry';
import { EventRegistry, CORE_PLUGIN_ID } from './event-registry';
import type {
  NavSidebarCanvasConfig,
  DrawerCanvasConfig,
  MenuBarCanvasConfig,
  FeedCanvasConfig,
} from './canvas';

// ─────────────────────────────────────────────────────────────────────────────
// Resolved Canvas Types (canvas config + owning plugin ID)
// ─────────────────────────────────────────────────────────────────────────────

export interface ResolvedNavSidebar {
  pluginId: string;
  config: NavSidebarCanvasConfig;
}

export interface ResolvedDrawer {
  pluginId: string;
  config: DrawerCanvasConfig;
}

export interface ResolvedMenuBar {
  pluginId: string;
  config: MenuBarCanvasConfig;
}

export interface ResolvedFeedCanvas {
  pluginId: string;
  config: FeedCanvasConfig;
}

export interface ResolvedEntityDrawer {
  entityType: string;
  pluginId: string;
  component: ComponentType<EntityDrawerProps>;
  card?: ComponentType<EntityCardProps>;
  feedCard?: ComponentType<EntityFeedCardProps>;
  workstreamWidget?: ComponentType<WorkstreamWidgetProps>;
}

export interface ResolvedWorkstreamWidget {
  entityType: string;
  pluginId: string;
  component: ComponentType<WorkstreamWidgetProps>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Summary (serializable, for GraphQL / UI)
// ─────────────────────────────────────────────────────────────────────────────

export interface EventSummary {
  qualifiedName: string;
  localName: string;
  description: string;
  ownerPluginId: string;
  listenerCount: number;
  payloadSchema: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Feed Item Adapter (DB-agnostic persistence interface)
// ─────────────────────────────────────────────────────────────────────────────

/** Info about a dynamic feed item (DB-agnostic shape). */
export interface FeedItemInfo {
  id: string;
  widgetId: string;
  props: Record<string, unknown> | null;
  enabled: boolean;
  source: string;
}

/** Adapter interface for feed item persistence. Keeps PluginSystem DB-agnostic. */
export interface FeedItemAdapter {
  add(input: {
    projectId: string;
    widgetId: string;
    props?: Record<string, unknown>;
    source: string;
    sortOrder?: number;
  }): { id: string };
  remove(id: string): boolean;
  enable(id: string): boolean;
  disable(id: string): boolean;
  list(projectId: string): FeedItemInfo[];
  findByWidgetAndProject(
    widgetId: string,
    projectId: string,
    matchProps?: Record<string, unknown>,
  ): { id: string } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Emit callback type
// ─────────────────────────────────────────────────────────────────────────────

/** Callback invoked after every successful event emission. */
export type EmitCallback = (eventName: string, payload: unknown, listenerCount: number) => void;

// ─────────────────────────────────────────────────────────────────────────────
// Zod schema description
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Produce a human-readable description of a Zod schema.
 * Walks the _def tree to extract shape keys and types.
 */
function describeZodSchema(schema: ZodType): string {
  try {
    // Zod stores internal config in `_def` — we access it reflectively.
    const def = (schema as unknown as { _def?: Record<string, unknown> })._def;
    if (!def) return 'unknown';

    const typeName = def['typeName'] as string | undefined;

    if (typeName === 'ZodObject') {
      const shape = typeof def['shape'] === 'function'
        ? (def['shape'] as () => Record<string, ZodType>)()
        : (def['shape'] as Record<string, ZodType> | undefined);
      if (!shape || typeof shape !== 'object') return 'object';
      const fields = Object.entries(shape).map(
        ([key, val]) => `${key}: ${describeZodSchema(val)}`,
      );
      return `{ ${fields.join(', ')} }`;
    }
    if (typeName === 'ZodString') return 'string';
    if (typeName === 'ZodNumber') return 'number';
    if (typeName === 'ZodBoolean') return 'boolean';
    if (typeName === 'ZodArray') {
      const inner = def['type'] as ZodType | undefined;
      return inner ? `${describeZodSchema(inner)}[]` : 'array';
    }
    if (typeName === 'ZodOptional' || typeName === 'ZodNullable') {
      const inner = def['innerType'] as ZodType | undefined;
      const suffix = typeName === 'ZodOptional' ? 'undefined' : 'null';
      return inner ? `${describeZodSchema(inner)} | ${suffix}` : 'unknown';
    }
    if (typeName === 'ZodEnum') {
      const values = def['values'] as string[] | undefined;
      return values ? values.map((v) => `"${v}"`).join(' | ') : 'enum';
    }
    if (typeName === 'ZodUnion' || typeName === 'ZodDiscriminatedUnion') {
      const options = def['options'] as ZodType[] | undefined;
      return options ? options.map((o) => describeZodSchema(o)).join(' | ') : 'union';
    }
    if (typeName === 'ZodLiteral') return JSON.stringify(def['value']);
    if (typeName === 'ZodRecord') return 'Record<string, unknown>';
    if (typeName === 'ZodUnknown') return 'unknown';

    return typeName?.replace('Zod', '').toLowerCase() ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PluginSystem
// ─────────────────────────────────────────────────────────────────────────────

export class PluginSystem {
  private plugins = new Map<string, PluginDefinition>();
  private integrations = new Map<string, IntegrationDefinition>();
  private entityToPlugin = new Map<string, string>();
  private integrationToPlugin = new Map<string, string>();

  /** Internal EntityRegistry — all entity definitions, handlers, and operations delegate here. */
  private entityRegistry = new EntityRegistry();

  /** Internal EventRegistry — all event definitions and listeners delegate here. */
  private eventRegistry = new EventRegistry();

  /** Optional logger for event emission diagnostics. */
  private logger?: PluginLogger;

  /** Callbacks invoked after every successful event emission. */
  private emitCallbacks: EmitCallback[] = [];

  /** Optional feed item persistence adapter. */
  private feedItemAdapter?: FeedItemAdapter;

  constructor() {
    // Wire context factory so event handlers receive emit + logger
    this.eventRegistry.setContextFactory((listenerPluginId) => ({
      emit: (eventName: string, payload: unknown) => {
        const qualifiedName = `${listenerPluginId}.${eventName}`;
        this.emit(listenerPluginId, qualifiedName, payload);
      },
      logger: this.logger?.child({ plugin: listenerPluginId }) ?? {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        child: () => ({
          debug: () => {},
          info: () => {},
          warn: () => {},
          error: () => {},
          child: function self() { return self as unknown as PluginLogger; },
        }) as PluginLogger,
      },
    }));
  }

  // ── Plugin Registration ──────────────────────────────────────────────

  registerPlugin(plugin: PluginDefinition): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin '${plugin.id}' is already registered`);
    }

    // Check for integration ID conflicts
    for (const integration of plugin.integrations) {
      if (this.integrations.has(integration.id)) {
        throw new Error(
          `Integration '${integration.id}' is already registered by plugin '${this.integrationToPlugin.get(integration.id)}'`,
        );
      }
    }

    // Check for entity type conflicts
    for (const entity of plugin.entities) {
      if (this.entityRegistry.getDefinition(entity.type)) {
        throw new Error(
          `Entity type '${entity.type}' is already registered by plugin '${this.entityToPlugin.get(entity.type)}'`,
        );
      }
    }

    // Check for event name conflicts before mutating state
    for (const event of plugin.events) {
      const qualifiedName = `${plugin.id}.${event.name}`;
      if (this.eventRegistry.hasEvent(qualifiedName)) {
        throw new Error(`Event '${qualifiedName}' is already registered`);
      }
    }

    // Register everything atomically
    this.plugins.set(plugin.id, plugin);

    for (const integration of plugin.integrations) {
      this.integrations.set(integration.id, integration);
      this.integrationToPlugin.set(integration.id, plugin.id);
    }

    for (const entity of plugin.entities) {
      this.entityRegistry.register(entity);
      this.entityToPlugin.set(entity.type, plugin.id);
    }

    this.eventRegistry.registerEvents(plugin.id, plugin.events);
    if (plugin.listensTo.length > 0) {
      this.eventRegistry.registerListeners(plugin.id, plugin.listensTo);
    }
  }

  unregisterPlugin(id: string): boolean {
    const plugin = this.plugins.get(id);
    if (!plugin) return false;

    for (const integration of plugin.integrations) {
      this.integrations.delete(integration.id);
      this.integrationToPlugin.delete(integration.id);
    }
    for (const entity of plugin.entities) {
      this.entityRegistry.unregister(entity.type);
      this.entityToPlugin.delete(entity.type);
    }
    this.eventRegistry.unregister(id);

    this.plugins.delete(id);
    return true;
  }

  // ── Plugin Queries ───────────────────────────────────────────────────

  getPlugin(id: string): PluginDefinition | undefined {
    return this.plugins.get(id);
  }

  getPlugins(): PluginDefinition[] {
    return Array.from(this.plugins.values());
  }

  getPluginIds(): string[] {
    return Array.from(this.plugins.keys());
  }

  // ── Integration Queries ──────────────────────────────────────────────

  getIntegration(id: string): IntegrationDefinition | undefined {
    return this.integrations.get(id);
  }

  getAllIntegrations(): IntegrationDefinition[] {
    return Array.from(this.integrations.values());
  }

  getPluginForIntegration(integrationId: string): string | undefined {
    return this.integrationToPlugin.get(integrationId);
  }

  // ── Entity Queries (delegated to EntityRegistry) ────────────────────

  getEntity(type: string): EntityDefinition | undefined {
    return this.entityRegistry.getDefinition(type);
  }

  getEntityTypes(): string[] {
    return this.entityRegistry.getTypes();
  }

  getAllEntities(): EntityDefinition[] {
    return this.entityRegistry.getAllDefinitions();
  }

  getAllMatchers(): Array<{ entityType: string; definition: EntityDefinition; matcher: EntityMatcher }> {
    const result: Array<{ entityType: string; definition: EntityDefinition; matcher: EntityMatcher }> = [];
    for (const def of this.entityRegistry.getAllDefinitions()) {
      for (const matcher of def.matchers) {
        result.push({ entityType: def.type, definition: def, matcher });
      }
    }
    return result;
  }

  // ── Entity Handlers (delegated to EntityRegistry) ───────────────────

  registerEntityHandlers<TData = BaseEntity>(type: string, handlers: EntityHandlers<TData>): void {
    this.entityRegistry.registerHandlers(type, handlers);
  }

  getEntityHandlers(type: string): EntityHandlers | undefined {
    return this.entityRegistry.getHandlers(type);
  }

  // ── Entity Operations (delegated to EntityRegistry) ─────────────────

  async resolveEntity(uri: string, ctx: EntityContext): Promise<BaseEntity | null> {
    return this.entityRegistry.getByURI(uri, ctx);
  }

  async searchEntities(
    query: string,
    ctx: EntityContext,
    types?: string[],
    limit = 20,
  ): Promise<BaseEntity[]> {
    return this.entityRegistry.search(query, ctx, types, limit);
  }

  async resolveEntityContext(uri: string, ctx: EntityContext): Promise<string | null> {
    return this.entityRegistry.resolveContext(uri, ctx);
  }

  // ── Type Summaries (delegated to EntityRegistry) ────────────────────

  getEntityTypeSummaries(): EntityTypeSummary[] {
    return this.entityRegistry.getTypeSummaries();
  }

  // ── Canvas Queries ───────────────────────────────────────────────────

  getNavCanvases(): ResolvedNavSidebar[] {
    const result: ResolvedNavSidebar[] = [];
    for (const plugin of this.plugins.values()) {
      if (plugin.canvases['nav-sidebar']) {
        result.push({ pluginId: plugin.id, config: plugin.canvases['nav-sidebar'] });
      }
    }
    return result.sort((a, b) => (b.config.priority ?? 50) - (a.config.priority ?? 50));
  }

  getDrawerCanvas(pluginId: string): ResolvedDrawer | undefined {
    const plugin = this.plugins.get(pluginId);
    if (!plugin?.canvases.drawer) return undefined;
    return { pluginId, config: plugin.canvases.drawer };
  }

  getMenuBarItems(): ResolvedMenuBar[] {
    const result: ResolvedMenuBar[] = [];
    for (const plugin of this.plugins.values()) {
      if (plugin.canvases['menu-bar']) {
        result.push({ pluginId: plugin.id, config: plugin.canvases['menu-bar'] });
      }
    }
    return result.sort((a, b) => (b.config.priority ?? 50) - (a.config.priority ?? 50));
  }

  getFeedCanvases(): ResolvedFeedCanvas[] {
    const result: ResolvedFeedCanvas[] = [];
    for (const plugin of this.plugins.values()) {
      if (plugin.canvases.feed) {
        result.push({ pluginId: plugin.id, config: plugin.canvases.feed });
      }
    }
    return result.sort((a, b) => (b.config.priority ?? 50) - (a.config.priority ?? 50));
  }

  getEntityDrawer(type: string): ResolvedEntityDrawer | undefined {
    const def = this.entityRegistry.getDefinition(type);
    if (!def?.ui?.drawer) return undefined;
    const pluginId = this.entityToPlugin.get(type);
    if (!pluginId) return undefined;
    return {
      entityType: type,
      pluginId,
      component: def.ui.drawer,
      card: def.ui.card,
      feedCard: def.ui.feedCard,
      workstreamWidget: def.ui.workstreamWidget,
    };
  }

  getEntityDrawers(): ResolvedEntityDrawer[] {
    const result: ResolvedEntityDrawer[] = [];
    for (const def of this.entityRegistry.getAllDefinitions()) {
      if (def.ui?.drawer) {
        const pluginId = this.entityToPlugin.get(def.type);
        if (pluginId) {
          result.push({
            entityType: def.type,
            pluginId,
            component: def.ui.drawer,
            card: def.ui.card,
            feedCard: def.ui.feedCard,
            workstreamWidget: def.ui.workstreamWidget,
          });
        }
      }
    }
    return result;
  }

  getEntityFeedCard(type: string): ComponentType<EntityFeedCardProps> | undefined {
    const def = this.entityRegistry.getDefinition(type);
    return def?.ui?.feedCard;
  }

  getWorkstreamWidget(type: string): ResolvedWorkstreamWidget | undefined {
    const def = this.entityRegistry.getDefinition(type);
    if (!def?.ui?.workstreamWidget) return undefined;
    const pluginId = this.entityToPlugin.get(type);
    if (!pluginId) return undefined;
    return {
      entityType: type,
      pluginId,
      component: def.ui.workstreamWidget,
    };
  }

  // ── Event System ────────────────────────────────────────────────────────

  /** Set a logger for event emission diagnostics. */
  setLogger(logger: PluginLogger): void {
    this.logger = logger;
  }

  /**
   * Register a callback invoked after every successful event emission.
   * Useful for forwarding events to the renderer via IPC.
   * Returns an unsubscribe function.
   */
  onEmit(callback: EmitCallback): () => void {
    this.emitCallbacks.push(callback);
    return () => {
      const idx = this.emitCallbacks.indexOf(callback);
      if (idx !== -1) this.emitCallbacks.splice(idx, 1);
    };
  }

  /** Emit an event. Validates caller ownership and payload schema. */
  emit(callerPluginId: string, eventName: string, payload: unknown): void {
    const listenerCount = this.eventRegistry.emit(callerPluginId, eventName, payload, this.logger);
    for (const cb of this.emitCallbacks) {
      try {
        cb(eventName, payload, listenerCount);
      } catch (err) {
        this.logger?.error('onEmit callback error', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  /** Register a core event definition (not owned by a plugin). */
  registerCoreEvent(definition: EventDefinition): void {
    this.eventRegistry.registerCoreEvent(definition);
  }

  /** Register core event listeners (not owned by a plugin). */
  registerCoreListeners(declarations: readonly EventListenerDeclaration[]): void {
    this.eventRegistry.registerListeners(CORE_PLUGIN_ID, declarations);
  }

  /** Emit a core event. Shorthand for emit(CORE_PLUGIN_ID, ...). */
  emitCoreEvent(eventName: string, payload: unknown): void {
    const listenerCount = this.eventRegistry.emit(CORE_PLUGIN_ID, eventName, payload, this.logger);
    for (const cb of this.emitCallbacks) {
      try {
        cb(eventName, payload, listenerCount);
      } catch (err) {
        this.logger?.error('onEmit callback error', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  /** Get all registered fully-qualified event names. */
  getEventNames(): string[] {
    return this.eventRegistry.getAllEventNames();
  }

  /** Get the definition for a specific event by qualified name. */
  getEventDefinition(qualifiedName: string): EventDefinition | undefined {
    return this.eventRegistry.getEventDefinition(qualifiedName);
  }

  /** Get all event names owned by a plugin. */
  getPluginEvents(pluginId: string): string[] {
    return this.eventRegistry.getEventsForPlugin(pluginId);
  }

  // ── Event Summaries (serializable, for GraphQL / UI) ───────────────────

  /** Get a serializable summary of all registered events. */
  getEventSummaries(): EventSummary[] {
    const names = this.eventRegistry.getAllEventNames();
    return names.map((qualifiedName) => {
      const def = this.eventRegistry.getEventDefinition(qualifiedName);
      const owner = this.eventRegistry.getEventOwner(qualifiedName);
      const listenerCount = this.eventRegistry.getListenerCount(qualifiedName);
      return {
        qualifiedName,
        localName: def?.name ?? qualifiedName,
        description: def?.description ?? '',
        ownerPluginId: owner ?? 'unknown',
        listenerCount,
        payloadSchema: def ? describeZodSchema(def.schema) : null,
      };
    });
  }

  // ── Feed Items ─────────────────────────────────────────────────────────

  /** Wire the feed item adapter (called once at startup from main process). */
  setFeedItemAdapter(adapter: FeedItemAdapter): void {
    this.feedItemAdapter = adapter;
  }

  /** Add a dynamic feed item to a project's feed. */
  addFeedItem(
    projectId: string,
    widgetId: string,
    props?: Record<string, unknown>,
    source: string = CORE_PLUGIN_ID,
  ): { id: string } | null {
    if (!this.feedItemAdapter) {
      this.logger?.error('Feed item adapter not configured');
      return null;
    }
    return this.feedItemAdapter.add({ projectId, widgetId, props, source });
  }

  /** Remove a dynamic feed item by ID. */
  removeFeedItem(id: string): boolean {
    return this.feedItemAdapter?.remove(id) ?? false;
  }

  /** Enable a dynamic feed item. */
  enableFeedItem(id: string): boolean {
    return this.feedItemAdapter?.enable(id) ?? false;
  }

  /** Disable a dynamic feed item (hidden from feed but not deleted). */
  disableFeedItem(id: string): boolean {
    return this.feedItemAdapter?.disable(id) ?? false;
  }

  /** List dynamic feed items for a project. */
  getFeedItems(projectId: string): FeedItemInfo[] {
    return this.feedItemAdapter?.list(projectId) ?? [];
  }

  /** Find a feed item by widget and project for deduplication. */
  findFeedItem(
    widgetId: string,
    projectId: string,
    matchProps?: Record<string, unknown>,
  ): { id: string } | null {
    return this.feedItemAdapter?.findByWidgetAndProject(widgetId, projectId, matchProps) ?? null;
  }
}
