/**
 * PaletteContainer - Base container for palette components
 *
 * Provides consistent dimensions, styling, and positioning for all palettes.
 * Follows the Vienna design system with theme-aware colors and semantic tokens.
 *
 * @module PaletteContainer
 *
 * Token mapping (drift-v2 → Vienna):
 * - `border-border` → `border-border-default`
 *
 * @ai-context
 * - This is the outermost wrapper for every palette (command, entity, etc.).
 * - Uses `flex flex-col` so child primitives (TabBar, ResultsList) stack vertically.
 * - Fixed height prevents layout shift when results change.
 * - The `size` variant controls width; height is always 388px.
 * - The `radius` variant follows Vienna's "bubbly" design convention.
 */

import { forwardRef } from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@tryvienna/ui';

// ═══════════════════════════════════════════════════════════════════════════════
// VARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

const paletteContainerVariants = cva(
  // Base styles - fixed dimensions, elevated appearance
  [
    'overflow-hidden',
    'flex flex-col',
    'bg-surface-page',
    'border',
    'border-border-default',
    'shadow-2xl', // Elevated modal-like shadow
  ],
  {
    variants: {
      /** Controls the width of the palette container. Height is always 388px. */
      size: {
        default: 'w-full h-[388px]',
        wide: 'w-[640px] h-[388px]',
        narrow: 'w-[360px] h-[388px]',
      },
      /** Controls the border radius. "default" uses the largest radius for modal-like elements. */
      radius: {
        default: 'rounded-2xl', // Bubbly: larger radius for modal-like elements
        lg: 'rounded-xl',
        md: 'rounded-lg',
      },
    },
    defaultVariants: {
      size: 'default',
      radius: 'default',
    },
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface PaletteContainerProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof paletteContainerVariants> {
  /** Palette content (tab bars, results lists, etc.) */
  children: React.ReactNode;
}

/**
 * PaletteContainer - Base wrapper for all palette components.
 *
 * Features:
 * - Fixed width to prevent layout shift
 * - Theme-aware background and border colors
 * - Elevated shadow for modal-like appearance
 * - Bubbly border radius (design system convention)
 *
 * @example
 * ```tsx
 * <PaletteContainer size="default">
 *   <PaletteTabBar tabs={tabs} activeTab="all" onTabChange={setTab} />
 *   <PaletteResultsList>
 *     {items.map(item => <PaletteResultItem key={item.id} {...item} />)}
 *   </PaletteResultsList>
 * </PaletteContainer>
 * ```
 */
export const PaletteContainer = forwardRef<HTMLDivElement, PaletteContainerProps>(
  function PaletteContainer({ className, size, radius, children, ...props }, ref) {
    return (
      <div
        ref={ref}
        data-slot="palette-container"
        data-size={size}
        className={cn(paletteContainerVariants({ size, radius }), 'group/palette', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

export { paletteContainerVariants };
