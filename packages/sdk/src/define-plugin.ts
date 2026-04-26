/**
 * definePlugin() — Factory for creating validated, immutable plugin definitions.
 *
 * Plugins are the top-level unit of extensibility in Vienna. Each plugin
 * bundles integrations, entities, and UI canvases into a single deployable unit.
 */

import type { PluginIcon } from './types';
import type { IntegrationDefinition } from './types';
import type { EntityDefinition } from './define-entity';
import type { EventDefinition, EventListenerDeclaration } from './define-event';
import type { PluginCanvases } from './canvas';
import { EntityTypeSchema } from './schemas';
import { EntityDefinitionError } from './errors';
import { isEntityDefinition } from './define-entity';
import { isEventDefinition } from './define-event';
import { isIntegrationDefinition } from './define-integration';

// ─────────────────────────────────────────────────────────────────────────────
// Config (input to definePlugin)
// ─────────────────────────────────────────────────────────────────────────────

export interface PluginConfig {
  /** Unique plugin identifier (lowercase alphanumeric + underscores) */
  id: string;
  /** Human-readable display name */
  name: string;
  /** Static icon asset */
  icon: PluginIcon;
  /** Description of what this plugin does */
  description?: string;

  /** Integration definitions provided by this plugin */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  integrations?: IntegrationDefinition<any>[];
  /** Entity definitions provided by this plugin */
  entities?: EntityDefinition[];

  /** UI canvas contributions */
  canvases?: PluginCanvases;

  /** Event definitions this plugin can emit. Names are auto-prefixed with plugin ID. */
  events?: EventDefinition[];

  /** Events this plugin listens to (from other plugins or core). */
  listensTo?: EventListenerDeclaration[];

