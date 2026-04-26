import { describe, expect, it, beforeEach, vi } from 'vitest';

import { defineEntity } from '../define-entity';
import { defineIntegration } from '../define-integration';
import { EntityRegistry, IntegrationRegistry } from '../registry';
import type { EntityHandlers } from '../registry';
import type { PluginIcon, EntityContext } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const testIcon: PluginIcon = { svg: '<svg>test</svg>' };

const mockCtx: EntityContext = {
  storage: { get: vi.fn(), set: vi.fn(), delete: vi.fn(), has: vi.fn() },
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn() },
  integrations: {},
} as unknown as EntityContext;

function makeEntity(type: string) {
  return defineEntity({
    type,
    name: type,
    icon: testIcon,
    uri: ['id'],
  });
}

function makeHandlers(type: string): EntityHandlers {
  return {
    resolve: async (id) => ({
      id: id['id']!,
      type,
      uri: `@vienna//${type}/${id['id']}`,
      title: `${type} ${id['id']}`,
    }),
    search: async (filters) => {
      const items = [
        { id: '1', type, uri: `@vienna//${type}/1`, title: `${type} 1` },
        { id: '2', type, uri: `@vienna//${type}/2`, title: `${type} 2` },
      ];
      if (filters?.query) {
        return items.filter((e) =>
          e.title.toLowerCase().includes(filters.query!.toLowerCase())
        );
      }
      return items.slice(0, filters?.limit ?? 20);
    },
    resolveContext: async (entity) => `# ${(entity as { title: string }).title}`,
  };
}

function makeIntegration(id: string) {
  return defineIntegration({
    id,
    name: id,
    icon: testIcon,
    createClient: async () => null,
  });
}

// ---------------------------------------------------------------------------
// EntityRegistry
// ---------------------------------------------------------------------------

