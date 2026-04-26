/**
 * FloatingMiniCard — Compact, draggable PiP floating card for detached entities
 *
 * @ai-context
 * - Fixed-position, draggable via pointer events
 * - Shows entity icon, label, dismiss button, and re-attach button
 * - Animated enter/exit via framer-motion
 * - data-slot="floating-mini-card"
 *
 * @example
 * <FloatingMiniCard card={detachedCard} />
 */

import React, { memo, useRef, useCallback, useState } from 'react';

import { motion } from 'framer-motion';

import { cn } from '@tryvienna/ui';

import type { DetachedCard } from '../../context/detachable-card-context';
import { useDetachableCards } from '../../context/detachable-card-context';
import { getEntityDisplayLabel } from '../../utils/entity-uri';
import { getEntityColors, getEntityIcon } from '../../utils/entity-styles';
import { SPRINGS } from '../../tokens';

export interface FloatingMiniCardProps {
  card: DetachedCard;
}

export const FloatingMiniCard = memo(function FloatingMiniCard({ card }: FloatingMiniCardProps) {
  const { reattach, dismiss, updatePosition } = useDetachableCards();

  const colors = getEntityColors(card.entity.entityType);
  const label = getEntityDisplayLabel(card.entity);
  const icon = getEntityIcon(card.entity.entityType);

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ pointerX: 0, pointerY: 0, cardX: 0, cardY: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest('button')) return;
      isDraggingRef.current = true;
      setIsDragging(true);
      dragStartRef.current = {
        pointerX: e.clientX,
        pointerY: e.clientY,
        cardX: card.position.x,
        cardY: card.position.y,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      e.preventDefault();
    },
    [card.position]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - dragStartRef.current.pointerX;
      const dy = e.clientY - dragStartRef.current.pointerY;
      updatePosition(card.id, {
        x: Math.max(8, dragStartRef.current.cardX - dx),
        y: Math.max(8, dragStartRef.current.cardY - dy),
      });
    },
    [card.id, updatePosition]
  );

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false;
    setIsDragging(false);
  }, []);

  return (
    <motion.div
      key={card.id}
      initial={{ opacity: 0, scale: 0.9, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: 12 }}
      transition={SPRINGS.GENTLE}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="select-none overflow-hidden"
      style={{
        position: 'fixed',
        bottom: card.position.y,
        right: card.position.x,
        width: 260,
        border: `1.5px solid ${colors.border}`,
        borderRadius: 10,
        boxShadow: '0 8px 24px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08)',
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: 9000,
      }}
      data-slot="floating-mini-card"
      data-floating-card
      data-card-id={card.id}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.bg }}
      >
        <span className="text-lg leading-none shrink-0">{icon}</span>
        <span className="flex-1 text-xs font-semibold truncate" style={{ color: colors.text }}>
          {label}
        </span>
        <button
          onClick={() => dismiss(card.id)}
          title="Dismiss"
          className="flex items-center justify-center w-6 h-6 rounded bg-transparent border-none cursor-pointer text-muted-foreground opacity-50 hover:opacity-100 transition-opacity"
        >
          <svg
            width={13}
            height={13}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Body */}
      {card.floatingContent ? (
        <div className="overflow-hidden bg-surface-page">{card.floatingContent}</div>
      ) : (
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-surface-page">
          <div className="text-xs text-muted-foreground truncate">
            {card.entity.entityType.replace(/_/g, ' ')} &middot;{' '}
            {card.entity.pathSegments.join('/')}
          </div>
          <button
            onClick={() => reattach(card.id)}
            title="Re-attach to chat"
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium shrink-0',
              'cursor-pointer opacity-80 hover:opacity-100 transition-opacity'
            )}
            style={{
              color: colors.text,
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.bg,
            }}
          >
            <svg
              width={10}
              height={10}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="17" x2="12" y2="3" />
              <path d="M5 10l7 7 7-7" />
              <line x1="4" y1="21" x2="20" y2="21" />
            </svg>
            <span>Attach</span>
          </button>
        </div>
      )}
    </motion.div>
  );
});
