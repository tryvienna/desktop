/**
 * Tests for MCP request handlers.
 *
 * Handlers route through graphql-js execute() — the same path the renderer
 * uses via IPC. Tests use a real in-memory AppDb and real EntityRegistry /
 * IntegrationRegistry instances with mock definitions to verify the full
 * GraphQL resolver chain.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  EntityRegistry,
  IntegrationRegistry,
  defineEntity,
  defineIntegration,
} from '@tryvienna/sdk';
import type { BaseEntity } from '@tryvienna/sdk';
import type { AppDb } from '@vienna/app-db';
import type { GraphQLContext } from '@vienna/graphql';
import { createHandlers } from '../handlers';
import type { MCPHandler } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

function makeEntity(type: string, id: string, title: string): BaseEntity {
  return {
    id,
    type,
    uri: `@vienna//${type}/${id}`,
    title,
    description: `A ${type} named ${title}`,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };
}

const project1 = makeEntity('project_entity', 'proj-1', 'Alpha');
const project2 = makeEntity('project_entity', 'proj-2', 'Beta');
const workstream1 = makeEntity('ws_entity', 'ws-1', 'Bug Fixes');

function createProjectDefinition() {
  const entities = [project1, project2];

  const def = defineEntity({
    type: 'project_entity',
    name: 'Project Entity',
    icon: { svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 7v10"/></svg>' },
    uri: ['id'],
  });

  const handlers = {
    resolve: async (id: Record<string, string>) => entities.find((e) => e.id === id['id']) ?? null,
    search: async (query: { query?: string; limit?: number }) => {
      let results = [...entities];
      if (query?.query) {
        const q = query.query.toLowerCase();
        results = results.filter((e) => e.title.toLowerCase().includes(q));
      }
      return results.slice(0, query?.limit ?? 20);
    },
  };

  return { def, handlers };
}

function createWorkstreamDefinition() {
  const def = defineEntity({
    type: 'ws_entity',
    name: 'Workstream Entity',
    icon: { svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21 15"/></svg>' },
    uri: ['id'],
  });

  const handlers = {
    resolve: async (id: Record<string, string>) => (id['id'] === 'ws-1' ? workstream1 : null),
    search: async (query: { query?: string; limit?: number }) => {
      let results = [workstream1];
      if (query?.query) {
        const q = query.query.toLowerCase();
        results = results.filter((e) => e.title.toLowerCase().includes(q));
      }
      return results.slice(0, query?.limit ?? 20);
    },
  };

  return { def, handlers };
}

function createTestIntegration() {
  return defineIntegration({
    id: 'test_service',
    name: 'Test Service',
    icon: { svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>' },
    createClient: async () => null,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

let handlers: Map<string, MCPHandler>;

beforeEach(() => {
  const entityRegistry = new EntityRegistry();
  const integrationRegistry = new IntegrationRegistry();

  const project = createProjectDefinition();
  const workstream = createWorkstreamDefinition();

  entityRegistry.register(project.def);
  entityRegistry.registerHandlers(project.def.type, project.handlers);
  entityRegistry.register(workstream.def);
  entityRegistry.registerHandlers(workstream.def.type, workstream.handlers);
  integrationRegistry.register(createTestIntegration());

  // Entity/integration handlers only use registries from the context, not db.
  // Stub AppDb to avoid native better-sqlite3 dependency in unit tests.
  const graphqlContext: GraphQLContext = {
    db: {} as AppDb,
    userId: null,
    entityRegistry,
    integrationRegistry,
  };

  handlers = createHandlers({ graphqlContext });
});

function getHandler(method: string): MCPHandler {
  const handler = handlers.get(method);
  if (!handler) throw new Error(`Handler not found: ${method}`);
  return handler;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('entity.get', () => {
  it('returns entity by URI', async () => {
    const result = (await getHandler('entity.get')({ uri: '@vienna//project_entity/proj-1' })) as {
      entity: { title: string } | null;
    };

    expect(result.entity).not.toBeNull();
    expect(result.entity!.title).toBe('Alpha');
  });

  it('returns null for unknown URI', async () => {
    const result = (await getHandler('entity.get')({
      uri: '@vienna//project_entity/unknown',
    })) as { entity: unknown | null };

    expect(result.entity).toBeNull();
  });

  it('returns null for unknown type', async () => {
    const result = (await getHandler('entity.get')({ uri: '@vienna//unknown/id' })) as {
      entity: unknown | null;
    };

    expect(result.entity).toBeNull();
  });
});

describe('entity.types', () => {
  it('returns type summaries and integrations', async () => {
    const result = (await getHandler('entity.types')({})) as {
      types: unknown[];
      integrations?: unknown[];
    };

    expect(result.types.length).toBe(2);
    expect(result.integrations).toBeDefined();
    expect(result.integrations!.length).toBe(1);
  });

  it('includes integration info', async () => {
    const result = (await getHandler('entity.types')({})) as {
      integrations: Array<{ id: string; displayName: string }>;
    };

    const integration = result.integrations[0]!;
    expect(integration.id).toBe('test_service');
    expect(integration.displayName).toBe('Test Service');
  });
});

describe('graphql.operations', () => {
  it('returns operations matching a keyword', async () => {
    const result = (await getHandler('graphql.operations')({
      query: 'entity',
    })) as { operations: Array<{ name: string; kind: string }> };

    expect(result.operations).toBeDefined();
    expect(result.operations.length).toBeGreaterThan(0);
    // All results should have "entity" in the name
    for (const op of result.operations) {
      expect(op.name.toLowerCase()).toContain('entity');
    }
  });

  it('filters by kind', async () => {
    const result = (await getHandler('graphql.operations')({
      kind: 'mutation',
    })) as { operations: Array<{ kind: string }> };

    expect(result.operations).toBeDefined();
    for (const op of result.operations) {
      expect(op.kind).toBe('mutation');
    }
  });

  it('returns operations with args', async () => {
    const result = (await getHandler('graphql.operations')({
      query: 'entity',
      kind: 'query',
    })) as { operations: Array<{ name: string; args: Array<{ name: string; type: string }> }> };

    expect(result.operations.length).toBeGreaterThan(0);
    // At least one entity query should have args
    const withArgs = result.operations.filter((op) => op.args.length > 0);
    expect(withArgs.length).toBeGreaterThan(0);
  });

  it('includes returnFields with object field hints', async () => {
    const result = (await getHandler('graphql.operations')({})) as {
      operations: Array<{ name: string; returnFields?: string[] }>;
    };

    // Some operations should have returnFields
    const withFields = result.operations.filter((op) => op.returnFields && op.returnFields.length > 0);
    expect(withFields.length).toBeGreaterThan(0);
  });

  it('exact-name match returns single operation', async () => {
    const result = (await getHandler('graphql.operations')({
      query: 'entity',
    })) as { operations: Array<{ name: string }> };

    // "entity" exactly matches the `entity` query — should return just that one
    expect(result.operations.length).toBe(1);
    expect(result.operations[0]!.name).toBe('entity');
  });

  it('fuzzy match returns multiple operations', async () => {
    const result = (await getHandler('graphql.operations')({
      query: 'entit',
    })) as { operations: Array<{ name: string }> };

    // "entit" is a substring match (not exact) — should find both entity and entityTypes
    expect(result.operations.length).toBeGreaterThan(1);
  });

  it('multi-word query matches words independently', async () => {
    // "entity types" as two words should match "entityTypes" (both words in name)
    const result = (await getHandler('graphql.operations')({
      query: 'entity types',
    })) as { operations: Array<{ name: string }> };

    expect(result.operations.length).toBeGreaterThan(0);
    expect(result.operations.some((op) => op.name === 'entityTypes')).toBe(true);
  });
});

describe('graphql.execute', () => {
  it('executes a query and returns data', async () => {
    const result = (await getHandler('graphql.execute')({
      query: '{ entityTypes { type displayName } }',
    })) as { entityTypes: Array<{ type: string }> };

    expect(result.entityTypes).toBeDefined();
    expect(result.entityTypes.length).toBe(2);
  });

  it('executes a query with variables', async () => {
    const result = (await getHandler('graphql.execute')({
      query: 'query Get($uri: String!) { entity(uri: $uri) { id title } }',
      variables: { uri: '@vienna//project_entity/proj-1' },
    })) as { entity: { title: string } | null };

    expect(result.entity).not.toBeNull();
    expect(result.entity!.title).toBe('Alpha');
  });

  it('throws for invalid GraphQL syntax', async () => {
    await expect(
      getHandler('graphql.execute')({
        query: '{ this is not valid graphql !!!',
      }),
    ).rejects.toThrow();
  });

  it('enriches errors with schema hints for known operations', async () => {
    // entity query requires uri: String! — omit it to trigger an error
    await expect(
      getHandler('graphql.execute')({
        query: '{ entity { id title } }',
      }),
    ).rejects.toThrow(/entity/);
  });
});

describe('graphql.operations — tag mutations', () => {
  it('discovers completeWorkstreamTag mutation', async () => {
    const result = (await getHandler('graphql.operations')({
      query: 'completeWorkstreamTag',
    })) as { operations: Array<{ name: string; kind: string; args: Array<{ name: string }> }> };

    expect(result.operations).toBeDefined();
    expect(result.operations.length).toBe(1);
    expect(result.operations[0]!.name).toBe('completeWorkstreamTag');
    expect(result.operations[0]!.kind).toBe('mutation');

    const argNames = result.operations[0]!.args.map((a) => a.name);
    expect(argNames).toContain('workstreamId');
    expect(argNames).toContain('tagName');
    expect(argNames).toContain('status');
    expect(argNames).toContain('error');
  });

  it('discovers applyTagToWorkstream mutation', async () => {
    const result = (await getHandler('graphql.operations')({
      query: 'applyTagToWorkstream',
    })) as { operations: Array<{ name: string; kind: string }> };

    expect(result.operations.length).toBe(1);
    expect(result.operations[0]!.name).toBe('applyTagToWorkstream');
  });

  it('discovers removeTagFromWorkstream mutation', async () => {
    const result = (await getHandler('graphql.operations')({
      query: 'removeTagFromWorkstream',
    })) as { operations: Array<{ name: string; kind: string }> };

    expect(result.operations.length).toBe(1);
    expect(result.operations[0]!.name).toBe('removeTagFromWorkstream');
  });

  it('discovers tag operations via keyword search', async () => {
    const result = (await getHandler('graphql.operations')({
      query: 'tag',
      kind: 'mutation',
    })) as { operations: Array<{ name: string }> };

    const names = result.operations.map((op) => op.name);
    expect(names).toContain('completeWorkstreamTag');
    expect(names).toContain('applyTagToWorkstream');
    expect(names).toContain('removeTagFromWorkstream');
  });

  it('discovers workstreamTags query', async () => {
    const result = (await getHandler('graphql.operations')({
      query: 'workstreamTags',
      kind: 'query',
    })) as { operations: Array<{ name: string; kind: string }> };

    expect(result.operations.length).toBe(1);
    expect(result.operations[0]!.name).toBe('workstreamTags');
  });
});

describe('handler registration', () => {
  it('registers all 7 methods', () => {
    expect(handlers.size).toBe(7);
    expect(handlers.has('entity.search')).toBe(true);
    expect(handlers.has('entity.get')).toBe(true);
    expect(handlers.has('entity.types')).toBe(true);
    expect(handlers.has('graphql.operations')).toBe(true);
    expect(handlers.has('graphql.execute')).toBe(true);
    expect(handlers.has('workstream.create')).toBe(true);
    expect(handlers.has('workstream.sendMessage')).toBe(true);
  });
});
