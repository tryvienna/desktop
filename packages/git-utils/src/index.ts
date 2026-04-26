/**
 * @vienna/git-utils — Typed wrappers for git operations.
 *
 * Provides synchronous, typed functions for branch listing,
 * worktree management, and repository inspection.
 *
 * @module git-utils
 */

export { GitError, execGit, type ExecGitOptions } from './exec';
export {
  isGitRepo,
  getCurrentBranch,
  getDefaultBranch,
  listBranches,
  listWorktrees,
  createWorktree,
  removeWorktree,
  generateWorktreePath,
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
} from './operations';
export {
  GitBranchSchema,
  GitWorktreeSchema,
  GitStatusFileSchema,
  GitCommitSchema,
  GitDiffSummarySchema,
  type GitBranch,
  type GitWorktree,
  type GitStatusFile,
  type GitCommit,
  type GitDiffSummary,
} from './schemas';
