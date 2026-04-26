/**
 * Inbox GraphQL Queries — read operations for inbox items.
 *
 * @module graphql/domains/inbox/queries
 */

import { builder } from '../../schema/builder';
import { InboxItemRef } from './types';

builder.queryFields((t) => ({
  /** List inbox items in reverse chronological order. */
  inboxItems: t.field({
    type: [InboxItemRef],
    args: {
      includeArchived: t.arg.boolean(),
      includeRead: t.arg.boolean(),
      limit: t.arg.int(),
      offset: t.arg.int(),
    },
    resolve: (_root, args, ctx) => {
      return ctx.db.inboxItems.list({
        includeArchived: args.includeArchived ?? false,
        includeRead: args.includeRead ?? true,
        limit: args.limit ?? 100,
        offset: args.offset ?? 0,
      });
    },
  }),

  /** Count of unread, non-archived inbox items. */
  inboxUnreadCount: t.int({
    resolve: (_root, _args, ctx) => {
      return ctx.db.inboxItems.countUnread();
    },
  }),
}));
