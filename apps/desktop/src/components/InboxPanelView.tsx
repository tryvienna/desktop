/**
 * InboxPanelView — Detached inbox panel for always-visible notification stream.
 *
 * Full-height panel with mark-read, archive, and action execution.
 * Draggable title bar area for repositioning the window.
 */

import { useCallback, useEffect, useMemo } from 'react';
import {
  useQuery,
  useMutation,
  GET_INBOX_ITEMS,
  GET_INBOX_UNREAD_COUNT,
  MARK_INBOX_ITEM_READ,
  MARK_ALL_INBOX_ITEMS_READ,
  ARCHIVE_INBOX_ITEM,
  EXECUTE_INBOX_ACTION,
} from '@vienna/graphql/client';
import { Inbox, Check, CheckCheck, Archive, X, ExternalLink } from 'lucide-react';
import { cn } from '@tryvienna/ui';
import { type InboxItem, sanitizeSvg, formatRelativeTime, getTrayApi } from './inbox-utils';

// ── Item row ───────────────────────────────────────────────────────────────

function PanelItem({
  item,
  onMarkRead,
  onArchive,
  onExecuteAction,
}: {
  item: InboxItem;
  onMarkRead: (id: string) => void;
  onArchive: (id: string) => void;
  onExecuteAction: (actionId: string, payload: unknown) => void;
}) {
  const handleClick = useCallback(() => {
    if (!item.read) onMarkRead(item.id);
    if (item.actions.length > 0) {
      onExecuteAction(item.actions[0]!.id, item.actions[0]!.payload);
    }
  }, [item, onMarkRead, onExecuteAction]);

  const isActionable = !!item.entityUri || item.actions.length > 0;

  return (
    <div
      role={isActionable ? 'button' : undefined}
      tabIndex={isActionable ? 0 : undefined}
      onClick={isActionable ? handleClick : undefined}
      onKeyDown={isActionable ? (e) => e.key === 'Enter' && handleClick() : undefined}
      className={cn(
        'group flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors',
        'hover:bg-[var(--color-surface-interactive-hover)]',
        !item.read && 'bg-[var(--color-surface-elevated)]/60',
      )}
    >
      {/* Icon */}
      <div className="mt-0.5 shrink-0 w-5 h-5 flex items-center justify-center text-[var(--color-text-muted)]">
        {item.icon ? (
          item.icon.includes('<') ? (
            <span dangerouslySetInnerHTML={{ __html: sanitizeSvg(item.icon) }} className="w-3.5 h-3.5 [&>svg]:w-full [&>svg]:h-full" />
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
          <span className={cn(
            'text-[13px] leading-tight truncate',
            !item.read ? 'font-medium text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]',
          )}>
            {item.title}
          </span>
          {item.entityUri && (
            <ExternalLink size={11} className="shrink-0 text-[var(--color-text-muted)]/40" />
          )}
        </div>
        {item.description && (
          <p className="mt-0.5 text-[11px] leading-snug text-[var(--color-text-muted)] line-clamp-2">
            {item.description}
          </p>
        )}
        <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--color-text-muted)]/50">
          {item.source && <span>{item.source}</span>}
          <span>{formatRelativeTime(item.createdAt)}</span>
          <div className="ml-auto shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!item.read && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onMarkRead(item.id); }}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] hover:bg-[var(--color-surface-interactive-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <Check size={12} />
                <span>Mark Read</span>
              </button>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onArchive(item.id); }}
              className="p-1 rounded hover:bg-[var(--color-surface-interactive-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
              title="Archive"
            >
              <Archive size={13} />
            </button>
          </div>
        </div>
        {item.actions.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5 min-w-0">
            {item.actions.slice(0, 2).map((action, i) => (
              <button
                key={action.id}
                type="button"
                onClick={(e) => { e.stopPropagation(); onExecuteAction(action.id, action.payload); }}
                className={`inline-flex items-center h-7 px-3 rounded-md text-[12px] font-medium transition-colors truncate max-w-[160px] ${i === 0 ? 'bg-[var(--color-brand-primary)] text-white hover:opacity-85 shadow-sm' : 'bg-[var(--color-surface-interactive-hover)] text-[var(--color-text-primary)] hover:opacity-80 border border-[var(--color-border-default)]'}`}
              >
                {action.label}
              </button>
            ))}
            {item.actions.length > 2 && (
              <span className="text-[10px] text-[var(--color-text-muted)]">+{item.actions.length - 2} more</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Panel view ─────────────────────────────────────────────────────────────

export function InboxPanelView() {
  const { data, loading, refetch } = useQuery(GET_INBOX_ITEMS, {
    variables: { includeRead: true, includeArchived: false, limit: 100 },
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
  const [archiveMut] = useMutation(ARCHIVE_INBOX_ITEM);
  const [executeActionMut] = useMutation(EXECUTE_INBOX_ACTION);

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
      markReadMut({ variables: { id }, refetchQueries: ['GetInboxItems', 'GetInboxUnreadCount'] });
    },
    [markReadMut],
  );

  const handleMarkAllRead = useCallback(() => {
    markAllReadMut({ refetchQueries: ['GetInboxItems', 'GetInboxUnreadCount'] });
  }, [markAllReadMut]);

  const handleArchive = useCallback(
    (id: string) => {
      archiveMut({ variables: { id }, refetchQueries: ['GetInboxItems', 'GetInboxUnreadCount'] });
    },
    [archiveMut],
  );

  const handleExecuteAction = useCallback(
    (actionId: string, payload: unknown) => {
      executeActionMut({ variables: { actionId, payload } });
    },
    [executeActionMut],
  );

  const handleClose = useCallback(() => {
    getTrayApi()?.closePanel();
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--color-surface-page)] text-[var(--color-text-primary)] select-none">
      {/* Draggable title bar */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border-default)]"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <Inbox size={14} className="text-[var(--color-text-muted)]" />
          <h1 className="text-[13px] font-semibold">Inbox</h1>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-brand-primary)] text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </div>
        <div
          className="flex items-center gap-1"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-interactive-hover)] transition-colors"
              title="Mark all as read"
            >
              <CheckCheck size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-interactive-hover)] transition-colors"
            title="Close panel"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto">
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-[var(--color-text-muted)]/30 border-t-[var(--color-text-muted)] rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-muted)]">
            <Inbox size={32} className="mb-3 opacity-20" />
            <p className="text-[13px] font-medium">All clear</p>
            <p className="text-[11px] mt-1 opacity-50">New items will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border-subtle)]">
            {items.map((item) => (
              <PanelItem
                key={item.id}
                item={item}
                onMarkRead={handleMarkRead}
                onArchive={handleArchive}
                onExecuteAction={handleExecuteAction}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
