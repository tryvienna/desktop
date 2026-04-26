/**
 * DetachableCard — Wrapper that adds detach/PiP/fullscreen to any feed card.
 *
 * When inline: renders children normally as part of the feed.
 * When detached: shows a "reattach" placeholder. FloatingCardLayer renders
 * the content in a portal.
 */

import { useRef, useEffect, type ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { useDetachableSafe } from './DetachableContext';

export interface DetachableCardProps {
  id: string;
  title?: string;
  floatingSize?: { width: number; height: number };
  children: ReactNode;
}

const DEFAULT_SIZE = { width: 320, height: 180 };

export function DetachableCard({
  id,
  title,
  floatingSize = DEFAULT_SIZE,
  children,
}: DetachableCardProps) {
  const ctx = useDetachableSafe();
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const idRef = useRef(id);
  idRef.current = id;

  // Register content with context so FloatingCardLayer can render it when detached
  useEffect(() => {
    const c = ctxRef.current;
    if (!c) return;
    const cardId = idRef.current;
    c.register({ id: cardId, content: children, title, size: floatingSize });
    return () => {
      const cc = ctxRef.current;
      if (!cc) return;
      if (!cc.isDetached(cardId) && !cc.isFullscreen(cardId)) {
        cc.unregister(cardId);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ctx) return <>{children}</>;

  const detached = ctx.isDetached(id);
  const fullscreen = ctx.isFullscreen(id);

  // Detached or fullscreen: show reattach placeholder
  if (detached || fullscreen) {
    return (
      <div className="rounded-xl border border-border bg-card p-3 shadow-sm dark:bg-surface-interactive">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {title ? `${title} — ` : ''}{fullscreen ? 'Fullscreen' : 'Playing in picture-in-picture'}
          </span>
          <button
            onClick={() => { if (fullscreen) ctx.exitFullscreen(); else ctx.reattach(id); }}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
              'cursor-pointer border border-border bg-muted/50',
              'hover:bg-muted transition-colors',
            )}
          >
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="17" x2="12" y2="3" />
              <path d="M5 10l7 7 7-7" />
              <line x1="4" y1="21" x2="20" y2="21" />
            </svg>
            <span>Reattach</span>
          </button>
        </div>
      </div>
    );
  }

  // Inline: render children normally with hover overlay for detach/fullscreen
  return (
    <div className="relative group">
      {/* Hover overlay with detach + fullscreen buttons */}
      <div className={cn(
        'absolute top-2 right-2 z-10 flex items-center gap-0.5',
        'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
      )}>
        <button
          onClick={() => ctx.enterFullscreen(id)}
          title="Fullscreen"
          className={cn(
            'flex items-center justify-center w-6 h-6 rounded-md',
            'text-muted-foreground',
            'bg-background/80 border border-border/60 backdrop-blur-sm',
            'cursor-pointer hover:bg-muted hover:text-foreground',
          )}
        >
          <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" />
            <path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" />
          </svg>
        </button>
        <button
          onClick={() => ctx.detach(id)}
          title="Detach to picture-in-picture"
          className={cn(
            'flex items-center gap-1 px-1.5 py-0.5 rounded-md',
            'text-[10px] font-medium text-muted-foreground',
            'bg-background/80 border border-border/60 backdrop-blur-sm',
            'cursor-pointer hover:bg-muted hover:text-foreground',
          )}
        >
          <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="14" rx="2" /><rect x="12" y="10" width="10" height="10" rx="1" />
          </svg>
          <span>Detach</span>
        </button>
      </div>
      {children}
    </div>
  );
}
