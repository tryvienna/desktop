/**
 * InboxView — Full-page inbox view showing notification/action items.
 *
 * Displays a flat, reverse-chronological list of inbox items pushed by
 * plugins or core Vienna. Supports mark-as-read, archive, and executing
 * registered action handlers.
 *
 * @module components/InboxView
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useQuery,
  useMutation,
  GET_INBOX_ITEMS,
  MARK_INBOX_ITEM_READ,
  MARK_ALL_INBOX_ITEMS_READ,
  ARCHIVE_INBOX_ITEM,
} from '@vienna/graphql/client';
import { Inbox, Check, CheckCheck, Archive, ExternalLink, Loader2, PanelRightOpen } from 'lucide-react';
import { cn, Popover, PopoverTrigger, PopoverContent } from '@tryvienna/ui';
import { getApi } from '@vienna/ipc/renderer';
import { useDrawerActions } from '../lib/drawer';
import { entityDrawerTab } from './drawer';
import { useWorkstreamActions } from '../renderer/contexts/WorkstreamContext';
import { useInboxActions } from '../renderer/hooks/useInboxActions';
import { useActionForm } from '../providers/ActionFormProvider';
import { type InboxItem, sanitizeSvg, formatRelativeTime, getTrayApi } from './inbox-utils';
import { usePersistedState } from '../storage';
import { api } from '../ipc';

// ── InboxItemRow ────────────────────────────────────────────────────────────

function InboxItemRow({
  item,
  onMarkRead,
  onArchive,
  onExecuteAction,
  onOpenEntity,
  onCtaClick,
}: {
  item: InboxItem;
  onMarkRead: (id: string) => void;
  onArchive: (id: string) => void;
  onExecuteAction: (actionId: string, payload: unknown) => void;
  onOpenEntity: (uri: string) => void;
  onCtaClick: (item: InboxItem) => void;
}) {
  const hasCta = !!item.ctaLabel;

  const handleClick = useCallback(() => {
    if (!item.read) {
      onMarkRead(item.id);
    }
    // When a CTA button is present, row click only marks as read
    if (hasCta) return;
    if (item.entityUri) {
      onOpenEntity(item.entityUri);
    } else if (item.actions.length > 0) {
      onExecuteAction(item.actions[0]!.id, item.actions[0]!.payload);
    }
  }, [item, hasCta, onMarkRead, onOpenEntity, onExecuteAction]);

  const handleCtaClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!item.read) {
        onMarkRead(item.id);
      }
      onCtaClick(item);
    },
    [item, onMarkRead, onCtaClick],
  );

  const handleArchive = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onArchive(item.id);
    },
    [item.id, onArchive],
  );

  const handleMarkRead = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onMarkRead(item.id);
    },
    [item.id, onMarkRead],
  );

  const isActionable = hasCta || !!item.entityUri || item.actions.length > 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={isActionable ? handleClick : undefined}
      onKeyDown={isActionable ? (e) => e.key === 'Enter' && handleClick() : undefined}
      className={cn(
        'group flex items-start gap-3 px-4 py-3 border-b border-border cursor-pointer transition-colors',
        'hover:bg-accent/50',
        !item.read && 'bg-accent/20',
      )}
    >
      {/* Unread indicator */}
      <div className="mt-1.5 shrink-0 w-2 h-2 rounded-full" style={{
        backgroundColor: item.read ? 'transparent' : 'var(--brand-primary)',
      }} />

      {/* Icon — SVG is sanitized with DOMPurify; emoji rendered as-is; plain text ignored */}
      <div className="mt-0.5 shrink-0 w-6 h-6 flex items-center justify-center text-muted-foreground">
        {item.icon ? (
          item.icon.includes('<') ? (
            <span dangerouslySetInnerHTML={{ __html: sanitizeSvg(item.icon) }} className="w-4 h-4 [&>svg]:w-full [&>svg]:h-full" />
          ) : /^\p{Emoji}/u.test(item.icon) ? (
            <span className="text-base leading-none">{item.icon}</span>
          ) : (
            <Inbox size={16} />
          )
        ) : (
          <Inbox size={16} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-sm truncate',
            !item.read ? 'font-medium text-foreground' : 'text-foreground/80',
          )}>
            {item.title}
          </span>
          {item.entityUri && (
            <ExternalLink size={12} className="shrink-0 text-muted-foreground/50" />
          )}
        </div>
        {item.description && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
            {item.description}
          </p>
        )}
        <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground/60">
          {item.source && <span>{item.source}</span>}
          <span>{formatRelativeTime(item.createdAt)}</span>
          <div className="ml-auto shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!item.read && (
              <button
                type="button"
                onClick={handleMarkRead}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              >
                <Check size={12} />
                <span>Mark Read</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleArchive}
              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Archive"
            >
              <Archive size={14} />
            </button>
          </div>
        </div>
        {/* CTA button or action buttons */}
        {hasCta ? (
          <div className="mt-2 flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={handleCtaClick}
              className="inline-flex items-center h-7 px-3 rounded-md text-[12px] font-medium shadow-sm transition-colors truncate max-w-[160px] bg-[var(--brand-primary)] text-white hover:opacity-85"
            >
              {item.ctaLabel}
            </button>
          </div>
        ) : item.actions.length > 0 ? (
          <div className="mt-2 flex items-center gap-1.5 min-w-0">
            {item.actions.slice(0, 2).map((action, i) => (
              <button
                key={action.id}
                type="button"
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); onExecuteAction(action.id, action.payload); }}
                className={`inline-flex items-center h-7 px-3 rounded-md text-[12px] font-medium shadow-sm transition-colors truncate max-w-[160px] ${i === 0 ? 'bg-[var(--brand-primary)] text-white hover:opacity-85' : 'bg-accent text-foreground hover:bg-accent/80 border border-border shadow-none'}`}
              >
                {action.label}
              </button>
            ))}
            {item.actions.length > 2 && (
              <span className="text-[10px] text-muted-foreground">+{item.actions.length - 2} more</span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ── Emoji quick-picks for the tray icon selector ───────────────────────────

const EMOJI_PICKS = [
  '😊', '🚀', '✨', '🔥', '💡', '🎯', '⚡', '🌈',
  '🤖', '👾', '🎵', '🌸', '🍕', '☕', '🧠', '💎',
  '🦊', '🐙', '🌍', '📬', '🔔', '💬', '🛠️', '❤️',
];

// ── TrayEmojiPicker ────────────────────────────────────────────────────────

function TrayEmojiPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (emoji: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');

  const selectEmoji = useCallback(
    (emoji: string) => {
      onChange(emoji);
      setOpen(false);
      setCustomInput('');
    },
    [onChange],
  );

  const handleCustomSubmit = useCallback(() => {
    // Extract the first emoji (or emoji sequence) from the input
    const match = customInput.trim().match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(\u200D(\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*/u);
    if (match) {
      selectEmoji(match[0]);
    }
  }, [customInput, selectEmoji]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Change menu bar icon"
          className="text-lg leading-none px-1.5 py-1 rounded-md border border-dashed border-border/50 hover:border-border transition-colors cursor-pointer"
          title="Change menu bar icon"
        >
          {value}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">Menu bar icon</p>
        <div className="grid grid-cols-8 gap-1 mb-2">
          {EMOJI_PICKS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={`Select ${emoji}`}
              onClick={() => selectEmoji(emoji)}
              className={cn(
                'w-7 h-7 flex items-center justify-center rounded text-base hover:bg-accent transition-colors cursor-pointer',
                value === emoji && 'bg-accent ring-1 ring-brand-primary',
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <input
            type="text"
            aria-label="Custom emoji input"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
            placeholder="Type or paste emoji…"
            className="flex-1 min-w-0 px-2 py-1 text-sm rounded border border-border bg-transparent placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
          <button
            type="button"
            onClick={handleCustomSubmit}
            disabled={!customInput.trim()}
            className="px-2 py-1 text-xs font-medium rounded bg-accent hover:bg-accent/80 disabled:opacity-40 transition-colors cursor-pointer"
          >
            Set
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── InboxView ───────────────────────────────────────────────────────────────

export function InboxView() {
  const ipc = useMemo(() => getApi(api), []);
  const [trayEmoji, setTrayEmoji] = usePersistedState('trayEmoji');

  // Sync tray label with persisted emoji on mount and when it changes
  useEffect(() => {
    ipc.system.setTrayLabel({ label: trayEmoji });
  }, [trayEmoji, ipc]);

  const handleEmojiChange = useCallback(
    (emoji: string) => {
      setTrayEmoji(emoji);
    },
    [setTrayEmoji],
  );

  const { data, loading } = useQuery(GET_INBOX_ITEMS, {
    variables: { includeRead: true, includeArchived: false, limit: 200 },
    fetchPolicy: 'cache-and-network',
    pollInterval: 30_000,
  });

  const [markReadMut] = useMutation(MARK_INBOX_ITEM_READ);
  const [markAllReadMut] = useMutation(MARK_ALL_INBOX_ITEMS_READ);
  const [archiveMut] = useMutation(ARCHIVE_INBOX_ITEM);
  const { openTab } = useDrawerActions();
  const { setActiveWorkstream } = useWorkstreamActions();

  const items = useMemo<InboxItem[]>(() => {
    const raw = data?.inboxItems;
    if (!raw) return [];
    return raw
      .filter((item): item is NonNullable<typeof item> => item != null)
      .map((item) => ({ ...item, actions: item.actions ?? [] })) as InboxItem[];
  }, [data]);

  const unreadCount = useMemo(() => items.filter((i) => !i.read).length, [items]);

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

  // Wire inbox action execution through the coroutine IPC system
  const actionForm = useActionForm();
  const { executeAction: ipcExecuteAction } = useInboxActions({
    showPluginActionForm: actionForm.showPluginActionForm,
    dismissForm: actionForm.dismissForm,
  });

  const handleExecuteAction = useCallback(
    (actionId: string, payload: unknown) => {
      ipcExecuteAction(actionId, payload);
    },
    [ipcExecuteAction],
  );

  const handleOpenEntity = useCallback(
    (uri: string) => {
      openTab(entityDrawerTab(uri));
    },
    [openTab],
  );

  const handleCtaClick = useCallback(
    (item: InboxItem) => {
      // Navigate to workstream if entityUri points to one
      const wsMatch = item.entityUri?.match(/^@vienna\/\/workstream\/(.+)$/);
      if (wsMatch) {
        setActiveWorkstream(wsMatch[1]);
        return;
      }
      // Fall back to default entity/action behavior
      if (item.entityUri) {
        openTab(entityDrawerTab(item.entityUri));
      } else if (item.actions.length > 0) {
        ipcExecuteAction(item.actions[0]!.id, item.actions[0]!.payload);
      }
    },
    [setActiveWorkstream, openTab, ipcExecuteAction],
  );

  return (
    <div data-slot="inbox" className="flex h-full flex-col bg-surface-elevated text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <TrayEmojiPicker value={trayEmoji} onChange={handleEmojiChange} />
          <h1 className="text-sm font-semibold">Inbox</h1>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {unreadCount} unread
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          )}
          <button
            type="button"
            onClick={() => getTrayApi()?.detachInbox()}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
            title="Open in side panel"
          >
            <PanelRightOpen size={15} />
          </button>
        </div>
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto">
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Inbox size={32} className="mb-3 opacity-40" />
            <p className="text-sm font-medium">No inbox items</p>
            <p className="text-xs mt-1 opacity-60">
              Items pushed by plugins and Vienna will appear here.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <InboxItemRow
              key={item.id}
              item={item}
              onMarkRead={handleMarkRead}
              onArchive={handleArchive}
              onExecuteAction={handleExecuteAction}
              onOpenEntity={handleOpenEntity}
              onCtaClick={handleCtaClick}
            />
          ))
        )}
      </div>
    </div>
  );
}
