/**
 * Schema Integration Tests
 *
 * Verifies the Pothos schema builds correctly and resolvers work
 * against a real in-memory SQLite database. No Electron required.
 *
 * All operations use typed document nodes from codegen — zero manual casts.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execute, type ExecutionResult } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { openAppDatabase, closeAppDatabase, createAppDb } from '@vienna/app-db';
import { EntityRegistry, IntegrationRegistry, defineEntity } from '@tryvienna/sdk';
import type { Database } from 'better-sqlite3';
import type { AppDb } from '@vienna/app-db';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { schema } from './schema/index';
import type { GraphQLContext, WorkstreamActions, RoutineActions } from './schema/builder';

// Import typed operations — these carry full TData/TVariables inference from codegen
import {
  GET_PROJECTS,
  GET_PROJECT,
  CREATE_PROJECT,
  GET_WORKSTREAMS_BY_PROJECT,
  GET_ARCHIVED_WORKSTREAMS,
  CREATE_WORKSTREAM,
  ARCHIVE_WORKSTREAM,
  UNARCHIVE_WORKSTREAM,
  PIN_WORKSTREAM,
  UNPIN_WORKSTREAM,
  // Entity operations
  GET_ENTITY,
  GET_ENTITIES,
  SEARCH_ENTITIES,
  GET_ENTITY_TYPES,
  // Routine operations
  GET_ROUTINES,
  GET_ROUTINE,
  GET_ROUTINE_BY_WORKSTREAM,
  GET_ROUTINE_RUN_HISTORY,
  GET_ROUTINE_LATEST_RUN,
  CREATE_ROUTINE,
  UPDATE_ROUTINE,
  DELETE_ROUTINE,
  PAUSE_ROUTINE,
  RESUME_ROUTINE,
  RUN_ROUTINE_NOW,
  // Workstream agent commands
  SEND_WORKSTREAM_MESSAGE,
  STOP_WORKSTREAM_AGENT,
  RESTART_WORKSTREAM_AGENT,
  INTERRUPT_WORKSTREAM_AGENT,
  SET_WORKSTREAM_IN_FOCUS,
  IS_WORKSTREAM_AGENT_RUNNING,
  // Workstream hybrid mutations
  SWITCH_WORKSTREAM_MODEL,
  LINK_WORKSTREAM_ENTITY,
  UNLINK_WORKSTREAM_ENTITY,
  // Workstream data mutations
  GET_WORKSTREAM_LINKED_ENTITIES,
  GET_WORKSTREAM_DIRECTORIES,
  SET_LINKED_ENTITY_CONTEXT_OVERRIDE,
  ADD_WORKSTREAM_DIRECTORY,
  REMOVE_WORKSTREAM_DIRECTORY,
  // Settings operations
  GET_SETTINGS,
  UPDATE_APPEARANCE_SETTINGS,
  UPDATE_AI_SETTINGS,
  UPDATE_ADVANCED_SETTINGS,
} from './client/operations';

// ─────────────────────────────────────────────────────────────────────────────
// Typed execute helper — single boundary cast bridges graphql-js's untyped
// execute() with TypedDocumentNode's generic parameters.
// ─────────────────────────────────────────────────────────────────────────────

async function exec<TData, TVars>(
  document: TypedDocumentNode<TData, TVars>,
  contextValue: GraphQLContext,
  variableValues?: TVars,
): Promise<ExecutionResult<TData>> {
  const result = await execute({
    schema,
    document,
    contextValue,
    variableValues: variableValues as Record<string, unknown> | undefined,
  });
  return result as ExecutionResult<TData>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Test helpers
// ─────────────────────────────────────────────────────────────────────────────

function createContext(
  db: AppDb,
  opts?: {
    entityRegistry?: EntityRegistry;
    integrationRegistry?: IntegrationRegistry;
    workstream?: WorkstreamActions;
    routine?: RoutineActions;
  },
): GraphQLContext {
  return { db, userId: 'test-user', ...opts };
}

function createMockWorkstreamActions(): WorkstreamActions {
  return {
    sendMessage: vi.fn<WorkstreamActions['sendMessage']>().mockResolvedValue(undefined),
    stopAgent: vi.fn<WorkstreamActions['stopAgent']>().mockResolvedValue(undefined),
    restartAgent: vi.fn<WorkstreamActions['restartAgent']>().mockResolvedValue('new-session'),
    respondPermission: vi.fn<WorkstreamActions['respondPermission']>(),
    interrupt: vi.fn<WorkstreamActions['interrupt']>(),
    compactConversation: vi.fn<WorkstreamActions['compactConversation']>().mockResolvedValue(true),
    isAgentRunning: vi.fn<WorkstreamActions['isAgentRunning']>().mockReturnValue(false),
    setInFocus: vi.fn<WorkstreamActions['setInFocus']>(),
    replayHistory: vi.fn<WorkstreamActions['replayHistory']>(),
    switchModel: vi.fn<WorkstreamActions['switchModel']>().mockResolvedValue(undefined),
    linkEntity: vi.fn<WorkstreamActions['linkEntity']>(),
    unlinkEntity: vi.fn<WorkstreamActions['unlinkEntity']>(),
  };
}

function createMockRoutineActions(): RoutineActions {
  return {
    execute: vi.fn<RoutineActions['execute']>().mockResolvedValue(undefined),
  };
}

describe('GraphQL Schema', () => {
  let rawDb: Database;
  let db: AppDb;
  let tmpDir: string;

  beforeEach(() => {
    rawDb = openAppDatabase({ path: ':memory:' });
    tmpDir = mkdtempSync(join(tmpdir(), 'vienna-gql-test-'));
    db = createAppDb(rawDb, join(tmpDir, 'settings.json'));
  });

  afterEach(() => {
    closeAppDatabase(rawDb);
    rmSync(tmpDir, { recursive: true, force: true });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Schema Structure
  // ─────────────────────────────────────────────────────────────────────────

  it('builds a valid schema with Query and Mutation types', () => {
    const queryType = schema.getQueryType();
    const mutationType = schema.getMutationType();
    expect(queryType).toBeTruthy();
    expect(mutationType).toBeTruthy();
  });

  it('has expected query fields', () => {
    const queryFields = schema.getQueryType()?.getFields();
    expect(queryFields).toHaveProperty('project');
    expect(queryFields).toHaveProperty('projects');
    expect(queryFields).toHaveProperty('workstream');
    expect(queryFields).toHaveProperty('workstreamsByProject');
    expect(queryFields).toHaveProperty('archivedWorkstreams');
    // Workstream agent/data queries
    expect(queryFields).toHaveProperty('isWorkstreamAgentRunning');
    expect(queryFields).toHaveProperty('workstreamLinkedEntities');
    expect(queryFields).toHaveProperty('workstreamDirectories');
    // Routine domain
    expect(queryFields).toHaveProperty('routine');
    expect(queryFields).toHaveProperty('routines');
    expect(queryFields).toHaveProperty('routineByWorkstreamId');
    expect(queryFields).toHaveProperty('routineRunHistory');
    expect(queryFields).toHaveProperty('routineLatestRun');
    // Entity domain
    expect(queryFields).toHaveProperty('entity');
    expect(queryFields).toHaveProperty('entities');
    expect(queryFields).toHaveProperty('entitySearch');
    expect(queryFields).toHaveProperty('entityTypes');
    // Settings domain
    expect(queryFields).toHaveProperty('settings');
  });

  it('has expected mutation fields', () => {
    const mutationFields = schema.getMutationType()?.getFields();
    expect(mutationFields).toHaveProperty('createProject');
    expect(mutationFields).toHaveProperty('updateProject');
    expect(mutationFields).toHaveProperty('deleteProject');
    expect(mutationFields).toHaveProperty('createWorkstream');
    expect(mutationFields).toHaveProperty('updateWorkstream');
    expect(mutationFields).toHaveProperty('archiveWorkstream');
    expect(mutationFields).toHaveProperty('pinWorkstream');
    expect(mutationFields).toHaveProperty('deleteWorkstream');
    // Workstream agent commands
    expect(mutationFields).toHaveProperty('sendWorkstreamMessage');
    expect(mutationFields).toHaveProperty('stopWorkstreamAgent');
    expect(mutationFields).toHaveProperty('restartWorkstreamAgent');
    expect(mutationFields).toHaveProperty('respondWorkstreamPermission');
    expect(mutationFields).toHaveProperty('interruptWorkstreamAgent');
    expect(mutationFields).toHaveProperty('compactWorkstreamConversation');
    expect(mutationFields).toHaveProperty('setWorkstreamInFocus');
    expect(mutationFields).toHaveProperty('replayWorkstreamHistory');
    // Workstream hybrid + data mutations
    expect(mutationFields).toHaveProperty('switchWorkstreamModel');
    expect(mutationFields).toHaveProperty('linkWorkstreamEntity');
    expect(mutationFields).toHaveProperty('unlinkWorkstreamEntity');
    expect(mutationFields).toHaveProperty('setLinkedEntityContextOverride');
    expect(mutationFields).toHaveProperty('addWorkstreamDirectory');
    expect(mutationFields).toHaveProperty('removeWorkstreamDirectory');
    // Routine mutations
    expect(mutationFields).toHaveProperty('createRoutine');
    expect(mutationFields).toHaveProperty('updateRoutine');
    expect(mutationFields).toHaveProperty('deleteRoutine');
    expect(mutationFields).toHaveProperty('pauseRoutine');
    expect(mutationFields).toHaveProperty('resumeRoutine');
    expect(mutationFields).toHaveProperty('runRoutineNow');
    // Settings domain
    expect(mutationFields).toHaveProperty('updateAppearanceSettings');
    expect(mutationFields).toHaveProperty('updateAiSettings');
    expect(mutationFields).toHaveProperty('updateAdvancedSettings');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Project Resolvers
  // ─────────────────────────────────────────────────────────────────────────

  it('creates and queries a project', async () => {
    const createResult = await exec(CREATE_PROJECT, createContext(db), {
      input: { name: 'Test Project' },
    });
    expect(createResult.errors).toBeUndefined();
    const project = createResult.data!.createProject!;
    expect(project.name).toBe('Test Project');
    expect(project.id).toBeTruthy();

    // Query by ID
    const queryResult = await exec(GET_PROJECT, createContext(db), { id: project.id! });
    expect(queryResult.errors).toBeUndefined();
    const found = queryResult.data!.project!;
    expect(found.name).toBe('Test Project');
    expect(found.createdAt).toBeTruthy();
  });

  it('lists all projects', async () => {
    db.projects.create({ name: 'A' });
    db.projects.create({ name: 'B' });

    const result = await exec(GET_PROJECTS, createContext(db));
    expect(result.errors).toBeUndefined();
    expect(result.data!.projects).toHaveLength(2);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Workstream Resolvers
  // ─────────────────────────────────────────────────────────────────────────

  it('creates and queries a workstream', async () => {
    const project = db.projects.create({ name: 'P' });

    const createResult = await exec(CREATE_WORKSTREAM, createContext(db), {
      input: { projectId: project.id, title: 'My WS' },
    });
    expect(createResult.errors).toBeUndefined();
    const ws = createResult.data!.createWorkstream!.workstream!;
    expect(ws.title).toBe('My WS');
    expect(ws.status).toBe('idle');
    expect(ws.isPinned).toBe(false);
    expect(ws.messageCount).toBe(0);
  });

  it('queries workstreams by project with nested project field', async () => {
    const project = db.projects.create({ name: 'P' });
    db.workstreams.create({ projectId: project.id, title: 'WS1' });
    db.workstreams.create({ projectId: project.id, title: 'WS2' });

    const result = await exec(GET_WORKSTREAMS_BY_PROJECT, createContext(db), {
      projectId: project.id,
    });
    expect(result.errors).toBeUndefined();
    const workstreams = result.data!.workstreamsByProject!;
    expect(workstreams).toHaveLength(2);
  });

  it('archives and unarchives a workstream', async () => {
    const project = db.projects.create({ name: 'P' });
    const ws = db.workstreams.create({ projectId: project.id, title: 'WS' });

    // Archive
    const archiveResult = await exec(ARCHIVE_WORKSTREAM, createContext(db), { id: ws.id });
    expect(archiveResult.errors).toBeUndefined();
    expect(archiveResult.data!.archiveWorkstream!.workstream!.archivedAt).toBeTruthy();

    // Verify it's in archived list
    const archivedResult = await exec(GET_ARCHIVED_WORKSTREAMS, createContext(db), {
      projectId: project.id,
    });
    expect(archivedResult.data!.archivedWorkstreams).toHaveLength(1);

    // Unarchive
    const unarchiveResult = await exec(UNARCHIVE_WORKSTREAM, createContext(db), { id: ws.id });
    expect(unarchiveResult.errors).toBeUndefined();
    expect(unarchiveResult.data!.unarchiveWorkstream!.workstream!.status).toBe('idle');
  });

  it('pins and unpins a workstream', async () => {
    const project = db.projects.create({ name: 'P' });
    const ws = db.workstreams.create({ projectId: project.id, title: 'WS' });

    const pinResult = await exec(PIN_WORKSTREAM, createContext(db), { id: ws.id });
    expect(pinResult.data!.pinWorkstream!.workstream!.isPinned).toBe(true);

    const unpinResult = await exec(UNPIN_WORKSTREAM, createContext(db), { id: ws.id });
    expect(unpinResult.data!.unpinWorkstream!.workstream!.isPinned).toBe(false);
  });

  it('returns error for non-existent workstream mutations', async () => {
    const result = await exec(ARCHIVE_WORKSTREAM, createContext(db), { id: 'nonexistent' });
    expect(result.errors).toHaveLength(1);
    expect(result.errors![0]!.message).toBe('Workstream not found');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Cross-domain: Project with nested workstreams
  // ─────────────────────────────────────────────────────────────────────────

  it('resolves project.workstreams relationship', async () => {
    const project = db.projects.create({ name: 'P' });
    db.workstreams.create({ projectId: project.id, title: 'WS1' });
    db.workstreams.create({ projectId: project.id, title: 'WS2' });
    const archived = db.workstreams.create({ projectId: project.id, title: 'Archived' });
    db.workstreams.update(archived.id, { archivedAt: Date.now() });

    const result = await exec(GET_PROJECT, createContext(db), { id: project.id });
    expect(result.errors).toBeUndefined();
    const p = result.data!.project!;
    expect(p.workstreams).toHaveLength(2); // Archived excluded
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Entity Domain — Generic entity operations
  // ─────────────────────────────────────────────────────────────────────────

  function makeTestEntity() {
    const entities = [
      { id: 'e1', type: 'test_item', uri: '@vienna//test_item/e1', title: 'Alpha Item' },
      { id: 'e2', type: 'test_item', uri: '@vienna//test_item/e2', title: 'Beta Item' },
    ];
    const def = defineEntity({
      type: 'test_item',
      name: 'Test Item',
      icon: { svg: '<svg/>' },
      uri: ['id'],
      source: 'builtin',
    });
    const handlers = {
      resolve: async (id: Record<string, string>) => entities.find((e) => e.id === id['id']) ?? null,
      search: async (filters: { query?: string; limit?: number }) => {
        let results = [...entities];
        if (filters?.query) {
          const q = filters.query.toLowerCase();
          results = results.filter((e) => e.title.toLowerCase().includes(q));
        }
        return results.slice(0, filters?.limit ?? 20);
      },
    };
    return { def, handlers };
  }

  it('returns empty results when no entity registry', async () => {
    const result = await exec(GET_ENTITY, createContext(db), { uri: '@vienna//test/1' });
    expect(result.errors).toBeUndefined();
    expect(result.data!.entity).toBeNull();

    const listResult = await exec(GET_ENTITIES, createContext(db), { type: 'test' });
    expect(listResult.errors).toBeUndefined();
    expect(listResult.data!.entities).toEqual([]);
  });

  it('resolves entity by URI', async () => {
    const entityRegistry = new EntityRegistry();
    const { def, handlers } = makeTestEntity();
    entityRegistry.register(def);
    entityRegistry.registerHandlers(def.type, handlers);

    const result = await exec(GET_ENTITY, createContext(db, { entityRegistry }), {
      uri: '@vienna//test_item/e1',
    });
    expect(result.errors).toBeUndefined();
    const entity = result.data!.entity!;
    expect(entity.id).toBe('e1');
    expect(entity.type).toBe('test_item');
    expect(entity.title).toBe('Alpha Item');
  });

  it('lists entities by type', async () => {
    const entityRegistry = new EntityRegistry();
    const { def, handlers } = makeTestEntity();
    entityRegistry.register(def);
    entityRegistry.registerHandlers(def.type, handlers);

    const result = await exec(GET_ENTITIES, createContext(db, { entityRegistry }), {
      type: 'test_item',
    });
    expect(result.errors).toBeUndefined();
    expect(result.data!.entities).toHaveLength(2);
  });

  it('searches entities with query', async () => {
    const entityRegistry = new EntityRegistry();
    const { def, handlers } = makeTestEntity();
    entityRegistry.register(def);
    entityRegistry.registerHandlers(def.type, handlers);

    const result = await exec(SEARCH_ENTITIES, createContext(db, { entityRegistry }), {
      query: 'Alpha',
    });
    expect(result.errors).toBeUndefined();
    const entities = result.data!.entitySearch!;
    expect(entities).toHaveLength(1);
    expect(entities[0]!.title).toBe('Alpha Item');
  });

  it('discovers entity types', async () => {
    const entityRegistry = new EntityRegistry();
    const { def, handlers } = makeTestEntity();
    entityRegistry.register(def);
    entityRegistry.registerHandlers(def.type, handlers);

    const result = await exec(GET_ENTITY_TYPES, createContext(db, { entityRegistry }));
    expect(result.errors).toBeUndefined();
    const types = result.data!.entityTypes!;
    expect(types).toHaveLength(1);
    expect(types[0]!.type).toBe('test_item');
    expect(types[0]!.displayName).toBe('Test Item');
  });

  it('entities query does not let filters override explicit query/limit args', async () => {
    const entityRegistry = new EntityRegistry();
    let capturedFilters: Record<string, unknown> = {};
    const spyDef = defineEntity({
      type: 'test_spy',
      name: 'Test Spy',
      icon: { svg: '<svg/>' },
      uri: ['id'],
    });
    entityRegistry.register(spyDef);
    entityRegistry.registerHandlers(spyDef.type, {
      search: async (filters) => {
        capturedFilters = filters as Record<string, unknown>;
        return [];
      },
    });

    await exec(GET_ENTITIES, createContext(db, { entityRegistry }), {
      type: 'test_spy',
      query: 'real-query',
      limit: 5,
      filters: { query: 'sneaky', limit: 999 },
    });

    // Explicit args should win over filters spread
    expect(capturedFilters.query).toBe('real-query');
    expect(capturedFilters.limit).toBe(5);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Routine Domain
  // ─────────────────────────────────────────────────────────────────────────

  it('creates and queries a routine', async () => {
    const project = db.projects.create({ name: 'P' });

    const createResult = await exec(CREATE_ROUTINE, createContext(db), {
      input: {
        name: 'Daily Check',
        prompt: 'Check status',
        projectId: project.id,
        schedule: { type: 'interval', expression: '3600000' },
      },
    });
    expect(createResult.errors).toBeUndefined();
    const routine = createResult.data!.createRoutine!.routine!;
    expect(routine.name).toBe('Daily Check');
    expect(routine.status).toBe('active');
    expect(routine.runCount).toBe(0);
    expect(routine.schedule!.type).toBe('interval');

    // Query by ID
    const queryResult = await exec(GET_ROUTINE, createContext(db), { id: routine.id! });
    expect(queryResult.errors).toBeUndefined();
    expect(queryResult.data!.routine!.name).toBe('Daily Check');
  });

  it('lists all routines', async () => {
    const project = db.projects.create({ name: 'P' });
    db.routines.create({
      name: 'R1',
      prompt: 'p1',
      projectId: project.id,
      schedule: { type: 'interval', expression: '1000' },
    });
    db.routines.create({
      name: 'R2',
      prompt: 'p2',
      projectId: project.id,
      schedule: { type: 'cron', expression: '0 * * * *' },
    });

    const result = await exec(GET_ROUTINES, createContext(db));
    expect(result.errors).toBeUndefined();
    expect(result.data!.routines).toHaveLength(2);
  });

  it('resolves routine.workstream relationship', async () => {
    const project = db.projects.create({ name: 'P' });
    const routine = db.routines.create({
      name: 'R1',
      prompt: 'p1',
      projectId: project.id,
      schedule: { type: 'interval', expression: '1000' },
    });

    const result = await exec(GET_ROUTINE, createContext(db), { id: routine.id });
    expect(result.errors).toBeUndefined();
    const r = result.data!.routine!;
    expect(r.workstream).toBeTruthy();
    expect(r.workstream!.id).toBe(routine.workstreamId);
  });

  it('queries routine by workstream ID', async () => {
    const project = db.projects.create({ name: 'P' });
    const routine = db.routines.create({
      name: 'R1',
      prompt: 'p1',
      projectId: project.id,
      schedule: { type: 'interval', expression: '1000' },
    });

    const result = await exec(GET_ROUTINE_BY_WORKSTREAM, createContext(db), {
      workstreamId: routine.workstreamId,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data!.routineByWorkstreamId!.name).toBe('R1');
  });

  it('updates a routine', async () => {
    const project = db.projects.create({ name: 'P' });
    const routine = db.routines.create({
      name: 'Original',
      prompt: 'p',
      projectId: project.id,
      schedule: { type: 'interval', expression: '1000' },
    });

    const result = await exec(UPDATE_ROUTINE, createContext(db), {
      id: routine.id,
      input: { name: 'Updated' },
    });
    expect(result.errors).toBeUndefined();
    expect(result.data!.updateRoutine!.routine!.name).toBe('Updated');
  });

  it('pauses and resumes a routine', async () => {
    const project = db.projects.create({ name: 'P' });
    const routine = db.routines.create({
      name: 'R',
      prompt: 'p',
      projectId: project.id,
      schedule: { type: 'interval', expression: '1000' },
    });

    const pauseResult = await exec(PAUSE_ROUTINE, createContext(db), { id: routine.id });
    expect(pauseResult.errors).toBeUndefined();
    expect(pauseResult.data!.pauseRoutine!.routine!.status).toBe('paused');

    const resumeResult = await exec(RESUME_ROUTINE, createContext(db), { id: routine.id });
    expect(resumeResult.errors).toBeUndefined();
    expect(resumeResult.data!.resumeRoutine!.routine!.status).toBe('active');
  });

  it('deletes a routine and returns it for cache eviction', async () => {
    const project = db.projects.create({ name: 'P' });
    const routine = db.routines.create({
      name: 'R',
      prompt: 'p',
      projectId: project.id,
      schedule: { type: 'interval', expression: '1000' },
    });

    const result = await exec(DELETE_ROUTINE, createContext(db), { id: routine.id });
    expect(result.errors).toBeUndefined();
    const deleted = result.data!.deleteRoutine!.routine!;
    expect(deleted.id).toBe(routine.id);
    expect(deleted.name).toBe('R');
    expect(db.routines.getById(routine.id)).toBeNull();
  });

  it('runs routine now via context action and returns routine', async () => {
    const project = db.projects.create({ name: 'P' });
    const routine = db.routines.create({
      name: 'R',
      prompt: 'p',
      projectId: project.id,
      schedule: { type: 'interval', expression: '1000' },
    });
    const mockRoutine = createMockRoutineActions();

    const result = await exec(
      RUN_ROUTINE_NOW,
      createContext(db, { routine: mockRoutine }),
      { id: routine.id },
    );
    expect(result.errors).toBeUndefined();
    const returned = result.data!.runRoutineNow!.routine!;
    expect(returned.id).toBe(routine.id);
    expect(mockRoutine.execute).toHaveBeenCalledWith(routine.id, 'manual');
  });

  it('returns error when runRoutineNow called without routine context', async () => {
    const result = await exec(RUN_ROUTINE_NOW, createContext(db), { id: 'some-id' });
    expect(result.errors).toHaveLength(1);
    expect(result.errors![0]!.message).toBe('Routine executor not available');
  });

  it('queries routine run history', async () => {
    const project = db.projects.create({ name: 'P' });
    const routine = db.routines.create({
      name: 'R',
      prompt: 'p',
      projectId: project.id,
      schedule: { type: 'interval', expression: '1000' },
    });
    const run = db.routines.createRun(routine.id, 'manual');
    db.routines.completeRun(run.id, 'completed', 'All good');

    const result = await exec(GET_ROUTINE_RUN_HISTORY, createContext(db), {
      routineId: routine.id,
    });
    expect(result.errors).toBeUndefined();
    const runs = result.data!.routineRunHistory!;
    expect(runs).toHaveLength(1);
    expect(runs[0]!.status).toBe('completed');
    expect(runs[0]!.triggeredBy).toBe('manual');
    expect(runs[0]!.summary).toBe('All good');
  });

  it('queries latest routine run', async () => {
    const project = db.projects.create({ name: 'P' });
    const routine = db.routines.create({
      name: 'R',
      prompt: 'p',
      projectId: project.id,
      schedule: { type: 'interval', expression: '1000' },
    });
    const run = db.routines.createRun(routine.id, 'schedule');
    db.routines.completeRun(run.id, 'failed', undefined, 'Timeout');

    const result = await exec(GET_ROUTINE_LATEST_RUN, createContext(db), {
      routineId: routine.id,
    });
    expect(result.errors).toBeUndefined();
    const latest = result.data!.routineLatestRun!;
    expect(latest.status).toBe('failed');
    expect(latest.error).toBe('Timeout');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Workstream Agent Commands (mock WorkstreamActions)
  // ─────────────────────────────────────────────────────────────────────────

  it('sendWorkstreamMessage calls ctx.workstream.sendMessage and returns workstream', async () => {
    const project = db.projects.create({ name: 'P' });
    const ws = db.workstreams.create({ projectId: project.id, title: 'WS' });
    const mockWs = createMockWorkstreamActions();

    const result = await exec(
      SEND_WORKSTREAM_MESSAGE,
      createContext(db, { workstream: mockWs }),
      { workstreamId: ws.id, text: 'Hello agent' },
    );
    expect(result.errors).toBeUndefined();
    const returned = result.data!.sendWorkstreamMessage!.workstream!;
    expect(returned.id).toBe(ws.id);
    expect(mockWs.sendMessage).toHaveBeenCalledWith(ws.id, 'Hello agent');
  });

  it('stopWorkstreamAgent calls ctx.workstream.stopAgent and returns workstream', async () => {
    const project = db.projects.create({ name: 'P' });
    const ws = db.workstreams.create({ projectId: project.id, title: 'WS' });
    const mockWs = createMockWorkstreamActions();

    const result = await exec(
      STOP_WORKSTREAM_AGENT,
      createContext(db, { workstream: mockWs }),
      { id: ws.id },
    );
    expect(result.errors).toBeUndefined();
    expect(result.data!.stopWorkstreamAgent!.workstream!.id).toBe(ws.id);
    expect(mockWs.stopAgent).toHaveBeenCalledWith(ws.id);
  });

  it('restartWorkstreamAgent calls ctx.workstream.restartAgent and returns workstream', async () => {
    const project = db.projects.create({ name: 'P' });
    const ws = db.workstreams.create({ projectId: project.id, title: 'WS' });
    const mockWs = createMockWorkstreamActions();

    const result = await exec(
      RESTART_WORKSTREAM_AGENT,
      createContext(db, { workstream: mockWs }),
      { id: ws.id },
    );
    expect(result.errors).toBeUndefined();
    expect(result.data!.restartWorkstreamAgent!.workstream!.id).toBe(ws.id);
    expect(mockWs.restartAgent).toHaveBeenCalledWith(ws.id);
  });

  it('interruptWorkstreamAgent calls ctx.workstream.interrupt and returns workstream', async () => {
    const project = db.projects.create({ name: 'P' });
    const ws = db.workstreams.create({ projectId: project.id, title: 'WS' });
    const mockWs = createMockWorkstreamActions();

    const result = await exec(
      INTERRUPT_WORKSTREAM_AGENT,
      createContext(db, { workstream: mockWs }),
      { id: ws.id },
    );
    expect(result.errors).toBeUndefined();
    expect(result.data!.interruptWorkstreamAgent!.workstream!.id).toBe(ws.id);
    expect(mockWs.interrupt).toHaveBeenCalledWith(ws.id);
  });

  it('setWorkstreamInFocus calls ctx.workstream.setInFocus with null to clear', async () => {
    const mockWs = createMockWorkstreamActions();
    const result = await exec(
      SET_WORKSTREAM_IN_FOCUS,
      createContext(db, { workstream: mockWs }),
      { id: null },
    );
    expect(result.errors).toBeUndefined();
    expect(result.data!.setWorkstreamInFocus!.workstream).toBeNull();
    expect(mockWs.setInFocus).toHaveBeenCalledWith(null);
  });

  it('isWorkstreamAgentRunning queries agent state', async () => {
    const mockWs = createMockWorkstreamActions();
    (mockWs.isAgentRunning as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const result = await exec(
      IS_WORKSTREAM_AGENT_RUNNING,
      createContext(db, { workstream: mockWs }),
      { id: 'ws-123' },
    );
    expect(result.errors).toBeUndefined();
    expect(result.data!.isWorkstreamAgentRunning).toBe(true);
    expect(mockWs.isAgentRunning).toHaveBeenCalledWith('ws-123');
  });

  it('returns error when agent command called without workstream context', async () => {
    const result = await exec(STOP_WORKSTREAM_AGENT, createContext(db), { id: 'ws-1' });
    expect(result.errors).toHaveLength(1);
    expect(result.errors![0]!.message).toBe('Workstream manager not available');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Workstream Hybrid Mutations (DB + agent side-effect)
  // ─────────────────────────────────────────────────────────────────────────

  it('switchWorkstreamModel persists in DB and calls agent', async () => {
    const project = db.projects.create({ name: 'P' });
    const ws = db.workstreams.create({ projectId: project.id, title: 'WS' });
    const mockWs = createMockWorkstreamActions();

    const result = await exec(
      SWITCH_WORKSTREAM_MODEL,
      createContext(db, { workstream: mockWs }),
      { id: ws.id, model: 'claude-sonnet-4-6' },
    );
    expect(result.errors).toBeUndefined();
    expect(result.data!.switchWorkstreamModel!.workstream!.model).toBe('claude-sonnet-4-6');
    expect(mockWs.switchModel).toHaveBeenCalledWith(ws.id, 'claude-sonnet-4-6');

    // Verify DB persisted
    expect(db.workstreams.getById(ws.id)?.model).toBe('claude-sonnet-4-6');
  });

  it('linkWorkstreamEntity persists in DB, calls agent, and returns workstream', async () => {
    const project = db.projects.create({ name: 'P' });
    const ws = db.workstreams.create({ projectId: project.id, title: 'WS' });
    const mockWs = createMockWorkstreamActions();

    const result = await exec(
      LINK_WORKSTREAM_ENTITY,
      createContext(db, { workstream: mockWs }),
      {
        workstreamId: ws.id,
        entityUri: '@vienna//github_pr/org/repo/42',
        entityType: 'github_pr',
        entityTitle: 'Fix bug #42',
      },
    );
    expect(result.errors).toBeUndefined();
    expect(result.data!.linkWorkstreamEntity!.workstream!.id).toBe(ws.id);
    expect(mockWs.linkEntity).toHaveBeenCalledWith(
      ws.id,
      '@vienna//github_pr/org/repo/42',
      'github_pr',
      'Fix bug #42',
    );

    // Verify DB persisted
    const linked = db.workstreamLinkedEntities.getByWorkstream(ws.id);
    expect(linked).toHaveLength(1);
    expect(linked[0]!.entityUri).toBe('@vienna//github_pr/org/repo/42');
  });

  it('unlinkWorkstreamEntity removes from DB, calls agent, and returns workstream', async () => {
    const project = db.projects.create({ name: 'P' });
    const ws = db.workstreams.create({ projectId: project.id, title: 'WS' });
    db.workstreamLinkedEntities.link(ws.id, '@vienna//slack/C123', 'slack_channel');
    const mockWs = createMockWorkstreamActions();

    const result = await exec(
      UNLINK_WORKSTREAM_ENTITY,
      createContext(db, { workstream: mockWs }),
      { workstreamId: ws.id, entityUri: '@vienna//slack/C123' },
    );
    expect(result.errors).toBeUndefined();
    expect(result.data!.unlinkWorkstreamEntity!.workstream!.id).toBe(ws.id);
    expect(mockWs.unlinkEntity).toHaveBeenCalledWith(ws.id, '@vienna//slack/C123');
    expect(db.workstreamLinkedEntities.getByWorkstream(ws.id)).toHaveLength(0);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Workstream Data Operations (DB only)
  // ─────────────────────────────────────────────────────────────────────────

  it('queries workstream linked entities', async () => {
    const project = db.projects.create({ name: 'P' });
    const ws = db.workstreams.create({ projectId: project.id, title: 'WS' });
    db.workstreamLinkedEntities.link(ws.id, '@vienna//github_pr/org/repo/1', 'github_pr', 'PR #1');
    db.workstreamLinkedEntities.link(ws.id, '@vienna//slack/C123', 'slack_channel', '#general');

    const result = await exec(GET_WORKSTREAM_LINKED_ENTITIES, createContext(db), {
      workstreamId: ws.id,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data!.workstreamLinkedEntities).toHaveLength(2);
  });

  it('sets linked entity context override and returns workstream', async () => {
    const project = db.projects.create({ name: 'P' });
    const ws = db.workstreams.create({ projectId: project.id, title: 'WS' });
    db.workstreamLinkedEntities.link(ws.id, '@vienna//github_pr/org/repo/1', 'github_pr');

    const result = await exec(SET_LINKED_ENTITY_CONTEXT_OVERRIDE, createContext(db), {
      workstreamId: ws.id,
      entityUri: '@vienna//github_pr/org/repo/1',
      contextOverride: 'Focus on the performance impact',
    });
    expect(result.errors).toBeUndefined();
    expect(result.data!.setLinkedEntityContextOverride!.workstream!.id).toBe(ws.id);

    const linked = db.workstreamLinkedEntities.getByWorkstream(ws.id);
    expect(linked[0]!.contextOverride).toBe('Focus on the performance impact');
  });

  it('adds and removes workstream directories, returning workstream', async () => {
    const project = db.projects.create({ name: 'P' });
    const ws = db.workstreams.create({ projectId: project.id, title: 'WS' });

    // Add
    const addResult = await exec(ADD_WORKSTREAM_DIRECTORY, createContext(db), {
      workstreamId: ws.id,
      path: '/Users/test/project',
      label: 'My Project',
    });
    expect(addResult.errors).toBeUndefined();
    expect(addResult.data!.addWorkstreamDirectory!.workstream!.id).toBe(ws.id);

    // Query
    const queryResult = await exec(GET_WORKSTREAM_DIRECTORIES, createContext(db), {
      workstreamId: ws.id,
    });
    expect(queryResult.errors).toBeUndefined();
    const dirs = queryResult.data!.workstreamDirectories!;
    expect(dirs).toHaveLength(1);
    expect(dirs[0]!.path).toBe('/Users/test/project');
    expect(dirs[0]!.label).toBe('My Project');

    // Remove
    const removeResult = await exec(REMOVE_WORKSTREAM_DIRECTORY, createContext(db), {
      workstreamId: ws.id,
      path: '/Users/test/project',
    });
    expect(removeResult.errors).toBeUndefined();
    expect(removeResult.data!.removeWorkstreamDirectory!.workstream!.id).toBe(ws.id);
    expect(db.workstreamDirectories.getByWorkstream(ws.id)).toHaveLength(0);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Settings Domain
  // ─────────────────────────────────────────────────────────────────────────

  it('has settings query and mutation fields', () => {
    const queryFields = schema.getQueryType()?.getFields();
    expect(queryFields).toHaveProperty('settings');

    const mutationFields = schema.getMutationType()?.getFields();
    expect(mutationFields).toHaveProperty('updateAppearanceSettings');
    expect(mutationFields).toHaveProperty('updateAiSettings');
    expect(mutationFields).toHaveProperty('updateAdvancedSettings');
  });

  it('returns default settings', async () => {
    const result = await exec(GET_SETTINGS, createContext(db));
    expect(result.errors).toBeUndefined();
    const s = result.data!.settings!;
    expect(s.appearance!.theme).toBe('system');
    expect(s.appearance!.fontSize).toBe(14);
    expect(s.appearance!.compactMode).toBe(false);
    expect(s.ai!.defaultModel).toBe('sonnet');
    expect(s.ai!.cliPath).toBeNull();
    expect(s.advanced!.developerMode).toBeNull();
    expect(s.advanced!.autoCompactPercent).toBeNull();
  });

  it('updates appearance settings and returns full settings', async () => {
    const result = await exec(UPDATE_APPEARANCE_SETTINGS, createContext(db), {
      input: { theme: 'dark' as const, fontSize: 18 },
    });
    expect(result.errors).toBeUndefined();
    const s = result.data!.updateAppearanceSettings!;
    expect(s.appearance!.theme).toBe('dark');
    expect(s.appearance!.fontSize).toBe(18);
    expect(s.appearance!.compactMode).toBe(false); // unchanged default
    expect(s.ai!.defaultModel).toBe('sonnet'); // cross-category preserved
  });

  it('updates AI settings', async () => {
    const result = await exec(UPDATE_AI_SETTINGS, createContext(db), {
      input: { defaultModel: 'opus' as const, cliSetupComplete: true },
    });
    expect(result.errors).toBeUndefined();
    const ai = result.data!.updateAiSettings!.ai!;
    expect(ai.defaultModel).toBe('opus');
    expect(ai.cliSetupComplete).toBe(true);
    expect(ai.cliPath).toBeNull(); // default preserved
  });

  it('updates advanced settings', async () => {
    const result = await exec(UPDATE_ADVANCED_SETTINGS, createContext(db), {
      input: { developerMode: true },
    });
    expect(result.errors).toBeUndefined();
    const adv = result.data!.updateAdvancedSettings!.advanced!;
    expect(adv.developerMode).toBe(true);
    expect(adv.focusMonitorEnabled).toBe(false); // default preserved
  });

  it('settings mutations are persistent across queries', async () => {
    // Update
    await exec(UPDATE_APPEARANCE_SETTINGS, createContext(db), {
      input: { theme: 'light' as const },
    });

    // Query should reflect the update
    const result = await exec(GET_SETTINGS, createContext(db));
    expect(result.errors).toBeUndefined();
    expect(result.data!.settings!.appearance!.theme).toBe('light');
  });

  it('cross-category updates are independent', async () => {
    await exec(UPDATE_APPEARANCE_SETTINGS, createContext(db), {
      input: { theme: 'dark' as const },
    });
    await exec(UPDATE_AI_SETTINGS, createContext(db), {
      input: { defaultModel: 'haiku' as const },
    });

    const result = await exec(GET_SETTINGS, createContext(db));
    expect(result.errors).toBeUndefined();
    const s = result.data!.settings!;
    expect(s.appearance!.theme).toBe('dark');
    expect(s.ai!.defaultModel).toBe('haiku');
    expect(s.advanced!.developerMode).toBe(false); // untouched
  });

  it('rejects invalid appearance settings via Zod validation', async () => {
    const result = await exec(UPDATE_APPEARANCE_SETTINGS, createContext(db), {
      input: { fontSize: 5 },
    });
    expect(result.errors).toHaveLength(1);
  });
});
