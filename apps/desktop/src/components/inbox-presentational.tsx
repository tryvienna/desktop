/**
 * Inbox Presentational Components
 *
 * Pure UI components for the three inbox views (Panel, Tray, Full-page).
 * These take data as props — no Apollo hooks, no IPC — making them
 * testable in Storybook and unit tests.
 *
 * All item rows use a fixed height (h-[84px] for panel/full with actions,
 * h-[72px] without actions, h-[60px] for tray) so the list has a clean,
 * uniform rhythm regardless of content.
 *
 * Actions: up to 2 CTA buttons shown. If 3+, first CTA + overflow button
 * with chevron that reveals remaining actions in a dropdown.
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import {
  Inbox,
  Check,
  CheckCheck,
  Archive,
  ArrowUpRight,
  ExternalLink,
  ChevronDown,
  X,
} from 'lucide-react';
import { Badge, Button, ScrollArea, cn } from '@tryvienna/ui';
import { type InboxItem, type InboxAction, sanitizeSvg, formatRelativeTime, formatShortTime } from './inbox-utils';

// ── Shared icon renderer ──────────────────────────────────────────────────

export function ItemIcon({ icon, size = 14 }: { icon: string | null; size?: number }) {
  if (icon) {
    if (icon.includes('<')) {
      return (
        <span
          dangerouslySetInnerHTML={{ __html: sanitizeSvg(icon) }}
          className="w-3.5 h-3.5 [&>svg]:w-full [&>svg]:h-full"
        />
      );
    }
    if (/^\p{Emoji}/u.test(icon)) {
      return <span className="text-sm leading-none">{icon}</span>;
    }
  }
  return <Inbox size={size} />;
}

// ── Unread dot ────────────────────────────────────────────────────────────

export function UnreadDot() {
  return (
    <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-brand-primary" />
  );
}

// ── Action buttons ────────────────────────────────────────────────────────

export function ActionButtons({
  actions,
  onExecuteAction,
}: {
  actions: InboxAction[];
  onExecuteAction: (actionId: string, payload: unknown) => void;
}) {
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!overflowOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [overflowOpen]);

  if (actions.length === 0) return null;

  const hasOverflow = actions.length > 2;
  const visibleActions = hasOverflow ? actions.slice(0, 1) : actions;
  const overflowActions = hasOverflow ? actions.slice(1) : [];

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      {visibleActions.map((action, i) => (
        <Button
          key={action.id}
          variant="default"
          size="sm"
          className={cn(
            'text-[12px] h-7 px-3 rounded-md shadow-sm font-medium truncate max-w-[160px]',
            i === 0
              ? 'bg-brand-primary text-white hover:bg-brand-primary/85'
              : 'bg-surface-interactive-hover text-text-primary hover:bg-surface-interactive-hover/80 border border-border-default shadow-none',
          )}
          onClick={(e) => {
            e.stopPropagation();
            onExecuteAction(action.id, action.payload);
          }}
        >
          {action.label}
        </Button>
      ))}
      {hasOverflow && (
        <div className="relative" ref={overflowRef}>
          <Button
            variant="default"
            size="sm"
            className="gap-0.5 text-[12px] h-7 px-2 rounded-md bg-surface-interactive-hover text-text-primary hover:bg-surface-interactive-hover/80 border border-border-default font-medium"
            onClick={(e) => {
              e.stopPropagation();
              setOverflowOpen((prev) => !prev);
            }}
          >
            +{overflowActions.length}
            <ChevronDown size={10} />
          </Button>
          {overflowOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-md border border-border-default bg-surface-page shadow-lg py-1">
              {overflowActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="w-full text-left px-3 py-1.5 text-[11px] text-text-primary hover:bg-surface-interactive-hover transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onExecuteAction(action.id, action.payload);
                    setOverflowOpen(false);
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PANEL VIEW — Detached sidebar panel (380px wide, full height)
// ═══════════════════════════════════════════════════════════════════════════

export interface PanelItemProps {
  item: InboxItem;
  onMarkRead: (id: string) => void;
  onArchive: (id: string) => void;
  onExecuteAction: (actionId: string, payload: unknown) => void;
}

export function PanelItem({
  item,
  onMarkRead,
  onArchive,
  onExecuteAction,
}: PanelItemProps) {
  const handleClick = useCallback(() => {
    if (!item.read) onMarkRead(item.id);
    if (item.entityUri) {
      // Entity link click handled by parent
    } else if (item.actions.length > 0) {
      onExecuteAction(item.actions[0]!.id, item.actions[0]!.payload);
    }
  }, [item, onMarkRead, onExecuteAction]);

  const isActionable = !!item.entityUri || item.actions.length > 0;
  const hasActions = item.actions.length > 0;

  return (
    <div
      role={isActionable ? 'button' : undefined}
      tabIndex={isActionable ? 0 : undefined}
      onClick={isActionable ? handleClick : undefined}
      onKeyDown={
        isActionable ? (e) => e.key === 'Enter' && handleClick() : undefined
      }
      className={cn(
        'group flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors',
        'hover:bg-surface-interactive-hover',
        !item.read && 'bg-surface-elevated/60',
      )}
    >
      {/* Icon */}
      <div className="shrink-0 w-5 h-5 flex items-center justify-center text-text-muted mt-1">
        <ItemIcon icon={item.icon} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
        {/* Row 1: Title */}
        <div className="flex items-center gap-1.5">
          {!item.read && <UnreadDot />}
          <span
            className={cn(
              'text-[13px] leading-tight truncate',
              !item.read
                ? 'font-medium text-text-primary'
                : 'text-text-secondary',
            )}
          >
            {item.title}
          </span>
          {item.entityUri && (
            <ExternalLink size={11} className="shrink-0 text-text-muted/40" />
          )}
        </div>

        {/* Row 2: Description (1 line, always occupies space) */}
        <p className="text-[11px] leading-snug text-text-muted truncate h-[15px]">
          {item.description ?? '\u00A0'}
        </p>

        {/* Row 3: Metadata + hover actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[10px] text-text-muted/50">
            {item.source && <span>{item.source}</span>}
            {item.source && <span>·</span>}
            <span>{formatRelativeTime(item.createdAt)}</span>
          </div>
          <div className="ml-auto shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!item.read && (
              <Button
                variant="ghost"
                size="xs"
                className="gap-1 text-[11px] h-5 text-text-muted hover:text-text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkRead(item.id);
                }}
              >
                <Check size={11} />
                Mark Read
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-text-muted hover:text-text-primary"
              onClick={(e) => {
                e.stopPropagation();
                onArchive(item.id);
              }}
              title="Archive"
            >
              <Archive size={13} />
            </Button>
          </div>
        </div>

        {/* Row 4: Action CTAs (dedicated bottom row with breathing room) */}
        {hasActions && (
          <div className="mt-2">
            <ActionButtons actions={item.actions} onExecuteAction={onExecuteAction} />
          </div>
        )}
      </div>
    </div>
  );
}