  /**
   * Domains the plugin is allowed to fetch via `hostApi.fetch()`.
   * Only exact hostname matches are permitted (e.g. `"api.open-meteo.com"`).
   */
  allowedDomains?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Plugin Definition (output of definePlugin)
// ─────────────────────────────────────────────────────────────────────────────

export interface PluginDefinition {
  readonly __brand: 'PluginDefinition';
  readonly id: string;
  readonly name: string;
  readonly icon: PluginIcon;
  readonly description?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly integrations: readonly IntegrationDefinition<any>[];
  readonly entities: readonly EntityDefinition[];
  readonly canvases: Readonly<PluginCanvases>;
  readonly events: readonly EventDefinition[];
  readonly listensTo: readonly EventListenerDeclaration[];
  readonly allowedDomains: readonly string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory
// ─────────────────────────────────────────────────────────────────────────────

export function definePlugin(config: PluginConfig): PluginDefinition {
  // Validate plugin ID
  const idResult = EntityTypeSchema.safeParse(config.id);
  if (!idResult.success) {
    throw new EntityDefinitionError(
      config.id,
      'id',
      `Invalid plugin id '${config.id}': ${idResult.error.issues[0]?.message}`,
    );
  }

  if (!config.name?.trim()) {
    throw new EntityDefinitionError(config.id, 'name', 'name is required');
  }

  // Validate integrations are IntegrationDefinition instances
  const integrations = config.integrations ?? [];
  const integrationIds = new Set<string>();
  for (const integration of integrations) {
    if (!isIntegrationDefinition(integration)) {
      throw new EntityDefinitionError(
        config.id,
        'integrations',
        'All integrations must be created with defineIntegration()',
      );
    }
    if (integrationIds.has(integration.id)) {
      throw new EntityDefinitionError(
        config.id,
        'integrations',
        `Duplicate integration id '${integration.id}'`,
      );
    }
    integrationIds.add(integration.id);
  }

  // Validate entities are EntityDefinition instances
  const entities = config.entities ?? [];
  const entityTypes = new Set<string>();
  for (const entity of entities) {
    if (!isEntityDefinition(entity)) {
      throw new EntityDefinitionError(
        config.id,
        'entities',
        'All entities must be created with defineEntity()',
      );
    }
    if (entityTypes.has(entity.type)) {
      throw new EntityDefinitionError(
        config.id,
        'entities',
        `Duplicate entity type '${entity.type}'`,
      );
    }
    entityTypes.add(entity.type);
  }

  // Validate canvases
  const canvases = config.canvases ?? {};

  if (canvases['nav-sidebar']) {
    const nav = canvases['nav-sidebar'];
    if (typeof nav.component !== 'function') {
      throw new EntityDefinitionError(config.id, 'canvases', 'nav-sidebar.component must be a React component');
    }
    if (!nav.label?.trim()) {
      throw new EntityDefinitionError(config.id, 'canvases', 'nav-sidebar.label is required');
    }
  }

  if (canvases.drawer) {
    const drawer = canvases.drawer;
    if (typeof drawer.component !== 'function') {
      throw new EntityDefinitionError(config.id, 'canvases', 'drawer.component must be a React component');
    }
    if (!drawer.label?.trim()) {
      throw new EntityDefinitionError(config.id, 'canvases', 'drawer.label is required');
    }
    // Drawer requires nav-sidebar or menu-bar to have a way to open it
    if (!canvases['nav-sidebar'] && !canvases['menu-bar']) {
      throw new EntityDefinitionError(
        config.id,
        'canvases',
        'drawer requires nav-sidebar or menu-bar canvas to provide an entry point',
      );
    }
  }

  if (canvases['menu-bar']) {
    const menuBar = canvases['menu-bar'];
    if (typeof menuBar.icon !== 'function') {
      throw new EntityDefinitionError(config.id, 'canvases', 'menu-bar.icon must be a React component');
    }
    if (typeof menuBar.component !== 'function') {
      throw new EntityDefinitionError(config.id, 'canvases', 'menu-bar.component must be a React component');
    }
    if (!menuBar.label?.trim()) {
      throw new EntityDefinitionError(config.id, 'canvases', 'menu-bar.label is required');
    }
  }

  if (canvases.feed) {
    const feed = canvases.feed;
    if (typeof feed.component !== 'function') {
      throw new EntityDefinitionError(config.id, 'canvases', 'feed.component must be a React component');
    }
    if (!feed.label?.trim()) {
      throw new EntityDefinitionError(config.id, 'canvases', 'feed.label is required');
    }
  }

  // Validate events are EventDefinition instances
  const events = config.events ?? [];
  const eventNames = new Set<string>();
  for (const event of events) {
    if (!isEventDefinition(event)) {
      throw new EntityDefinitionError(
        config.id,
        'events',
        'All events must be created with defineEvent()',
      );
    }
    if (eventNames.has(event.name)) {
      throw new EntityDefinitionError(
        config.id,
        'events',
        `Duplicate event name '${event.name}'`,
      );
    }
    eventNames.add(event.name);
  }

  // Validate listensTo declarations
  const listensTo = config.listensTo ?? [];
  for (const listener of listensTo) {
    if (!listener.event?.trim()) {
      throw new EntityDefinitionError(config.id, 'listensTo', 'listener event name is required');
    }
    if (typeof listener.handler !== 'function') {
      throw new EntityDefinitionError(config.id, 'listensTo', 'listener handler must be a function');
    }
  }

  const definition: PluginDefinition = {
    __brand: 'PluginDefinition' as const,
    id: config.id,
    name: config.name,
    icon: config.icon,
    description: config.description,
    integrations: Object.freeze([...integrations]),
    entities: Object.freeze([...entities]),
    canvases: Object.freeze({ ...canvases }),
    events: Object.freeze([...events]),
    listensTo: Object.freeze([...listensTo]),
    allowedDomains: Object.freeze([...(config.allowedDomains ?? [])]),
  };

  return Object.freeze(definition);
}

/** Type guard for PluginDefinition */
export function isPluginDefinition(value: unknown): value is PluginDefinition {
  if (!value || typeof value !== 'object') return false;
  const def = value as Record<string, unknown>;
  return def['__brand'] === 'PluginDefinition';
}
