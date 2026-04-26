/**
 * Runtime notification type registry. Wraps the built-in catalog from
 * `@vienna/app-db` with append-only mutability so the gate can later track
 * plugin-pushed types it has seen at runtime.
 */

import {
  BUILTIN_NOTIFICATION_TYPES,
  listNotificationSources,
} from '@vienna/app-db';
import type { NotificationType } from '@vienna/app-db';

export { BUILTIN_NOTIFICATION_TYPES };
export type { NotificationType };

export class NotificationTypeRegistry {
  private readonly types = new Map<string, NotificationType>();

  constructor(initial: readonly NotificationType[] = BUILTIN_NOTIFICATION_TYPES) {
    for (const t of initial) this.types.set(t.id, t);
  }

  get(id: string): NotificationType | undefined {
    return this.types.get(id);
  }

  has(id: string): boolean {
    return this.types.has(id);
  }

  /** Append-only: existing entries are preserved when re-registered. */
  register(type: NotificationType): void {
    if (!this.types.has(type.id)) {
      this.types.set(type.id, type);
    }
  }

  /** Snapshot all types in deterministic insertion order. */
  list(): NotificationType[] {
    return Array.from(this.types.values());
  }

  /** Distinct source labels in insertion order. */
  sources(): string[] {
    return listNotificationSources(this.list());
  }
}
