/**
 * Entity Tool GraphQL Types — Dev-mode entity debugging tool.
 *
 * @module graphql/domains/entity-tool/types
 */

import type { EntityToolEntry } from '@vienna/app-db';
import { builder } from '../../schema/builder';

export const EntityToolEntryRef = builder.objectRef<EntityToolEntry>('EntityToolEntry');

builder.objectType(EntityToolEntryRef, {
  description: 'A saved entity URI for dev debugging',
  fields: (t) => ({
    uri: t.exposeString('uri'),
    addedAt: t.exposeString('addedAt'),
  }),
});
