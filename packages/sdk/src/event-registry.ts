/**
 * EventRegistry — Internal registry for event definitions and listeners.
 *
 * Manages:
 * - Registered event definitions (with zod schemas) keyed by fully-qualified name
 * - Ownership tracking (which plugin owns which event)
 * - Listener mappings (which handlers listen to which events)
 * - Context factory: handlers receive an EventHandlerContext with emit + logger
 * - emit() — validates ownership, validates payload via zod, dispatches fire-and-forget
 *
 * Used internally by PluginSystem, similar to how EntityRegistry is used.
 */

import type { EventDefinition, EventListenerDeclaration, EventHandlerContext } from './define-event';
import type { PluginLogger } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Internal types
// ─────────────────────────────────────────────────────────────────────────────

interface RegisteredEvent {
  readonly definition: EventDefinition;
  readonly qualifiedName: string;
  readonly ownerPluginId: string;
}

interface RegisteredListener {
  readonly pluginId: string;
  readonly eventName: string;
  readonly handler: (payload: unknown, ctx: EventHandlerContext) => void;
}

/**
 * Factory that builds an EventHandlerContext for a given listener plugin.
 * Provided by PluginSystem so the registry stays decoupled from plugin internals.
 */
export type EventHandlerContextFactory = (listenerPluginId: string) => EventHandlerContext;

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const CORE_PLUGIN_ID = 'core';

/** Noop logger used when no context factory is configured. */
const NOOP_LOGGER: PluginLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => NOOP_LOGGER,
};

/** Fallback context when no factory is set. */
const NOOP_CONTEXT: EventHandlerContext = {
  emit: () => {
    throw new Error('emit() unavailable: no context factory configured');
  },
  logger: NOOP_LOGGER,
};

// ─────────────────────────────────────────────────────────────────────────────
// EventRegistry
// ─────────────────────────────────────────────────────────────────────────────

export class EventRegistry {
  /** Fully-qualified event name → registered event. */
  private events = new Map<string, RegisteredEvent>();
  /** Fully-qualified event name → listeners. */
  private listeners = new Map<string, RegisteredListener[]>();
  /** Plugin ID → set of fully-qualified event names it owns. */
  private pluginEvents = new Map<string, Set<string>>();
  /** Plugin ID → list of listener registrations (for cleanup on unregister). */
  private pluginListeners = new Map<string, RegisteredListener[]>();
  /** Factory that builds handler context per listener plugin. */
  private contextFactory?: EventHandlerContextFactory;

  /** Set the factory that builds EventHandlerContext for listener handlers. */
  setContextFactory(factory: EventHandlerContextFactory): void {
    this.contextFactory = factory;
  }

  // ── Registration ────────────────────────────────────────────────────────

  /**
   * Register event definitions from a plugin.
   * Auto-prefixes each event name with the plugin ID.
   */
  registerEvents(pluginId: string, definitions: readonly EventDefinition[]): void {
    for (const def of definitions) {
      const qualifiedName = `${pluginId}.${def.name}`;
      const existing = this.events.get(qualifiedName);

      if (existing) {
        throw new Error(
          `Event '${qualifiedName}' is already registered by plugin '${existing.ownerPluginId}'`,
        );
      }

      this.events.set(qualifiedName, {
        definition: def,
        qualifiedName,
        ownerPluginId: pluginId,
      });

      let owned = this.pluginEvents.get(pluginId);
      if (!owned) {
        owned = new Set();
        this.pluginEvents.set(pluginId, owned);
      }
      owned.add(qualifiedName);
    }
  }

  /**
   * Register listeners from a plugin.
   * Listeners reference fully-qualified event names.
   * Listeners for not-yet-registered events are stored as dormant — they
   * activate when the source plugin loads (avoids load-order dependencies).
   */
  registerListeners(pluginId: string, declarations: readonly EventListenerDeclaration[]): void {
    for (const decl of declarations) {
      const listener: RegisteredListener = {
        pluginId,
        eventName: decl.event,
        handler: decl.handler,
      };

      // Add to event → listeners map
      let eventListeners = this.listeners.get(decl.event);
      if (!eventListeners) {
        eventListeners = [];
        this.listeners.set(decl.event, eventListeners);
      }
      eventListeners.push(listener);

      // Track for cleanup on unregister
      let pluginListenerList = this.pluginListeners.get(pluginId);
      if (!pluginListenerList) {
        pluginListenerList = [];
        this.pluginListeners.set(pluginId, pluginListenerList);
      }
      pluginListenerList.push(listener);
    }
  }

