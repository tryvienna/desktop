/**
 * FloatingCardLayer — Portal that renders detached/fullscreen cards only.
 *
 * Inline cards are rendered normally by DetachableCard.
 * This layer only handles PiP and fullscreen states.
 */

import { useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';
import { useDetachableSafe } from './DetachableContext';

// ─────────────────────────────────────────────────────────────────────────────
// Shared icon button
// ─────────────────────────────────────────────────────────────────────────────

function IconButton({ onClick, title, children }: {
  onClick: (e: React.MouseEvent) => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'flex items-center justify-center w-6 h-6 rounded',
        'bg-transparent border-none cursor-pointer',
        'text-muted-foreground opacity-60 hover:opacity-100 transition-opacity',
      )}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PiP Header
// ─────────────────────────────────────────────────────────────────────────────

function PiPHeader({ title, onReattach, onFullscreen, onDismiss }: {
  title?: string;
  onReattach: () => void;
  onFullscreen: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-border bg-muted/30">
      {title ? (
        <span className="flex-1 text-[11px] font-medium truncate text-muted-foreground">{title}</span>
      ) : (
        <span className="flex-1" />
      )}
      <IconButton onClick={(e) => { e.stopPropagation(); onReattach(); }} title="Reattach">
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="17" x2="12" y2="3" /><path d="M5 10l7 7 7-7" /><line x1="4" y1="21" x2="20" y2="21" />
        </svg>
      </IconButton>
      <IconButton onClick={(e) => { e.stopPropagation(); onFullscreen(); }} title="Fullscreen">
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" />
          <path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
      </IconButton>
      <IconButton onClick={(e) => { e.stopPropagation(); onDismiss(); }} title="Close">
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </IconButton>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FloatingCardLayer
// ─────────────────────────────────────────────────────────────────────────────

export function FloatingCardLayer() {
  const ctx = useDetachableSafe();

  const dragRef = useRef<{
    cardId: string;
    startX: number; startY: number;
    startPosX: number; startPosY: number;
    el: HTMLDivElement;
  } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent, cardId: string) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (!ctx) return;
    const state = ctx.detachedStates.get(cardId);
    if (!state) return;
    dragRef.current = {
      cardId,
      startX: e.clientX, startY: e.clientY,
      startPosX: state.position.x, startPosY: state.position.y,
      el: e.currentTarget as HTMLDivElement,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }, [ctx]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const newX = Math.max(8, dragRef.current.startPosX - (e.clientX - dragRef.current.startX));
    const newY = Math.max(8, dragRef.current.startPosY - (e.clientY - dragRef.current.startY));
    dragRef.current.el.style.right = `${newX}px`;
    dragRef.current.el.style.bottom = `${newY}px`;
  }, []);

  const handlePointerUp = useCallback(() => {
    if (!dragRef.current || !ctx) return;
    const el = dragRef.current.el;
    const newX = parseInt(el.style.right) || 24;
    const newY = parseInt(el.style.bottom) || 24;
    ctx.updatePosition(dragRef.current.cardId, { x: newX, y: newY });
    dragRef.current = null;
  }, [ctx]);

  if (!ctx) return null;
  const { registeredCards, detachedStates, fullscreenCardId, reattach, enterFullscreen, exitFullscreen, dismiss } = ctx;

  // Only render cards that are detached or fullscreen
  const floatingCards = Array.from(registeredCards).filter(
    ([id]) => detachedStates.has(id) || fullscreenCardId === id
  );

  if (floatingCards.length === 0) return null;

  return createPortal(
    <>
      {floatingCards.map(([id, card]) => {
        const det = detachedStates.get(id);
        const isFs = fullscreenCardId === id;
        const isPiP = !!det && !isFs;

        return (
          <div
            key={id}
            className={cn(
              'select-none overflow-hidden',
              isPiP && 'fixed z-[9000] rounded-[10px] border-[1.5px] border-border bg-card cursor-grab',
              isPiP && 'shadow-[0_8px_24px_rgba(0,0,0,0.14),0_2px_6px_rgba(0,0,0,0.08)]',
              isFs && 'fixed inset-0 z-[201] flex items-center justify-center bg-background p-8',
            )}
            style={isPiP ? {
              bottom: det.position.y,
              right: det.position.x,
              width: card.size.width,
            } : undefined}
            onPointerDown={isPiP ? (e) => handlePointerDown(e, id) : undefined}
            onPointerMove={isPiP ? handlePointerMove : undefined}
            onPointerUp={isPiP ? handlePointerUp : undefined}
          >
            {isPiP && (
              <PiPHeader
                title={card.title}
                onReattach={() => reattach(id)}
                onFullscreen={() => enterFullscreen(id)}
                onDismiss={() => dismiss(id)}
              />
            )}
            {isFs && (
              <button
                type="button"
                onClick={() => exitFullscreen()}
                className="absolute top-4 right-4 z-10 p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Exit fullscreen"
              >
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18" /><path d="M6 6l12 12" />
                </svg>
              </button>
            )}
            <div
              className="overflow-hidden"
              style={
                isPiP ? { height: card.size.height } :
                isFs ? { width: '100%', maxWidth: '1280px', aspectRatio: '16/9' } :
                undefined
              }
            >
              {card.content}
            </div>
          </div>
        );
      })}
    </>,
    document.body,
  );
}
