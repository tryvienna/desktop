/**
 * Entity Tool Mutations — Add/remove entity URIs for dev debugging.
 *
 * @module graphql/domains/entity-tool/mutations
 */

import { GraphQLError } from 'graphql';
import type { EntityToolEntry } from '@vienna/app-db';
import { isEntityURI } from '@tryvienna/sdk';
import { builder } from '../../schema/builder';
import { EntityToolEntryRef } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Payload types
// ─────────────────────────────────────────────────────────────────────────────

type AddEntityToolEntryPayloadShape = { entry: EntityToolEntry | null; alreadyExists: boolean };

const AddEntityToolEntryPayload = builder
  .objectRef<AddEntityToolEntryPayloadShape>('AddEntityToolEntryPayload')
  .implement({
    fields: (t) => ({
      entry: t.field({
        type: EntityToolEntryRef,
        nullable: true,
        resolve: (parent) => parent.entry,
      }),
      alreadyExists: t.exposeBoolean('alreadyExists'),
    }),
  });

type RemoveEntityToolEntryPayloadShape = { success: boolean };

const RemoveEntityToolEntryPayload = builder
  .objectRef<RemoveEntityToolEntryPayloadShape>('RemoveEntityToolEntryPayload')
  .implement({
    fields: (t) => ({
      success: t.exposeBoolean('success'),
    }),
  });

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

builder.mutationFields((t) => ({
  addEntityToolEntry: t.field({
    type: AddEntityToolEntryPayload,
    description: 'Add an entity URI to the dev entity tool',
    args: { uri: t.arg.string({ required: true }) },
    resolve: (_root, args, ctx) => {
      if (!ctx.entityToolStore) {
        throw new GraphQLError('Entity tool store not available', { extensions: { code: 'UNAVAILABLE' } });
      }
      const uri = args.uri.trim();
      if (!uri) {
        throw new GraphQLError('URI cannot be empty', { extensions: { code: 'BAD_USER_INPUT' } });
      }
      if (!isEntityURI(uri)) {
        throw new GraphQLError('Invalid entity URI format. Expected: @vienna//type/segments', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      const { entry, alreadyExists } = ctx.entityToolStore.add(uri);
      return { entry, alreadyExists };
    },
  }),

  removeEntityToolEntry: t.field({
    type: RemoveEntityToolEntryPayload,
    description: 'Remove an entity URI from the dev entity tool',
    args: { uri: t.arg.string({ required: true }) },
    resolve: (_root, args, ctx) => {
      if (!ctx.entityToolStore) {
        throw new GraphQLError('Entity tool store not available', { extensions: { code: 'UNAVAILABLE' } });
      }
      const success = ctx.entityToolStore.remove(args.uri);
      return { success };
    },
  }),
}));
