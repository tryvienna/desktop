/**
 * Notification Drawer — Floating notification cards on a transparent canvas.
 *
 * Pure presentational components: no Apollo, no IPC, no side effects.
 * Cards float with drop shadows over the desktop.
 * Rendered in a transparent, frameless Electron window (right edge of screen).
 *
 * Reuses ItemIcon, ActionButtons from inbox-presentational.tsx.
 */

import { useCallback, useEffect, useState } from 'react';
import { X, ExternalLink, Inbox } from 'lucide-react';
import { cn } from '@tryvienna/ui/utils';
import { ItemIcon, UnreadDot, ActionButtons } from './inbox-presentational';
import { type InboxItem, formatShortTime } from './inbox-utils';

// ── FloatingCard ────────────────────────────────────────────────────────────

export interface FloatingCardProps {
  item: InboxItem;
  index: number;
  onDismiss: (id: string) => void;
  onExecuteAction: (actionId: string, payload: unknown) => void;
  onOpenEntity?: (uri: string) => void;
}

export function FloatingCard({
  item,
  index,
  onDismiss,
  onExecuteAction,
  onOpenEntity,
}: FloatingCardProps) {
  const [visible, setVisible] = useState(false);

  // Stagger entrance animation
  useEffect(() => {
    // Cap stagger at 3 items so 5+ notifications don't feel sluggish
    const timer = setTimeout(() => setVisible(true), Math.min(index, 3) * 80);
    return () => clearTimeout(timer);
  }, [index]);

  const handleClick = useCallback(() => {
    if (item.entityUri && onOpenEntity) {
      onOpenEntity(item.entityUri);
    }
  }, [item.entityUri, onOpenEntity]);

  const hasEntityLink = !!item.entityUri;

  return (
    <div
      className={cn(
        'group relative w-[340px] rounded-xl border border-border',
        'bg-popover shadow-2xl',
        'transition-all duration-300 ease-out',
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20',
        hasEntityLink && 'cursor-pointer',
      )}
      style={{
        boxShadow: '0 8px 32px rgba(0,0,0,0.24), 0 2px 8px rgba(0,0,0,0.12)',
      }}
      onClick={hasEntityLink ? handleClick : undefined}
    >
      {/* Dismiss button — visible on hover */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(item.id);
        }}
        className={cn(
          'absolute top-2 right-2 z-10',
          'flex items-center justify-center w-5 h-5 rounded-full',
          'text-muted-foreground opacity-0 group-hover:opacity-60 hover:!opacity-100',
          'transition-opacity cursor-pointer',
          'bg-muted/50',
        )}
      >
        <X size={10} />
      </button>

      {/* Content */}
      <div className="px-3.5 py-3">
        {/* Header: icon + title */}
        <div className="flex items-start gap-2.5">
          <div className="shrink-0 mt-0.5 text-muted-foreground">
            <ItemIcon icon={item.icon} size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {!item.read && <UnreadDot />}
              <span className="text-[13px] font-semibold text-foreground truncate">
                {item.title}
              </span>
            </div>
            {item.description && (
              <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                {item.description}
              </p>
            )}
          </div>
        </div>

        {/* Meta: source + time + entity link */}
        <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
          {item.source && <span>{item.source}</span>}
          <span>{formatShortTime(item.createdAt)}</span>
          {hasEntityLink && <ExternalLink size={9} />}
        </div>

        {/* Action buttons */}
        {item.actions.length > 0 && (
          <div className="mt-2.5">
            <ActionButtons
              actions={item.actions}
              onExecuteAction={onExecuteAction}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── NotificationDrawer ──────────────────────────────────────────────────────

export interface NotificationDrawerProps {
  items: InboxItem[];
  preExistingCount: number;
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
  onDismissSummary: () => void;
  onOpenVienna: () => void;
  onExecuteAction: (actionId: string, payload: unknown) => void;
  onOpenEntity?: (uri: string) => void;
}

export function NotificationDrawer({
  items,
  preExistingCount,
  onDismiss,
  onDismissAll,
  onDismissSummary,
  onOpenVienna,
  onExecuteAction,
  onOpenEntity,
}: NotificationDrawerProps) {
  const hasContent = items.length > 0 || preExistingCount > 0;

  return (
    <div className="flex flex-col items-end min-h-full p-4 gap-3">
      {/* Controls — subtle, top-right */}
      {hasContent && (
        <div className="flex items-center gap-1.5 mr-1">
          <button
            type="button"
            onClick={onOpenVienna}
            className={cn(
              'text-[10px] text-muted-foreground px-2 py-1 rounded-md',
              'hover:text-foreground hover:bg-muted/40',
              'transition-colors cursor-pointer',
            )}
          >
            Open Vienna
          </button>
          <button
            type="button"
            onClick={onDismissAll}
            className={cn(
              'flex items-center justify-center w-5 h-5 rounded-full',
              'text-muted-foreground hover:text-foreground',
              'hover:bg-muted/40',
              'transition-colors cursor-pointer',
            )}
            title="Dismiss all"
          >
            <X size={10} />
          </button>
        </div>
      )}

      {/* Notification cards */}
      {items.map((item, i) => (
        <FloatingCard
          key={item.id}
          item={item}
          index={i}
          onDismiss={onDismiss}
          onExecuteAction={onExecuteAction}
          onOpenEntity={onOpenEntity}
        />
      ))}

      {/* Pre-existing summary card */}
      {preExistingCount > 0 && items.length === 0 && (
        <div
          className="w-[340px] rounded-xl border border-border bg-popover shadow-2xl cursor-pointer group relative"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.24), 0 2px 8px rgba(0,0,0,0.12)' }}
          onClick={onOpenVienna}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDismissSummary(); }}
            className={cn(
              'absolute top-2 right-2 z-10',
              'flex items-center justify-center w-5 h-5 rounded-full',
              'text-muted-foreground opacity-0 group-hover:opacity-60 hover:!opacity-100',
              'transition-opacity cursor-pointer bg-muted/50',
            )}
          >
            <X size={10} />
          </button>
          <div className="px-3.5 py-3 flex items-center gap-2.5">
            <Inbox size={14} className="shrink-0 text-muted-foreground" />
            <span className="text-[13px] text-foreground">
              You have {preExistingCount} notification{preExistingCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Summary link when both new + pre-existing */}
      {preExistingCount > 0 && items.length > 0 && (
        <div className="w-[340px] flex justify-center">
          <button
            type="button"
            onClick={onOpenVienna}
            className={cn(
              'text-[11px] text-muted-foreground px-3 py-1 rounded-full',
              'bg-popover/80 backdrop-blur-sm border border-border/50 shadow-sm',
              'hover:text-foreground hover:bg-popover',
              'transition-colors cursor-pointer',
            )}
          >
            +{preExistingCount} more notification{preExistingCount !== 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  );
}
