/**
 * defineIntegration() — Factory for creating validated, immutable integration definitions.
 *
 * Integrations define external API connections with auth, client creation,
 * and typed methods. They can optionally extend the GraphQL schema.
 */

import type { PluginIcon, OAuthConfig, AuthContext, IntegrationDefinition } from './types';
import type { SchemaBuilder } from './schema-builder';
import { EntityTypeSchema } from './schemas';
import { EntityDefinitionError } from './errors';

// ─────────────────────────────────────────────────────────────────────────────
// Config (input to defineIntegration)
// ─────────────────────────────────────────────────────────────────────────────

export interface IntegrationConfig<TClient> {
  /** Unique integration ID (e.g., 'github', 'linear') */
  id: string;
  /** Human-readable display name */
  name: string;
  /** Static icon asset */
  icon: PluginIcon;
  /** Description of what this integration provides */
  description?: string;

  /** OAuth configuration for external authentication */
  oauth?: OAuthConfig;
  /** Keys stored in secure storage (e.g., ['api_key', 'personal_access_token']) */
  credentials?: string[];

  /** Create an API client from auth context. Returns null if auth not configured. */
  createClient: (ctx: AuthContext) => Promise<TClient | null>;

  /** Optional GraphQL schema extension. Called with the typed SchemaBuilder. */
  schema?: (builder: SchemaBuilder) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-export types from types.ts
// ─────────────────────────────────────────────────────────────────────────────

export type { IntegrationDefinition, IntegrationAccessor, ClientOf } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Factory
// ─────────────────────────────────────────────────────────────────────────────

export function defineIntegration<TClient>(
  config: IntegrationConfig<TClient>,
): IntegrationDefinition<TClient> {
  const idResult = EntityTypeSchema.safeParse(config.id);
  if (!idResult.success) {
    throw new EntityDefinitionError(
      config.id,
      'id',
      `Invalid integration id '${config.id}': ${idResult.error.issues[0]?.message}`,
    );
  }

  if (!config.name?.trim()) {
    throw new EntityDefinitionError(config.id, 'name', 'name is required');
  }

  const definition: IntegrationDefinition<TClient> = {
    __brand: 'IntegrationDefinition' as const,
    id: config.id,
    name: config.name,
    icon: config.icon,
    description: config.description,
    oauth: config.oauth,
    credentials: config.credentials ? Object.freeze([...config.credentials]) : undefined,
    createClient: config.createClient,
    schema: config.schema,
  };

  return Object.freeze(definition);
}

/** Type guard for IntegrationDefinition */
export function isIntegrationDefinition(value: unknown): value is IntegrationDefinition {
  if (!value || typeof value !== 'object') return false;
  const def = value as Record<string, unknown>;
  return def['__brand'] === 'IntegrationDefinition';
}
