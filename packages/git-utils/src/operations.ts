/**
 * Git Operations — Typed wrappers for common git commands.
 *
 * Most functions are synchronous (matching better-sqlite3 convention).
 * listWorktrees, listBranches, createWorktree, and removeWorktree are async to
 * avoid blocking the event loop on potentially slow git operations.
 * All functions throw GitError on failure.
 *
 * @module git-utils/operations
 */

import { execGit, execGitAsync, type ExecGitOptions } from './exec';
import { GitError } from './exec';
import type { GitBranch, GitWorktree, GitStatusFile, GitCommit, GitDiffSummary } from './schemas';

/**
 * Allowed characters for a git ref name as accepted by our helpers.
 *
 * This is stricter than git's own `git check-ref-format` — we refuse
 * anything that could be mistaken for a flag (leading `-`), any non-ASCII
 * or control character, and anything outside `[A-Za-z0-9._/-]`. That's
 * enough to cover typical workflow branch names (`feat/foo`, `fix-bar`,
 * `user/feature.1`) while making argv smuggling (`--config`, `--upload-pack`)
 * impossible.
 *
 * Rejected:
 * - leading `-` (would parse as a flag)
 * - `..` (git would reject but we reject early with a clear message)
 * - any character outside `[A-Za-z0-9._/-]`
 * - empty / whitespace-only
 * - trailing slash, trailing `.lock`, trailing dot
 */
const BRANCH_NAME_ALLOWED = /^[A-Za-z0-9._/-]+$/;

export function isValidBranchName(name: unknown): name is string {
  if (typeof name !== 'string') return false;
  if (name.length === 0) return false;
  if (name.startsWith('-')) return false;
  if (name.includes('..')) return false;
  if (name.endsWith('/') || name.endsWith('.') || name.endsWith('.lock')) return false;
  if (!BRANCH_NAME_ALLOWED.test(name)) return false;
  return true;
}

function assertSafeBranchName(name: string, op: string): void {
  if (!isValidBranchName(name)) {
    throw new GitError(`Invalid branch name: ${JSON.stringify(name)}`, op, null, '');
  }
}

/**
 * Check if a directory is inside a git repository.
 */
