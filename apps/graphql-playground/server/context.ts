/**
 * Server Context — In-memory SQLite + Schema + Registries
 *
 * Creates an isolated GraphQL context with:
 * - In-memory SQLite database (no file dependency)
 * - Entity registries with project + workstream entities
 * - Mock integration registrations (github, linear)
 * - Sample seed data for exploration
 */

import { openAppDatabase, closeAppDatabase, createAppDb } from '@vienna/app-db';
import type { AppDb, ProjectRecord, WorkstreamRecord } from '@vienna/app-db';
import { z } from 'zod';
import { EntityRegistry, IntegrationRegistry, buildEntityURI, defineEntity, defineIntegration, BaseEntitySchema } from '@tryvienna/sdk';
import type { BaseEntity } from '@tryvienna/sdk';
import type { Database } from 'better-sqlite3';
import type { GraphQLContext } from '@vienna/graphql/schema';
import { schema } from '@vienna/graphql/schema';

// ─────────────────────────────────────────────────────────────────────────────
// Entity registrations (inlined to avoid cross-app imports)
// ─────────────────────────────────────────────────────────────────────────────

const URI_PATH = { segments: ['id'] as const };

function projectToEntity(record: ProjectRecord): BaseEntity {
  return {
    id: record.id,
    type: 'project',
    uri: buildEntityURI('project', { id: record.id }, URI_PATH),
    title: record.name,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function workstreamToEntity(record: WorkstreamRecord): BaseEntity {
  return {
    id: record.id,
    type: 'workstream',
    uri: buildEntityURI('workstream', { id: record.id }, URI_PATH),
    title: record.title,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    metadata: {
      projectId: record.projectId,
      status: record.status,
      model: record.model,
      isPinned: record.isPinned,
      messageCount: record.messageCount,
      lastActivityAt: record.lastActivityAt,
    },
  };
}

function createProjectDefinition(db: AppDb) {
  return defineEntity({
    type: 'project',
    displayName: 'Project',
    icon: 'folder',
    source: 'builtin',
    schema: BaseEntitySchema,
    uriPath: URI_PATH,
    display: {
      emoji: '📁',
      colors: { bg: '#1e293b', text: '#e2e8f0', border: '#334155' },
      description: 'A project containing workstreams',
      outputFields: [{ key: 'name', label: 'Name', metadataPath: 'title' }],
    },
    resolve: async (id) => {
      const record = db.projects.getById(id['id']!);
      return record ? projectToEntity(record) : null;
    },
    search: async (filters) => {
      const all = db.projects.listAll();
      let results = all.map(projectToEntity);
      if (filters?.query) {
        const q = filters.query.toLowerCase();
        results = results.filter((e) => e.title.toLowerCase().includes(q));
      }
      return results.slice(0, filters?.limit ?? 20);
    },
    actions: [
      {
        id: 'create',
        label: 'Create Project',
        description: 'Create a new project',
        scope: 'type',
        inputSchema: z.object({ name: z.string().describe('Project name') }),
        handler: async (params) => {
          const { name } = params.input as { name: string };
          const record = db.projects.create({ name });
          return { success: true, entity: projectToEntity(record) };
        },
      },
      {
        id: 'delete',
        label: 'Delete Project',
        description: 'Delete a project and all its workstreams',
        scope: 'instance',
        handler: async (params) => {
          if (!params.entity) return { success: false, message: 'No entity provided' };
          const deleted = db.projects.delete(params.entity.id);
          return { success: deleted, message: deleted ? 'Project deleted' : 'Project not found' };
        },
      },
    ],
  });
}

function createWorkstreamDefinition(db: AppDb) {
  return defineEntity({
    type: 'workstream',
    displayName: 'Workstream',
    icon: 'message-circle',
    source: 'builtin',
    schema: BaseEntitySchema,
    uriPath: URI_PATH,
    display: {
      emoji: '💬',
      colors: { bg: '#1e1b4b', text: '#c7d2fe', border: '#3730a3' },
      description: 'A conversation thread within a project',
      filterDescriptions: [
        { name: 'projectId', type: 'string', description: 'Filter by project ID' },
      ],
      outputFields: [
        { key: 'title', label: 'Title', metadataPath: 'title' },
        { key: 'status', label: 'Status', metadataPath: 'metadata.status' },
      ],
    },
    resolve: async (id) => {
      const record = db.workstreams.getById(id['id']!);
      return record ? workstreamToEntity(record) : null;
    },
    search: async (filters) => {
      const projectId = (filters as Record<string, unknown> | undefined)?.['projectId'] as
        | string
        | undefined;
      let records: WorkstreamRecord[];
      if (projectId) {
        records = [
          ...db.workstreams.getByProject(projectId),
          ...db.workstreams.getArchivedByProject(projectId),
        ];
      } else {
        records = db.workstreams.listAll();
      }
      let results = records.map(workstreamToEntity);
      if (filters?.query) {
        const q = filters.query.toLowerCase();
        results = results.filter((e) => e.title.toLowerCase().includes(q));
      }
      return results.slice(0, filters?.limit ?? 20);
    },
    actions: [
      {
        id: 'create',
        label: 'Create Workstream',
        description: 'Create a new workstream in a project',
        scope: 'type',
        inputSchema: z.object({
          projectId: z.string().describe('Parent project ID'),
          title: z.string().describe('Workstream title'),
        }),
        handler: async (params) => {
          const { projectId, title } = params.input as { projectId: string; title: string };
          const record = db.workstreams.create({ projectId, title });
          return { success: true, entity: workstreamToEntity(record) };
        },
      },
      {
        id: 'archive',
        label: 'Archive',
        description: 'Archive a workstream',
        scope: 'instance',
        handler: async (params) => {
          if (!params.entity) return { success: false, message: 'No entity provided' };
          const record = db.workstreams.update(params.entity.id, { archivedAt: Date.now() });
          if (!record) return { success: false, message: 'Workstream not found' };
          return { success: true, entity: workstreamToEntity(record) };
        },
      },
    ],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock GitHub PR entity (integration source, compound URI)
// ─────────────────────────────────────────────────────────────────────────────

const PR_URI_PATH = { segments: ['owner', 'repo', 'number'] as const };

const MOCK_PRS: BaseEntity[] = [
  {
    id: 'anthropic/vienna/42',
    type: 'github_pr',
    uri: '@vienna//github_pr/anthropic/vienna/42',
    title: 'feat: Add entity registry browser to playground',
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 1800000,
    metadata: {
      state: 'open',
      owner: 'anthropic',
      repo: 'vienna',
      number: 42,
      author: 'willcl-ark',
      headBranch: 'feat/registry-browser',
      baseBranch: 'main',
      additions: 342,
      deletions: 18,
      changedFiles: 9,
    },
  },
  {
    id: 'anthropic/vienna/41',
    type: 'github_pr',
    uri: '@vienna//github_pr/anthropic/vienna/41',
    title: 'fix: Resolve CodeMirror theme sync issue',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 43200000,
    metadata: {
      state: 'merged',
      owner: 'anthropic',
      repo: 'vienna',
      number: 41,
      author: 'willcl-ark',
      headBranch: 'fix/cm-theme',
      baseBranch: 'main',
      additions: 24,
      deletions: 12,
      changedFiles: 2,
    },
  },
  {
    id: 'anthropic/vienna/40',
    type: 'github_pr',
    uri: '@vienna//github_pr/anthropic/vienna/40',
    title: 'chore: Update dependencies',
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 172800000,
    metadata: {
      state: 'closed',
      owner: 'anthropic',
      repo: 'vienna',
      number: 40,
      author: 'dependabot',
      headBranch: 'deps/update',
      baseBranch: 'main',
      additions: 87,
      deletions: 92,
      changedFiles: 3,
    },
  },
];

function createGitHubPRDefinition() {
  return defineEntity({
    type: 'github_pr',
    displayName: 'GitHub Pull Request',
    icon: 'git-pull-request',
    source: 'integration',
    schema: BaseEntitySchema,
    uriPath: PR_URI_PATH,
    display: {
      emoji: '🔀',
      colors: { bg: '#0d1f0d', text: '#3fb950', border: '#238636' },
      description: 'A GitHub pull request',
      filterDescriptions: [
        { name: 'state', type: 'string', description: 'Filter by state (open, closed, merged)' },
        { name: 'author', type: 'string', description: 'Filter by author' },
      ],
      outputFields: [
        { key: 'repo', label: 'Repository', metadataPath: 'metadata.repo' },
        { key: 'author', label: 'Author', metadataPath: 'metadata.author' },
        { key: 'state', label: 'State', metadataPath: 'metadata.state' },
      ],
    },
    resolve: async (id) => {
      const uri = buildEntityURI('github_pr', id as Record<string, string>, PR_URI_PATH);
      return MOCK_PRS.find((pr) => pr.uri === uri) ?? null;
    },
    search: async (filters) => {
      let results = [...MOCK_PRS];
      const f = filters as Record<string, unknown> | undefined;
      if (f?.['state']) {
        results = results.filter(
          (pr) => (pr.metadata as Record<string, unknown>).state === f['state']
        );
      }
      if (filters?.query) {
        const q = filters.query.toLowerCase();
        results = results.filter((pr) => pr.title.toLowerCase().includes(q));
      }
      return results.slice(0, filters?.limit ?? 20);
    },
    actions: [
      {
        id: 'create',
        label: 'Create PR',
        description: 'Create a new pull request',
        scope: 'type',
        inputSchema: z.object({
          owner: z.string().describe('Repository owner'),
          repo: z.string().describe('Repository name'),
          title: z.string().describe('PR title'),
          head: z.string().describe('Head branch'),
          base: z.string().describe('Base branch'),
        }),
        handler: async (params) => {
          const input = params.input as { title: string };
          return {
            success: true,
            message: `PR "${input.title}" created (mock)`,
            data: { number: 43 },
          };
        },
      },
      {
        id: 'merge',
        label: 'Merge PR',
        description: 'Merge this pull request',
        scope: 'instance',
        inputSchema: z.object({
          method: z.enum(['merge', 'squash', 'rebase']).optional().describe('Merge method'),
        }),
        handler: async (params) => {
          const input = params.input as { method?: string } | undefined;
          return {
            success: true,
            message: `PR merged via ${input?.method ?? 'merge'} (mock)`,
          };
        },
      },
      {
        id: 'add_comment',
        label: 'Add Comment',
        description: 'Post a comment on this pull request',
        scope: 'instance',
        inputSchema: z.object({
          body: z.string().describe('Comment body (markdown)'),
        }),
        handler: async () => {
          return { success: true, message: 'Comment posted (mock)' };
        },
      },
    ],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock integrations
// ─────────────────────────────────────────────────────────────────────────────

function registerMockIntegrations(registry: IntegrationRegistry): void {
  registry.register(defineIntegration({
    id: 'github',
    displayName: 'GitHub',
    icon: 'github',
    methods: [
      {
        id: 'list_repos',
        description: 'List repositories for the authenticated user',
        aiHint: 'Use to discover available repositories',
        inputSchema: z.object({
          type: z.enum(['owner', 'all', 'member']).optional().describe('Filter by ownership'),
          limit: z.number().optional().describe('Max results'),
        }),
        execute: async () => [
          { name: 'vienna', full_name: 'anthropic/vienna', language: 'TypeScript', stars: 42 },
          {
            name: 'vienna-sdk',
            full_name: 'anthropic/vienna-sdk',
            language: 'TypeScript',
            stars: 15,
          },
        ],
      },
      {
        id: 'list_pull_requests',
        description: 'List pull requests for a repository',
        inputSchema: z.object({
          owner: z.string().describe('Repository owner'),
          repo: z.string().describe('Repository name'),
          state: z.enum(['open', 'closed', 'all']).optional().describe('PR state filter'),
        }),
        execute: async () => [
          { number: 42, title: 'Add entity registry browser', state: 'open', author: 'willcl-ark' },
        ],
      },
      {
        id: 'create_issue',
        description: 'Create a new issue in a repository',
        mutation: true,
        inputSchema: z.object({
          owner: z.string().describe('Repository owner'),
          repo: z.string().describe('Repository name'),
          title: z.string().describe('Issue title'),
          body: z.string().optional().describe('Issue body (markdown)'),
        }),
        execute: async (input) => ({ id: 'issue-1', ...(input as object) }),
      },
    ],
  }));

  registry.register(defineIntegration({
    id: 'linear',
    displayName: 'Linear',
    icon: 'ticket',
    methods: [
      {
        id: 'list_teams',
        description: 'List all teams in the workspace',
        execute: async () => [
          { id: 'team-eng', name: 'Engineering', key: 'ENG' },
          { id: 'team-design', name: 'Design', key: 'DES' },
        ],
      },
      {
        id: 'list_issues',
        description: 'List issues with optional filters',
        inputSchema: z.object({
          teamId: z.string().optional().describe('Filter by team ID'),
          status: z.string().optional().describe('Filter by status'),
          limit: z.number().optional().describe('Max results'),
        }),
        execute: async () => [
          { id: 'lin-1', identifier: 'ENG-123', title: 'Fix login bug', status: 'In Progress' },
        ],
      },
      {
        id: 'create_issue',
        description: 'Create a new issue',
        mutation: true,
        inputSchema: z.object({
          teamId: z.string().describe('Team ID'),
          title: z.string().describe('Issue title'),
          description: z.string().optional().describe('Issue description (markdown)'),
          priority: z.number().optional().describe('Priority (0=none, 1=urgent, 4=low)'),
        }),
        execute: async (input) => ({ id: 'lin-new', ...(input as object) }),
      },
    ],
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Context initialization
// ─────────────────────────────────────────────────────────────────────────────

let rawDb: Database;
let db: AppDb;
let entityRegistry: EntityRegistry;
let integrationRegistry: IntegrationRegistry;

function seed(appDb: AppDb): void {
  const project = appDb.projects.create({ name: 'My First Project' });
  const project2 = appDb.projects.create({ name: 'Plugin Development' });

  appDb.workstreams.create({ projectId: project.id, title: 'Design System Exploration' });
  appDb.workstreams.create({ projectId: project.id, title: 'API Integration' });
  appDb.workstreams.create({ projectId: project2.id, title: 'Custom Entity Plugin' });
  appDb.workstreams.create({ projectId: project2.id, title: 'Dashboard Widget' });
}

export function initContext(): { schema: typeof schema; createContext: () => GraphQLContext } {
  rawDb = openAppDatabase({ path: ':memory:' });
  // Playground uses an in-memory DB; settings.json goes to OS temp dir
  const { join } = require('node:path');
  const { tmpdir } = require('node:os');
  db = createAppDb(rawDb, join(tmpdir(), 'vienna-playground-settings.json'));

  entityRegistry = new EntityRegistry();
  integrationRegistry = new IntegrationRegistry();

  entityRegistry.register(createProjectDefinition(db));
  entityRegistry.register(createWorkstreamDefinition(db));
  entityRegistry.register(createGitHubPRDefinition());

  registerMockIntegrations(integrationRegistry);

  seed(db);

  return {
    schema,
    createContext: () => ({
      db,
      userId: 'playground-user',
      entityRegistry,
      integrationRegistry,
    }),
  };
}

export function closeContext(): void {
  closeAppDatabase(rawDb);
}
