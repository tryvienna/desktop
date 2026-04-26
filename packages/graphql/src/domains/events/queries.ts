/**
 * Events GraphQL Queries
 *
 * @module graphql/domains/events/queries
 */

import { builder } from '../../schema/builder';
import { RegisteredEventRef } from './types';

builder.queryFields((t) => ({
  registeredEvents: t.field({
    type: [RegisteredEventRef],
    description: 'List all registered events in the plugin event system',
    resolve: (_root, _args, ctx) => {
      if (!ctx.events) return [];
      return ctx.events.getEventSummaries();
    },
  }),
}));
