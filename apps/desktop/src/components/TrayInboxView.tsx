/**
 * TrayInboxView — Compact inbox for the tray popover window.
 *
 * Shows a scrollable list of recent inbox items with mark-read and
 * mark-all-read. Clicking an item opens the main Vienna window.
 */

import { useCallback, useEffect, useMemo } from 'react';
import {
  useQuery,
  useMutation,
  GET_INBOX_ITEMS,
  GET_INBOX_UNREAD_COUNT,
  MARK_INBOX_ITEM_READ,
  MARK_ALL_INBOX_ITEMS_READ,
} from '@vienna/graphql/client';
import { Inbox, Check, CheckCheck, ArrowUpRight } from 'lucide-react';
import { cn } from '@tryvienna/ui';
import { type InboxItem, sanitizeSvg, formatShortTime, getTrayApi } from './inbox-utils';

// ── Item row ───────────────────────────────────────────────────────────────

function TrayItem({
  item,
  onMarkRead,
}: {
  item: InboxItem;
  onMarkRead: (id: string) => void;
}) {
  const handleMarkRead = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onMarkRead(item.id);
    },
    [item.id, onMarkRead],
  );

  return (
    <div
      className={cn(
        'group flex items-start gap-3 px-4 py-2.5 cursor-pointer transition-colors',
        'hover:bg-[var(--color-surface-interactive-hover)]',
        !item.read && 'bg-[var(--color-surface-elevated)]/60',
      )}
    >
      {/* Icon */}
      <div className="mt-0.5 shrink-0 w-5 h-5 flex items-center justify-center text-[var(--color-text-muted)]">
        {item.icon ? (
          item.icon.includes('<') ? (
            <span
              dangerouslySetInnerHTML={{ __html: sanitizeSvg(item.icon) }}
              className="w-3.5 h-3.5 [&>svg]:w-full [&>svg]:h-full"
            />
          ) : /^\p{Emoji}/u.test(item.icon) ? (
            <span className="text-sm leading-none">{item.icon}</span>
          ) : (
            <Inbox size={14} />
          )
        ) : (
          <Inbox size={14} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {!item.read && (
            <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-brand-primary)]" />
          )}
          <span
            className={cn(
              'text-[13px] leading-tight truncate',
              !item.read
                ? 'font-medium text-[var(--color-text-primary)]'
                : 'text-[var(--color-text-secondary)]',
            )}
          >
            {item.title}
          </span>
        </div>
        {item.description && (
          <p className="mt-0.5 text-[11px] leading-snug text-[var(--color-text-muted)] line-clamp-1">
            {item.description}
          </p>
        )}
        {!item.read && (
          <button
            type="button"
            onClick={handleMarkRead}
            className="mt-1 flex items-center gap-1 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <Check size={11} />
            <span>Mark as Read</span>
          </button>
        )}
      </div>

      {/* Timestamp */}
      <span className="shrink-0 text-[11px] text-[var(--color-text-muted)] mt-0.5 tabular-nums">
        {formatShortTime(item.createdAt)}
      </span>
    </div>
  );
}

// ── Main view ──────────────────────────────────────────────────────────────

export function TrayInboxView() {
  const { data, loading, refetch } = useQuery(GET_INBOX_ITEMS, {
    variables: { includeRead: true, includeArchived: false, limit: 20 },
    fetchPolicy: 'cache-and-network',
    pollInterval: 10_000,
  });

  const { data: countData, refetch: refetchCount } = useQuery(GET_INBOX_UNREAD_COUNT, {
    pollInterval: 10_000,
  });

  // Refetch immediately when another window modifies inbox data
  useEffect(() => {
    const cleanup = getTrayApi()?.onInboxChanged(() => {
      refetch();
      refetchCount();
    });
    return cleanup;
  }, [refetch, refetchCount]);

  const [markReadMut] = useMutation(MARK_INBOX_ITEM_READ);
  const [markAllReadMut] = useMutation(MARK_ALL_INBOX_ITEMS_READ);

  const items = useMemo<InboxItem[]>(() => {
    const raw = data?.inboxItems;
    if (!raw) return [];
    return raw
      .filter((item): item is NonNullable<typeof item> => item != null)
      .map((item) => ({ ...item, actions: item.actions ?? [] })) as InboxItem[];
  }, [data]);

  const unreadCount = countData?.inboxUnreadCount ?? 0;

  const handleMarkRead = useCallback(
    (id: string) => {
      markReadMut({
        variables: { id },
        refetchQueries: ['GetInboxItems', 'GetInboxUnreadCount'],
      });
    },
    [markReadMut],
  );

  const handleMarkAllRead = useCallback(() => {
    markAllReadMut({
      refetchQueries: ['GetInboxItems', 'GetInboxUnreadCount'],
    });
  }, [markAllReadMut]);

  const handleOpenInbox = useCallback(() => {
    getTrayApi()?.openInbox();
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--color-surface-page)] text-[var(--color-text-primary)] select-none rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-default)]">
        <div className="flex items-center gap-2">
          <h1 className="text-[13px] font-semibold">Inbox</h1>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-brand-primary)] text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-interactive-hover)] transition-colors"
              title="Mark all as read"
            >
              <CheckCheck size={13} />
              <span>Read all</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleOpenInbox}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-interactive-hover)] transition-colors"
            title="Open full inbox"
          >
            <ArrowUpRight size={13} />
            <span>Open</span>
          </button>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-[var(--color-text-muted)]/30 border-t-[var(--color-text-muted)] rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-muted)]">
            <Inbox size={28} className="mb-2 opacity-30" />
            <p className="text-[13px]">All clear</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border-subtle)]">
            {items.map((item) => (
              <TrayItem key={item.id} item={item} onMarkRead={handleMarkRead} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
