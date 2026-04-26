/**
 * Tests for tag GraphQL mutations.
 *
 * Uses a real in-memory SQLite database and real TagFileStore to test
 * the full resolver chain for tag mutations.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as os from 'node:os';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Database } from 'better-sqlite3';
import { openAppDatabase, closeAppDatabase, createAppDb, TagFileStore } from '@vienna/app-db';
import type { AppDb } from '@vienna/app-db';
import { execute, parse } from 'graphql';
import { schema } from '../../../schema';
import type { GraphQLContext, TagActions } from '../../../schema/builder';

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

let rawDb: Database;
let db: AppDb;
let tagFileStore: TagFileStore;
let tmpDir: string;
let projectId: string;
let mockTag: TagActions;

beforeEach(() => {
  rawDb = openAppDatabase({ path: ':memory:' });
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tag-mutations-test-'));
  db = createAppDb(rawDb, path.join(tmpDir, 'settings.json'));
  tagFileStore = new TagFileStore(tmpDir);
  projectId = db.projects.create({ name: 'Test Project' }).id;

  mockTag = {
    executePipeline: vi.fn().mockResolvedValue('run-1'),
    onTagCompleted: vi.fn().mockResolvedValue(undefined),
    onTagFailed: vi.fn().mockResolvedValue(undefined),
  };
});

afterEach(() => {
  closeAppDatabase(rawDb);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function makeContext(overrides?: Partial<GraphQLContext>): GraphQLContext {
  return {
    db,
    userId: null,
    tagFileStore,
    tag: mockTag,
    ...overrides,
  };
}

function addTagDefinition(name: string, instructions: string, opts?: { dependsOn?: string[] }) {
  const tags = tagFileStore.getForProject(projectId);
  tags.push({
    name,
    instructions,
    color: '#3B82F6',
    maxDepth: 3,
    spawnWorkstream: false,
    worktreeMode: 'same',
    dependsOn: opts?.dependsOn ?? [],
  });
  tagFileStore.setForProject(projectId, tags);
}

async function gql(query: string, variables?: Record<string, unknown>, ctx?: GraphQLContext) {
  const result = await execute({
    schema,
    document: parse(query),
    variableValues: variables,
    contextValue: ctx ?? makeContext(),
  });
  if (result.errors && result.errors.length > 0) {
    throw new Error(result.errors.map((e) => e.message).join(', '));
  }
  return result.data!;
}

// ─────────────────────────────────────────────────────────────────────────────
// completeWorkstreamTag
// ─────────────────────────────────────────────────────────────────────────────

describe('completeWorkstreamTag', () => {
  const COMPLETE_TAG = `
    mutation CompleteTag($workstreamId: ID!, $tagName: String!, $status: WorkstreamTagCompletionStatus!, $error: String) {
      completeWorkstreamTag(workstreamId: $workstreamId, tagName: $tagName, status: $status, error: $error) {
        workstreamTag {
          id
          tagName
          status
          completedAt
          error
        }
        alreadyTerminal
      }
    }
  `;

  it('completes a running tag as completed', async () => {
    const ws = db.workstreams.create({ projectId, title: 'WS' });
    addTagDefinition('deploy', 'deploy instructions');
    db.tags.applyTag(ws.id, tagFileStore.getByName(projectId, 'deploy')!, 'manual');
    // Transition to running
    const wsTag = db.tags.getWorkstreamTags(ws.id)[0];
    db.tags.claimPendingTag(wsTag.id);

    const data = await gql(COMPLETE_TAG, {
      workstreamId: ws.id,
      tagName: 'deploy',
      status: 'completed',
    });

    const result = data.completeWorkstreamTag as any;
    expect(result.alreadyTerminal).toBe(false);
    expect(result.workstreamTag.status).toBe('completed');
    expect(result.workstreamTag.completedAt).toBeTruthy();
    expect(result.workstreamTag.error).toBeNull();
  });

  it('completes a running tag as failed with error message', async () => {
    const ws = db.workstreams.create({ projectId, title: 'WS' });
    addTagDefinition('deploy', 'deploy instructions');
    db.tags.applyTag(ws.id, tagFileStore.getByName(projectId, 'deploy')!, 'manual');
    const wsTag = db.tags.getWorkstreamTags(ws.id)[0];
    db.tags.claimPendingTag(wsTag.id);

    const data = await gql(COMPLETE_TAG, {
      workstreamId: ws.id,
      tagName: 'deploy',
      status: 'failed',
      error: 'Build failed with exit code 1',
    });

    const result = data.completeWorkstreamTag as any;
    expect(result.alreadyTerminal).toBe(false);
    expect(result.workstreamTag.status).toBe('failed');
    expect(result.workstreamTag.error).toBe('Build failed with exit code 1');
  });

  it('completes a pending tag (skipping running state)', async () => {
    const ws = db.workstreams.create({ projectId, title: 'WS' });
    addTagDefinition('deploy', 'deploy instructions');
    db.tags.applyTag(ws.id, tagFileStore.getByName(projectId, 'deploy')!, 'manual');

    const data = await gql(COMPLETE_TAG, {
      workstreamId: ws.id,
      tagName: 'deploy',
      status: 'completed',
    });

    const result = data.completeWorkstreamTag as any;
    expect(result.alreadyTerminal).toBe(false);
    expect(result.workstreamTag.status).toBe('completed');
  });

  it('returns alreadyTerminal=true for already-completed tag', async () => {
    const ws = db.workstreams.create({ projectId, title: 'WS' });
    addTagDefinition('deploy', 'deploy instructions');
    db.tags.applyTag(ws.id, tagFileStore.getByName(projectId, 'deploy')!, 'manual');
    const wsTag = db.tags.getWorkstreamTags(ws.id)[0];
    db.tags.claimPendingTag(wsTag.id);
    db.tags.completeWorkstreamTag(wsTag.id, 'completed');

    const data = await gql(COMPLETE_TAG, {
      workstreamId: ws.id,
      tagName: 'deploy',
      status: 'failed', // try to fail an already-completed tag
    });

    const result = data.completeWorkstreamTag as any;
    expect(result.alreadyTerminal).toBe(true);
    expect(result.workstreamTag.status).toBe('completed'); // unchanged
  });

  it('returns alreadyTerminal=true for already-failed tag', async () => {
    const ws = db.workstreams.create({ projectId, title: 'WS' });
    addTagDefinition('deploy', 'deploy instructions');
    db.tags.applyTag(ws.id, tagFileStore.getByName(projectId, 'deploy')!, 'manual');
    const wsTag = db.tags.getWorkstreamTags(ws.id)[0];
    db.tags.claimPendingTag(wsTag.id);
    db.tags.completeWorkstreamTag(wsTag.id, 'failed', 'some error');

    const data = await gql(COMPLETE_TAG, {
      workstreamId: ws.id,
      tagName: 'deploy',
      status: 'completed', // try to complete an already-failed tag
    });

    const result = data.completeWorkstreamTag as any;
    expect(result.alreadyTerminal).toBe(true);
    expect(result.workstreamTag.status).toBe('failed'); // unchanged
  });

  it('throws when tag is not applied to workstream', async () => {
    const ws = db.workstreams.create({ projectId, title: 'WS' });

    await expect(
      gql(COMPLETE_TAG, {
        workstreamId: ws.id,
        tagName: 'nonexistent',
        status: 'completed',
      }),
    ).rejects.toThrow('not applied');
  });

  it('advances the DAG pipeline via ctx.tag.onTagCompleted', async () => {
    const ws = db.workstreams.create({ projectId, title: 'WS' });
    addTagDefinition('deploy', 'deploy instructions');
    db.tags.applyTag(ws.id, tagFileStore.getByName(projectId, 'deploy')!, 'manual');
    const wsTag = db.tags.getWorkstreamTags(ws.id)[0];
    db.tags.claimPendingTag(wsTag.id);

    await gql(COMPLETE_TAG, {
      workstreamId: ws.id,
      tagName: 'deploy',
      status: 'completed',
    });

    expect(mockTag.onTagCompleted).toHaveBeenCalledWith(ws.id, 'deploy');
    expect(mockTag.onTagFailed).not.toHaveBeenCalled();
  });

  it('advances the DAG pipeline via ctx.tag.onTagFailed', async () => {
    const ws = db.workstreams.create({ projectId, title: 'WS' });
    addTagDefinition('deploy', 'deploy instructions');
    db.tags.applyTag(ws.id, tagFileStore.getByName(projectId, 'deploy')!, 'manual');
    const wsTag = db.tags.getWorkstreamTags(ws.id)[0];
    db.tags.claimPendingTag(wsTag.id);

    await gql(COMPLETE_TAG, {
      workstreamId: ws.id,
      tagName: 'deploy',
      status: 'failed',
      error: 'oops',
    });

    expect(mockTag.onTagFailed).toHaveBeenCalledWith(ws.id, 'deploy');
    expect(mockTag.onTagCompleted).not.toHaveBeenCalled();
  });

  it('does not call pipeline advancement for already-terminal tags', async () => {
    const ws = db.workstreams.create({ projectId, title: 'WS' });
    addTagDefinition('deploy', 'deploy instructions');
    db.tags.applyTag(ws.id, tagFileStore.getByName(projectId, 'deploy')!, 'manual');
    const wsTag = db.tags.getWorkstreamTags(ws.id)[0];
    db.tags.claimPendingTag(wsTag.id);
    db.tags.completeWorkstreamTag(wsTag.id, 'completed');

    await gql(COMPLETE_TAG, {
      workstreamId: ws.id,
      tagName: 'deploy',
      status: 'completed',
    });

    expect(mockTag.onTagCompleted).not.toHaveBeenCalled();
    expect(mockTag.onTagFailed).not.toHaveBeenCalled();
  });

  it('propagates status to source workstream for delegated tags', async () => {
    // Set up delegation: source workstream has a tag, delegated workstream has a backlinked tag
    const sourceWs = db.workstreams.create({ projectId, title: 'Source' });
    const delegatedWs = db.workstreams.create({ projectId, title: 'Delegated' });

    addTagDefinition('deploy', 'deploy instructions');
    const tagDef = tagFileStore.getByName(projectId, 'deploy')!;

    // Apply tag to source workstream
    const sourceWsTag = db.tags.applyTag(sourceWs.id, tagDef, 'manual');
    db.tags.claimPendingTag(sourceWsTag.id);

    // Apply delegated tag with backlink
    const delegatedWsTag = db.tags.applyTagWithSource(delegatedWs.id, tagDef, 'pipeline', sourceWsTag.id);
    db.tags.claimPendingTag(delegatedWsTag.id);

    // Complete the delegated tag
    await gql(COMPLETE_TAG, {
      workstreamId: delegatedWs.id,
      tagName: 'deploy',
      status: 'completed',
    });

    // Source tag should also be completed
    const updatedSourceTag = db.tags.getWorkstreamTagById(sourceWsTag.id);
    expect(updatedSourceTag!.status).toBe('completed');

    // Pipeline should be advanced on both workstreams
    expect(mockTag.onTagCompleted).toHaveBeenCalledWith(sourceWs.id, 'deploy');
    expect(mockTag.onTagCompleted).toHaveBeenCalledWith(delegatedWs.id, 'deploy');
  });

  it('propagates failure to source workstream for delegated tags', async () => {
    const sourceWs = db.workstreams.create({ projectId, title: 'Source' });
    const delegatedWs = db.workstreams.create({ projectId, title: 'Delegated' });

    addTagDefinition('deploy', 'deploy instructions');
    const tagDef = tagFileStore.getByName(projectId, 'deploy')!;

    const sourceWsTag = db.tags.applyTag(sourceWs.id, tagDef, 'manual');
    db.tags.claimPendingTag(sourceWsTag.id);

    const delegatedWsTag = db.tags.applyTagWithSource(delegatedWs.id, tagDef, 'pipeline', sourceWsTag.id);
    db.tags.claimPendingTag(delegatedWsTag.id);

    await gql(COMPLETE_TAG, {
      workstreamId: delegatedWs.id,
      tagName: 'deploy',
      status: 'failed',
      error: 'deployment error',
    });

    const updatedSourceTag = db.tags.getWorkstreamTagById(sourceWsTag.id);
    expect(updatedSourceTag!.status).toBe('failed');
    expect(updatedSourceTag!.error).toBe('deployment error');

    expect(mockTag.onTagFailed).toHaveBeenCalledWith(sourceWs.id, 'deploy');
    expect(mockTag.onTagFailed).toHaveBeenCalledWith(delegatedWs.id, 'deploy');
  });

  it('does not propagate to source when source tag is already terminal', async () => {
    const sourceWs = db.workstreams.create({ projectId, title: 'Source' });
    const delegatedWs = db.workstreams.create({ projectId, title: 'Delegated' });

    addTagDefinition('deploy', 'deploy instructions');
    const tagDef = tagFileStore.getByName(projectId, 'deploy')!;

    const sourceWsTag = db.tags.applyTag(sourceWs.id, tagDef, 'manual');
    db.tags.claimPendingTag(sourceWsTag.id);
    db.tags.completeWorkstreamTag(sourceWsTag.id, 'completed'); // already completed

    const delegatedWsTag = db.tags.applyTagWithSource(delegatedWs.id, tagDef, 'pipeline', sourceWsTag.id);
    db.tags.claimPendingTag(delegatedWsTag.id);

    await gql(COMPLETE_TAG, {
      workstreamId: delegatedWs.id,
      tagName: 'deploy',
      status: 'completed',
    });

    // Source tag should still be completed (not double-completed)
    const updatedSourceTag = db.tags.getWorkstreamTagById(sourceWsTag.id);
    expect(updatedSourceTag!.status).toBe('completed');

    // Pipeline advancement should only be called for the delegated workstream, not the source
    expect(mockTag.onTagCompleted).toHaveBeenCalledTimes(1);
    expect(mockTag.onTagCompleted).toHaveBeenCalledWith(delegatedWs.id, 'deploy');
  });

  it('works without ctx.tag (no pipeline advancement)', async () => {
    const ws = db.workstreams.create({ projectId, title: 'WS' });
    addTagDefinition('deploy', 'deploy instructions');
    db.tags.applyTag(ws.id, tagFileStore.getByName(projectId, 'deploy')!, 'manual');
    const wsTag = db.tags.getWorkstreamTags(ws.id)[0];
    db.tags.claimPendingTag(wsTag.id);

    // Use context without tag actions
    const data = await gql(
      COMPLETE_TAG,
      { workstreamId: ws.id, tagName: 'deploy', status: 'completed' },
      makeContext({ tag: undefined }),
    );

    const result = data.completeWorkstreamTag as any;
    expect(result.workstreamTag.status).toBe('completed');
    // No error thrown — just no pipeline advancement
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// applyTagToWorkstream (via pipeline)
// ─────────────────────────────────────────────────────────────────────────────

describe('applyTagToWorkstream', () => {
  const APPLY_TAG = `
    mutation ApplyTag($workstreamId: ID!, $tagName: String!) {
      applyTagToWorkstream(workstreamId: $workstreamId, tagName: $tagName) {
        workstreamTag {
          id
          tagName
          status
        }
        pipelineRunId
      }
    }
  `;

  it('applies a tag via pipeline when ctx.tag is available', async () => {
    const ws = db.workstreams.create({ projectId, title: 'WS' });
    addTagDefinition('deploy', 'deploy instructions');

    const data = await gql(APPLY_TAG, {
      workstreamId: ws.id,
      tagName: 'deploy',
    });

    const result = data.applyTagToWorkstream as any;
    expect(result.pipelineRunId).toBe('run-1');
    expect(mockTag.executePipeline).toHaveBeenCalledWith(ws.id, ['deploy'], 'manual', projectId);
  });

  it('falls back to direct snapshot when ctx.tag is unavailable', async () => {
    const ws = db.workstreams.create({ projectId, title: 'WS' });
    addTagDefinition('deploy', 'deploy instructions');

    const data = await gql(
      APPLY_TAG,
      { workstreamId: ws.id, tagName: 'deploy' },
      makeContext({ tag: undefined }),
    );

    const result = data.applyTagToWorkstream as any;
    expect(result.pipelineRunId).toBeNull();
    expect(result.workstreamTag.tagName).toBe('deploy');
    expect(result.workstreamTag.status).toBe('pending');
  });

  it('throws when tagFileStore is unavailable', async () => {
    const ws = db.workstreams.create({ projectId, title: 'WS' });
    addTagDefinition('deploy', 'deploy instructions');

    await expect(
      gql(
        APPLY_TAG,
        { workstreamId: ws.id, tagName: 'deploy' },
        makeContext({ tagFileStore: undefined }),
      ),
    ).rejects.toThrow('Tag file store not available');
  });

  it('throws for non-existent workstream', async () => {
    addTagDefinition('deploy', 'deploy instructions');

    await expect(
      gql(APPLY_TAG, { workstreamId: 'nonexistent', tagName: 'deploy' }),
    ).rejects.toThrow('Workstream not found');
  });

  it('throws for non-existent tag', async () => {
    const ws = db.workstreams.create({ projectId, title: 'WS' });

    await expect(
      gql(APPLY_TAG, { workstreamId: ws.id, tagName: 'nonexistent' }),
    ).rejects.toThrow('Tag not found');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// removeTagFromWorkstream
// ─────────────────────────────────────────────────────────────────────────────

describe('removeTagFromWorkstream', () => {
  const REMOVE_TAG = `
    mutation RemoveTag($workstreamId: ID!, $tagName: String!) {
      removeTagFromWorkstream(workstreamId: $workstreamId, tagName: $tagName) {
        success
      }
    }
  `;

  it('removes an applied tag', async () => {
    const ws = db.workstreams.create({ projectId, title: 'WS' });
    addTagDefinition('deploy', 'deploy instructions');
    db.tags.applyTag(ws.id, tagFileStore.getByName(projectId, 'deploy')!, 'manual');

    const data = await gql(REMOVE_TAG, {
      workstreamId: ws.id,
      tagName: 'deploy',
    });

    expect((data.removeTagFromWorkstream as any).success).toBe(true);
    expect(db.tags.getWorkstreamTags(ws.id)).toHaveLength(0);
  });

  it('returns false when tag is not applied', async () => {
    const ws = db.workstreams.create({ projectId, title: 'WS' });

    const data = await gql(REMOVE_TAG, {
      workstreamId: ws.id,
      tagName: 'nonexistent',
    });

    expect((data.removeTagFromWorkstream as any).success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// workstreamTags query
// ─────────────────────────────────────────────────────────────────────────────

describe('workstreamTags query', () => {
  const GET_TAGS = `
    query GetTags($workstreamId: ID!) {
      workstreamTags(workstreamId: $workstreamId) {
        id
        tagName
        status
        appliedBy
        depth
        error
      }
    }
  `;

  it('returns all tags applied to a workstream', async () => {
    const ws = db.workstreams.create({ projectId, title: 'WS' });
    addTagDefinition('deploy', 'deploy');
    addTagDefinition('test', 'test');
    db.tags.applyTag(ws.id, tagFileStore.getByName(projectId, 'deploy')!, 'manual');
    db.tags.applyTag(ws.id, tagFileStore.getByName(projectId, 'test')!, 'agent');

    const data = await gql(GET_TAGS, { workstreamId: ws.id });

    const tags = data.workstreamTags as any[];
    expect(tags).toHaveLength(2);
    const names = tags.map((t: any) => t.tagName).sort();
    expect(names).toEqual(['deploy', 'test']);
  });

  it('returns empty array for workstream with no tags', async () => {
    const ws = db.workstreams.create({ projectId, title: 'WS' });

    const data = await gql(GET_TAGS, { workstreamId: ws.id });

    expect(data.workstreamTags).toEqual([]);
  });
});
