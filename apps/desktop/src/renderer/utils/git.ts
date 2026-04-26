/**
 * Git Utilities — Shared helpers for branch/worktree UI components.
 *
 * @ai-context
 * - DEFAULT_BRANCHES: Set of branch names considered "default" (no highlight)
 * - getDirectoryName: Extracts last path segment for display
 * - generateWorktreePath: Deterministic worktree path from repo + branch
 */

/** Branch names that are considered default (not highlighted in the picker) */
export const DEFAULT_BRANCHES = new Set(['main', 'master', 'develop', 'dev']);

/** Extract the last path segment for display (e.g., "/path/to/my-repo" → "my-repo") */
export function getDirectoryName(dirPath: string): string {
  const parts = dirPath.split('/');
  return parts[parts.length - 1] || dirPath;
}

/** Generate a deterministic worktree path: repoPath/.worktrees/<safe-branch> */
export function generateWorktreePath(repoPath: string, branch: string): string {
  const safeBranch = branch.replace(/[^a-zA-Z0-9-_]/g, '-');
  return `${repoPath}/.worktrees/${safeBranch}`;
}

/** Shorten a path for display by replacing the home directory with ~ */
export function shortenPath(dirPath: string): string {
  // Match common home directory patterns across macOS, Linux, and Windows (WSL)
  return dirPath.replace(/^\/(?:Users|home)\/[^/]+/, '~');
}
