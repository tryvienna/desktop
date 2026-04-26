import { describe, expect, it } from 'vitest';

import { defineEntity } from '../define-entity';
import type { PluginIcon } from '../types';
import {
  MockSecureStorage,
  MockPluginLogger,
  MockOAuthAccessor,
  MockIntegrationAccessor,
  createMockEntityContext,
  createTestHarness,
} from '../testing';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const testIcon: PluginIcon = { svg: '<svg>test</svg>' };

const testDef = defineEntity({
  type: 'test_entity',
  name: 'Test',
  icon: testIcon,
  uri: ['id'],
});

// ---------------------------------------------------------------------------
// MockSecureStorage
// ---------------------------------------------------------------------------

describe('MockSecureStorage', () => {
  it('stores and retrieves values via set/get', async () => {
    const storage = new MockSecureStorage();

    await storage.set('token', 'abc123');
    const value = await storage.get('token');

    expect(value).toBe('abc123');
  });

  it('returns null for a key that does not exist', async () => {
    const storage = new MockSecureStorage();

    const value = await storage.get('missing');

    expect(value).toBeNull();
  });

  it('deletes a stored value', async () => {
    const storage = new MockSecureStorage();

    await storage.set('key', 'value');
    await storage.delete('key');

    expect(await storage.get('key')).toBeNull();
    expect(await storage.has('key')).toBe(false);
  });

  it('returns correct boolean from has()', async () => {
    const storage = new MockSecureStorage();

    expect(await storage.has('key')).toBe(false);

    await storage.set('key', 'value');
    expect(await storage.has('key')).toBe(true);
  });

  it('clears all entries and tracks size', async () => {
    const storage = new MockSecureStorage();

    await storage.set('a', '1');
    await storage.set('b', '2');
    await storage.set('c', '3');
    expect(storage.size).toBe(3);

    storage.clear();
    expect(storage.size).toBe(0);
    expect(await storage.get('a')).toBeNull();
  });

});

// ---------------------------------------------------------------------------
// MockPluginLogger
// ---------------------------------------------------------------------------

describe('MockPluginLogger', () => {
  it('logs entries at all levels', () => {
    const logger = new MockPluginLogger();

    logger.debug('debug msg');
    logger.info('info msg');
    logger.warn('warn msg');
    logger.error('error msg');

    expect(logger.entries).toHaveLength(4);
    expect(logger.entries[0]).toMatchObject({ level: 'debug', msg: 'debug msg' });
    expect(logger.entries[1]).toMatchObject({ level: 'info', msg: 'info msg' });
    expect(logger.entries[2]).toMatchObject({ level: 'warn', msg: 'warn msg' });
    expect(logger.entries[3]).toMatchObject({ level: 'error', msg: 'error msg' });
  });

  it('stores context objects alongside the message', () => {
    const logger = new MockPluginLogger();
    const ctx = { userId: 'u1', action: 'login' };

    logger.info('user action', ctx);

    expect(logger.entries).toHaveLength(1);
    expect(logger.entries[0]!.ctx).toEqual({ userId: 'u1', action: 'login' });
  });

  it('clears all entries', () => {
    const logger = new MockPluginLogger();

    logger.info('one');
    logger.warn('two');
    expect(logger.entries).toHaveLength(2);

    logger.clear();
    expect(logger.entries).toHaveLength(0);
  });

  it('child() returns a child logger that shares entries with parent', () => {
    const parent = new MockPluginLogger({ service: 'root' });
    const child = parent.child({ module: 'auth' });

    child.info('from child');
    parent.info('from parent');

    // Both logs should appear in the shared array
    expect(parent.entries).toHaveLength(2);
    expect(child.entries).toBe(parent.entries);

    // Child should merge bindings from parent + its own
    expect(parent.entries[0]!.ctx).toEqual({ service: 'root', module: 'auth' });
    expect(parent.entries[1]!.ctx).toEqual({ service: 'root' });
  });

  it('child() merges bindings from constructor', () => {
    const parent = new MockPluginLogger({ a: 1 });
    const child = parent.child({ b: 2 });

    child.debug('test');
    expect(child.entries[0]!.ctx).toEqual({ a: 1, b: 2 });
  });
});

// ---------------------------------------------------------------------------
// MockOAuthAccessor
// ---------------------------------------------------------------------------