describe('EntityRegistry', () => {
  let registry: EntityRegistry;

  beforeEach(() => {
    registry = new EntityRegistry();
  });

  // ── register ────────────────────────────────────────────────────────────

  describe('register', () => {
    it('stores the definition so it can be retrieved later', () => {
      const def = makeEntity('task');
      registry.register(def);

      expect(registry.getDefinition('task')).toBe(def);
    });

    it('throws on duplicate type', () => {
      const def = makeEntity('task');
      registry.register(def);

      expect(() => registry.register(def)).toThrow(
        /Entity type 'task' is already registered/
      );
    });
  });

  // ── registerHandlers ──────────────────────────────────────────────────

  describe('registerHandlers', () => {
    it('attaches handlers to a registered entity type', () => {
      registry.register(makeEntity('task'));
      const handlers = makeHandlers('task');
      registry.registerHandlers('task', handlers);

      expect(registry.getHandlers('task')).toBe(handlers);
    });

    it('throws when the entity type is not registered', () => {
      expect(() => registry.registerHandlers('nonexistent', {})).toThrow(
        /entity type 'nonexistent' is not registered/
      );
    });
  });

  // ── unregister ──────────────────────────────────────────────────────────

  describe('unregister', () => {
    it('removes the definition and handlers, returns true', () => {
      registry.register(makeEntity('task'));
      registry.registerHandlers('task', makeHandlers('task'));

      expect(registry.unregister('task')).toBe(true);
      expect(registry.getDefinition('task')).toBeUndefined();
      expect(registry.getHandlers('task')).toBeUndefined();
    });

    it('returns false for an unknown type', () => {
      expect(registry.unregister('nonexistent')).toBe(false);
    });
  });

  // ── getTypes ──────────────────────────────────────────────────────────

  describe('getTypes', () => {
    it('returns all registered type names', () => {
      registry.register(makeEntity('task'));
      registry.register(makeEntity('project'));

      const types = registry.getTypes();
      expect(types).toContain('task');
      expect(types).toContain('project');
      expect(types).toHaveLength(2);
    });
  });

  // ── getAllDefinitions ────────────────────────────────────────────────

  describe('getAllDefinitions', () => {
    it('returns all registered definitions', () => {
      registry.register(makeEntity('task'));
      registry.register(makeEntity('project'));

      const all = registry.getAllDefinitions();
      expect(all).toHaveLength(2);
    });
  });

  // ── getTypeSummaries ──────────────────────────────────────────────────

  describe('getTypeSummaries', () => {
    it('returns summaries with uriExample for each registered type', () => {
      registry.register(makeEntity('task'));
      registry.register(makeEntity('project'));

      const summaries = registry.getTypeSummaries();
      expect(summaries).toHaveLength(2);

      const taskSummary = summaries.find((s) => s.type === 'task');
      expect(taskSummary).toBeDefined();
      expect(taskSummary!.displayName).toBe('task');
      expect(taskSummary!.uriExample).toBe('@vienna//task/%3Cid%3E');
    });
  });

  // ── getByURI ──────────────────────────────────────────────────────────

  describe('getByURI', () => {
    it('resolves an entity from its URI using registered handlers', async () => {
      registry.register(makeEntity('task'));
      registry.registerHandlers('task', makeHandlers('task'));

      const entity = await registry.getByURI('@vienna//task/abc', mockCtx);
      expect(entity).toEqual({
        id: 'abc',
        type: 'task',
        uri: '@vienna//task/abc',
        title: 'task abc',
      });
    });

    it('returns null for an unknown type', async () => {
      const result = await registry.getByURI('@vienna//unknown/123', mockCtx);
      expect(result).toBeNull();
    });

    it('returns null when no handlers are registered', async () => {
      registry.register(makeEntity('task'));

      const result = await registry.getByURI('@vienna//task/abc', mockCtx);
      expect(result).toBeNull();
    });

    it('returns null when resolve handler is not provided', async () => {
      registry.register(makeEntity('task'));
      registry.registerHandlers('task', { search: async () => [] });

      const result = await registry.getByURI('@vienna//task/abc', mockCtx);
      expect(result).toBeNull();
    });

    it('catches synchronous errors (e.g. malformed URI) and returns null', async () => {
      const result = await registry.getByURI('not-a-valid-uri', mockCtx);
      expect(result).toBeNull();
      expect(mockCtx.logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to resolve entity"),
        expect.objectContaining({ error: expect.any(String) }),
      );
    });
  });

  // ── search ────────────────────────────────────────────────────────────

  describe('search', () => {
    it('searches across all registered types using handlers', async () => {
      registry.register(makeEntity('task'));
      registry.registerHandlers('task', makeHandlers('task'));
      registry.register(makeEntity('project'));
      registry.registerHandlers('project', makeHandlers('project'));

      const results = await registry.search('1', mockCtx);
      expect(results.length).toBeGreaterThanOrEqual(2);
      const titles = results.map((r) => r.title);
      expect(titles).toContain('task 1');
      expect(titles).toContain('project 1');
    });

    it('respects the type filter', async () => {
      registry.register(makeEntity('task'));
      registry.registerHandlers('task', makeHandlers('task'));
      registry.register(makeEntity('project'));
      registry.registerHandlers('project', makeHandlers('project'));

      const results = await registry.search('1', mockCtx, ['task']);
      const types = results.map((r) => r.type);
      expect(types.every((t) => t === 'task')).toBe(true);
    });

    it('skips types whose search throws (allSettled)', async () => {
      registry.register(makeEntity('failing'));
      registry.registerHandlers('failing', {
        search: async () => { throw new Error('boom'); },
      });
      registry.register(makeEntity('task'));
      registry.registerHandlers('task', makeHandlers('task'));

      const results = await registry.search('1', mockCtx);
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.every((r) => r.type === 'task')).toBe(true);
    });

    it('skips types without search handlers', async () => {
      registry.register(makeEntity('minimal'));
      // No handlers registered
      registry.register(makeEntity('task'));
      registry.registerHandlers('task', makeHandlers('task'));

      const results = await registry.search('1', mockCtx);
      expect(results.every((r) => r.type === 'task')).toBe(true);
    });
  });

  // ── resolveContext ────────────────────────────────────────────────────

  describe('resolveContext', () => {
    it('returns context markdown for a resolved entity', async () => {
      registry.register(makeEntity('task'));
      registry.registerHandlers('task', makeHandlers('task'));

      const ctx = await registry.resolveContext('@vienna//task/abc', mockCtx);
      expect(ctx).toBe('# task abc');
    });

    it('returns null when no resolveContext handler', async () => {
      registry.register(makeEntity('task'));
      registry.registerHandlers('task', {
        resolve: async (id) => ({
          id: id['id']!, type: 'task',
          uri: `@vienna//task/${id['id']}`, title: 'task',
        }),
      });

      const ctx = await registry.resolveContext('@vienna//task/abc', mockCtx);
      expect(ctx).toBeNull();
    });

    it('returns null for unknown type', async () => {
      const ctx = await registry.resolveContext('@vienna//unknown/abc', mockCtx);
      expect(ctx).toBeNull();
    });

    it('catches synchronous errors (e.g. malformed URI) and returns null', async () => {
      const ctx = await registry.resolveContext('not-a-valid-uri', mockCtx);
      expect(ctx).toBeNull();
      expect(mockCtx.logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to resolve context"),
        expect.objectContaining({ error: expect.any(String) }),
      );
    });

    it('returns null when entity cannot be resolved', async () => {
      registry.register(makeEntity('task'));
      registry.registerHandlers('task', {
        resolve: async () => null,
        resolveContext: async () => 'should not reach',
      });

      const ctx = await registry.resolveContext('@vienna//task/abc', mockCtx);
      expect(ctx).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// IntegrationRegistry
// ---------------------------------------------------------------------------

describe('IntegrationRegistry', () => {
  let registry: IntegrationRegistry;

  beforeEach(() => {
    registry = new IntegrationRegistry();
  });

  describe('register', () => {
    it('stores the definition so it can be retrieved later', () => {
      const def = makeIntegration('linear');
      registry.register(def);

      expect(registry.getDefinition('linear')).toBe(def);
    });

    it('throws on duplicate id', () => {
      const def = makeIntegration('linear');
      registry.register(def);

      expect(() => registry.register(def)).toThrow(
        /Integration 'linear' is already registered/
      );
    });
  });

  describe('unregister', () => {
    it('removes the definition and returns true', () => {
      registry.register(makeIntegration('linear'));

      expect(registry.unregister('linear')).toBe(true);
      expect(registry.getDefinition('linear')).toBeUndefined();
    });

    it('returns false for an unknown id', () => {
      expect(registry.unregister('nonexistent')).toBe(false);
    });
  });

  describe('getAllDefinitions', () => {
    it('returns all registered definitions', () => {
      const linear = makeIntegration('linear');
      const github = makeIntegration('github');
      registry.register(linear);
      registry.register(github);

      const all = registry.getAllDefinitions();
      expect(all).toHaveLength(2);
      expect(all).toContain(linear);
      expect(all).toContain(github);
    });
  });
});