export function isGitRepo(path: string): boolean {
  try {
    execGit(['rev-parse', '--is-inside-work-tree'], { cwd: path });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the current branch name, or null if in detached HEAD state.
 */
export function getCurrentBranch(path: string): string | null {
  try {
    return execGit(['symbolic-ref', '--short', 'HEAD'], { cwd: path }) || null;
  } catch {
    return null;
  }
}

/**
 * Get the default branch name (usually 'main' or 'master').
 * Checks remote origin HEAD first, falls back to common names.
 */
export function getDefaultBranch(path: string): string {
  try {
    const ref = execGit(['symbolic-ref', 'refs/remotes/origin/HEAD'], { cwd: path });
    const match = ref.match(/refs\/remotes\/origin\/(.+)/);
    if (match?.[1]) return match[1];
  } catch {
    // No remote or no origin/HEAD — check local branches
  }

  // Check if 'main' or 'master' exist locally
  try {
    execGit(['rev-parse', '--verify', 'refs/heads/main'], { cwd: path });
    return 'main';
  } catch {
    // fall through
  }

  try {
    execGit(['rev-parse', '--verify', 'refs/heads/master'], { cwd: path });
    return 'master';
  } catch {
    // fall through
  }

  return 'main';
}

/**
 * List all worktrees for a repository.
 *
 * Async to avoid blocking the Node.js event loop.
 */
export async function listWorktrees(path: string): Promise<GitWorktree[]> {
  let output: string;
  try {
    output = await execGitAsync(['worktree', 'list', '--porcelain'], { cwd: path });
  } catch {
    return [];
  }

  if (!output) return [];

  const worktrees: GitWorktree[] = [];
  let current: Partial<GitWorktree> = {};

  for (const line of output.split('\n')) {
    if (line.startsWith('worktree ')) {
      if (current.path) {
        worktrees.push({
          path: current.path,
          branch: current.branch ?? null,
          head: current.head ?? '',
          isMain: current.isMain ?? false,
        });
      }
      current = { path: line.slice(9), branch: null, head: '', isMain: worktrees.length === 0 };
    } else if (line.startsWith('HEAD ')) {
      current.head = line.slice(5);
    } else if (line.startsWith('branch ')) {
      current.branch = line.slice(7).replace('refs/heads/', '');
    }
  }
  if (current.path) {
    worktrees.push({
      path: current.path,
      branch: current.branch ?? null,
      head: current.head ?? '',
      isMain: current.isMain ?? false,
    });
  }

  return worktrees;
}

/**
 * List all local and remote branches, annotated with worktree info.
 *
 * Async to avoid blocking the Node.js event loop.
 */
export async function listBranches(path: string, options?: ExecGitOptions): Promise<GitBranch[]> {
  const timeout = options?.timeout;
  const output = await execGitAsync(
    ['branch', '--all', '--no-color', '--format=%(HEAD)%(refname:short)'],
    { cwd: path, timeout },
  );

  if (!output) return [];

  // Build a map of branch → worktree path
  const worktrees = await listWorktrees(path);
  const worktreeByBranch = new Map<string, string>();
  for (const wt of worktrees) {
    if (wt.branch) worktreeByBranch.set(wt.branch, wt.path);
  }

  return output.split('\n').map((line): GitBranch => {
    const isCurrent = line.startsWith('*');
    const name = line.replace(/^\*/, '').trim();
    const isRemote = name.startsWith('origin/');
    const wtPath = worktreeByBranch.get(name) ?? null;

    return { name, isCurrent, isRemote, hasWorktree: wtPath !== null, worktreePath: wtPath };
  });
}

/**
 * Create a git worktree for a branch at the target path.
 * If the branch doesn't exist locally, creates it from HEAD (or startPoint if provided).
 *
 * Uses an optimistic approach: tries to attach an existing branch first,
 * then falls back to creating a new branch — avoids a TOCTOU race.
 *
 * @param startPoint - Optional branch/commit to start the new branch from (e.g. 'main').
 *                     Only used when creating a new branch (fallback path).
 *
 * Async to avoid blocking the Node.js event loop during worktree creation.
 */
export async function createWorktree(
  repoPath: string,
  branch: string,
  targetPath: string,
  startPoint?: string,
): Promise<void> {
  assertSafeBranchName(branch, 'git worktree add');
  if (startPoint !== undefined) assertSafeBranchName(startPoint, 'git worktree add');
  try {
    // Optimistic: branch already exists
    await execGitAsync(['worktree', 'add', targetPath, branch], { cwd: repoPath });
  } catch (err) {
    // Only retry with -b if the branch doesn't exist.
    // Other failures (target path exists, disk full, etc.) should propagate as-is.
    const stderr = err instanceof GitError ? err.stderr : '';
    const isBranchNotFound = /not a valid object|invalid reference/i.test(stderr);
    if (!isBranchNotFound) throw err;
    // Branch doesn't exist — create it (optionally from a start point)
    const args = ['worktree', 'add', '-b', branch, targetPath];
    if (startPoint) args.push(startPoint);
    await execGitAsync(args, { cwd: repoPath });
  }
}

/**
 * Remove a git worktree.
 * @param force - Pass true to force removal (e.g., with uncommitted changes). Defaults to false.
 *
 * Async to avoid blocking the Node.js event loop during worktree removal.
 */
export async function removeWorktree(repoPath: string, targetPath: string, force = false): Promise<void> {
  const args = ['worktree', 'remove', targetPath];
  if (force) args.push('--force');
  await execGitAsync(args, { cwd: repoPath });
}

/**
 * Generate a deterministic worktree path: repoPath/.worktrees/<safe-branch>.
 * Sanitizes the branch name to be filesystem-safe (replaces non-alphanumeric chars with dashes).
 */
export function generateWorktreePath(repoPath: string, branch: string): string {
  const safeBranch = branch.replace(/[^a-zA-Z0-9-_]/g, '-');
  return `${repoPath}/.worktrees/${safeBranch}`;
}

/**
 * Check if a directory is a git worktree (not the main working tree).
 * Compares --git-dir with --git-common-dir — they differ only in worktrees.
 */
export function isWorktree(path: string): boolean {
  try {
    const gitDir = execGit(['rev-parse', '--git-dir'], { cwd: path });
    const commonDir = execGit(['rev-parse', '--git-common-dir'], { cwd: path });
    return gitDir !== commonDir;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Diff & Status Operations
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse NUL-delimited `git diff --name-status -z` output into file entries.
 *
 * Format: STATUS\0PATH\0 for non-renames, or R###\0OLDPATH\0NEWPATH\0 for renames.
 * Each field is NUL-separated — no ambiguous position-based parsing needed.
 */
function parseNameStatusNul(
  output: string,
  staged: boolean,
): GitStatusFile[] {
  if (!output) return [];
  const parts = output.split('\0').filter(Boolean);
  const files: GitStatusFile[] = [];
  let i = 0;
  while (i < parts.length) {
    const statusField = parts[i]!;
    const statusChar = statusField[0]!;

    if (statusChar === 'R' || statusChar === 'C') {
      // Rename/copy: consumes two path fields (old, new)
      const oldPath = parts[i + 1];
      const newPath = parts[i + 2];
      if (oldPath && newPath) {
        files.push({ path: newPath, status: 'R', oldPath, staged });
      }
      i += 3;
    } else {
      // M, A, D, T, U — single path field
      const filePath = parts[i + 1];
      if (filePath) {
        let status: GitStatusFile['status'];
        if (statusChar === 'A') status = 'A';
        else if (statusChar === 'D') status = 'D';
        else status = 'M';
        files.push({ path: filePath, status, oldPath: null, staged });
      }
      i += 2;
    }
  }
  return files;
}

/**
 * Get the list of changed files in the working tree (staged + unstaged + untracked).
 *
 * Uses three separate git commands with NUL-delimited output (-z) for robust parsing:
 * 1. `git diff --name-status --cached -z` — staged changes
 * 2. `git diff --name-status -z` — unstaged changes
 * 3. `git ls-files --others --exclude-standard -z` — untracked files
 */
export async function getStatusFiles(path: string): Promise<GitStatusFile[]> {
  const opts = { cwd: path, timeout: 30_000 };

  // Run all commands in parallel (including numstat for line counts)
  const [stagedRaw, unstagedRaw, untrackedRaw, stagedNumstat, unstagedNumstat] = await Promise.all([
    execGitAsync(['diff', '--name-status', '--cached', '-z'], opts).catch(() => ''),
    execGitAsync(['diff', '--name-status', '-z'], opts).catch(() => ''),
    execGitAsync(['ls-files', '--others', '--exclude-standard', '-z'], opts).catch(() => ''),
    execGitAsync(['diff', '--numstat', '--cached'], opts).catch(() => ''),
    execGitAsync(['diff', '--numstat'], opts).catch(() => ''),
  ]);

  const staged = parseNameStatusNul(stagedRaw, true);
  const unstaged = parseNameStatusNul(unstagedRaw, false);

  // Untracked files: just NUL-separated paths
  const untracked: GitStatusFile[] = untrackedRaw
    ? untrackedRaw
        .split('\0')
        .filter(Boolean)
        .map((p) => ({ path: p, status: 'U' as const, oldPath: null, staged: false }))
    : [];

  // Merge: staged first, then unstaged (skip if already in staged), then untracked
  const seen = new Set<string>();
  const result: GitStatusFile[] = [];
  for (const f of staged) {
    seen.add(f.path);
    result.push(f);
  }
  for (const f of unstaged) {
    if (!seen.has(f.path)) {
      seen.add(f.path);
      result.push(f);
    }
  }
  for (const f of untracked) {
    if (!seen.has(f.path)) {
      seen.add(f.path);
      result.push(f);
    }
  }

  // Attach numstat (additions/deletions) from both staged and unstaged
  const stagedStats = parseNumstat(stagedNumstat);
  const unstagedStats = parseNumstat(unstagedNumstat);
  const mergedPerFile = new Map<string, { additions: number; deletions: number }>();
  for (const [filePath, stats] of unstagedStats.perFile) {
    mergedPerFile.set(filePath, { ...stats });
  }
  for (const [filePath, stats] of stagedStats.perFile) {
    const existing = mergedPerFile.get(filePath);
    if (existing) {
      existing.additions += stats.additions;
      existing.deletions += stats.deletions;
    } else {
      mergedPerFile.set(filePath, { ...stats });
    }
  }

  return attachNumstat(result, mergedPerFile);
}

/**
 * Parse --numstat output into per-file and total additions/deletions.
 * Each line: "additions\tdeletions\tfilepath" (binary files show "-" for both).
 */
function parseNumstat(output: string): {
  additions: number;
  deletions: number;
  perFile: Map<string, { additions: number; deletions: number }>;
} {
  let additions = 0;
  let deletions = 0;
  const perFile = new Map<string, { additions: number; deletions: number }>();
  for (const line of output.split('\n')) {
    if (!line) continue;
    const parts = line.split('\t');
    if (parts.length < 3) continue;
    const add = parseInt(parts[0]!, 10);
    const del = parseInt(parts[1]!, 10);
    const filePath = parts.slice(2).join('\t');
    if (!isNaN(add)) additions += add;
    if (!isNaN(del)) deletions += del;
    perFile.set(filePath, { additions: isNaN(add) ? 0 : add, deletions: isNaN(del) ? 0 : del });
  }
  return { additions, deletions, perFile };
}

/**
 * Attach per-file numstat data to file list.
 *
 * For renames, git numstat uses `{oldPath => newPath}` format (or just the new path
 * depending on git version). We try matching by `f.path` first, then by `f.oldPath`
 * for renamed files, and finally by the `{old => new}` notation.
 */
function attachNumstat(
  files: GitStatusFile[],
  perFile: Map<string, { additions: number; deletions: number }>,
): GitStatusFile[] {
  return files.map((f) => {
    // Direct match by path (most common case)
    const stats = perFile.get(f.path)
      // For renames, try matching by old path
      ?? (f.oldPath ? perFile.get(f.oldPath) : undefined)
      // Git numstat may use `{oldPath => newPath}` notation for renames
      ?? (f.oldPath ? perFile.get(`${f.oldPath} => ${f.path}`) : undefined);
    return stats ? { ...f, additions: stats.additions, deletions: stats.deletions } : f;
  });
}

/**
 * Get diff stat summary for branch changes vs a base ref.
 * Uses three-dot syntax (merge-base) to match GitHub PR behavior.
 * Uses -z (NUL-delimited) output for robust path parsing.
 */
export async function getDiffStatSummary(
  path: string,
  base: string,
): Promise<GitDiffSummary> {
  const opts = { cwd: path, timeout: 30_000 };

  let numstatOutput: string;
  try {
    numstatOutput = await execGitAsync(
      ['diff', '--numstat', `${base}...HEAD`],
      opts,
    );
  } catch {
    return { additions: 0, deletions: 0, files: [] };
  }

  let nameStatusOutput: string;
  try {
    nameStatusOutput = await execGitAsync(
      ['diff', '--name-status', '-z', `${base}...HEAD`],
      opts,
    );
  } catch {
    nameStatusOutput = '';
  }

  const { additions, deletions, perFile } = parseNumstat(numstatOutput);
  const files = attachNumstat(parseNameStatusNul(nameStatusOutput, false), perFile);

  return { additions, deletions, files };
}

/**
 * Get diff stat for working tree changes (unstaged + staged).
 */
export async function getWorkingTreeDiffStat(
  path: string,
): Promise<GitDiffSummary> {
  // Unstaged changes
  let unstagedOutput = '';
  try {
    unstagedOutput = await execGitAsync(['diff', '--numstat'], { cwd: path });
  } catch {
    // empty
  }

  // Staged changes
  let stagedOutput = '';
  try {
    stagedOutput = await execGitAsync(['diff', '--numstat', '--cached'], { cwd: path });
  } catch {
    // empty
  }

  const unstaged = parseNumstat(unstagedOutput);
  const staged = parseNumstat(stagedOutput);

  // Merge per-file stats from both
  const mergedPerFile = new Map<string, { additions: number; deletions: number }>();
  for (const [filePath, stats] of unstaged.perFile) {
    mergedPerFile.set(filePath, { ...stats });
  }
  for (const [filePath, stats] of staged.perFile) {
    const existing = mergedPerFile.get(filePath);
    if (existing) {
      existing.additions += stats.additions;
      existing.deletions += stats.deletions;
    } else {
      mergedPerFile.set(filePath, { ...stats });
    }
  }

  // Get file list from status
  const files = attachNumstat(await getStatusFiles(path), mergedPerFile);

  return {
    additions: unstaged.additions + staged.additions,
    deletions: unstaged.deletions + staged.deletions,
    files,
  };
}

/**
 * Get commit log for commits on the current branch that aren't on the base ref.
 * Uses two-dot syntax: base..HEAD.
 *
 * Uses NUL (%x00) as field delimiter instead of pipe to avoid breakage when
 * commit messages or author names contain `|` characters.
 */
export async function getCommitLog(
  path: string,
  base: string,
): Promise<GitCommit[]> {
  let output: string;
  try {
    output = await execGitAsync(
      ['log', '--format=%H%x00%h%x00%s%x00%an%x00%at', `${base}..HEAD`],
      { cwd: path },
    );
  } catch {
    return [];
  }

  if (!output) return [];

  return output
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash, shortHash, message, author, dateStr] = line.split('\0');
      return {
        hash: hash!,
        shortHash: shortHash!,
        message: message!,
        author: author!,
        date: parseInt(dateStr!, 10) * 1000,
      };
    });
}

/**
 * Get the unified diff for a single commit.
 */
export async function getDiffForCommit(
  path: string,
  commitHash: string,
): Promise<string> {
  try {
    // Check if it's a root commit (no parent)
    try {
      await execGitAsync(['rev-parse', `${commitHash}^`], { cwd: path });
    } catch {
      // No parent — root commit
      return await execGitAsync(
        ['diff', '--root', commitHash],
        { cwd: path, timeout: 60_000 },
      );
    }

    return await execGitAsync(
      ['diff', `${commitHash}^..${commitHash}`],
      { cwd: path, timeout: 60_000 },
    );
  } catch {
    return '';
  }
}

/**
 * Get the aggregate unified diff for all branch changes vs base.
 */
export async function getDiffAgainstBase(
  path: string,
  base: string,
): Promise<string> {
  try {
    return await execGitAsync(
      ['diff', `${base}...HEAD`],
      { cwd: path, timeout: 60_000 },
    );
  } catch {
    return '';
  }
}

/**
 * Get unified diff for all working tree changes (staged + unstaged) against HEAD.
 */
export async function getWorkingTreeDiff(path: string): Promise<string> {
  try {
    // Unstaged changes
    const unstaged = await execGitAsync(['diff'], { cwd: path, timeout: 60_000 });
    // Staged changes
    const staged = await execGitAsync(['diff', '--cached'], { cwd: path, timeout: 60_000 });
    return [unstaged, staged].filter(Boolean).join('\n');
  } catch {
    return '';
  }
}

/**
 * Get unified diff for a single file combining branch diff and working tree changes.
 * Tries: 1) branch diff vs base for the file, 2) working tree diff for the file,
 * 3) for untracked files, shows full content as new file.
 */
export async function getFileDiff(
  path: string,
  filePath: string,
  base?: string,
): Promise<string> {
  // Try branch diff for this file
  if (base) {
    try {
      const branchDiff = await execGitAsync(
        ['diff', `${base}...HEAD`, '--', filePath],
        { cwd: path, timeout: 60_000 },
      );
      if (branchDiff.trim()) return branchDiff;
    } catch {
      // fall through
    }
  }

  // Try working tree diff (unstaged + staged) for this file
  try {
    const unstaged = await execGitAsync(['diff', '--', filePath], { cwd: path, timeout: 60_000 });
    if (unstaged.trim()) return unstaged;
  } catch {
    // fall through
  }
  try {
    const staged = await execGitAsync(['diff', '--cached', '--', filePath], { cwd: path, timeout: 60_000 });
    if (staged.trim()) return staged;
  } catch {
    // fall through
  }

  // For untracked/new files, show full content as addition
  try {
    const content = await execGitAsync(
      ['diff', '--no-index', '/dev/null', filePath],
      { cwd: path, timeout: 60_000 },
    );
    if (content.trim()) return content;
  } catch (err: unknown) {
    // git diff --no-index exits with code 1 when files differ (which is expected).
    // GitError preserves stdout so we can extract the diff output.
    if (err instanceof GitError && err.stdout?.trim()) {
      return err.stdout;
    }
  }

  return '';
}

/**
 * Get file content at a specific git ref (commit, branch, tag).
 * If ref is null/undefined, reads the current working tree version.
 *
 * Validates that the resolved file path stays within the repository root
 * to prevent path traversal attacks (e.g., `../../etc/passwd`).
 */
export async function getFileAtRef(
  repoPath: string,
  filePath: string,
  ref?: string,
): Promise<string> {
  if (ref) {
    // Content at a specific ref — git validates the path is within the repo
    return execGitAsync(['show', `${ref}:${filePath}`], { cwd: repoPath, timeout: 30_000 });
  }
  // Current working tree content — must validate path stays within repo
  const { readFile } = await import('fs/promises');
  const { resolve, normalize } = await import('path');
  const resolved = normalize(resolve(repoPath, filePath));
  const normalizedRepo = normalize(resolve(repoPath));
  if (!resolved.startsWith(normalizedRepo + '/') && resolved !== normalizedRepo) {
    throw new GitError(
      `File path "${filePath}" resolves outside repository root`,
      'getFileAtRef',
      null,
      '',
    );
  }
  return readFile(resolved, 'utf-8');
}
