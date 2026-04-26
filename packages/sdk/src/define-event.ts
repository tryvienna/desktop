/**
 * defineEvent() — Factory for creating validated, immutable event definitions.
 *
 * Events are metadata declarations that describe what payloads a plugin can emit.
 * The schema is used for runtime validation at emit time.
 *
 * Usage:
 * ```ts
 * export const prReferencedEvent = defineEvent({
 *   name: 'pr.referenced',
 *   description: 'Emitted when a GitHub PR is mentioned in conversation',
 *   schema: z.object({
 *     workstreamId: z.string(),
 *     entityUri: z.string(),
 *     prNumber: z.number(),
 *   }),
 * });
 * ```
 */

import { z } from 'zod';
import { EntityDefinitionError } from './errors';
import type { PluginLogger } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

/** Event name: lowercase alphanumeric with dots, underscores, or hyphens. Starts with a letter. */
export const EventNameSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(
    /^[a-z][a-z0-9._-]*$/,
    'Must be lowercase alphanumeric with dots, underscores, or hyphens, starting with a letter',
  );

// ─────────────────────────────────────────────────────────────────────────────
// Handler Context
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Context provided to event listener handlers at dispatch time.
 * Gives handlers access to plugin-scoped capabilities: emitting events
 * the handler's plugin owns, and a logger scoped to that plugin.
 */
export interface EventHandlerContext {
  /** Emit an event owned by the listener's plugin (local name, auto-prefixed). */
  emit(eventName: string, payload: unknown): void;
  /** Plugin-scoped logger. */
  logger: PluginLogger;
}

// ─────────────────────────────────────────────────────────────────────────────
// Config (input to defineEvent)
// ─────────────────────────────────────────────────────────────────────────────

export interface EventDefinitionConfig {
  /**
   * Event name (local to the plugin). Will be auto-prefixed with the plugin ID
   * when registered. E.g., 'pr.referenced' → 'github.pr.referenced'.
   */
  name: string;
  /** Human-readable description of when this event fires. */
  description: string;
  /** Zod schema for runtime payload validation at emit time. */
  schema: z.ZodType;
}

// ─────────────────────────────────────────────────────────────────────────────
// EventDefinition (output of defineEvent)
// ─────────────────────────────────────────────────────────────────────────────

export interface EventDefinition {
  readonly __brand: 'EventDefinition';
  /** Local event name (without plugin prefix). */
  readonly name: string;
  readonly description: string;
  /** Zod schema for payload validation. */
  readonly schema: z.ZodType;
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory
// ─────────────────────────────────────────────────────────────────────────────

export function defineEvent(config: EventDefinitionConfig): EventDefinition {
  const nameResult = EventNameSchema.safeParse(config.name);
  if (!nameResult.success) {
    throw new EntityDefinitionError(
      config.name,
      'name',
      `Invalid event name '${config.name}': ${nameResult.error.issues[0]?.message}`,
    );
  }

  if (!config.description?.trim()) {
    throw new EntityDefinitionError(config.name, 'description', 'description is required');
  }

  if (!config.schema || !(config.schema instanceof z.ZodType)) {
    throw new EntityDefinitionError(config.name, 'schema', 'schema must be a Zod schema');
  }

  const definition: EventDefinition = {
    __brand: 'EventDefinition' as const,
    name: config.name,
    description: config.description,
    schema: config.schema,
  };

  return Object.freeze(definition);
}

/** Type guard for EventDefinition */
export function isEventDefinition(value: unknown): value is EventDefinition {
  if (!value || typeof value !== 'object') return false;
  const def = value as Record<string, unknown>;
  return def['__brand'] === 'EventDefinition';
}

// ─────────────────────────────────────────────────────────────────────────────
// Listener Declaration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Static declaration of an event listener, provided in definePlugin().
 * The `event` is the fully-qualified event name (e.g., 'core.reference.detected').
 */
export interface EventListenerDeclaration {
  /** Fully-qualified event name to listen for (e.g., 'github.pr.referenced'). */
  event: string;
  /** Handler function. Receives validated payload and a plugin-scoped context. */
  handler: (payload: unknown, ctx: EventHandlerContext) => void;
}
