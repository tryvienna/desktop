/**
 * FloatingCardLayer — Portal-based layer rendering all detached floating cards
 *
 * @ai-context
 * - Creates a React portal to document.body
 * - Renders FloatingMiniCard for each detached card
 * - Rendered once inside the Chat component
 * - data-slot="floating-card-layer"
 *
 * @example
 * <FloatingCardLayer />
 */

import { createPortal } from 'react-dom';

import { AnimatePresence } from 'framer-motion';

import { useDetachableCardsSafe } from '../../context/detachable-card-context';
import { FloatingMiniCard } from './floating-mini-card';

export function FloatingCardLayer() {
  const ctx = useDetachableCardsSafe();

  if (!ctx || ctx.detachedCards.length === 0) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {ctx.detachedCards.map((card) => (
        <FloatingMiniCard key={card.id} card={card} />
      ))}
    </AnimatePresence>,
    document.body
  );
}
