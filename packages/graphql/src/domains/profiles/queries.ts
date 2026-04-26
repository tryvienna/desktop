/**
 * GraphQL queries for content profiles.
 *
 * @module graphql/domains/profiles/queries
 */

import { GraphQLError } from 'graphql';
import { builder } from '../../schema/builder';
import { ContentProfileRef } from './types';

builder.queryFields((t) => ({
  contentProfiles: t.field({
    type: [ContentProfileRef],
    description: 'List all content profiles',
    resolve: (_root, _args, ctx) => {
      if (!ctx.contentProfiles) throw unavailable();
      return ctx.contentProfiles.list();
    },
  }),

  activeContentProfile: t.field({
    type: ContentProfileRef,
    description: 'Get the currently active content profile',
    resolve: (_root, _args, ctx) => {
      if (!ctx.contentProfiles) throw unavailable();
      return ctx.contentProfiles.getActive();
    },
  }),
}));

function unavailable(): GraphQLError {
  return new GraphQLError('Content profile manager not available', {
    extensions: { code: 'SERVICE_UNAVAILABLE' },
  });
}
