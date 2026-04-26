/**
 * Workstream Mutations Tests — focused on worktree branch naming.
 *
 * Tests the createWorkstream mutation's branch name construction
 * and worktree creation behavior, especially for workstreams created
 * inside a scope (workstream group) with autoCreateWorktrees enabled.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execute, type ExecutionResult } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { openAppDatabase, closeAppDatabase, createAppDb } from '@vienna/app-db';
import type { Database } from 'better-sqlite3';
import type { AppDb } from '@vienna/app-db';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { schema } from '../../schema/index';
import type { GraphQLContext, GitOps } from '../../schema/builder';
import { graphql } from '../../client/generated/gql';

// ─────────────────────────────────────────────────────────────────────────────
// GraphQL operations with worktree fields in the response
// ─────────────────────────────────────────────────────────────────────────────

const CREATE_WORKSTREAM_WITH_WORKTREES = graphql(`
  mutation CreateWorkstreamWithWorktrees($input: CreateWorkstreamInput!) {
    createWorkstream(input: $input) {
      workstream { id title status }
      worktrees { directoryPath branch worktreePath error }
    }
  }
`);

const CREATE_WORKSTREAM = graphql(`
  mutation CreateWorkstreamBasic($input: CreateWorkstreamInput!) {
    createWorkstream(input: $input) {
      workstream { id title }
    }
  }
`);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
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

function createMockGitOps(overrides?: Partial<GitOps>): GitOps {
  return {
    isGitRepo: vi.fn().mockReturnValue(true),
    getCurrentBranch: vi.fn().mockReturnValue('main'),
    getDefaultBranch: vi.fn().mockReturnValue('main'),
    listBranches: vi.fn().mockResolvedValue([]),
    createWorktree: vi.fn().mockResolvedValue(undefined),
    removeWorktree: vi.fn().mockResolvedValue(undefined),
    generateWorktreePath: vi.fn((repoPath: string, branch: string) => {
      const safeBranch = branch.replace(/[^a-zA-Z0-9-_]/g, '-');
      return `${repoPath}/.worktrees/${safeBranch}`;
    }),
    isWorktree: vi.fn().mockReturnValue(false),
    getStatusFiles: vi.fn().mockResolvedValue([]),
    getDiffStatSummary: vi.fn().mockResolvedValue({ additions: 0, deletions: 0, files: [] }),
    getWorkingTreeDiffStat: vi.fn().mockResolvedValue({ additions: 0, deletions: 0, files: [] }),
    getCommitLog: vi.fn().mockResolvedValue([]),
    getDiffForCommit: vi.fn().mockResolvedValue(''),
    getDiffAgainstBase: vi.fn().mockResolvedValue(''),
    getWorkingTreeDiff: vi.fn().mockResolvedValue(''),
    getFileDiff: vi.fn().mockResolvedValue(''),
    getFileAtRef: vi.fn().mockResolvedValue(''),
    ...overrides,
  };
}

function createContext(db: AppDb, opts?: { gitOps?: GitOps }): GraphQLContext {
  return { db, userId: 'test-user', ...opts };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('createWorkstream — worktree branch naming', () => {
  let rawDb: Database;
  let db: AppDb;
  let tmpDir: string;

  beforeEach(() => {
    rawDb = openAppDatabase({ path: ':memory:' });
    tmpDir = mkdtempSync(join(tmpdir(), 'vienna-ws-mutations-test-'));
    db = createAppDb(rawDb, join(tmpDir, 'settings.json'));
  });

  afterEach(() => {
    closeAppDatabase(rawDb);
    rmSync(tmpDir, { recursive: true, force: true });
  });

  // ─── Auto-create worktrees (scope with autoCreateWorktrees) ──────────────

  describe('scope autoCreateWorktrees branch naming', () => {
    it('uses hyphen separator between group name and title (not slash)', async () => {
      const gitOps = createMockGitOps();
      const project = db.projects.create({ name: 'P' });
      const group = db.workstreamGroups.create({ projectId: project.id, name: 'Integrations' });
      db.workstreamGroups.update(group.id, { autoCreateWorktrees: true });

      // Add a directory to the project and group so worktrees get created
      db.projectDirectories.add(project.id, '/tmp/repo');
      db.groupDirectories.add(group.id, '/tmp/repo');
      db.groupBranchSelections.set(group.id, '/tmp/repo', 'main', 'main');

      const result = await exec(CREATE_WORKSTREAM, createContext(db, { gitOps }), {
        input: { projectId: project.id, groupId: group.id, title: 'My Feature' },
      });

      expect(result.errors).toBeUndefined();

      // Verify createWorktree was called with a hyphen-separated branch name
      const createWorktreeCall = (gitOps.createWorktree as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(createWorktreeCall).toBeDefined();
      const [, branch] = createWorktreeCall;
      expect(branch).toMatch(/^integrations-my-feature-[a-f0-9]{8}$/);
      // Must NOT contain a slash
      expect(branch).not.toContain('/');
    });

    it('slugifies group name and title in the branch name', async () => {
      const gitOps = createMockGitOps();
      const project = db.projects.create({ name: 'P' });
      const group = db.workstreamGroups.create({ projectId: project.id, name: 'My Awesome Scope' });
      db.workstreamGroups.update(group.id, { autoCreateWorktrees: true });

      db.projectDirectories.add(project.id, '/tmp/repo');
      db.groupDirectories.add(group.id, '/tmp/repo');
      db.groupBranchSelections.set(group.id, '/tmp/repo', 'main', 'main');

      const result = await exec(CREATE_WORKSTREAM, createContext(db, { gitOps }), {
        input: { projectId: project.id, groupId: group.id, title: 'Fix The Bug!!!' },
      });

      expect(result.errors).toBeUndefined();
      const [, branch] = (gitOps.createWorktree as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(branch).toMatch(/^my-awesome-scope-fix-the-bug-[a-f0-9]{8}$/);
    });

    it('creates worktrees for each directory in group branch selections', async () => {
      const gitOps = createMockGitOps();
      const project = db.projects.create({ name: 'P' });
      const group = db.workstreamGroups.create({ projectId: project.id, name: 'Backend' });
      db.workstreamGroups.update(group.id, { autoCreateWorktrees: true });

      db.projectDirectories.add(project.id, '/tmp/repo-a');
      db.projectDirectories.add(project.id, '/tmp/repo-b');
      db.groupDirectories.add(group.id, '/tmp/repo-a');
      db.groupDirectories.add(group.id, '/tmp/repo-b');
      db.groupBranchSelections.set(group.id, '/tmp/repo-a', 'main', 'main');
      db.groupBranchSelections.set(group.id, '/tmp/repo-b', 'develop', 'develop');

      await exec(CREATE_WORKSTREAM, createContext(db, { gitOps }), {
        input: { projectId: project.id, groupId: group.id, title: 'Multi Dir' },
      });

      expect(gitOps.createWorktree).toHaveBeenCalledTimes(2);
      const calls = (gitOps.createWorktree as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls[0][0]).toBe('/tmp/repo-a');
      expect(calls[1][0]).toBe('/tmp/repo-b');
      // Same branch for both
      expect(calls[0][1]).toBe(calls[1][1]);
    });

    it('does not create worktrees when autoCreateWorktrees is false', async () => {
      const gitOps = createMockGitOps();
      const project = db.projects.create({ name: 'P' });
      const group = db.workstreamGroups.create({ projectId: project.id, name: 'NoAuto' });
      // autoCreateWorktrees defaults to false

      db.projectDirectories.add(project.id, '/tmp/repo');
      db.groupDirectories.add(group.id, '/tmp/repo');
      db.groupBranchSelections.set(group.id, '/tmp/repo', 'main', 'main');

      await exec(CREATE_WORKSTREAM, createContext(db, { gitOps }), {
        input: { projectId: project.id, groupId: group.id, title: 'No Worktree' },
      });

      expect(gitOps.createWorktree).not.toHaveBeenCalled();
    });

    it('does not create worktrees when gitOps is not available', async () => {
      const project = db.projects.create({ name: 'P' });
      const group = db.workstreamGroups.create({ projectId: project.id, name: 'NoGit' });
      db.workstreamGroups.update(group.id, { autoCreateWorktrees: true });

      db.projectDirectories.add(project.id, '/tmp/repo');
      db.groupDirectories.add(group.id, '/tmp/repo');
      db.groupBranchSelections.set(group.id, '/tmp/repo', 'main', 'main');

      // No gitOps in context
      const result = await exec(CREATE_WORKSTREAM, createContext(db), {
        input: { projectId: project.id, groupId: group.id, title: 'No Git' },
      });

      expect(result.errors).toBeUndefined();
    });
  });

  // ─── Explicit worktree creation (createWorktrees: true) ──────────────────

  describe('explicit createWorktrees branch naming', () => {
    it('uses hyphen separator for auto-generated branch name (not slash)', async () => {
      const gitOps = createMockGitOps();
      const project = db.projects.create({ name: 'P' });
      db.projectDirectories.add(project.id, '/tmp/repo');

      const result = await exec(CREATE_WORKSTREAM_WITH_WORKTREES, createContext(db, { gitOps }), {
        input: { projectId: project.id, title: 'New Feature', createWorktrees: true },
      });

      expect(result.errors).toBeUndefined();
      const [, branch] = (gitOps.createWorktree as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(branch).toMatch(/^workstream-new-feature-[a-f0-9]{8}$/);
      expect(branch).not.toContain('/');
    });

    it('uses custom branchName when provided', async () => {
      const gitOps = createMockGitOps();
      const project = db.projects.create({ name: 'P' });
      db.projectDirectories.add(project.id, '/tmp/repo');

      await exec(CREATE_WORKSTREAM_WITH_WORKTREES, createContext(db, { gitOps }), {
        input: { projectId: project.id, title: 'Custom', createWorktrees: true, branchName: 'my-custom-branch' },
      });

      const [, branch] = (gitOps.createWorktree as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(branch).toBe('my-custom-branch');
    });

    it('returns worktree results with branch and path', async () => {
      const gitOps = createMockGitOps();
      const project = db.projects.create({ name: 'P' });
      db.projectDirectories.add(project.id, '/tmp/repo');

      const result = await exec(CREATE_WORKSTREAM_WITH_WORKTREES, createContext(db, { gitOps }), {
        input: { projectId: project.id, title: 'WtResult', createWorktrees: true },
      });

      expect(result.errors).toBeUndefined();
      const worktrees = result.data!.createWorkstream!.worktrees!;
      expect(worktrees).toHaveLength(1);
      expect(worktrees[0].directoryPath).toBe('/tmp/repo');
      expect(worktrees[0].branch).toMatch(/^workstream-wtresult-[a-f0-9]{8}$/);
      expect(worktrees[0].worktreePath).toBeTruthy();
      expect(worktrees[0].error).toBeNull();
    });

    it('returns error in worktree result when createWorktree fails', async () => {
      const gitOps = createMockGitOps({
        createWorktree: vi.fn().mockRejectedValue(new Error('disk full')),
      });
      const project = db.projects.create({ name: 'P' });
      db.projectDirectories.add(project.id, '/tmp/repo');

      const result = await exec(CREATE_WORKSTREAM_WITH_WORKTREES, createContext(db, { gitOps }), {
        input: { projectId: project.id, title: 'FailWt', createWorktrees: true },
      });

      expect(result.errors).toBeUndefined();
      const worktrees = result.data!.createWorkstream!.worktrees!;
      expect(worktrees).toHaveLength(1);
      expect(worktrees[0].worktreePath).toBeNull();
      expect(worktrees[0].error).toContain('disk full');
    });

    it('errors when createWorktrees is true but gitOps is unavailable', async () => {
      const project = db.projects.create({ name: 'P' });
      db.projectDirectories.add(project.id, '/tmp/repo');

      const result = await exec(CREATE_WORKSTREAM_WITH_WORKTREES, createContext(db), {
        input: { projectId: project.id, title: 'NoGit', createWorktrees: true },
      });

      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toContain('Git operations not available');
    });
  });

  // ─── createWorktreeWithFallback behavior ─────────────────────────────────

  describe('createWorktreeWithFallback', () => {
    it('saves branch selection even when worktree creation fails', async () => {
      const gitOps = createMockGitOps({
        createWorktree: vi.fn().mockRejectedValue(new Error('cannot lock ref')),
      });
      const project = db.projects.create({ name: 'P' });
      const group = db.workstreamGroups.create({ projectId: project.id, name: 'Scope' });
      db.workstreamGroups.update(group.id, { autoCreateWorktrees: true });

      db.projectDirectories.add(project.id, '/tmp/repo');
      db.groupDirectories.add(group.id, '/tmp/repo');
      db.groupBranchSelections.set(group.id, '/tmp/repo', 'main', 'main');

      const result = await exec(CREATE_WORKSTREAM, createContext(db, { gitOps }), {
        input: { projectId: project.id, groupId: group.id, title: 'Fallback' },
      });

      expect(result.errors).toBeUndefined();
      const ws = result.data!.createWorkstream!.workstream!;

      // Branch selection should still be saved (without worktree path)
      const selections = db.branchSelections.list(ws.id);
      expect(selections).toHaveLength(1);
      expect(selections[0].branch).toMatch(/^scope-fallback-/);
      expect(selections[0].worktreePath).toBeNull();
    });

    it('saves branch selection with worktree path on success', async () => {
      const gitOps = createMockGitOps();
      const project = db.projects.create({ name: 'P' });
      const group = db.workstreamGroups.create({ projectId: project.id, name: 'Good' });
      db.workstreamGroups.update(group.id, { autoCreateWorktrees: true });

      db.projectDirectories.add(project.id, '/tmp/repo');
      db.groupDirectories.add(group.id, '/tmp/repo');
      db.groupBranchSelections.set(group.id, '/tmp/repo', 'main', 'main');

      const result = await exec(CREATE_WORKSTREAM, createContext(db, { gitOps }), {
        input: { projectId: project.id, groupId: group.id, title: 'Success' },
      });

      expect(result.errors).toBeUndefined();
      const ws = result.data!.createWorkstream!.workstream!;

      const selections = db.branchSelections.list(ws.id);
      expect(selections).toHaveLength(1);
      expect(selections[0].worktreePath).toBeTruthy();
    });
  });
});
