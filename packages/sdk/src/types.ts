/**
 * Core Entity SDK Types
 *
 * Runtime interfaces for integrations, entities, and plugins.
 * Zod-validated types live in schemas.ts; this file covers
 * async/callback interfaces that can't be expressed as schemas.
 */

import type { SchemaBuilder } from './schema-builder';

// ─────────────────────────────────────────────────────────────────────────────
// Icon
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Static icon asset for plugins, integrations, and entities.
 * Plugins ship a file; the host renders it via `<img>` or inline SVG.
 */
export type PluginIcon =
  | { svg: string }       // Inline SVG markup string
  | { png: string }       // Base64-encoded PNG data
  | { path: string };     // Relative path to icon file in plugin package

// ─────────────────────────────────────────────────────────────────────────────
// Secure Storage
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scoped secure storage interface for integrations.
 * Provides encrypted key-value storage scoped to a specific integration.
 * Structurally identical to ScopedStorage from @vienna/secure-storage.
 */
export interface SecureStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Logger
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Structured logger interface provided to integrations and entities at runtime.
 *
 * Every plugin gets a logger pre-scoped with `{ plugin: pluginId }`.
 * Integration and entity handlers get further scoped loggers
 * (e.g., `{ plugin: 'github', integration: 'github' }` or
 * `{ plugin: 'github', entity: 'github_pr' }`).
 *
 * Call `child()` to create sub-loggers with additional bindings.
 */
export interface PluginLogger {
  debug(msg: string, ctx?: Record<string, unknown>): void;
  info(msg: string, ctx?: Record<string, unknown>): void;
  warn(msg: string, ctx?: Record<string, unknown>): void;
  error(msg: string, ctx?: Record<string, unknown>): void;
  /** Create a child logger with additional bindings merged into every log entry. */
  child(bindings: Record<string, unknown>): PluginLogger;
}

// ─────────────────────────────────────────────────────────────────────────────
// OAuth
// ─────────────────────────────────────────────────────────────────────────────

/** OAuth configuration for an integration. */
export interface OAuthConfig {
  providers: OAuthProviderConfig[];
}

export interface OAuthProviderConfig {
  providerId: string;
  displayName: string;
  icon?: string;
  flow: OAuthFlowConfig;
  refreshBufferSeconds?: number;
  required?: boolean;
}

export type OAuthFlowConfig =
  | OAuthAuthorizationCodeConfig
  | OAuthDeviceCodeConfig
  | OAuthManualCodeConfig;

export interface OAuthAuthorizationCodeConfig {
  grantType: 'authorization_code';
  clientId: string;
  clientSecret?: string;
  clientIdKey?: string;
  clientSecretKey?: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  pkce?: { enabled: boolean; method?: 'S256' | 'plain' };
  extraAuthParams?: Record<string, string>;
  refreshUrl?: string;
  redirectPath?: string;
  redirectPort?: number;
  scopeSeparator?: string;
}

export interface OAuthDeviceCodeConfig {
  grantType: 'device_code';
  clientId: string;
  clientSecret?: string;
  clientIdKey?: string;
  clientSecretKey?: string;
  deviceAuthorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  pollingInterval?: number;
  refreshUrl?: string;
}

export interface OAuthManualCodeConfig {
  grantType: 'manual_code';
  clientId: string;
  clientSecret?: string;
  clientIdKey?: string;
  clientSecretKey?: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  instructions: string;
  refreshUrl?: string;
}

/** Token data stored after successful OAuth flow. */
export interface OAuthTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scopes?: string[];
  tokenType?: string;
  obtainedAt?: number;
  extra?: Record<string, unknown>;
}

/** OAuth accessor provided to integration's createClient. */
export interface OAuthAccessor {
  getAccessToken(providerId: string): Promise<string | null>;
  getTokenData(providerId: string): Promise<OAuthTokenData | null>;
  isAuthenticated(providerId: string): Promise<boolean>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth Context (provided to createClient and method handlers)
// ─────────────────────────────────────────────────────────────────────────────

/** Context injected into integration's createClient and method handlers. */
export interface AuthContext {
  storage: SecureStorage;
  logger: PluginLogger;
  oauth?: OAuthAccessor;
}

// ─────────────────────────────────────────────────────────────────────────────
// Integration Types
// ─────────────────────────────────────────────────────────────────────────────

/** Infer the client type from an IntegrationDefinition. */
export type ClientOf<T> = T extends IntegrationDefinition<infer C> ? C : never;

// Forward reference — full interface defined in define-integration.ts
export interface IntegrationDefinition<_TClient = unknown> {
  readonly __brand: 'IntegrationDefinition';
  readonly id: string;
  readonly name: string;
  readonly icon: PluginIcon;
  readonly description?: string;
  readonly oauth?: OAuthConfig;
  readonly credentials?: readonly string[];
  readonly createClient: (ctx: AuthContext) => Promise<_TClient | null>;
  readonly schema?: (builder: SchemaBuilder) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Entity Context (provided to resolve, search, action handlers)
// ─────────────────────────────────────────────────────────────────────────────

/** Accessor for a single integration's client and methods within an entity context. */
export interface IntegrationAccessor<TClient = unknown> {
  readonly client: TClient | null;
}

/**
 * Context provided to entity resolve/search/action handlers.
 * Integration clients are pre-resolved and typed via the integrations map.
 */
export type EntityContext<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TIntegrations extends Record<string, IntegrationDefinition<any>> = Record<string, IntegrationDefinition<any>>,
> = {
  storage: SecureStorage;
  logger: PluginLogger;
  integrations: {
    [K in keyof TIntegrations]: IntegrationAccessor<ClientOf<TIntegrations[K]>>;
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Entity Action Types
// ─────────────────────────────────────────────────────────────────────────────

/** Search query passed to entity search handlers. */
export interface SearchQuery {
  query?: string;
  limit?: number;
  offset?: number;
  filters?: Record<string, unknown>;
}

// Re-export schema-derived types for convenience
export type {
  BaseEntity,
  EntityType,
  EntityURIPath,
  EntityURIErrorCode,
  EntitySource,
  EntityDisplayColors,
  FilterDescription,
  OutputField,
  EntityDisplayMetadata,
  PaletteFilterValueSpec,
  PaletteFilterSpec,
  EntityCacheConfig,
  EntityTypeSummary,
} from './schemas';
