/**
 * PaletteResultItem - Generic result item for palettes
 *
 * Displays any type of result (entity, command, etc.) with consistent styling.
 * Supports selection states, icons, metadata, hover actions, and an animated
 * check indicator for bulk selection.
 *
 * @module PaletteResultItem
 *
 * Token mapping (aligned with @tryvienna/ui):
 * - `text-foreground` — primary text color
 * - `text-muted-foreground` — muted text color
 * - `border-border-muted` — muted border color
 *
 * @ai-context
 * - This is the main interactive element inside PaletteResultsList.
 * - Uses `scrollIntoView({ block: 'nearest' })` when selected for keyboard navigation.
 * - The left-side selection indicator (brand-colored bar) fades in/out via opacity.
 * - The checked indicator uses framer-motion for spring-based animation.
 * - `data-palette-result` attribute is used by parent components for DOM queries.
 */

import { useEffect, useRef } from 'react';

import { cva, type VariantProps } from 'class-variance-authority';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckIcon } from 'lucide-react';

import { cn } from '@tryvienna/ui';

// ═══════════════════════════════════════════════════════════════════════════════
// VARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

const paletteResultItemVariants = cva(
  // Base styles
  [
    'relative flex cursor-pointer items-center gap-3',
    'rounded-lg px-3 py-2.5',
    'transition-all duration-150',
    'outline-none',
  ],
  {
    variants: {
      /** Whether the item is currently highlighted via keyboard navigation */
      selected: {
        true: 'bg-surface-elevated',
        false: 'group-data-[mouse-active]/palette:hover:bg-surface-elevated/50',
      },
      /** Whether the item is non-interactive */
      disabled: {
        true: 'cursor-not-allowed opacity-50',
        false: '',
      },
    },
    defaultVariants: {
      selected: false,
      disabled: false,
    },
  }
);

const selectionIndicatorVariants = cva(
  // Base styles - left border indicator
  [
    'absolute left-0 top-1/2 h-4 w-0.5',
    '-translate-y-1/2 rounded-full',
    'bg-brand',
    'transition-opacity duration-150',
  ],
  {
    variants: {
      /** Whether the indicator is visible (tied to selected state) */
      visible: {
        true: 'opacity-100',
        false: 'opacity-0',
      },
    },
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface PaletteResultItemProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof paletteResultItemVariants> {
  /** Primary display text */
  title: string;
  /** Optional secondary text displayed below the title */
  subtitle?: string;
  /** Icon component rendered to the left of the content */
  icon?: React.ReactNode;
  /** Metadata content rendered to the right (e.g., badges, timestamps) */
  metadata?: React.ReactNode;
  /** Whether this item is selected via keyboard navigation */
  selected?: boolean;
  /** Whether this item is checked/active in a bulk selection context */
  checked?: boolean;
  /** Whether this item is disabled and non-interactive */
  disabled?: boolean;
  /** Called when the item is clicked */
  onSelect?: () => void;
  /** Called when the mouse enters the item (for hover-to-select behavior) */
  onHover?: () => void;
}

/**
 * PaletteResultItem - Generic result item component.
 *
 * Features:
 * - Left border indicator when selected (brand color)
 * - Icon slot with flexible sizing
 * - Primary/secondary text with truncation
 * - Metadata display (right-aligned)
 * - Animated check indicator for bulk selection (framer-motion)
 * - Auto-scroll into view when selected via keyboard
 * - Hover states with smooth transitions
 *
 * @example Basic usage
 * ```tsx
 * <PaletteResultItem
 *   title="Fix authentication bug"
 *   subtitle="DRF-142"
 *   icon={<LinearIcon />}
 *   selected={index === selectedIndex}
 *   onSelect={() => handleSelect(item)}
 *   onHover={() => setSelectedIndex(index)}
 * />
 * ```
 *
 * @example With metadata and checked state
 * ```tsx
 * <PaletteResultItem
 *   title="Enable dark mode"
 *   subtitle="settings.appearance"
 *   icon={<SettingsIcon />}
 *   metadata={<span className="text-muted-foreground">2h ago</span>}
 *   selected={index === selectedIndex}
 *   checked={selectedIds.has(item.id)}
 *   onSelect={() => toggleSelection(item.id)}
 * />
 * ```
 */
export function PaletteResultItem({
  title,
  subtitle,
  icon,
  metadata,
  selected = false,
  checked,
  disabled = false,
  onSelect,
  onHover,
  className,
  ...props
}: PaletteResultItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);

  // Auto-scroll into view when selected (for keyboard navigation)
  useEffect(() => {
    if (selected && itemRef.current) {
      itemRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selected]);

  const handleClick = () => {
    if (!disabled && onSelect) {
      onSelect();
    }
  };

  const handleMouseEnter = () => {
    if (!disabled && onHover) {
      onHover();
    }
  };

  return (
    <div
      ref={itemRef}
      data-slot="palette-result-item"
      data-palette-result
      data-selected={selected}
      data-disabled={disabled}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      className={cn(
        paletteResultItemVariants({ selected, disabled }),
        checked && 'bg-brand/10',
        className
      )}
      {...props}
    >
      {/* Selection indicator - left border */}
      <div className={cn(selectionIndicatorVariants({ visible: selected }))} aria-hidden="true" />

      {/* Icon */}
      {icon && (
        <div className="flex-shrink-0" aria-hidden="true">
          {icon}
        </div>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'truncate text-md font-medium text-foreground',
              disabled && 'text-muted-foreground',
              checked && 'text-brand font-semibold'
            )}
          >
            {title}
          </span>
        </div>
        {subtitle && <div className="truncate text-sm text-muted-foreground">{subtitle}</div>}
      </div>

      {/* Metadata */}
      {metadata && (
        <div className="flex flex-shrink-0 items-center gap-2 text-sm text-muted-foreground">
          {metadata}
        </div>
      )}

      {/* Checked indicator - animated circle with spring animation, shown when checked prop is defined */}
      {checked !== undefined && (
        <motion.div
          className={cn(
            'flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200',
            checked ? 'border-brand bg-brand' : 'border-border-muted bg-transparent'
          )}
          animate={{ scale: checked ? [1, 1.15, 1] : 1 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <AnimatePresence>
            {checked && (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 600, damping: 28, mass: 0.4 }}
              >
                <CheckIcon className="size-2.5 text-white stroke-[3]" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

export { paletteResultItemVariants };
