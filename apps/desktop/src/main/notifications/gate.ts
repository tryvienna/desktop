/**
 * NotificationGate — single entry point for creating inbox notifications.
 *
 * Replaces direct `appDb.inboxItems.create(...)` calls so we have one place
 * that:
 *   1. Resolves the type id → source label via the registry.
 *   2. Checks the user's mute settings (source-level OR type-level).
 *   3. If allowed, creates the inbox item and broadcasts to renderers.
 *
 * Filtering happens *at creation time* — muted notifications never touch the
 * DB, so the tray badge, drawer, and audit log all stay clean.
 */

import type { CreateInboxItemInput, InboxItemRecord, NotificationsSettings } from '@vienna/app-db';
import { isNotificationMuted } from '@vienna/app-db';
import type { NotificationTypeRegistry } from './registry';

export interface NotificationGateDeps {
  /** The notification type registry (built-in + plugin-pushed types). */
  registry: NotificationTypeRegistry;
  /** Reads the latest mute preferences. Called on every notify() so toggles take effect immediately, no restart. */
  getSettings: () => NotificationsSettings;
  /** Persists the inbox item to the DB. */
  createInboxItem: (input: CreateInboxItemInput) => InboxItemRecord;
  /** Notifies renderers / tray / drawer that the inbox changed. */
  broadcast: () => void;
  /** Optional logger for diagnostics. */
  log?: (msg: string, meta: Record<string, unknown>) => void;
}

export interface NotificationContent {
  title: string;
  description?: string | null;
  icon?: string | null;
  actions?: CreateInboxItemInput['actions'];
  entityUri?: string | null;
  ctaLabel?: string | null;
}

export class NotificationGate {
  constructor(private readonly deps: NotificationGateDeps) {}

  /**
   * Push a notification of the given type. If the type is muted (either
   * directly or via its source), nothing is written and `null` is returned.
   *
   * The `source` field on the inbox item is always overridden by the
   * registered type's source — callers don't pick the source label, the
   * registry does.
   */
  notify(typeId: string, content: NotificationContent): InboxItemRecord | null {
    const type = this.deps.registry.get(typeId);
    if (!type) {
      // Unknown type: allow by default (forward-compat with plugin-pushed items),
      // but fall back to using the typeId itself as the source label so the
      // mute UI can still address it.
      this.deps.log?.('notification.unknown-type', { typeId });
      return this.write(typeId, typeId, content);
    }

    const settings = this.deps.getSettings();
    if (isNotificationMuted(typeId, type.source, settings)) {
      this.deps.log?.('notification.muted', { typeId, source: type.source });
      return null;
    }

    return this.write(typeId, type.source, content);
  }

  private write(_typeId: string, source: string, content: NotificationContent): InboxItemRecord {
    const item = this.deps.createInboxItem({
      title: content.title,
      description: content.description ?? null,
      icon: content.icon ?? null,
      source,
      actions: content.actions,
      entityUri: content.entityUri ?? null,
      ctaLabel: content.ctaLabel ?? null,
    });
    this.deps.broadcast();
    return item;
  }
}
