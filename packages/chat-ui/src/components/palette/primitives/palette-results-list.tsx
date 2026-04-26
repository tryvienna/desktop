/**
 * PaletteResultsList - Scrollable container for palette results
 *
 * Provides a fixed-height, scrollable area for rendering palette result items.
 * Uses flex-1 with min-h-0 to fill remaining space inside a PaletteContainer
 * while preventing layout shift as items are added or removed.
 *
 * @module PaletteResultsList
 *
 * @ai-context
 * - This component sits between PaletteTabBar (above) and PaletteKeyboardHints (below).
 * - The `size` variant constrains max-height for standalone use outside PaletteContainer.
 * - When used inside PaletteContainer (default), it fills remaining flex space.
 * - Custom scrollbar styling uses Tailwind scrollbar utilities for a subtle,
 *   theme-aware scrollbar that matches the design system.
 * - Forward ref is exposed for programmatic scroll control (e.g., scroll-to-top on tab change).
 */

import { forwardRef } from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@tryvienna/ui';

// ═══════════════════════════════════════════════════════════════════════════════
// VARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

const paletteResultsListVariants = cva(
  // Base styles - fills remaining space in flex parent, scrollable
  ['overflow-y-auto p-1 flex-1 min-h-0'],
  {
    variants: {
      /** Controls the max-height constraint. "default" fills remaining flex space. */
      size: {
        default: '', // Fills remaining space in PaletteContainer
        compact: 'max-h-[240px]',
        tall: 'max-h-[480px]',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface PaletteResultsListProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof paletteResultsListVariants> {
  /** Results content (PaletteResultItem elements, loading states, empty states, etc.) */
  children: React.ReactNode;
}

/**
 * PaletteResultsList - Scrollable results container with fixed height.
 *
 * Critical features:
 * - **Fixed height** prevents layout shift when results change
 * - Empty state and 100 items have the same container height
 * - Smooth scrolling for keyboard navigation
 * - Theme-aware scrollbar (subtle, matches design system)
 *
 * @example
 * ```tsx
 * <PaletteResultsList>
 *   {isLoading && <LoadingState />}
 *   {!isLoading && results.length === 0 && <EmptyState />}
 *   {!isLoading && results.map(item => (
 *     <PaletteResultItem key={item.id} {...item} />
 *   ))}
 * </PaletteResultsList>
 * ```
 *
 * @example Compact standalone usage
 * ```tsx
 * <PaletteResultsList size="compact">
 *   {suggestions.map(s => <PaletteResultItem key={s.id} {...s} />)}
 * </PaletteResultsList>
 * ```
 */
export const PaletteResultsList = forwardRef<HTMLDivElement, PaletteResultsListProps>(
  function PaletteResultsList({ className, size, children, ...props }, ref) {
    return (
      <div
        ref={ref}
        data-slot="palette-results-list"
        data-size={size}
        className={cn(
          paletteResultsListVariants({ size }),
          // Custom scrollbar styling (theme-aware)
          'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

export { paletteResultsListVariants };
