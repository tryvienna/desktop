/**
 * Git Operations Tests
 *
 * Uses a temporary git repository to test all operations.
 * Each test gets a fresh repo via beforeEach.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execFileSync } from 'child_process';
import {
  isGitRepo,
  getCurrentBranch,
  getDefaultBranch,
  listBranches,
  createWorktree,
  removeWorktree,
  isWorktree,
  getStatusFiles,
  getDiffStatSummary,
  getWorkingTreeDiffStat,
  getCommitLog,
  getDiffForCommit,
  getDiffAgainstBase,
  getWorkingTreeDiff,
  getFileDiff,
  getFileAtRef,
  generateWorktreePath,
} from './operations';

function git(args: string[], cwd: string): string {
  return execFileSync('git', args, { cwd, encoding: 'utf-8' }).trim();
}

function initRepo(dir: string): void {
  git(['init', '-b', 'main'], dir);
  git(['config', 'user.email', 'test@test.com'], dir);
  git(['config', 'user.name', 'Test'], dir);
  writeFileSync(join(dir, 'README.md'), '# Test');
  git(['add', '.'], dir);
  git(['commit', '-m', 'init'], dir);
}

describe('git-utils operations', () => {
  let repoDir: string;

  beforeEach(() => {
    repoDir = mkdtempSync(join(tmpdir(), 'git-utils-test-'));
    initRepo(repoDir);
  });

  afterEach(() => {
    rmSync(repoDir, { recursive: true, force: true });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // isGitRepo
  // ─────────────────────────────────────────────────────────────────────────

  describe('isGitRepo', () => {
    it('returns true for a git repository', () => {
      expect(isGitRepo(repoDir)).toBe(true);
    });

    it('returns false for a non-git directory', () => {
      const nonGit = mkdtempSync(join(tmpdir(), 'non-git-'));
      try {
        expect(isGitRepo(nonGit)).toBe(false);
      } finally {
        rmSync(nonGit, { recursive: true, force: true });
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getCurrentBranch
  // ─────────────────────────────────────────────────────────────────────────

  describe('getCurrentBranch', () => {
    it('returns the current branch name', () => {
      expect(getCurrentBranch(repoDir)).toBe('main');
    });

    it('returns null in detached HEAD', () => {
      const sha = git(['rev-parse', 'HEAD'], repoDir);
      git(['checkout', sha], repoDir);
      expect(getCurrentBranch(repoDir)).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getDefaultBranch
  // ─────────────────────────────────────────────────────────────────────────

  describe('getDefaultBranch', () => {
    it('returns "main" when main branch exists', () => {
      expect(getDefaultBranch(repoDir)).toBe('main');
    });

    it('returns "master" when only master exists', () => {
      git(['branch', '-m', 'main', 'master'], repoDir);
      expect(getDefaultBranch(repoDir)).toBe('master');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // listBranches
  // ─────────────────────────────────────────────────────────────────────────

  describe('listBranches', () => {
    it('lists the default branch', async () => {
      const branches = await listBranches(repoDir);
      expect(branches).toHaveLength(1);
      expect(branches[0]).toMatchObject({ name: 'main', isCurrent: true, isRemote: false, hasWorktree: true });
      // git worktree list resolves symlinks (e.g. /tmp → /private/tmp on macOS)
      expect(branches[0].worktreePath).toBeTruthy();
    });

    it('lists multiple branches', async () => {
      git(['branch', 'feature-a'], repoDir);
      git(['branch', 'feature-b'], repoDir);

      const branches = await listBranches(repoDir);
      const names = branches.map((b) => b.name).sort();
      expect(names).toEqual(['feature-a', 'feature-b', 'main']);
    });

    it('marks the current branch', async () => {
      git(['branch', 'other'], repoDir);
      git(['checkout', 'other'], repoDir);

      const branches = await listBranches(repoDir);
      const current = branches.find((b) => b.isCurrent);
      expect(current?.name).toBe('other');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // createWorktree / removeWorktree / isWorktree
  // ─────────────────────────────────────────────────────────────────────────

  describe('worktree operations', () => {
    it('creates a worktree for an existing branch', () => {
      git(['branch', 'feature'], repoDir);
      const wtPath = join(repoDir, '..', 'wt-feature');

      try {
        createWorktree(repoDir, 'feature', wtPath);
        expect(isGitRepo(wtPath)).toBe(true);
        expect(isWorktree(wtPath)).toBe(true);
        expect(getCurrentBranch(wtPath)).toBe('feature');
      } finally {
        try { removeWorktree(repoDir, wtPath); } catch { /* cleanup */ }
      }
    });

    it('creates a worktree with a new branch', () => {
      const wtPath = join(repoDir, '..', 'wt-new-branch');

      try {
        createWorktree(repoDir, 'new-branch', wtPath);
        expect(isWorktree(wtPath)).toBe(true);
        expect(getCurrentBranch(wtPath)).toBe('new-branch');
      } finally {
        try { removeWorktree(repoDir, wtPath); } catch { /* cleanup */ }
      }
    });

    it('removes a worktree', () => {
      git(['branch', 'to-remove'], repoDir);
      const wtPath = join(repoDir, '..', 'wt-remove');

      createWorktree(repoDir, 'to-remove', wtPath);
      expect(isWorktree(wtPath)).toBe(true);

      removeWorktree(repoDir, wtPath);
      expect(isGitRepo(wtPath)).toBe(false);
    });

    it('reports main repo is not a worktree', () => {
      expect(isWorktree(repoDir)).toBe(false);
    });

    it('creates a worktree with a hyphen-separated branch name', async () => {
      const wtPath = join(repoDir, '..', 'wt-scope-feature');

      try {
        await createWorktree(repoDir, 'scope-my-feature', wtPath);
        expect(isWorktree(wtPath)).toBe(true);
        expect(getCurrentBranch(wtPath)).toBe('scope-my-feature');
      } finally {
        try { removeWorktree(repoDir, wtPath); } catch { /* cleanup */ }
      }
    });

    it('fails when branch name has slash and a conflicting ref prefix exists', async () => {
      // Create a branch called 'integrations'
      git(['branch', 'integrations'], repoDir);

      // Trying to create 'integrations/feature' should fail because
      // refs/heads/integrations (file) blocks refs/heads/integrations/feature (directory)
      const wtPath = join(repoDir, '..', 'wt-conflict');

      try {
        await expect(
          createWorktree(repoDir, 'integrations/feature', wtPath),
        ).rejects.toThrow(/cannot lock ref/);
      } finally {
        try { removeWorktree(repoDir, wtPath); } catch { /* cleanup */ }
      }
    });

    it('succeeds with hyphen separator even when conflicting prefix branch exists', async () => {
      // Create a branch called 'integrations'
      git(['branch', 'integrations'], repoDir);

      // Using a hyphen instead of slash avoids the ref conflict
      const wtPath = join(repoDir, '..', 'wt-no-conflict');

      try {
        await createWorktree(repoDir, 'integrations-feature', wtPath);
        expect(isWorktree(wtPath)).toBe(true);
        expect(getCurrentBranch(wtPath)).toBe('integrations-feature');
      } finally {
        try { removeWorktree(repoDir, wtPath); } catch { /* cleanup */ }
      }
    });

    it('fails when slash-separated branch conflicts with existing nested refs', async () => {
      // Create a branch with a slash: 'scope/existing'
      const wtExisting = join(repoDir, '..', 'wt-existing');
      await createWorktree(repoDir, 'scope/existing', wtExisting);

      // Now trying to create a branch called 'scope' should fail because
      // refs/heads/scope/ (directory) blocks refs/heads/scope (file)
      const wtConflict = join(repoDir, '..', 'wt-conflict2');

      try {
        await expect(
          createWorktree(repoDir, 'scope', wtConflict),
        ).rejects.toThrow();
      } finally {
        try { removeWorktree(repoDir, wtConflict); } catch { /* cleanup */ }
        try { removeWorktree(repoDir, wtExisting); } catch { /* cleanup */ }
      }
    });

    // Integration tests: confirm the branch-name validator actually rejects
    // argv-injection attempts *inside* createWorktree, before git is invoked.
    // The unit tests in branch-validation.test.ts cover the predicate; these
    // cover the integration at the public boundary.
    describe('rejects dangerous branch names before invoking git', () => {
      const dangerous = [
        '--config',
        '--upload-pack=evil',
        '-C',
        'foo..bar',
        'foo/',
        'foo.lock',
        'with space',
        'with\\backslash',
        '',
      ];

      for (const bad of dangerous) {
        it(`rejects ${JSON.stringify(bad)}`, async () => {
          const wtPath = join(repoDir, '..', 'wt-rejected');
          await expect(
            createWorktree(repoDir, bad, wtPath),
          ).rejects.toThrow(/Invalid branch name/);
          // Confirm git never created anything
          expect(isGitRepo(wtPath)).toBe(false);
        });
      }

      it('rejects a dangerous startPoint too', async () => {
        const wtPath = join(repoDir, '..', 'wt-rejected-startpoint');
        await expect(
          createWorktree(repoDir, 'safe-branch', wtPath, '--config=core.sshCommand=evil'),
        ).rejects.toThrow(/Invalid branch name/);
        expect(isGitRepo(wtPath)).toBe(false);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // generateWorktreePath
  // ─────────────────────────────────────────────────────────────────────────

  describe('generateWorktreePath', () => {
    it('produces a path under .worktrees with sanitized branch name', () => {
      expect(generateWorktreePath('/repo', 'my-feature')).toBe('/repo/.worktrees/my-feature');
    });

    it('replaces slashes with hyphens', () => {
      expect(generateWorktreePath('/repo', 'scope/feature')).toBe('/repo/.worktrees/scope-feature');
    });

    it('handles hyphen-separated branch names unchanged', () => {
      expect(generateWorktreePath('/repo', 'scope-feature-abc12345')).toBe('/repo/.worktrees/scope-feature-abc12345');
    });

    it('replaces special characters with hyphens', () => {
      expect(generateWorktreePath('/repo', 'a@b#c')).toBe('/repo/.worktrees/a-b-c');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getStatusFiles
  // ─────────────────────────────────────────────────────────────────────────

  describe('getStatusFiles', () => {
    it('detects staged, unstaged, and untracked files', async () => {
      // Create an unstaged modification
      writeFileSync(join(repoDir, 'README.md'), '# Modified');

      // Create a staged new file
      writeFileSync(join(repoDir, 'staged.ts'), 'export const a = 1;');
      git(['add', 'staged.ts'], repoDir);

      // Create an untracked file
      writeFileSync(join(repoDir, 'untracked.txt'), 'hello');

      const files = await getStatusFiles(repoDir);
      const paths = files.map((f) => f.path);

      expect(paths).toContain('staged.ts');
      expect(paths).toContain('README.md');
      expect(paths).toContain('untracked.txt');

      const staged = files.find((f) => f.path === 'staged.ts');
      expect(staged?.status).toBe('A');
      expect(staged?.staged).toBe(true);

      const modified = files.find((f) => f.path === 'README.md');
      expect(modified?.status).toBe('M');

      const untracked = files.find((f) => f.path === 'untracked.txt');
      expect(untracked?.status).toBe('U');
      expect(untracked?.staged).toBe(false);
    });

    it('returns empty for a clean working tree', async () => {
      const files = await getStatusFiles(repoDir);
      expect(files).toEqual([]);
    });

    it('handles renames', async () => {
      writeFileSync(join(repoDir, 'original.ts'), 'content');
      git(['add', 'original.ts'], repoDir);
      git(['commit', '-m', 'add original'], repoDir);

      git(['mv', 'original.ts', 'renamed.ts'], repoDir);

      const files = await getStatusFiles(repoDir);
      const renamed = files.find((f) => f.path === 'renamed.ts');
      expect(renamed?.status).toBe('R');
      expect(renamed?.oldPath).toBe('original.ts');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getCommitLog
  // ─────────────────────────────────────────────────────────────────────────

  describe('getCommitLog', () => {
    it('returns commits ahead of base', async () => {
      git(['checkout', '-b', 'feature'], repoDir);
      writeFileSync(join(repoDir, 'a.ts'), 'a');
      git(['add', '.'], repoDir);
      git(['commit', '-m', 'feat: add a'], repoDir);

      writeFileSync(join(repoDir, 'b.ts'), 'b');
      git(['add', '.'], repoDir);
      git(['commit', '-m', 'feat: add b'], repoDir);

      const commits = await getCommitLog(repoDir, 'main');
      expect(commits).toHaveLength(2);
      expect(commits[0]!.message).toBe('feat: add b');
      expect(commits[1]!.message).toBe('feat: add a');
      expect(commits[0]!.hash).toHaveLength(40);
      expect(commits[0]!.shortHash.length).toBeGreaterThanOrEqual(7);
      expect(commits[0]!.author).toBe('Test');
      expect(commits[0]!.date).toBeGreaterThan(0);
    });

    it('returns empty when on base branch', async () => {
      const commits = await getCommitLog(repoDir, 'main');
      expect(commits).toEqual([]);
    });

    it('handles commit messages with pipe characters', async () => {
      git(['checkout', '-b', 'pipe-test'], repoDir);
      writeFileSync(join(repoDir, 'pipe.ts'), 'pipe');
      git(['add', '.'], repoDir);
      git(['commit', '-m', 'fix: use A | B | C format'], repoDir);

      const commits = await getCommitLog(repoDir, 'main');
      expect(commits).toHaveLength(1);
      expect(commits[0]!.message).toBe('fix: use A | B | C format');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getDiffStatSummary
  // ─────────────────────────────────────────────────────────────────────────

  describe('getDiffStatSummary', () => {
    it('returns additions, deletions, and file list for branch', async () => {
      git(['checkout', '-b', 'diff-test'], repoDir);
      writeFileSync(join(repoDir, 'new.ts'), 'line1\nline2\nline3\n');
      git(['add', '.'], repoDir);
      git(['commit', '-m', 'add new file'], repoDir);

      const summary = await getDiffStatSummary(repoDir, 'main');
      expect(summary.additions).toBe(3);
      expect(summary.deletions).toBe(0);
      expect(summary.files).toHaveLength(1);
      expect(summary.files[0]!.path).toBe('new.ts');
      expect(summary.files[0]!.status).toBe('A');
      expect(summary.files[0]!.additions).toBe(3);
      expect(summary.files[0]!.deletions).toBe(0);
    });

    it('counts modifications correctly', async () => {
      git(['checkout', '-b', 'modify-test'], repoDir);
      writeFileSync(join(repoDir, 'README.md'), 'new content\nextra line\n');
      git(['add', '.'], repoDir);
      git(['commit', '-m', 'modify readme'], repoDir);

      const summary = await getDiffStatSummary(repoDir, 'main');
      expect(summary.additions).toBeGreaterThan(0);
      expect(summary.files[0]!.status).toBe('M');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getWorkingTreeDiffStat
  // ─────────────────────────────────────────────────────────────────────────

  describe('getWorkingTreeDiffStat', () => {
    it('returns zero for clean working tree', async () => {
      const summary = await getWorkingTreeDiffStat(repoDir);
      expect(summary.additions).toBe(0);
      expect(summary.deletions).toBe(0);
      expect(summary.files).toEqual([]);
    });

    it('counts unstaged modifications', async () => {
      writeFileSync(join(repoDir, 'README.md'), 'changed\nextra\n');

      const summary = await getWorkingTreeDiffStat(repoDir);
      expect(summary.additions).toBeGreaterThan(0);
      expect(summary.files.length).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getDiffForCommit
  // ─────────────────────────────────────────────────────────────────────────

  describe('getDiffForCommit', () => {
    it('returns diff for a specific commit', async () => {
      writeFileSync(join(repoDir, 'new.ts'), 'content');
      git(['add', '.'], repoDir);
      git(['commit', '-m', 'add new'], repoDir);
      const hash = git(['rev-parse', 'HEAD'], repoDir);

      const diff = await getDiffForCommit(repoDir, hash);
      expect(diff).toContain('new.ts');
      expect(diff).toContain('+content');
    });

    it('handles root commit (no parent)', async () => {
      const hash = git(['rev-list', '--max-parents=0', 'HEAD'], repoDir);

      const diff = await getDiffForCommit(repoDir, hash);
      // Root commit may return empty diff depending on git version —
      // the important thing is it doesn't throw
      expect(typeof diff).toBe('string');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getDiffAgainstBase
  // ─────────────────────────────────────────────────────────────────────────

  describe('getDiffAgainstBase', () => {
    it('returns aggregate diff vs base branch', async () => {
      git(['checkout', '-b', 'agg-diff'], repoDir);
      writeFileSync(join(repoDir, 'a.ts'), 'aaa');
      git(['add', '.'], repoDir);
      git(['commit', '-m', 'add a'], repoDir);

      const diff = await getDiffAgainstBase(repoDir, 'main');
      expect(diff).toContain('+aaa');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getWorkingTreeDiff
  // ─────────────────────────────────────────────────────────────────────────

  describe('getWorkingTreeDiff', () => {
    it('returns empty for clean tree', async () => {
      const diff = await getWorkingTreeDiff(repoDir);
      expect(diff).toBe('');
    });

    it('includes both staged and unstaged changes', async () => {
      // staged change
      writeFileSync(join(repoDir, 'staged.ts'), 'staged');
      git(['add', 'staged.ts'], repoDir);

      // unstaged change
      writeFileSync(join(repoDir, 'README.md'), 'unstaged change');

      const diff = await getWorkingTreeDiff(repoDir);
      expect(diff).toContain('staged.ts');
      expect(diff).toContain('README.md');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getFileDiff
  // ─────────────────────────────────────────────────────────────────────────

  describe('getFileDiff', () => {
    it('returns branch diff for a single file', async () => {
      git(['checkout', '-b', 'file-diff'], repoDir);
      writeFileSync(join(repoDir, 'target.ts'), 'new content');
      git(['add', '.'], repoDir);
      git(['commit', '-m', 'add target'], repoDir);

      const diff = await getFileDiff(repoDir, 'target.ts', 'main');
      expect(diff).toContain('+new content');
    });

    it('falls back to working tree diff', async () => {
      writeFileSync(join(repoDir, 'README.md'), 'modified');

      const diff = await getFileDiff(repoDir, 'README.md');
      expect(diff).toContain('README.md');
    });

    it('handles untracked files', async () => {
      writeFileSync(join(repoDir, 'brand-new.ts'), 'brand new');

      const diff = await getFileDiff(repoDir, 'brand-new.ts');
      expect(diff).toContain('brand-new.ts');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getFileAtRef
  // ─────────────────────────────────────────────────────────────────────────

  describe('getFileAtRef', () => {
    it('returns file content at HEAD', async () => {
      const content = await getFileAtRef(repoDir, 'README.md', 'HEAD');
      expect(content).toBe('# Test');
    });

    it('returns working tree content when ref is omitted', async () => {
      writeFileSync(join(repoDir, 'README.md'), 'modified content');

      const content = await getFileAtRef(repoDir, 'README.md');
      expect(content).toBe('modified content');
    });

    it('rejects path traversal outside repo root', async () => {
      await expect(
        getFileAtRef(repoDir, '../../etc/passwd'),
      ).rejects.toThrow('resolves outside repository root');
    });

    it('allows nested paths within repo', async () => {
      const { mkdirSync } = await import('fs');
      mkdirSync(join(repoDir, 'src'), { recursive: true });
      writeFileSync(join(repoDir, 'src', 'file.ts'), 'nested');

      const content = await getFileAtRef(repoDir, 'src/file.ts');
      expect(content).toBe('nested');
    });
  });
});
