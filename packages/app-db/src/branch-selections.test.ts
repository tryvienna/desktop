import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Database } from 'better-sqlite3';
import { openAppDatabase, closeAppDatabase } from './database';
import { ProjectRepository } from './projects';
import { WorkstreamRepository } from './workstreams';
import { WorkstreamDirectoryRepository } from './workstream-directories';
import { BranchSelectionRepository } from './branch-selections';

describe('BranchSelectionRepository', () => {
  let db: Database;
  let dirs: WorkstreamDirectoryRepository;
  let branches: BranchSelectionRepository;
  let wsId: string;

  beforeEach(() => {
    db = openAppDatabase({ path: ':memory:' });
    const projects = new ProjectRepository(db);
    const workstreams = new WorkstreamRepository(db);
    dirs = new WorkstreamDirectoryRepository(db);
    branches = new BranchSelectionRepository(db);

    const project = projects.create({ name: 'Test Project' });
    wsId = workstreams.create({ projectId: project.id, title: 'Test WS' }).id;
  });

  afterEach(() => {
    closeAppDatabase(db);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // set / get
  // ─────────────────────────────────────────────────────────────────────────

  describe('set', () => {
    it('creates a new branch selection', () => {
      const sel = branches.set({
        workstreamId: wsId,
        directoryPath: '/Users/test/project',
        branch: 'feature-x',
      });

      expect(sel.workstreamId).toBe(wsId);
      expect(sel.directoryPath).toBe('/Users/test/project');
      expect(sel.branch).toBe('feature-x');
      expect(sel.baseBranch).toBe('main');
      expect(sel.worktreePath).toBeNull();
      expect(sel.id).toBeTruthy();
    });

    it('creates with worktree path and base branch', () => {
      const sel = branches.set({
        workstreamId: wsId,
        directoryPath: '/Users/test/project',
        branch: 'feature-x',
        worktreePath: '/Users/test/.worktrees/feature-x',
        baseBranch: 'develop',
      });

      expect(sel.worktreePath).toBe('/Users/test/.worktrees/feature-x');
      expect(sel.baseBranch).toBe('develop');
    });

    it('upserts: updates existing selection for same directory', () => {
      branches.set({
        workstreamId: wsId,
        directoryPath: '/Users/test/project',
        branch: 'branch-a',
      });

      const updated = branches.set({
        workstreamId: wsId,
        directoryPath: '/Users/test/project',
        branch: 'branch-b',
        worktreePath: '/wt/branch-b',
      });

      expect(updated.branch).toBe('branch-b');
      expect(updated.worktreePath).toBe('/wt/branch-b');

      // Only one selection should exist
      expect(branches.list(wsId)).toHaveLength(1);
    });

    it('normalizes directory path', () => {
      branches.set({
        workstreamId: wsId,
        directoryPath: '/Users/test/project/',
        branch: 'feature',
      });

      const sel = branches.get(wsId, '/Users/test/project');
      expect(sel).not.toBeNull();
      expect(sel!.directoryPath).toBe('/Users/test/project');
    });
  });

  describe('get', () => {
    it('returns null for non-existing selection', () => {
      expect(branches.get(wsId, '/nope')).toBeNull();
    });

    it('retrieves by normalized path', () => {
      branches.set({
        workstreamId: wsId,
        directoryPath: '/Users/test/project',
        branch: 'feature',
      });

      expect(branches.get(wsId, '/Users/test/project/')).not.toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // list
  // ─────────────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns empty array for no selections', () => {
      expect(branches.list(wsId)).toEqual([]);
    });

    it('returns all selections ordered by directory path', () => {
      branches.set({ workstreamId: wsId, directoryPath: '/z-path', branch: 'b1' });
      branches.set({ workstreamId: wsId, directoryPath: '/a-path', branch: 'b2' });

      const all = branches.list(wsId);
      expect(all).toHaveLength(2);
      expect(all[0]!.directoryPath).toBe('/a-path');
      expect(all[1]!.directoryPath).toBe('/z-path');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // remove / clear
  // ─────────────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('removes a specific selection', () => {
      branches.set({ workstreamId: wsId, directoryPath: '/path/a', branch: 'b1' });
      branches.set({ workstreamId: wsId, directoryPath: '/path/b', branch: 'b2' });

      const removed = branches.remove(wsId, '/path/a');
      expect(removed).toBe(true);
      expect(branches.list(wsId)).toHaveLength(1);
      expect(branches.list(wsId)[0]!.directoryPath).toBe('/path/b');
    });

    it('returns false when selection not found', () => {
      expect(branches.remove(wsId, '/nope')).toBe(false);
    });
  });

  describe('clear', () => {
    it('removes all selections for a workstream', () => {
      branches.set({ workstreamId: wsId, directoryPath: '/path/a', branch: 'b1' });
      branches.set({ workstreamId: wsId, directoryPath: '/path/b', branch: 'b2' });

      const count = branches.clear(wsId);
      expect(count).toBe(2);
      expect(branches.list(wsId)).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getDirectoriesWithBranchInfo
  // ─────────────────────────────────────────────────────────────────────────

  describe('getDirectoriesWithBranchInfo', () => {
    it('returns directories without branch selections', () => {
      dirs.add(wsId, '/Users/test/project', 'my-proj');

      const result = branches.getDirectoriesWithBranchInfo(wsId);
      expect(result).toHaveLength(1);

      expect(result[0]).toMatchObject({
        path: '/Users/test/project',
        effectivePath: '/Users/test/project',
        label: 'my-proj',
        branch: null,
        baseBranch: 'main',
        worktreePath: null,
        isInherited: false,
      });
    });

    it('computes effective path from worktree when branch selected', () => {
      dirs.add(wsId, '/Users/test/project');
      branches.set({
        workstreamId: wsId,
        directoryPath: '/Users/test/project',
        branch: 'feature-x',
        worktreePath: '/Users/test/.worktrees/feature-x',
        baseBranch: 'develop',
      });

      const result = branches.getDirectoriesWithBranchInfo(wsId);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        path: '/Users/test/project',
        effectivePath: '/Users/test/.worktrees/feature-x',
        branch: 'feature-x',
        baseBranch: 'develop',
        worktreePath: '/Users/test/.worktrees/feature-x',
      });
    });

    it('uses original path when branch selected without worktree', () => {
      dirs.add(wsId, '/Users/test/project');
      branches.set({
        workstreamId: wsId,
        directoryPath: '/Users/test/project',
        branch: 'feature-x',
      });

      const result = branches.getDirectoriesWithBranchInfo(wsId);
      expect(result[0]!.effectivePath).toBe('/Users/test/project');
    });

    it('preserves inherited flag', () => {
      dirs.add(wsId, '/Users/test/project', null, true);

      const result = branches.getDirectoriesWithBranchInfo(wsId);
      expect(result[0]!.isInherited).toBe(true);
    });

    it('returns empty array for workstream with no directories', () => {
      expect(branches.getDirectoriesWithBranchInfo(wsId)).toEqual([]);
    });

    it('mixes directories with and without selections', () => {
      dirs.add(wsId, '/path/a');
      dirs.add(wsId, '/path/b');
      branches.set({
        workstreamId: wsId,
        directoryPath: '/path/b',
        branch: 'feat',
        worktreePath: '/wt/feat',
      });

      const result = branches.getDirectoriesWithBranchInfo(wsId);
      expect(result).toHaveLength(2);
      expect(result[0]!.effectivePath).toBe('/path/a'); // no selection
      expect(result[1]!.effectivePath).toBe('/wt/feat'); // worktree
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getEffectiveDirectoryPaths
  // ─────────────────────────────────────────────────────────────────────────

  describe('getEffectiveDirectoryPaths', () => {
    it('returns original paths when no selections', () => {
      dirs.add(wsId, '/path/a');
      dirs.add(wsId, '/path/b');

      expect(branches.getEffectiveDirectoryPaths(wsId)).toEqual(['/path/a', '/path/b']);
    });

    it('returns worktree paths for selected branches', () => {
      dirs.add(wsId, '/path/a');
      dirs.add(wsId, '/path/b');
      branches.set({
        workstreamId: wsId,
        directoryPath: '/path/b',
        branch: 'feat',
        worktreePath: '/wt/feat',
      });

      expect(branches.getEffectiveDirectoryPaths(wsId)).toEqual(['/path/a', '/wt/feat']);
    });

    it('deduplicates paths', () => {
      dirs.add(wsId, '/path/a');
      dirs.add(wsId, '/path/b');
      // Both point to same worktree (edge case)
      branches.set({
        workstreamId: wsId,
        directoryPath: '/path/a',
        branch: 'feat',
        worktreePath: '/same/path',
      });
      branches.set({
        workstreamId: wsId,
        directoryPath: '/path/b',
        branch: 'feat',
        worktreePath: '/same/path',
      });

      const paths = branches.getEffectiveDirectoryPaths(wsId);
      expect(paths).toEqual(['/same/path']);
    });

    it('returns empty array when no directories', () => {
      expect(branches.getEffectiveDirectoryPaths(wsId)).toEqual([]);
    });
  });
});