export interface InboxPanelProps {
  items: InboxItem[];
  unreadCount: number;
  loading: boolean;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onArchive: (id: string) => void;
  onExecuteAction: (actionId: string, payload: unknown) => void;
  onClose: () => void;
}

export function InboxPanel({
  items,
  unreadCount,
  loading,
  onMarkRead,
  onMarkAllRead,
  onArchive,
  onExecuteAction,
  onClose,
}: InboxPanelProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface-page text-text-primary select-none">
      {/* Draggable title bar */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b border-border-default"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <Inbox size={14} className="text-text-muted" />
          <h1 className="text-[13px] font-semibold">Inbox</h1>
          {unreadCount > 0 && (
            <Badge variant="default" className="min-w-[18px] h-[18px] px-1 text-[10px] font-bold">
              {unreadCount}
            </Badge>
          )}
        </div>
        <div
          className="flex items-center gap-1"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onMarkAllRead}
              title="Mark all as read"
            >
              <CheckCheck size={13} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onClose}
            title="Close panel"
          >
            <X size={14} />
          </Button>
        </div>
      </div>

      {/* Item list */}
      <ScrollArea className="flex-1">
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-text-muted/30 border-t-text-muted rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-muted">
            <Inbox size={32} className="mb-3 opacity-20" />
            <p className="text-[13px] font-medium">All clear</p>
            <p className="text-[11px] mt-1 opacity-50">
              New items will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {items.map((item) => (
              <PanelItem
                key={item.id}
                item={item}
                onMarkRead={onMarkRead}
                onArchive={onArchive}
                onExecuteAction={onExecuteAction}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TRAY VIEW — Compact tray popover (narrow, short)
// ═══════════════════════════════════════════════════════════════════════════

export interface TrayItemProps {
  item: InboxItem;
  onMarkRead: (id: string) => void;
}

export function TrayItem({ item, onMarkRead }: TrayItemProps) {
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
        'group flex items-center gap-3 px-4 h-[60px] cursor-pointer transition-colors',
        'hover:bg-surface-interactive-hover',
        !item.read && 'bg-surface-elevated/60',
      )}
    >
      {/* Icon */}
      <div className="shrink-0 w-5 h-5 flex items-center justify-center text-text-muted">
        <ItemIcon icon={item.icon} />
      </div>

      {/* Content — fixed 2-row layout */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
        {/* Row 1: Title */}
        <div className="flex items-center gap-1.5">
          {!item.read && <UnreadDot />}
          <span
            className={cn(
              'text-[13px] leading-tight truncate',
              !item.read
                ? 'font-medium text-text-primary'
                : 'text-text-secondary',
            )}
          >
            {item.title}
          </span>
        </div>

        {/* Row 2: Description or metadata */}
        <p className="text-[11px] leading-snug text-text-muted truncate h-[15px]">
          {item.description ?? '\u00A0'}
        </p>
      </div>

      {/* Right side: timestamp or mark-read */}
      <div className="shrink-0 flex items-center">
        {!item.read ? (
          <button
            type="button"
            onClick={handleMarkRead}
            className="flex items-center gap-1 text-[10px] text-text-muted hover:text-text-primary transition-colors"
          >
            <Check size={11} />
            <span>Read</span>
          </button>
        ) : (
          <span className="text-[11px] text-text-muted tabular-nums">
            {formatShortTime(item.createdAt)}
          </span>
        )}
      </div>
    </div>
  );
}

export interface TrayInboxProps {
  items: InboxItem[];
  unreadCount: number;
  loading: boolean;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onOpenInbox: () => void;
}

export function TrayInbox({
  items,
  unreadCount,
  loading,
  onMarkRead,
  onMarkAllRead,
  onOpenInbox,
}: TrayInboxProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface-page text-text-primary select-none rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
        <div className="flex items-center gap-2">
          <h1 className="text-[13px] font-semibold">Inbox</h1>
          {unreadCount > 0 && (
            <Badge variant="default" className="min-w-[18px] h-[18px] px-1 text-[10px] font-bold">
              {unreadCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="xs"
              onClick={onMarkAllRead}
              title="Mark all as read"
              className="gap-1 text-[11px]"
            >
              <CheckCheck size={13} />
              <span>Read all</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="xs"
            onClick={onOpenInbox}
            title="Open full inbox"
            className="gap-1 text-[11px]"
          >
            <ArrowUpRight size={13} />
            <span>Open</span>
          </Button>
        </div>
      </div>

      {/* Items */}
      <ScrollArea className="flex-1">
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-text-muted/30 border-t-text-muted rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-text-muted">
            <Inbox size={28} className="mb-2 opacity-30" />
            <p className="text-[13px]">All clear</p>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {items.map((item) => (
              <TrayItem key={item.id} item={item} onMarkRead={onMarkRead} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FULL-PAGE VIEW — Main app inbox
// ═══════════════════════════════════════════════════════════════════════════

export interface FullInboxItemProps {
  item: InboxItem;
  onMarkRead: (id: string) => void;
  onArchive: (id: string) => void;
  onExecuteAction: (actionId: string, payload: unknown) => void;
  onOpenEntity: (uri: string) => void;
}

export function FullInboxItem({
  item,
  onMarkRead,
  onArchive,
  onExecuteAction,
  onOpenEntity,
}: FullInboxItemProps) {
  const handleClick = useCallback(() => {
    if (!item.read) onMarkRead(item.id);
    if (item.entityUri) {
      onOpenEntity(item.entityUri);
    } else if (item.actions.length > 0) {
      onExecuteAction(item.actions[0]!.id, item.actions[0]!.payload);
    }
  }, [item, onMarkRead, onOpenEntity, onExecuteAction]);

  const isActionable = !!item.entityUri || item.actions.length > 0;
  const hasActions = item.actions.length > 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={isActionable ? handleClick : undefined}
      onKeyDown={
        isActionable ? (e) => e.key === 'Enter' && handleClick() : undefined
      }
      className={cn(
        'group flex items-start gap-3 px-4 py-3 border-b border-border-default cursor-pointer transition-colors',
        'hover:bg-accent/50',
        !item.read && 'bg-accent/20',
      )}
    >
      {/* Unread indicator */}
      <div
        className="shrink-0 w-2 h-2 rounded-full mt-2.5"
        style={{
          backgroundColor: item.read ? 'transparent' : 'var(--brand-primary)',
        }}
      />

      {/* Icon */}
      <div className="shrink-0 w-6 h-6 flex items-center justify-center text-muted-foreground mt-1">
        <ItemIcon icon={item.icon} size={16} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
        {/* Row 1: Title */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-sm truncate',
              !item.read
                ? 'font-medium text-foreground'
                : 'text-foreground/80',
            )}
          >
            {item.title}
          </span>
          {item.entityUri && (
            <ExternalLink size={12} className="shrink-0 text-muted-foreground/50" />
          )}
        </div>

        {/* Row 2: Description (1 line, always occupies space) */}
        <p className="text-xs text-muted-foreground truncate h-[16px]">
          {item.description ?? '\u00A0'}
        </p>

        {/* Row 3: Metadata + hover actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
            {item.source && <span>{item.source}</span>}
            {item.source && <span>·</span>}
            <span>{formatRelativeTime(item.createdAt)}</span>
          </div>
          <div className="ml-auto shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!item.read && (
              <Button
                variant="ghost"
                size="xs"
                className="gap-1 text-xs h-6 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkRead(item.id);
                }}
              >
                <Check size={12} />
                Mark Read
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onArchive(item.id);
              }}
              title="Archive"
            >
              <Archive size={14} />
            </Button>
          </div>
        </div>

        {/* Row 4: Action CTAs (dedicated bottom row with breathing room) */}
        {hasActions && (
          <div className="mt-2">
            <ActionButtons actions={item.actions} onExecuteAction={onExecuteAction} />
          </div>
        )}
      </div>
    </div>
  );
}

export interface FullInboxProps {
  items: InboxItem[];
  unreadCount: number;
  loading: boolean;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onArchive: (id: string) => void;
  onExecuteAction: (actionId: string, payload: unknown) => void;
  onOpenEntity: (uri: string) => void;
  onDetach?: () => void;
}

export function FullInbox({
  items,
  unreadCount,
  loading,
  onMarkRead,
  onMarkAllRead,
  onArchive,
  onExecuteAction,
  onOpenEntity,
}: FullInboxProps) {
  return (
    <div
      data-slot="inbox"
      className="flex h-full flex-col bg-surface-elevated text-foreground"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Inbox size={18} className="text-muted-foreground" />
          <h1 className="text-sm font-semibold">Inbox</h1>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {unreadCount} unread
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkAllRead}
              className="gap-1.5 text-xs text-muted-foreground"
            >
              <CheckCheck size={14} />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Item list */}
      <ScrollArea className="flex-1">
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
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
            <FullInboxItem
              key={item.id}
              item={item}
              onMarkRead={onMarkRead}
              onArchive={onArchive}
              onExecuteAction={onExecuteAction}
              onOpenEntity={onOpenEntity}
            />
          ))
        )}
      </ScrollArea>
    </div>
  );
}
