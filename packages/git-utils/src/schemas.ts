/**
 * Git Schemas — Zod schemas for git operation return types.
 *
 * @module git-utils/schemas
 */

import { z } from 'zod';

export const GitBranchSchema = z.object({
  /** Branch name without refs/ prefix */
  name: z.string(),
  /** Whether this is the currently checked-out branch */
  isCurrent: z.boolean(),
  /** Whether this is a remote-tracking branch */
  isRemote: z.boolean(),
  /** Whether this branch has an associated worktree */
  hasWorktree: z.boolean(),
  /** Absolute path to the worktree directory, if one exists */
  worktreePath: z.string().nullable(),
});
export type GitBranch = z.infer<typeof GitBranchSchema>;

export const GitWorktreeSchema = z.object({
  /** Absolute path to the worktree */
  path: z.string(),
  /** Branch checked out in this worktree */
  branch: z.string().nullable(),
  /** HEAD commit SHA */
  head: z.string(),
  /** Whether this is the main worktree */
  isMain: z.boolean(),
});
export type GitWorktree = z.infer<typeof GitWorktreeSchema>;

export const GitStatusFileSchema = z.object({
  /** File path relative to repo root */
  path: z.string(),
  /** Status code: M (modified), A (added), D (deleted), R (renamed), U (untracked) */
  status: z.enum(['M', 'A', 'D', 'R', 'U']),
  /** Original path for renames */
  oldPath: z.string().nullable(),
  /** Whether the change is staged */
  staged: z.boolean(),
  /** Lines added (from --numstat, 0 if unavailable) */
  additions: z.number().optional(),
  /** Lines deleted (from --numstat, 0 if unavailable) */
  deletions: z.number().optional(),
});
export type GitStatusFile = z.infer<typeof GitStatusFileSchema>;

export const GitCommitSchema = z.object({
  /** Full commit hash */
  hash: z.string(),
  /** Abbreviated commit hash */
  shortHash: z.string(),
  /** Commit message (first line) */
  message: z.string(),
  /** Author name */
  author: z.string(),
  /** Commit date as epoch milliseconds */
  date: z.number(),
});
export type GitCommit = z.infer<typeof GitCommitSchema>;

export const GitDiffSummarySchema = z.object({
  /** Total lines added */
  additions: z.number(),
  /** Total lines deleted */
  deletions: z.number(),
  /** Changed files */
  files: z.array(GitStatusFileSchema),
});
export type GitDiffSummary = z.infer<typeof GitDiffSummarySchema>;
