/**
 * Git Queries — GraphQL query fields for git operations.
 *
 * All queries delegate to ctx.gitOps which wraps @vienna/git-utils.
 * Paths are validated to be absolute and within known project directories.
 *
 * @module graphql/domains/git/queries
 */

import { builder } from '../../schema/builder';
import { GitBranchRef } from './types';
import { requireGitOps, validateGitPath } from './utils';

builder.queryFields((t) => ({
  isGitRepo: t.field({
    type: 'Boolean',
    description: 'Check if a path is inside a git repository',
    args: { path: t.arg.string({ required: true }) },
    resolve: (_root, args, ctx) => {
      const path = validateGitPath(args.path, ctx);
      return requireGitOps(ctx).isGitRepo(path);
    },
  }),

  gitBranches: t.field({
    type: [GitBranchRef],
    description: 'List branches for a git repository',
    args: { path: t.arg.string({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const path = validateGitPath(args.path, ctx);
      return requireGitOps(ctx).listBranches(path);
    },
  }),

  gitCurrentBranch: t.field({
    type: 'String',
    nullable: true,
    description: 'Get the current branch for a git repository',
    args: { path: t.arg.string({ required: true }) },
    resolve: (_root, args, ctx) => {
      const path = validateGitPath(args.path, ctx);
      return requireGitOps(ctx).getCurrentBranch(path);
    },
  }),

  gitDefaultBranch: t.field({
    type: 'String',
    description: 'Get the default branch for a git repository (main/master)',
    args: { path: t.arg.string({ required: true }) },
    resolve: (_root, args, ctx) => {
      const path = validateGitPath(args.path, ctx);
      return requireGitOps(ctx).getDefaultBranch(path);
    },
  }),
}));