describe('MockOAuthAccessor', () => {
  it('getAccessToken returns null when no token set', async () => {
    const oauth = new MockOAuthAccessor();
    expect(await oauth.getAccessToken('github')).toBeNull();
  });

  it('setToken + getAccessToken returns the access token', async () => {
    const oauth = new MockOAuthAccessor();
    oauth.setToken('github', { accessToken: 'abc', expiresAt: Date.now() + 3600_000 });

    expect(await oauth.getAccessToken('github')).toBe('abc');
  });

  it('getTokenData returns full token data', async () => {
    const oauth = new MockOAuthAccessor();
    const tokenData = { accessToken: 'tok', refreshToken: 'ref', expiresAt: 1234 };
    oauth.setToken('linear', tokenData);

    expect(await oauth.getTokenData('linear')).toEqual(tokenData);
  });

  it('getTokenData returns null for unknown provider', async () => {
    const oauth = new MockOAuthAccessor();
    expect(await oauth.getTokenData('nonexistent')).toBeNull();
  });

  it('isAuthenticated returns correct boolean', async () => {
    const oauth = new MockOAuthAccessor();
    expect(await oauth.isAuthenticated('github')).toBe(false);

    oauth.setToken('github', { accessToken: 'tok', expiresAt: 9999 });
    expect(await oauth.isAuthenticated('github')).toBe(true);
  });

  it('removeToken removes the token', async () => {
    const oauth = new MockOAuthAccessor();
    oauth.setToken('github', { accessToken: 'tok', expiresAt: 9999 });
    oauth.removeToken('github');

    expect(await oauth.isAuthenticated('github')).toBe(false);
    expect(await oauth.getAccessToken('github')).toBeNull();
  });

  it('clear removes all tokens', async () => {
    const oauth = new MockOAuthAccessor();
    oauth.setToken('a', { accessToken: 'x', expiresAt: 1 });
    oauth.setToken('b', { accessToken: 'y', expiresAt: 2 });
    oauth.clear();

    expect(await oauth.isAuthenticated('a')).toBe(false);
    expect(await oauth.isAuthenticated('b')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// MockIntegrationAccessor
// ---------------------------------------------------------------------------

describe('MockIntegrationAccessor', () => {
  it('defaults client to null', () => {
    const accessor = new MockIntegrationAccessor();
    expect(accessor.client).toBeNull();
  });

  it('stores a provided client', () => {
    const client = { api: true };
    const accessor = new MockIntegrationAccessor(client);
    expect(accessor.client).toBe(client);
  });

  it('clear() sets client to null', () => {
    const accessor = new MockIntegrationAccessor({ api: true });
    accessor.clear();
    expect(accessor.client).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// createMockEntityContext
// ---------------------------------------------------------------------------

describe('createMockEntityContext', () => {
  it('returns ctx, storage, and logger', () => {
    const { ctx, storage, logger } = createMockEntityContext();

    expect(storage).toBeInstanceOf(MockSecureStorage);
    expect(logger).toBeInstanceOf(MockPluginLogger);
    expect(ctx.storage).toBe(storage);
    expect(ctx.logger).toBe(logger);
    expect(ctx.integrations).toEqual({});
  });

  it('passes integrations into the context', () => {
    const accessor = new MockIntegrationAccessor({ myClient: true });
    const { ctx } = createMockEntityContext({ github: accessor });

    expect(ctx.integrations).toEqual({ github: accessor });
  });
});

// ---------------------------------------------------------------------------
// createTestHarness
// ---------------------------------------------------------------------------

describe('createTestHarness', () => {
  it('creates a harness with storage, logger, ctx, and definition', () => {
    const harness = createTestHarness(testDef);

    expect(harness.storage).toBeInstanceOf(MockSecureStorage);
    expect(harness.logger).toBeInstanceOf(MockPluginLogger);
    expect(harness.ctx).toBeDefined();
    expect(harness.definition).toBe(testDef);
  });

  it('delegates createURI and parseURI to the definition', () => {
    const harness = createTestHarness(testDef);

    const uri = harness.createURI({ id: 'xyz' });
    expect(uri).toBe('@vienna//test_entity/xyz');

    const parsed = harness.parseURI('@vienna//test_entity/xyz');
    expect(parsed).toEqual({ type: 'test_entity', id: { id: 'xyz' } });
  });
});
