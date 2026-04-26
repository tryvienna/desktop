/**
 * SelectionPopover — Floating "Ask Vienna" action button near text selections
 *
 * @ai-context
 * - Positioned absolutely (or fixed) near the user's text selection
 * - Animated enter/exit with scale + translate
 * - Calls onCapture to create a NanoContext from the selected text
 * - data-slot="selection-popover"
 *
 * @example
 * <SelectionPopover visible position={{ x: 100, y: 200 }} onCapture={handleCapture} />
 */

import { useEffect, useState } from 'react';

import type { SelectionPopoverProps } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Default Icon
// ─────────────────────────────────────────────────────────────────────────────

function SparkleIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M5 19l.5 1.5L7 21l-1.5.5L5 23l-.5-1.5L3 21l1.5-.5L5 19z" />
      <path d="M19 13l.5 1.5L21 15l-1.5.5L19 17l-.5-1.5L17 15l1.5-.5L19 13z" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ANIMATION_DURATION = 120;
const ENTER_EASING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
const EXIT_EASING = 'ease-out';

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function SelectionPopover({
  visible,
  position,
  onCapture,
  label = 'Ask Vienna',
  icon,
  containerRef,
  useFixedPosition = false,
}: SelectionPopoverProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, ANIMATION_DURATION);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!shouldRender) return null;

  const popoverWidth = 95;
  const popoverHeight = 28;
  let adjustedX = position.x + 8;
  let adjustedY = position.y + 8;

  let boundsWidth: number;
  let boundsHeight: number;

  if (useFixedPosition) {
    boundsWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
    boundsHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  } else if (containerRef?.current) {
    boundsWidth = containerRef.current.offsetWidth;
    boundsHeight = containerRef.current.offsetHeight;
  } else {
    boundsWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
    boundsHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  }

  if (adjustedX + popoverWidth > boundsWidth - 8) {
    adjustedX = position.x - popoverWidth - 8;
  }
  if (adjustedY + popoverHeight > boundsHeight - 8) {
    adjustedY = position.y - popoverHeight - 8;
  }
  adjustedX = Math.max(8, Math.min(adjustedX, boundsWidth - popoverWidth - 8));
  adjustedY = Math.max(8, Math.min(adjustedY, boundsHeight - popoverHeight - 8));

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onCapture();
  };

  return (
    <div
      data-slot="selection-popover"
      className="flex items-center gap-1 px-2 py-1 bg-surface-elevated border border-ai rounded-md shadow-lg cursor-pointer select-none z-[1000] hover:bg-surface-hover hover:border-focus"
      style={{
        position: useFixedPosition ? 'fixed' : 'absolute',
        left: adjustedX,
        top: adjustedY,
        opacity: isAnimating ? 1 : 0,
        transform: isAnimating ? 'translateY(0) scale(1)' : 'translateY(4px) scale(0.9)',
        transition: isAnimating
          ? `opacity ${ANIMATION_DURATION}ms ${ENTER_EASING}, transform ${ANIMATION_DURATION}ms ${ENTER_EASING}`
          : `opacity ${ANIMATION_DURATION * 0.6}ms ${EXIT_EASING}, transform ${ANIMATION_DURATION * 0.6}ms ${EXIT_EASING}`,
      }}
      onClick={handleClick}
      onMouseDown={(e) => e.preventDefault()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick(e as unknown as React.MouseEvent);
        }
      }}
    >
      <button className="flex items-center gap-1 p-0 m-0 bg-none border-none text-ai text-xs font-sans font-medium cursor-pointer whitespace-nowrap">
        {icon ?? <SparkleIcon size={12} />}
        {label}
      </button>
    </div>
  );
}

SelectionPopover.displayName = 'SelectionPopover';
