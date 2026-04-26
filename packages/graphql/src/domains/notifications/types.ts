/**
 * Notifications GraphQL Types
 *
 * - `NotificationType` — one entry in the catalog of notification types,
 *   with the user's current mute state computed from settings.
 * - `NotificationSource` — one source group (e.g. "GitHub"), which contains
 *   many types and has its own master mute toggle.
 * - `NotificationsSettings` — backing object for the nested field on Settings.
 *
 * @module graphql/domains/notifications/types
 */

import type { NotificationsSettings, NotificationType as NotificationTypeRecord } from '@vienna/app-db';
import { builder } from '../../schema/builder';

// ── NotificationType ─────────────────────────────────────────────────────────

export interface NotificationTypeView {
  id: string;
  source: string;
  label: string;
  description: string | null;
  defaultEnabled: boolean;
  /** Computed: true iff the user has muted this type or its source. */
  muted: boolean;
}

export const NotificationTypeRef = builder.objectRef<NotificationTypeView>('NotificationType');

builder.objectType(NotificationTypeRef, {
  description: 'A registered inbox notification type, with the user\'s current mute state.',
  fields: (t) => ({
    id: t.exposeID('id'),
    source: t.exposeString('source'),
    label: t.exposeString('label'),
    description: t.exposeString('description', { nullable: true }),
    defaultEnabled: t.exposeBoolean('defaultEnabled'),
    muted: t.exposeBoolean('muted'),
  }),
});

// ── NotificationSource (one group/section in the settings UI) ────────────────

export interface NotificationSourceView {
  source: string;
  /** True iff the user has muted the entire source. */
  muted: boolean;
  types: NotificationTypeView[];
}

export const NotificationSourceRef = builder.objectRef<NotificationSourceView>('NotificationSource');

builder.objectType(NotificationSourceRef, {
  description: 'A group of notification types sharing a source label (e.g. "GitHub"). Has a master mute toggle.',
  fields: (t) => ({
    source: t.exposeString('source'),
    muted: t.exposeBoolean('muted'),
    types: t.field({
      type: [NotificationTypeRef],
      resolve: (s) => s.types,
    }),
  }),
});

// ── NotificationsSettings (nested on Settings) ───────────────────────────────

export const NotificationsSettingsRef = builder.objectRef<NotificationsSettings>('NotificationsSettings');

builder.objectType(NotificationsSettingsRef, {
  description: 'Per-source / per-type mute preferences for inbox notifications.',
  fields: (t) => ({
    /** Keys are source labels; values are true iff muted. */
    mutedSources: t.field({
      type: 'JSON',
      resolve: (s) => s.mutedSources,
    }),
    /** Keys are notification type ids; values are true iff muted. */
    mutedTypes: t.field({
      type: 'JSON',
      resolve: (s) => s.mutedTypes,
    }),
  }),
});

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert a catalog entry + current settings into the GraphQL-shaped view.
 * Source mute beats type mute — the same predicate the gate uses.
 */
export function toNotificationTypeView(
  type: NotificationTypeRecord,
  settings: NotificationsSettings,
): NotificationTypeView {
  const sourceMuted = settings.mutedSources[type.source] === true;
  const typeMuted = settings.mutedTypes[type.id] === true;
  return {
    id: type.id,
    source: type.source,
    label: type.label,
    description: type.description ?? null,
    defaultEnabled: type.defaultEnabled,
    muted: sourceMuted || typeMuted,
  };
}

/** Group catalog entries by source, computing source-level mute state. */
export function groupBySource(
  catalog: readonly NotificationTypeRecord[],
  settings: NotificationsSettings,
): NotificationSourceView[] {
  const bySource = new Map<string, NotificationTypeView[]>();
  for (const t of catalog) {
    const view = toNotificationTypeView(t, settings);
    const arr = bySource.get(t.source) ?? [];
    arr.push(view);
    bySource.set(t.source, arr);
  }
  return Array.from(bySource.entries()).map(([source, types]) => ({
    source,
    muted: settings.mutedSources[source] === true,
    types,
  }));
}
