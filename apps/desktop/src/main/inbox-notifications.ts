/**
 * InboxNotifications — Native OS notifications for new inbox items.
 *
 * Tracks the last-seen unread count. When new items arrive (count increases),
 * fires a native Notification showing the newest item's title/description.
 * Clicking the notification brings the main window to focus and opens the inbox.
 */

import { Notification, app, BrowserWindow } from 'electron';
import type { InboxItemRepository } from '@vienna/app-db';

let lastSeenCount = -1;
let onViewInbox: (() => void) | undefined;

export interface InboxNotificationOptions {
  onViewInbox?: () => void;
}

export function setupInboxNotifications(opts: InboxNotificationOptions = {}): void {
  onViewInbox = opts.onViewInbox;
}

/**
 * Called on each poll tick. Compares current unread count to the last-seen
 * value and fires a native notification if new items arrived.
 */
export function checkAndNotify(inboxItems: InboxItemRepository): void {
  const count = inboxItems.countUnread();

  // First tick — just record the baseline, don't notify
  if (lastSeenCount === -1) {
    lastSeenCount = count;
    return;
  }

  // No new items
  if (count <= lastSeenCount) {
    lastSeenCount = count;
    return;
  }

  const newCount = count - lastSeenCount;
  lastSeenCount = count;

  // Fetch the newest unread items to populate the notification
  const items = inboxItems.list({ includeRead: false, includeArchived: false, limit: newCount });
  if (items.length === 0) return;

  const newest = items[0]!;

  const title = newCount === 1
    ? newest.title
    : `${newCount} new inbox items`;

  const body = newCount === 1
    ? (newest.description ?? newest.source ?? '')
    : items.slice(0, 3).map((i) => i.title).join(', ');

  const notification = new Notification({
    title,
    body: body || undefined,
    silent: false,
  });

  notification.on('click', () => {
    // Bring main window to front
    const win = BrowserWindow.getAllWindows().find((w) => {
      const url = w.webContents.getURL();
      return !url.includes('mode=tray') && !url.includes('mode=inbox-panel');
    });
    if (win) {
      win.show();
      win.focus();
    } else {
      app.focus();
    }
    onViewInbox?.();
  });

  notification.show();
}

/**
 * Reset the last-seen count (e.g., when user views the inbox).
 * This prevents duplicate notifications after reading items.
 */
export function resetNotificationCount(): void {
  lastSeenCount = -1;
}
