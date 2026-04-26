/**
 * Notifications GraphQL Queries.
 *
 * @module graphql/domains/notifications/queries
 */

import { BUILTIN_NOTIFICATION_TYPES } from '@vienna/app-db';
import { builder } from '../../schema/builder';
import {
  NotificationTypeRef,
  NotificationSourceRef,
  toNotificationTypeView,
  groupBySource,
} from './types';

builder.queryFields((t) => ({
  /** Flat list of all known notification types with current mute state. */
  notificationTypes: t.field({
    type: [NotificationTypeRef],
    description: 'All registered notification types with their current mute state computed from settings.',
    resolve: (_root, _args, ctx) => {
      const settings = ctx.db.settings.get('notifications');
      return BUILTIN_NOTIFICATION_TYPES.map((type) => toNotificationTypeView(type, settings));
    },
  }),

  /** Same data, grouped by source — what the settings UI consumes. */
  notificationSources: t.field({
    type: [NotificationSourceRef],
    description: 'Notification types grouped by source, with per-source master mute state.',
    resolve: (_root, _args, ctx) => {
      const settings = ctx.db.settings.get('notifications');
      return groupBySource(BUILTIN_NOTIFICATION_TYPES, settings);
    },
  }),
}));
