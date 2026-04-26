/**
 * PaletteEntityChip — Clickable chip for entity references in chat input
 *
 * @ai-context
 * - Displays entity references as inline chips with vienna:// URIs
 * - CVA variants: default (neutral) and brand (highlighted)
 * - Remove button (X) with hover reveal via group-hover
 * - data-slot="palette-entity-chip"
 *
 * @example
 * <PaletteEntityChip label="Fix auth bug" type="linear" onRemove={remove} />
 */

import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';

import { cn } from '@tryvienna/ui';

import type { EntityType } from '../types';

// =============================================================================
// VARIANTS
// =============================================================================

/**
 * CVA variant definitions for entity chip styling.
 *
 * Variants:
 * - **default** - Neutral elevated surface with border, suitable for general entities
 * - **brand** - Brand-tinted background and border, suitable for highlighted/active entities
 */
const entityChipVariants = cva(
  // Base styles
  [
    'inline-flex items-center gap-1.5',
    'max-w-full',
    'rounded-md px-2 py-1',
    'text-[13px] font-medium',
    'transition-all duration-150',
    'cursor-pointer',
    'group',
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-surface-elevated text-foreground',
          'border',
          'border-border-default',
          'hover:bg-surface-hover',
        ],
        brand: ['bg-brand/10 text-brand', 'border', 'border-brand/20', 'hover:bg-brand/20'],
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

// =============================================================================
// COMPONENT
// =============================================================================

export interface PaletteEntityChipProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof entityChipVariants> {
  /** Human-readable label displayed inside the chip */
  label: string;
  /** Entity type used for icon/color mapping and data attributes */
  type?: EntityType;
  /** Optional icon component rendered before the label */
  icon?: React.ReactNode;
  /** Called when the chip body is clicked */
  onClick?: () => void;
  /** Called when the remove (X) button is clicked */
  onRemove?: () => void;
  /** Whether the remove button is shown on hover (defaults to true) */
  removable?: boolean;
}

/**
 * PaletteEntityChip - Display an entity reference as a clickable chip.
 *
 * Renders a compact inline chip with an optional icon, truncated label, and
 * a remove button that appears on hover. Designed for use in chat input fields
 * and entity reference displays.
 *
 * Features:
 * - Human-readable label with automatic truncation
 * - Optional leading icon based on entity type
 * - Click handler for viewing entity details
 * - Remove button (X) with hover reveal animation
 * - Two visual variants: default (neutral) and brand (highlighted)
 * - Theme-aware styling with smooth transitions
 *
 * @example
 * ```tsx
 * <PaletteEntityChip
 *   label="Fix authentication bug"
 *   type="linear"
 *   icon={<LinearIcon />}
 *   onClick={() => openEntity(entity)}
 *   onRemove={() => removeEntity(entity)}
 *   removable
 * />
 *
 * <PaletteEntityChip
 *   label="Feature request"
 *   variant="brand"
 *   onClick={() => openEntity(entity)}
 * />
 * ```
 */
export function PaletteEntityChip({
  label,
  type,
  icon,
  onClick,
  onRemove,
  removable = true,
  variant = 'default',
  className,
  ...props
}: PaletteEntityChipProps) {
  /** Handle chip body click with event propagation control. */
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    }
  };

  /** Handle remove button click, stopping propagation to avoid triggering chip click. */
  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onRemove) {
      onRemove();
    }
  };

  return (
    <div
      data-slot="palette-entity-chip"
      data-type={type}
      onClick={handleClick}
      className={cn(entityChipVariants({ variant }), className)}
      {...props}
    >
      {/* Icon */}
      {icon && (
        <div className="flex-shrink-0" aria-hidden="true">
          {icon}
        </div>
      )}

      {/* Label */}
      <span className="min-w-0 truncate">{label}</span>

      {/* Remove button - appears on hover via group-hover */}
      {removable && onRemove && (
        <button
          type="button"
          onClick={handleRemove}
          className={cn(
            'flex-shrink-0 rounded-sm',
            'opacity-0 transition-opacity group-hover:opacity-100',
            'hover:bg-surface-hover',
            'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ai'
          )}
          aria-label="Remove"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}

export { entityChipVariants };
