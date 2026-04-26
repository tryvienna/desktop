/**
 * Git Diff Queries — GraphQL query fields for diff, status, and commit log operations.
 *
 * @module graphql/domains/git/diff-queries
 */

import { builder } from '../../schema/builder';
import { GitStatusFileRef, GitCommitRef, GitDiffSummaryRef } from './diff-types';
import { requireGitOps, validateGitPath, validateFilePath } from './utils';

builder.queryFields((t) => ({
  gitDiffSummary: t.field({
    type: GitDiffSummaryRef,
    description: 'Get diff stat summary for branch changes vs a base ref (merge-base)',
    args: {
      path: t.arg.string({ required: true }),
      base: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const path = validateGitPath(args.path, ctx);
      return requireGitOps(ctx).getDiffStatSummary(path, args.base);
    },
  }),

  gitWorkingTreeSummary: t.field({
    type: GitDiffSummaryRef,
    description: 'Get diff stat for working tree changes (unstaged + staged + untracked)',
    args: {
      path: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const path = validateGitPath(args.path, ctx);
      return requireGitOps(ctx).getWorkingTreeDiffStat(path);
    },
  }),

  gitCommitLog: t.field({
    type: [GitCommitRef],
    description: 'Get commit log for commits on current branch not on base ref',
    args: {
      path: t.arg.string({ required: true }),
      base: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const path = validateGitPath(args.path, ctx);
      return requireGitOps(ctx).getCommitLog(path, args.base);
    },
  }),

  gitCommitDiff: t.field({
    type: 'String',
    description: 'Get unified diff for a single commit',
    args: {
      path: t.arg.string({ required: true }),
      hash: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const path = validateGitPath(args.path, ctx);
      return requireGitOps(ctx).getDiffForCommit(path, args.hash);
    },
  }),

  gitBranchDiff: t.field({
    type: 'String',
    description: 'Get aggregate unified diff for all branch changes vs base',
    args: {
      path: t.arg.string({ required: true }),
      base: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const path = validateGitPath(args.path, ctx);
      return requireGitOps(ctx).getDiffAgainstBase(path, args.base);
    },
  }),

  gitWorkingTreeDiff: t.field({
    type: 'String',
    description: 'Get unified diff for all working tree changes (staged + unstaged) vs HEAD',
    args: {
      path: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const path = validateGitPath(args.path, ctx);
      return requireGitOps(ctx).getWorkingTreeDiff(path);
    },
  }),

  gitStatusFiles: t.field({
    type: [GitStatusFileRef],
    description: 'Get changed files in the working tree (staged + unstaged + untracked)',
    args: {
      path: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const path = validateGitPath(args.path, ctx);
      return requireGitOps(ctx).getStatusFiles(path);
    },
  }),

  gitFileDiff: t.field({
    type: 'String',
    description: 'Get unified diff for a single file (tries branch diff, working tree, then untracked)',
    args: {
      path: t.arg.string({ required: true }),
      filePath: t.arg.string({ required: true }),
      base: t.arg.string(),
    },
    resolve: async (_root, args, ctx) => {
      const path = validateGitPath(args.path, ctx);
      validateFilePath(args.filePath, path);
      return requireGitOps(ctx).getFileDiff(path, args.filePath, args.base ?? undefined);
    },
  }),

  gitFileAtRef: t.field({
    type: 'String',
    description: 'Get file content at a specific git ref, or current working tree if ref is null',
    args: {
      path: t.arg.string({ required: true }),
      filePath: t.arg.string({ required: true }),
      ref: t.arg.string(),
    },
    resolve: async (_root, args, ctx) => {
      const path = validateGitPath(args.path, ctx);
      validateFilePath(args.filePath, path);
      return requireGitOps(ctx).getFileAtRef(path, args.filePath, args.ref ?? undefined);
    },
  }),
}));
