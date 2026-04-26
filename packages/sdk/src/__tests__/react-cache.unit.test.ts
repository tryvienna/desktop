/**
 * Tests for cache utility functions (invalidateEntity, updateCachedEntity).
 *
 * These are pure functions that operate on a mocked Apollo client,
 * so no React rendering is needed.
 */
import { describe, it, expect, vi } from 'vitest';
import { invalidateEntity, updateCachedEntity } from '../react/cache';

function createMockClient(identifyResult?: string) {
  const cache = {
    identify: vi.fn().mockReturnValue(identifyResult),
    evict: vi.fn(),
    gc: vi.fn(),
    modify: vi.fn(),
  };
  const client = {
    cache,
    refetchQueries: vi.fn().mockResolvedValue([]),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { client: client as any, cache };
}

describe('invalidateEntity', () => {
  it('evicts by id and refetches active queries', () => {
    const { client, cache } = createMockClient('Entity:123');

    invalidateEntity(client, 'Workstream', 'ws-1');

    expect(cache.identify).toHaveBeenCalledWith({ __typename: 'Workstream', id: 'ws-1' });
    expect(cache.evict).toHaveBeenCalledWith({ id: 'Entity:123' });
    expect(cache.gc).toHaveBeenCalled();
    expect(client.refetchQueries).toHaveBeenCalledWith({ include: 'active' });
  });

  it('evicts by keyFields for non-standard types like Entity', () => {
    const { client, cache } = createMockClient('Entity:{"uri":"@vienna//test/1"}');

    invalidateEntity(client, 'Entity', undefined, { uri: '@vienna//test/1' });

    expect(cache.identify).toHaveBeenCalledWith({
      __typename: 'Entity',
      uri: '@vienna//test/1',
    });
    expect(cache.evict).toHaveBeenCalledWith({ id: 'Entity:{"uri":"@vienna//test/1"}' });
  });

  it('skips evict when cache cannot identify the entity', () => {
    const { client, cache } = createMockClient();

    invalidateEntity(client, 'Entity', 'missing');

    expect(cache.evict).not.toHaveBeenCalled();
    expect(cache.gc).toHaveBeenCalled();
    expect(client.refetchQueries).toHaveBeenCalled();
  });

  it('refetches without evict when no id or keyFields given', () => {
    const { client, cache } = createMockClient('Entity:123');

    invalidateEntity(client, 'Entity');

    expect(cache.identify).not.toHaveBeenCalled();
    expect(cache.evict).not.toHaveBeenCalled();
    expect(cache.gc).toHaveBeenCalled();
    expect(client.refetchQueries).toHaveBeenCalledWith({ include: 'active' });
  });
});

describe('updateCachedEntity', () => {
  it('modifies cached fields by id', () => {
    const { client, cache } = createMockClient('Entity:123');

    updateCachedEntity(client, 'Workstream', 'ws-1', { status: 'active' });

    expect(cache.identify).toHaveBeenCalledWith({ __typename: 'Workstream', id: 'ws-1' });
    expect(cache.modify).toHaveBeenCalledWith({
      id: 'Entity:123',
      fields: expect.objectContaining({
        status: expect.any(Function),
      }),
    });

    // Verify the field modifier returns the new value
    const modifyCall = cache.modify.mock.calls[0]!;
    const fields = (modifyCall[0] as { fields: Record<string, () => unknown> }).fields;
    expect(fields['status']!()).toBe('active');
  });

  it('modifies cached fields by keyFields', () => {
    const { client, cache } = createMockClient('Entity:uri-key');

    updateCachedEntity(client, 'Entity', '', { metadata: { read: true } }, { uri: '@vienna//x/1' });

    expect(cache.identify).toHaveBeenCalledWith({
      __typename: 'Entity',
      uri: '@vienna//x/1',
    });
    expect(cache.modify).toHaveBeenCalled();
  });

  it('is a no-op when cache cannot identify the entity', () => {
    const { client, cache } = createMockClient();

    updateCachedEntity(client, 'Entity', 'missing', { status: 'gone' });

    expect(cache.modify).not.toHaveBeenCalled();
  });
});
