/**
 * Testing Utilities — Mocks and test harness for entity definitions.
 *
 * Provides in-memory implementations of SecureStorage, PluginLogger,
 * OAuthAccessor, IntegrationAccessor, and a structured test harness.
 */

import type {
  SecureStorage,
  PluginLogger,
  OAuthAccessor,
  OAuthTokenData,
  IntegrationAccessor,
  EntityContext,
} from './types';
import type { EntityDefinition } from './define-entity';

// ─────────────────────────────────────────────────────────────────────────────
// Mock Secure Storage
// ─────────────────────────────────────────────────────────────────────────────

export class MockSecureStorage implements SecureStorage {
  private store = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async has(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Logger
// ─────────────────────────────────────────────────────────────────────────────

export interface LogEntry {
  level: string;
  msg: string;
  ctx?: Record<string, unknown>;
}

export class MockPluginLogger implements PluginLogger {
  readonly entries: LogEntry[] = [];
  private readonly bindings: Record<string, unknown>;

  constructor(bindings: Record<string, unknown> = {}) {
    this.bindings = bindings;
  }

  debug(msg: string, ctx?: Record<string, unknown>): void {
    this.entries.push({ level: 'debug', msg, ctx: { ...this.bindings, ...ctx } });
  }

  info(msg: string, ctx?: Record<string, unknown>): void {
    this.entries.push({ level: 'info', msg, ctx: { ...this.bindings, ...ctx } });
  }

  warn(msg: string, ctx?: Record<string, unknown>): void {
    this.entries.push({ level: 'warn', msg, ctx: { ...this.bindings, ...ctx } });
  }

  error(msg: string, ctx?: Record<string, unknown>): void {
    this.entries.push({ level: 'error', msg, ctx: { ...this.bindings, ...ctx } });
  }

  child(childBindings: Record<string, unknown>): MockPluginLogger {
    const child = new MockPluginLogger({ ...this.bindings, ...childBindings });
    // Share entries array so parent sees all child logs
    (child as { entries: LogEntry[] }).entries = this.entries;
    return child;
  }

  clear(): void {
    this.entries.length = 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock OAuth Accessor
// ─────────────────────────────────────────────────────────────────────────────

export class MockOAuthAccessor implements OAuthAccessor {
  private tokens = new Map<string, OAuthTokenData>();

  async getAccessToken(providerId: string): Promise<string | null> {
    return this.tokens.get(providerId)?.accessToken ?? null;
  }

  async getTokenData(providerId: string): Promise<OAuthTokenData | null> {
    return this.tokens.get(providerId) ?? null;
  }

  async isAuthenticated(providerId: string): Promise<boolean> {
    return this.tokens.has(providerId);
  }

  setToken(providerId: string, token: OAuthTokenData): void {
    this.tokens.set(providerId, token);
  }

  removeToken(providerId: string): void {
    this.tokens.delete(providerId);
  }

  clear(): void {
    this.tokens.clear();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Integration Accessor
// ─────────────────────────────────────────────────────────────────────────────

export class MockIntegrationAccessor<TClient = unknown> implements IntegrationAccessor<TClient> {
  client: TClient | null;

  constructor(client: TClient | null = null) {
    this.client = client;
  }

  clear(): void {
    this.client = null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Context Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a mock EntityContext for testing.
 * Pass integration accessors keyed by local name matching the entity's integrations config.
 */
export function createMockEntityContext(
  integrations: Record<string, IntegrationAccessor> = {},
): {
  ctx: EntityContext;
  storage: MockSecureStorage;
  logger: MockPluginLogger;
} {
  const storage = new MockSecureStorage();
  const logger = new MockPluginLogger();
  return {
    ctx: { storage, logger, integrations } as EntityContext,
    storage,
    logger,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Harness
// ─────────────────────────────────────────────────────────────────────────────

export interface EntityTestHarness {
  storage: MockSecureStorage;
  logger: MockPluginLogger;
  ctx: EntityContext;
  definition: EntityDefinition;
  createURI(id: Record<string, string>): string;
  parseURI(uri: string): { type: string; id: Record<string, string> };
}

/**
 * Create a test harness for an entity definition.
 * Provides mock storage, logger, and context for testing.
 *
 * Since EntityDefinition is metadata-only, the harness just provides
 * the mock context and delegates createURI/parseURI.
 */
export function createTestHarness(
  definition: EntityDefinition,
  integrations: Record<string, IntegrationAccessor> = {},
): EntityTestHarness {
  const { ctx, storage, logger } = createMockEntityContext(integrations);

  return {
    storage,
    logger,
    ctx,
    definition,

    createURI(id) {
      return definition.createURI(id);
    },

    parseURI(uri) {
      return definition.parseURI(uri);
    },
  };
}