  /**
   * Register a core event (not owned by any plugin).
   * Uses CORE_PLUGIN_ID as the owner.
   */
  registerCoreEvent(definition: EventDefinition): void {
    this.registerEvents(CORE_PLUGIN_ID, [definition]);
  }

  // ── Unregistration ──────────────────────────────────────────────────────

  /**
   * Unregister all events and listeners for a plugin.
   * Owned events are removed. Listeners from other plugins for those events
   * remain as dormant (they reactivate if the event is re-registered).
   */
  unregister(pluginId: string): void {
    // Remove owned events
    const owned = this.pluginEvents.get(pluginId);
    if (owned) {
      for (const name of owned) {
        this.events.delete(name);
      }
      this.pluginEvents.delete(pluginId);
    }

    // Remove this plugin's listener registrations
    const pluginListenerList = this.pluginListeners.get(pluginId);
    if (pluginListenerList) {
      for (const listener of pluginListenerList) {
        const eventListeners = this.listeners.get(listener.eventName);
        if (eventListeners) {
          const idx = eventListeners.indexOf(listener);
          if (idx !== -1) eventListeners.splice(idx, 1);
          if (eventListeners.length === 0) this.listeners.delete(listener.eventName);
        }
      }
      this.pluginListeners.delete(pluginId);
    }
  }

  // ── Emission ────────────────────────────────────────────────────────────

  /**
   * Emit an event. Validates:
   * 1. Event exists in registry
   * 2. Caller is the owning plugin
   * 3. Payload matches the zod schema
   *
   * Then dispatches to all listeners fire-and-forget with error isolation.
   * Returns the number of listeners notified.
   */
  emit(callerPluginId: string, eventName: string, payload: unknown, logger?: PluginLogger): number {
    // 1. Validate event exists
    const registered = this.events.get(eventName);
    if (!registered) {
      const msg = `Cannot emit unknown event '${eventName}'`;
      logger?.error(msg, { callerPluginId });
      throw new Error(msg);
    }

    // 2. Validate ownership
    if (registered.ownerPluginId !== callerPluginId) {
      const msg = `Plugin '${callerPluginId}' cannot emit event '${eventName}' owned by '${registered.ownerPluginId}'`;
      logger?.error(msg);
      throw new Error(msg);
    }

    // 3. Validate payload against schema
    const result = registered.definition.schema.safeParse(payload);
    if (!result.success) {
      const issues = result.error.issues.map((i) => i.message).join(', ');
      const msg = `Invalid payload for event '${eventName}': ${issues}`;
      logger?.error(msg, { payload: payload as Record<string, unknown> });
      throw new Error(msg);
    }

    const validatedPayload: unknown = result.data;

    // 4. Dispatch to listeners (fire-and-forget)
    const eventListeners = this.listeners.get(eventName);
    if (!eventListeners?.length) {
      logger?.debug(`Event '${eventName}' emitted with no listeners`);
      return 0;
    }

    for (const listener of eventListeners) {
      try {
        const ctx = this.contextFactory?.(listener.pluginId) ?? NOOP_CONTEXT;
        listener.handler(validatedPayload, ctx);
      } catch (err) {
        logger?.error(`Event handler error in plugin '${listener.pluginId}' for '${eventName}'`, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return eventListeners.length;
  }

  // ── Queries ─────────────────────────────────────────────────────────────

  hasEvent(qualifiedName: string): boolean {
    return this.events.has(qualifiedName);
  }

  getEventDefinition(qualifiedName: string): EventDefinition | undefined {
    return this.events.get(qualifiedName)?.definition;
  }

  getEventOwner(qualifiedName: string): string | undefined {
    return this.events.get(qualifiedName)?.ownerPluginId;
  }

  getAllEventNames(): string[] {
    return Array.from(this.events.keys());
  }

  getEventsForPlugin(pluginId: string): string[] {
    const owned = this.pluginEvents.get(pluginId);
    return owned ? Array.from(owned) : [];
  }

  getListenerCount(eventName: string): number {
    return this.listeners.get(eventName)?.length ?? 0;
  }
}
