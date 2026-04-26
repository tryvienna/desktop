/**
 * Command Queries — GraphQL query fields for command palette.
 *
 * @ai-context
 * Single query to fetch the full command catalog, optionally filtered
 * by category. Delegates to ctx.command.getCatalog().
 *
 * @module graphql/domains/commands/queries
 */

import { GraphQLError } from 'graphql';
import { builder } from '../../schema/builder';
import { CommandRef } from './types';

builder.queryFields((t) => ({
  commands: t.field({
    type: [CommandRef],
    description: 'Get all commands, optionally filtered by category',
    args: {
      categoryFilter: t.arg.string(),
    },
    resolve: (_root, args, ctx) => {
      if (!ctx.command) {
        throw new GraphQLError('Command registry not available', {
          extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
      }
      return ctx.command.getCatalog(args.categoryFilter ?? undefined);
    },
  }),
}));
