import { describe, it, expect } from 'vitest';
import type { WorkstreamRecord, WorkstreamGroupRecord, GroupLinkedEntityRecord, DirectoryWithBranchInfo, WorkstreamLinkedEntityRecord } from '@vienna/app-db';
import {
  buildWorkstreamSessionConfig,
  buildLinkedEntityContext,
  buildDirectoryContext,
  buildGroupAwarenessContext,
  mergeLinkedEntities,
  type SiblingWorkstreamSummary,
} from './context-builder';

function makeWorkstream(overrides: Partial<WorkstreamRecord> = {}): WorkstreamRecord {
  return {
    id: 'ws-1',
    projectId: 'proj-1',
    groupId: null,
    title: 'Test Workstream',
    status: 'idle',
    model: 'claude-sonnet',
    isPinned: false,
    isRoutineWorkstream: false,
    activeSessionId: null,
    messageCount: 0,
    lastActivityAt: null,
    archivedAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makeGroup(overrides: Partial<WorkstreamGroupRecord> = {}): WorkstreamGroupRecord {
  return {
    id: 'group-1',
    projectId: 'proj-1',
    name: 'Feature ABC',
    isPinned: false,
    autoCreateWorktrees: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makeGroupEntity(uri: string, type: string, title?: string): GroupLinkedEntityRecord {
  return {
    groupId: 'group-1',
    entityUri: uri,
    entityType: type,
    entityTitle: title ?? null,
    contextOverride: null,
    createdAt: Date.now(),
  };
}

function makeSibling(id: string, title: string, status = 'idle'): SiblingWorkstreamSummary {
  return { id, title, status };
}

function makeDir(path: string, overrides: Partial<DirectoryWithBranchInfo> = {}): DirectoryWithBranchInfo {
  return {
    path,
    effectivePath: path,
    label: null,
    branch: null,
    baseBranch: 'main',
    worktreePath: null,
    isInherited: false,
    ...overrides,
  };
}

function makeEntity(uri: string, type: string, title?: string): WorkstreamLinkedEntityRecord {
  return {
    workstreamId: 'ws-1',
    entityUri: uri,
    entityType: type,
    entityTitle: title ?? null,
    contextOverride: null,
    createdAt: Date.now(),
  };
}

describe('buildWorkstreamSessionConfig', () => {
  it('builds basic config from workstream', () => {
    const config = buildWorkstreamSessionConfig({
      workstream: makeWorkstream(),
      directories: [makeDir('/Users/test/project')],
      linkedEntities: [],
      providerId: 'claude-code',
    });

    expect(config.model).toBe('claude-sonnet');
    expect(config.directories).toEqual(['/Users/test/project']);
  });

  it('uses effective paths for directories', () => {
    const config = buildWorkstreamSessionConfig({
      workstream: makeWorkstream(),
      directories: [
        makeDir('/Users/test/project', {
          branch: 'feature',
          worktreePath: '/wt/feature',
          effectivePath: '/wt/feature',
        }),
        makeDir('/Users/test/other'),
      ],
      linkedEntities: [],
      providerId: 'claude-code',
    });

    expect(config.directories).toEqual(['/wt/feature', '/Users/test/other']);
  });

  it('uses sessionCwd as cwd when provided', () => {
    const config = buildWorkstreamSessionConfig({
      workstream: makeWorkstream(),
      directories: [makeDir('/Users/test/project')],
      linkedEntities: [],
      providerId: 'claude-code',
      sessionCwd: '/vienna/workstreams/ws-1',
    });

    expect(config.cwd).toBe('/vienna/workstreams/ws-1');
  });

  it('uses first effective path as cwd when no sessionCwd', () => {
    const config = buildWorkstreamSessionConfig({
      workstream: makeWorkstream(),
      directories: [
        makeDir('/first', { effectivePath: '/wt/first' }),
        makeDir('/second'),
      ],
      linkedEntities: [],
      providerId: 'claude-code',
    });

    expect(config.cwd).toBe('/wt/first');
  });

  it('uses fallback cwd when no directories', () => {
    const config = buildWorkstreamSessionConfig({
      workstream: makeWorkstream(),
      directories: [],
      linkedEntities: [],
      providerId: 'claude-code',
    });

    expect(config.cwd).toBeTruthy();
    expect(config.directories).toEqual([]);
  });

  it('passes providerSessionId for resume', () => {
    const config = buildWorkstreamSessionConfig({
      workstream: makeWorkstream(),
      directories: [],
      linkedEntities: [],
      providerId: 'claude-code',
      providerSessionId: 'session-abc',
    });

    expect(config.sessionId).toBe('session-abc');
  });

  it('includes directory context in appendSystemPrompt', () => {
    const config = buildWorkstreamSessionConfig({
      workstream: makeWorkstream(),
      directories: [makeDir('/Users/test/project', { label: 'my-proj' })],
      linkedEntities: [],
      providerId: 'claude-code',
    });

    expect(config.appendSystemPrompt).toContain('vienna-working-directories');
    expect(config.appendSystemPrompt).toContain('/Users/test/project');
  });

  it('includes linked entity context in appendSystemPrompt', () => {
    const config = buildWorkstreamSessionConfig({
      workstream: makeWorkstream(),
      directories: [],
      linkedEntities: [
        makeEntity('@vienna//github_pr/acme/repo/42', 'github_pr', 'Fix auth bug'),
      ],
      providerId: 'claude-code',
    });

    expect(config.appendSystemPrompt).toContain('vienna-linked-entities');
    expect(config.appendSystemPrompt).toContain('Fix auth bug');
    expect(config.appendSystemPrompt).toContain('@vienna//github_pr/acme/repo/42');
  });

  it('omits appendSystemPrompt when no directories or entities', () => {
    const config = buildWorkstreamSessionConfig({
      workstream: makeWorkstream(),
      directories: [],
      linkedEntities: [],
      providerId: 'claude-code',
    });

    expect(config.appendSystemPrompt).toBeUndefined();
  });

  it('handles null model', () => {
    const config = buildWorkstreamSessionConfig({
      workstream: makeWorkstream({ model: null }),
      directories: [],
      linkedEntities: [],
      providerId: 'claude-code',
    });

    expect(config.model).toBeUndefined();
  });

  it('passes mcpServers through', () => {
    const mcpServers = { 'vienna-entities': { command: 'npx', args: ['@vienna/mcp'] } };
    const config = buildWorkstreamSessionConfig({
      workstream: makeWorkstream(),
      directories: [],
      linkedEntities: [],
      providerId: 'claude-code',
      mcpServers,
    });

    expect(config.mcpServers).toBe(mcpServers);
  });
});

describe('buildDirectoryContext', () => {
  it('returns empty string for no directories', () => {
    expect(buildDirectoryContext([])).toBe('');
  });

  it('lists directories with paths', () => {
    const result = buildDirectoryContext([
      makeDir('/Users/test/project'),
      makeDir('/Users/test/other'),
    ]);

    expect(result).toContain('<vienna-working-directories>');
    expect(result).toContain('</vienna-working-directories>');
    expect(result).toContain('/Users/test/project');
    expect(result).toContain('/Users/test/other');
  });

  it('includes labels', () => {
    const result = buildDirectoryContext([
      makeDir('/Users/test/project', { label: 'my-proj' }),
    ]);

    expect(result).toContain('(my-proj)');
  });

  it('marks inherited directories', () => {
    const result = buildDirectoryContext([
      makeDir('/Users/test/project', { isInherited: true }),
    ]);

    expect(result).toContain('[inherited]');
  });

  it('shows branch info with worktree', () => {
    const result = buildDirectoryContext([
      makeDir('/Users/test/project', {
        branch: 'feature-x',
        worktreePath: '/wt/feature-x',
      }),
    ]);

    expect(result).toContain('branch "feature-x"');
    expect(result).toContain('worktree at /wt/feature-x');
    expect(result).toContain('Active Branch Selections');
  });

  it('shows branch info without worktree', () => {
    const result = buildDirectoryContext([
      makeDir('/Users/test/project', { branch: 'feature-x' }),
    ]);

    expect(result).toContain('branch "feature-x"');
    expect(result).not.toContain('Active Branch Selections');
  });

  it('includes session cwd warning when provided', () => {
    const result = buildDirectoryContext(
      [makeDir('/Users/test/project')],
      '/vienna/workstreams/ws-1',
    );

    expect(result).toContain('/vienna/workstreams/ws-1');
    expect(result).toContain('internal Vienna session directory');
    expect(result).toContain('do NOT work in it');
  });

  it('omits session cwd warning when not provided', () => {
    const result = buildDirectoryContext([makeDir('/Users/test/project')]);

    expect(result).not.toContain('internal Vienna session directory');
  });
});

describe('buildLinkedEntityContext', () => {
  it('returns empty string for no entities', () => {
    expect(buildLinkedEntityContext([])).toBe('');
  });

  it('formats entity with title', () => {
    const result = buildLinkedEntityContext([
      makeEntity('@vienna//github_pr/acme/repo/42', 'github_pr', 'Fix auth bug'),
    ]);

    expect(result).toContain('github_pr: Fix auth bug');
    expect(result).toContain('@vienna//github_pr/acme/repo/42');
    expect(result).toContain('<vienna-linked-entities>');
    expect(result).toContain('</vienna-linked-entities>');
  });

  it('uses URI when no title', () => {
    const result = buildLinkedEntityContext([
      makeEntity('@vienna//slack_message/C123/456', 'slack_message'),
    ]);

    expect(result).toContain('@vienna//slack_message/C123/456');
  });

  it('uses context override when set', () => {
    const entity = makeEntity('@vienna//linear_issue/ISS-123', 'linear_issue', 'Some Issue');
    entity.contextOverride = 'Custom context for this entity\nWith multiple lines';

    const result = buildLinkedEntityContext([entity]);
    expect(result).toContain('Custom context for this entity');
    expect(result).not.toContain('Some Issue');
  });

  it('formats multiple entities', () => {
    const result = buildLinkedEntityContext([
      makeEntity('@vienna//issue/1', 'issue', 'First'),
      makeEntity('@vienna//issue/2', 'issue', 'Second'),
    ]);

    expect(result).toContain('First');
    expect(result).toContain('Second');
  });
});

describe('buildGroupAwarenessContext', () => {
  it('returns empty string when no group', () => {
    expect(buildGroupAwarenessContext(null, [])).toBe('');
  });

  it('includes group name', () => {
    const result = buildGroupAwarenessContext(makeGroup(), []);
    expect(result).toContain('Feature ABC');
    expect(result).toContain('<vienna-workstream-group>');
    expect(result).toContain('</vienna-workstream-group>');
  });

  it('lists sibling workstreams', () => {
    const result = buildGroupAwarenessContext(makeGroup(), [
      makeSibling('ws-2', 'Implementation', 'processing'),
      makeSibling('ws-3', 'Code Review', 'idle'),
    ]);

    expect(result).toContain('"Implementation" (status: processing)');
    expect(result).toContain('"Code Review" (status: idle)');
    expect(result).toContain('@vienna//workstream/ws-2');
    expect(result).toContain('@vienna//workstream/ws-3');
    expect(result).toContain('MCP workstream entity tools');
  });

  it('omits sibling section when no siblings', () => {
    const result = buildGroupAwarenessContext(makeGroup(), []);
    expect(result).not.toContain('Sibling workstreams');
  });
});

describe('mergeLinkedEntities', () => {
  it('returns workstream entities when no group entities', () => {
    const wsEntities = [makeEntity('@vienna//pr/1', 'github_pr', 'PR 1')];
    const result = mergeLinkedEntities(wsEntities, []);
    expect(result).toHaveLength(1);
    expect(result[0]!.entityUri).toBe('@vienna//pr/1');
  });

  it('returns group entities when no workstream entities', () => {
    const groupEntities = [makeGroupEntity('@vienna//pr/1', 'github_pr', 'PR 1')];
    const result = mergeLinkedEntities([], groupEntities);
    expect(result).toHaveLength(1);
    expect(result[0]!.entityUri).toBe('@vienna//pr/1');
  });

  it('workstream entities take precedence over group entities', () => {
    const wsEntities = [makeEntity('@vienna//pr/1', 'github_pr', 'WS PR Title')];
    const groupEntities = [makeGroupEntity('@vienna//pr/1', 'github_pr', 'Group PR Title')];
    const result = mergeLinkedEntities(wsEntities, groupEntities);
    expect(result).toHaveLength(1);
    expect(result[0]!.entityTitle).toBe('WS PR Title');
  });

  it('merges unique entities from both sources', () => {
    const wsEntities = [makeEntity('@vienna//pr/1', 'github_pr', 'WS Only')];
    const groupEntities = [makeGroupEntity('@vienna//issue/2', 'linear_issue', 'Group Only')];
    const result = mergeLinkedEntities(wsEntities, groupEntities);
    expect(result).toHaveLength(2);
    expect(result.find((e) => e.entityUri === '@vienna//pr/1')).toBeTruthy();
    expect(result.find((e) => e.entityUri === '@vienna//issue/2')).toBeTruthy();
  });

  it('returns empty array when both sources are empty', () => {
    expect(mergeLinkedEntities([], [])).toHaveLength(0);
  });

  it('preserves workstream context override over group context override', () => {
    const wsEntity = makeEntity('@vienna//pr/1', 'github_pr', 'PR');
    wsEntity.contextOverride = 'WS-level override';
    const groupEntity = makeGroupEntity('@vienna//pr/1', 'github_pr', 'PR');
    groupEntity.contextOverride = 'Group-level override';

    const result = mergeLinkedEntities([wsEntity], [groupEntity]);
    expect(result).toHaveLength(1);
    expect(result[0]!.contextOverride).toBe('WS-level override');
  });

  it('uses group context override when no workstream override exists for unique URIs', () => {
    const groupEntity = makeGroupEntity('@vienna//issue/1', 'linear_issue', 'Issue');
    groupEntity.contextOverride = 'Custom group context';

    const result = mergeLinkedEntities([], [groupEntity]);
    expect(result).toHaveLength(1);
    expect(result[0]!.contextOverride).toBe('Custom group context');
  });
});

describe('buildWorkstreamSessionConfig with group context', () => {
  it('includes group awareness in appendSystemPrompt', () => {
    const config = buildWorkstreamSessionConfig({
      workstream: makeWorkstream({ groupId: 'group-1' }),
      directories: [],
      linkedEntities: [],
      providerId: 'claude-code',
      group: makeGroup(),
      siblingWorkstreams: [makeSibling('ws-2', 'Sibling')],
    });

    expect(config.appendSystemPrompt).toContain('vienna-workstream-group');
    expect(config.appendSystemPrompt).toContain('Feature ABC');
    expect(config.appendSystemPrompt).toContain('Sibling');
  });

  it('merges group and workstream entities', () => {
    const config = buildWorkstreamSessionConfig({
      workstream: makeWorkstream({ groupId: 'group-1' }),
      directories: [],
      linkedEntities: [makeEntity('@vienna//pr/1', 'github_pr', 'WS PR')],
      providerId: 'claude-code',
      group: makeGroup(),
      groupLinkedEntities: [makeGroupEntity('@vienna//issue/2', 'linear_issue', 'Group Issue')],
    });

    expect(config.appendSystemPrompt).toContain('vienna-linked-entities');
    expect(config.appendSystemPrompt).toContain('WS PR');
    expect(config.appendSystemPrompt).toContain('Group Issue');
  });

  it('omits group context when no group', () => {
    const config = buildWorkstreamSessionConfig({
      workstream: makeWorkstream(),
      directories: [],
      linkedEntities: [],
      providerId: 'claude-code',
    });

    expect(config.appendSystemPrompt).toBeUndefined();
  });

  it('workstream entity overrides group entity with same URI in session config', () => {
    const config = buildWorkstreamSessionConfig({
      workstream: makeWorkstream({ groupId: 'group-1' }),
      directories: [],
      linkedEntities: [makeEntity('@vienna//pr/1', 'github_pr', 'WS Title')],
      providerId: 'claude-code',
      group: makeGroup(),
      groupLinkedEntities: [makeGroupEntity('@vienna//pr/1', 'github_pr', 'Group Title')],
    });

    expect(config.appendSystemPrompt).toContain('WS Title');
    expect(config.appendSystemPrompt).not.toContain('Group Title');
  });

  it('includes group entities even without workstream entities', () => {
    const config = buildWorkstreamSessionConfig({
      workstream: makeWorkstream({ groupId: 'group-1' }),
      directories: [],
      linkedEntities: [],
      providerId: 'claude-code',
      group: makeGroup(),
      groupLinkedEntities: [makeGroupEntity('@vienna//issue/1', 'linear_issue', 'Group Issue')],
    });

    expect(config.appendSystemPrompt).toContain('vienna-linked-entities');
    expect(config.appendSystemPrompt).toContain('Group Issue');
  });
});
