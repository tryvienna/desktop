/**
 * GraphQL mutations for content profiles.
 *
 * @module graphql/domains/profiles/mutations
 */

import { GraphQLError } from 'graphql';
import { builder } from '../../schema/builder';
import { ContentProfileRef } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

function unavailable(): GraphQLError {
  return new GraphQLError('Content profile manager not available', {
    extensions: { code: 'SERVICE_UNAVAILABLE' },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

builder.mutationFields((t) => ({
  createContentProfile: t.field({
    type: ContentProfileRef,
    description: 'Create a new empty content profile',
    args: {
      name: t.arg.string({ required: true }),
    },
    resolve: async (_root, { name }, ctx) => {
      if (!ctx.contentProfiles) throw unavailable();
      return ctx.contentProfiles.create(name);
    },
  }),

  forkContentProfile: t.field({
    type: ContentProfileRef,
    description: 'Fork a content profile by cloning a git repository',
    args: {
      gitUrl: t.arg.string({ required: true }),
      name: t.arg.string({ required: false }),
    },
    resolve: async (_root, { gitUrl, name }, ctx) => {
      if (!ctx.contentProfiles) throw unavailable();
      return ctx.contentProfiles.fork(gitUrl, name ?? undefined);
    },
  }),

  switchContentProfile: t.field({
    type: 'Boolean',
    description: 'Switch to a different content profile',
    args: {
      name: t.arg.string({ required: true }),
    },
    resolve: async (_root, { name }, ctx) => {
      if (!ctx.contentProfiles) throw unavailable();
      await ctx.contentProfiles.switchTo(name);
      return true;
    },
  }),

  deleteContentProfile: t.field({
    type: 'Boolean',
    description: 'Delete a content profile (cannot delete default or active)',
    args: {
      name: t.arg.string({ required: true }),
    },
    resolve: async (_root, { name }, ctx) => {
      if (!ctx.contentProfiles) throw unavailable();
      return ctx.contentProfiles.delete(name);
    },
  }),
}));
