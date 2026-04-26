/**
 * Git GraphQL Types — Types for git repository operations.
 *
 * @module graphql/domains/git/types
 */

import { builder } from '../../schema/builder';

// ─────────────────────────────────────────────────────────────────────────────
// GitBranch type (not in Objects map — uses a simple object ref)
// ─────────────────────────────────────────────────────────────────────────────

type GitBranchShape = {
  name: string;
  isCurrent: boolean;
  isRemote: boolean;
  hasWorktree: boolean;
  worktreePath: string | null;
};

export const GitBranchRef = builder.objectRef<GitBranchShape>('GitBranch');

builder.objectType(GitBranchRef, {
  description: 'A git branch',
  fields: (t) => ({
    name: t.exposeString('name'),
    isCurrent: t.exposeBoolean('isCurrent'),
    isRemote: t.exposeBoolean('isRemote'),
    hasWorktree: t.exposeBoolean('hasWorktree'),
    worktreePath: t.exposeString('worktreePath', { nullable: true }),
  }),
});
