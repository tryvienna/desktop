/**
 * Test Helpers — Shared test context factory and fixtures.
 *
 * Creates a ToolContext backed by real EntityRegistry/IntegrationRegistry
 * instances with mock entity definitions and handlers. No bridge, no socket, no mocking.
 */

import {
  EntityRegistry,
  IntegrationRegistry,
  defineEntity,
  defineIntegration,
  createMockEntityContext,
} from '@tryvienna/sdk';
import type {
  BaseEntity,
  EntityDefinition,
  IntegrationDefinition,
  EntityHandlers,
} from '@tryvienna/sdk';
import type { ToolContext } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

function makeEntity(
  type: string,
  id: string,
  title: string,
  extra?: Record<string, unknown>
): BaseEntity & Record<string, unknown> {
  return {
    id,
    type,
    uri: `@vienna//${type}/${id}`,
    title,
    description: `A ${type} named ${title}`,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    ...extra,
  };
}

export const FIXTURES = {
  project1: makeEntity('project', 'proj-1', 'Alpha Project', { status: 'active' }),
  project2: makeEntity('project', 'proj-2', 'Beta Project', { status: 'archived' }),
  workstream1: makeEntity('workstream', 'ws-1', 'Bug Fixes', {
    projectId: 'proj-1',
    status: 'active',
    isPinned: true,
  }),
  workstream2: makeEntity('workstream', 'ws-2', 'Feature Work', {
    projectId: 'proj-1',
    status: 'idle',
    isPinned: false,
  }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Entity Definitions (metadata-only)
// ─────────────────────────────────────────────────────────────────────────────

export function createProjectDefinition(): EntityDefinition {
  return defineEntity({
    type: 'project',
    name: 'Project',
    icon: { svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>' },
    uri: ['id'],
    display: {
      emoji: '\u{1F4C1}',
      colors: { bg: '#E8F5E9', text: '#2E7D32', border: '#A5D6A7' },
      description: 'A project grouping workstreams',
      filterDescriptions: [
        { name: 'status', type: 'string', description: 'Filter by status' },
      ],
    },
  });
}

export function createProjectHandlers(): EntityHandlers {
  const entities = [FIXTURES.project1, FIXTURES.project2];
  return {
    resolve: async (id) => entities.find((e) => e.id === id['id']) ?? null,
    search: async (filters) => {
      let results = [...entities];
      if (filters?.query) {
        const q = filters.query.toLowerCase();
        results = results.filter((e) => e.title.toLowerCase().includes(q));
      }
      return results.slice(0, filters?.limit ?? 20);
    },
  };
}

export function createWorkstreamDefinition(): EntityDefinition {
  return defineEntity({
    type: 'workstream',
    name: 'Workstream',
    icon: { svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>' },
    uri: ['id'],
    display: {
      emoji: '\u{1F4AC}',
      colors: { bg: '#E3F2FD', text: '#1565C0', border: '#90CAF9' },
      description: 'A conversation within a project',
    },
  });
}

export function createWorkstreamHandlers(): EntityHandlers {
  const entities = [FIXTURES.workstream1, FIXTURES.workstream2];
  return {
    resolve: async (id) => entities.find((e) => e.id === id['id']) ?? null,
    search: async (filters) => {
      let results = [...entities];
      if (filters?.query) {
        const q = filters.query.toLowerCase();
        results = results.filter((e) => e.title.toLowerCase().includes(q));
      }
      return results.slice(0, filters?.limit ?? 20);
    },
  };
}

export function createTestIntegration(): IntegrationDefinition {
  return defineIntegration({
    id: 'test_service',
    name: 'Test Service',
    icon: { svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>' },
    createClient: async () => null,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Context Factory
// ─────────────────────────────────────────────────────────────────────────────

export interface EntityWithHandlers {
  definition: EntityDefinition;
  handlers: EntityHandlers;
}

export interface TestContextOptions {
  entities?: EntityWithHandlers[];
  integrations?: IntegrationDefinition[];
}

export function createTestContext(opts?: TestContextOptions): ToolContext {
  const entityRegistry = new EntityRegistry();
  const integrationRegistry = new IntegrationRegistry();

  for (const e of opts?.entities ?? []) {
    entityRegistry.register(e.definition);
    entityRegistry.registerHandlers(e.definition.type, e.handlers);
  }
  for (const i of opts?.integrations ?? []) {
    integrationRegistry.register(i);
  }

  // Create a mock EntityContext for registry operations that require one
  const { ctx: mockCtx } = createMockEntityContext();

  return {
    getEntity: (uri) => entityRegistry.getByURI(uri, mockCtx),
    getEntityTypes: async () => entityRegistry.getTypeSummaries(),
    executeGraphql: async (_query, _variables) => {
      // In unit tests, we don't have a real GraphQL schema.
      return { __test: true };
    },
    getGraphqlOperations: async (query, kind) => {
      // Mock operations for testing
      const ops = [
        { kind: 'mutation' as const, name: 'mergePR', description: 'Merge a pull request', args: [{ name: 'owner', type: 'String!' }, { name: 'repo', type: 'String!' }], returnType: 'MergePRPayload' },
        { kind: 'query' as const, name: 'projects', description: 'List all projects', args: [], returnType: '[Project]' },
        { kind: 'mutation' as const, name: 'createWorkstream', description: 'Create a workstream', args: [{ name: 'input', type: 'CreateWorkstreamInput!' }], returnType: 'CreateWorkstreamPayload' },
      ];
      let filtered = ops;
      if (kind) filtered = filtered.filter((o) => o.kind === kind);
      if (query) {
        const q = query.toLowerCase();
        filtered = filtered.filter((o) => o.name.toLowerCase().includes(q) || o.description.toLowerCase().includes(q));
      }
      return filtered;
    },
    createWorkstream: async (input) => {
      // Test stub — returns a mock workstream
      return {
        workstream: {
          id: 'ws-new',
          title: input.title,
          status: 'idle',
          model: input.model ?? null,
        },
        worktrees: input.createWorktrees
          ? [{ directoryPath: '/test/repo', branch: input.branchName ?? 'workstream/test', worktreePath: '/test/repo/.worktrees/test' }]
          : undefined,
      };
    },
    sendWorkstreamMessage: async (workstreamId) => {
      // Test stub — returns a mock result
      return {
        workstream: {
          id: workstreamId,
          status: 'processing',
          messageCount: 1,
        },
      };
    },
    addReference: async (input) => {
      return { success: true, entityUri: input.entityUri };
    },
    removeReference: async (entityUri) => {
      return { success: true, entityUri };
    },
  };
}

/** Create a standard test context with project + workstream entities and test integration */
export function createStandardTestContext(): ToolContext {
  return createTestContext({
    entities: [
      { definition: createProjectDefinition(), handlers: createProjectHandlers() },
      { definition: createWorkstreamDefinition(), handlers: createWorkstreamHandlers() },
    ],
    integrations: [createTestIntegration()],
  });
}
