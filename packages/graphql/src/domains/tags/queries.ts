/**
 * Tag Queries — GraphQL query fields for tags.
 *
 * Tag definitions come from TagFileStore (JSON files).
 * Workstream tags come from the database (snapshot data).
 *
 * @module graphql/domains/tags/queries
 */

import { GraphQLError } from 'graphql';
import { builder } from '../../schema/builder';
import { TagRef, WorkstreamTagRef } from './types';

builder.queryFields((t) => ({
  tagsByProject: t.field({
    type: [TagRef],
    description: 'List all merged tags for a project (global + project overrides)',
    args: { projectId: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) => {
      if (!ctx.tagFileStore) {
        throw new GraphQLError('Tag file store not available', { extensions: { code: 'UNAVAILABLE' } });
      }
      return ctx.tagFileStore.getMerged(String(args.projectId));
    },
  }),

  tagByName: t.field({
    type: TagRef,
    nullable: true,
    description: 'Find a tag by name within a project (searches merged set)',
    args: {
      projectId: t.arg.id({ required: true }),
      name: t.arg.string({ required: true }),
    },
    resolve: (_root, args, ctx) => {
      if (!ctx.tagFileStore) return null;
      return ctx.tagFileStore.getByName(String(args.projectId), args.name);
    },
  }),

  workstreamTags: t.field({
    type: [WorkstreamTagRef],
    description: 'Get all tags applied to a workstream (snapshot data)',
    args: { workstreamId: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) => ctx.db.tags.getWorkstreamTags(String(args.workstreamId)),
  }),
}));
