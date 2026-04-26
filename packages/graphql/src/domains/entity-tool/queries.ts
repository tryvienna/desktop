/**
 * Entity Tool Queries — List saved entity URIs for dev debugging.
 *
 * @module graphql/domains/entity-tool/queries
 */

import { builder } from '../../schema/builder';
import { EntityToolEntryRef } from './types';

builder.queryFields((t) => ({
  entityToolEntries: t.field({
    type: [EntityToolEntryRef],
    description: 'List all saved entity tool entries (dev debugging)',
    resolve: (_root, _args, ctx) => {
      if (!ctx.entityToolStore) return [];
      return ctx.entityToolStore.getAll();
    },
  }),
}));
