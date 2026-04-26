/**
 * DetachableEntityCard — Entity card that floats as PiP when scrolled out of view
 *
 * @ai-context
 * - Shows FullCard inline or GhostPlaceholder when detached
 * - IntersectionObserver for auto-detach when autoDetach=true
 * - AnimatePresence transitions between ghost and full states
 * - data-slot="detachable-entity-card"
 *
 * @example
 * <DetachableEntityCard cardId="m1:@vienna//pr/1" entity={parsed} autoDetach />
 */

import React, { memo, useRef, useEffect, useCallback } from 'react';

import { motion, AnimatePresence } from 'framer-motion';

import { cn } from '@tryvienna/ui';

import type { ParsedEntityURI } from '../../utils/entity-uri';
import { getEntityDisplayLabel } from '../../utils/entity-uri';
import { getEntityColors, getEntityIcon } from '../../utils/entity-styles';
import { useDetachableCardsSafe } from '../../context/detachable-card-context';
import { SPRINGS } from '../../tokens';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface DetachableEntityCardProps {
  /** Stable unique ID: `${messageId}:${entity.uri}` */
  cardId: string;
  /** Parsed entity data */
  entity: ParsedEntityURI;
  /** Optional click handler */
  onClick?: () => void;
  /** Optional custom card content */
  children?: React.ReactNode;
  /** Optional floating mini-card content */
  floatingContent?: React.ReactNode;
  /** Auto-detach when scrolled out of view */
  autoDetach?: boolean;
}

// ─── Ghost Placeholder ───────────────────────────────────────────────────────

const GhostPlaceholder = memo(function GhostPlaceholder({
  entity,
  onReattach,
}: {
  entity: ParsedEntityURI;
  onReattach: () => void;
}) {
  const colors = getEntityColors(entity.entityType);
  const label = getEntityDisplayLabel(entity);
  const icon = getEntityIcon(entity.entityType);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={SPRINGS.GENTLE}
      className="overflow-hidden"
    >
      <button
        onClick={onReattach}
        title="Click to re-attach card"
        className={cn(
          'flex items-center gap-2 w-full px-3 py-2',
          'bg-transparent rounded-lg cursor-pointer',
          'opacity-55 hover:opacity-85 transition-opacity'
        )}
        style={{ border: `1.5px dashed ${colors.border}` }}
      >
        <span style={{ color: colors.text }}>{icon}</span>
        <span
          className="flex-1 text-sm font-medium truncate text-left"
          style={{ color: colors.text }}
        >
          {label}
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <svg
            width={11}
            height={11}
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
          <span>floating</span>
        </span>
      </button>
    </motion.div>
  );
});

// ─── Full Card ────────────────────────────────────────────────────────────────

const FullCard = memo(function FullCard({
  entity,
  onClick,
  children,
}: {
  entity: ParsedEntityURI;
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  const colors = getEntityColors(entity.entityType);
  const label = getEntityDisplayLabel(entity);
  const icon = getEntityIcon(entity.entityType);

  if (children) return <>{children}</>;

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-3 px-4 py-3 rounded-lg',
        onClick && 'cursor-pointer',
        'transition-colors duration-150'
      )}
      style={{
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
      }}
      title={entity.uri}
    >
      <span className="text-xl leading-none">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate" style={{ color: colors.text }}>
          {label}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {entity.entityType.replace(/_/g, ' ')} &middot; {entity.pathSegments.join('/')}
        </div>
      </div>
    </div>
  );
});

// ─── Main Component ───────────────────────────────────────────────────────────

export const DetachableEntityCard = memo(function DetachableEntityCard({
  cardId,
  entity,
  onClick,
  children,
  floatingContent,
  autoDetach = false,
}: DetachableEntityCardProps) {
  const ctx = useDetachableCardsSafe();
  const cardRef = useRef<HTMLDivElement>(null);
  const reattachingRef = useRef(false);

  const isDetached = ctx ? ctx.isDetached(cardId) : false;
  const isDismissed = ctx ? ctx.isDismissed(cardId) : false;
  const showGhost = isDetached;

  // IntersectionObserver for auto-detach
  useEffect(() => {
    if (!autoDetach || !ctx || !cardRef.current || isDismissed) return;

    const el = cardRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (reattachingRef.current) {
          reattachingRef.current = false;
          return;
        }
        if (!entry!.isIntersecting) {
          ctx.detach({ id: cardId, entity, floatingContent });
        }
      },
      { threshold: 0, rootMargin: '0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [autoDetach, ctx, cardId, entity, floatingContent, isDismissed]);

  const handleReattach = useCallback(() => {
    reattachingRef.current = true;
    ctx?.reattach(cardId);
    requestAnimationFrame(() => {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [ctx, cardId]);

  return (
    <div ref={cardRef} data-slot="detachable-entity-card" className="w-full">
      <AnimatePresence mode="wait" initial={false}>
        {showGhost ? (
          <GhostPlaceholder key="ghost" entity={entity} onReattach={handleReattach} />
        ) : (
          <motion.div
            key="card"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={SPRINGS.GENTLE}
          >
            <FullCard entity={entity} onClick={onClick}>
              {children}
            </FullCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
