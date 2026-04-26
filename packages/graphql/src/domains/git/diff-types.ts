/**
 * Git Diff GraphQL Types — Types for diff, status, and commit log operations.
 *
 * @module graphql/domains/git/diff-types
 */

import { builder } from '../../schema/builder';

// ─────────────────────────────────────────────────────────────────────────────
// GitStatusFile
// ─────────────────────────────────────────────────────────────────────────────

type GitStatusFileShape = {
  path: string;
  status: string;
  oldPath: string | null;
  staged: boolean;
  additions?: number;
  deletions?: number;
};

export const GitStatusFileRef = builder.objectRef<GitStatusFileShape>('GitStatusFile');

builder.objectType(GitStatusFileRef, {
  description: 'A file with git status information',
  fields: (t) => ({
    path: t.exposeString('path'),
    status: t.exposeString('status'),
    oldPath: t.exposeString('oldPath', { nullable: true }),
    staged: t.exposeBoolean('staged'),
    additions: t.exposeInt('additions', { nullable: true }),
    deletions: t.exposeInt('deletions', { nullable: true }),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// GitCommit
// ─────────────────────────────────────────────────────────────────────────────

type GitCommitShape = {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: number;
};

export const GitCommitRef = builder.objectRef<GitCommitShape>('GitCommit');

builder.objectType(GitCommitRef, {
  description: 'A git commit',
  fields: (t) => ({
    hash: t.exposeString('hash'),
    shortHash: t.exposeString('shortHash'),
    message: t.exposeString('message'),
    author: t.exposeString('author'),
    date: t.exposeFloat('date', { description: 'Commit date as epoch milliseconds' }),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// GitDiffSummary
// ─────────────────────────────────────────────────────────────────────────────

type GitDiffSummaryShape = {
  additions: number;
  deletions: number;
  files: GitStatusFileShape[];
};

export const GitDiffSummaryRef = builder.objectRef<GitDiffSummaryShape>('GitDiffSummary');

builder.objectType(GitDiffSummaryRef, {
  description: 'Summary of git diff with line counts and changed files',
  fields: (t) => ({
    additions: t.exposeInt('additions'),
    deletions: t.exposeInt('deletions'),
    files: t.field({
      type: [GitStatusFileRef],
      resolve: (parent) => parent.files,
    }),
  }),
});
