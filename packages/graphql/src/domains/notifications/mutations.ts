/**
 * Notifications GraphQL Mutations — toggle source / type mute state.
 *
 * Mutations always return the full Settings object so Apollo's normalized
 * cache picks up the change without a refetch.
 *
 * @module graphql/domains/notifications/mutations
 */

import { GraphQLError } from 'graphql';
import { builder } from '../../schema/builder';
import { SettingsRef } from '../settings/types';

builder.mutationFields((t) => ({
  /** Mute or unmute an entire notification source. */
  setNotificationSourceMuted: t.field({
    type: SettingsRef,
    description: 'Mute (or unmute) all notifications from a given source label.',
    args: {
      source: t.arg.string({ required: true }),
      muted: t.arg.boolean({ required: true }),
    },
    resolve: (_root, args, ctx) => {
      try {
        const current = ctx.db.settings.get('notifications');
        const mutedSources = { ...current.mutedSources, [args.source]: args.muted };
        ctx.db.settings.update('notifications', { mutedSources });
        return ctx.db.settings.getAll();
      } catch (error) {
        throw new GraphQLError(
          error instanceof Error ? error.message : 'Failed to update notification source mute',
          { extensions: { code: 'VALIDATION_ERROR' } },
        );
      }
    },
  }),

  /** Mute or unmute a single notification type by id. */
  setNotificationTypeMuted: t.field({
    type: SettingsRef,
    description: 'Mute (or unmute) a single notification type by its stable id.',
    args: {
      typeId: t.arg.string({ required: true }),
      muted: t.arg.boolean({ required: true }),
    },
    resolve: (_root, args, ctx) => {
      try {
        const current = ctx.db.settings.get('notifications');
        const mutedTypes = { ...current.mutedTypes, [args.typeId]: args.muted };
        ctx.db.settings.update('notifications', { mutedTypes });
        return ctx.db.settings.getAll();
      } catch (error) {
        throw new GraphQLError(
          error instanceof Error ? error.message : 'Failed to update notification type mute',
          { extensions: { code: 'VALIDATION_ERROR' } },
        );
      }
    },
  }),

  /** Reset all notification mutes back to defaults (everything enabled). */
  resetNotificationMutes: t.field({
    type: SettingsRef,
    description: 'Clear all notification mutes — every source and type returns to its default-enabled state.',
    resolve: (_root, _args, ctx) => {
      try {
        ctx.db.settings.update('notifications', { mutedSources: {}, mutedTypes: {} });
        return ctx.db.settings.getAll();
      } catch (error) {
        throw new GraphQLError(
          error instanceof Error ? error.message : 'Failed to reset notification mutes',
          { extensions: { code: 'VALIDATION_ERROR' } },
        );
      }
    },
  }),
}));
