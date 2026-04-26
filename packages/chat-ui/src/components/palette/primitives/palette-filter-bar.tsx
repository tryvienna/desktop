/**
 * PaletteFilterBar — Filter controls for entity palette tabs
 *
 * @ai-context
 * - Renders filter key buttons between tab bar and results list
 * - Portal-based dropdown value picker (escapes overflow:hidden)
 * - Multi-select within a key (OR logic), cross-key AND logic
 * - Badge shows active filter count; "Clear" resets all
 * - Syncs with keyword syntax (e.g., "status:done") automatically
 * - Returns null when no filter definitions provided
 * - data-slot="palette-filter-bar"
 *
 * @example
 * <PaletteFilterBar filters={defs} activeFilters={active} onFiltersChange={set} />
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

import { ChevronDownIcon, XIcon, CheckIcon } from 'lucide-react';

import { cn } from '@tryvienna/ui';

import type { PaletteFilterDefinition, ActivePaletteFilter } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// COLOR TOKEN MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

const COLOR_TOKEN_CLASSES: Record<string, string> = {
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
  brand: 'text-brand',
  info: 'text-info',
  muted: 'text-muted-foreground',
  ai: 'text-ai',
};

function getColorClass(colorToken?: string): string {
  if (!colorToken) return '';
  return COLOR_TOKEN_CLASSES[colorToken] ?? '';
}

// ═══════════════════════════════════════════════════════════════════════════════
// DROPDOWN PORTAL
// ═══════════════════════════════════════════════════════════════════════════════

interface FilterDropdownProps {
  filterDef: PaletteFilterDefinition;
  activeValues: string[];
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onToggleValue: (valueId: string) => void;
  onClose: () => void;
}

/**
 * FilterDropdown - Value picker rendered via portal.
 *
 * Positions itself below the anchor button using getBoundingClientRect().
 * Uses position:fixed to escape overflow:hidden on PaletteContainer.
 */
function FilterDropdown({
  filterDef,
  activeValues,
  anchorRef,
  onToggleValue,
  onClose,
}: FilterDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  // Calculate position from anchor on mount and on scroll/resize
  useEffect(() => {
    function updatePosition() {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }

    updatePosition();
    window.addEventListener('scroll', updatePosition, { passive: true });
    window.addEventListener('resize', updatePosition, { passive: true });
    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [anchorRef]);

  // Close on click outside
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (dropdownRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [anchorRef, onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        e.stopPropagation();
        anchorRef.current?.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [anchorRef, onClose]);

  if (!position) return null;

  return createPortal(
    <div
      ref={dropdownRef}
      data-slot="palette-filter-dropdown"
      style={{ top: position.top, left: position.left }}
      // Prevent focus from moving into the portal so the chat input stays focused
      onMouseDown={(e) => e.preventDefault()}
      className={cn(
        'fixed z-[200]',
        'min-w-[152px]',
        'rounded-lg border border-border-default bg-surface-elevated shadow-lg',
        'py-1',
        // Subtle enter animation
        'animate-in fade-in-0 zoom-in-95 duration-100'
      )}
    >
      {filterDef.values.map((value) => {
        const isSelected = activeValues.includes(value.id);
        return (
          <button
            key={value.id}
            data-slot="palette-filter-value"
            data-selected={isSelected}
            onClick={() => onToggleValue(value.id)}
            className={cn(
              'flex w-full items-center gap-2 px-3 py-1.5',
              'text-xs transition-colors duration-100',
              'hover:bg-surface-hover',
              'outline-none focus-visible:bg-surface-hover',
              isSelected ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            {/* Checkbox */}
            <span
              className={cn(
                'flex size-3.5 shrink-0 items-center justify-center rounded-sm border transition-colors',
                isSelected ? 'border-brand bg-brand' : 'border-border-default'
              )}
            >
              {isSelected && <CheckIcon className="size-2.5 text-white stroke-[2.5]" />}
            </span>

            {/* Icon */}
            {value.icon && <span className="shrink-0">{value.icon}</span>}

            {/* Label */}
            <span
              className={cn(
                'flex-1 text-left',
                isSelected && value.colorToken ? getColorClass(value.colorToken) : ''
              )}
            >
              {value.label}
            </span>
          </button>
        );
      })}
    </div>,
    document.body
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface PaletteFilterBarProps {
  /** Filter definitions for the current tab's entity type */
  filters: PaletteFilterDefinition[];
  /** Currently active filters */
  activeFilters: ActivePaletteFilter[];
  /** Called when active filters change */
  onFiltersChange: (filters: ActivePaletteFilter[]) => void;
  /** Additional className */
  className?: string;
}

/**
 * PaletteFilterBar
 *
 * Renders between the tab bar and results list when the active tab's entity
 * type declares palette filters. Provides key button -> dropdown value picker
 * interaction. Returns null when no filter definitions are provided.
 *
 * Both the filter bar UI and the keyboard syntax (e.g., "status:done") produce
 * the same `ActivePaletteFilter[]` -- callers can use `parseKeywordFilters` from
 * `@vienna/chat-ui/utils` to sync the search input with this component.
 *
 * @example
 * ```tsx
 * <PaletteFilterBar
 *   filters={linearFilters}
 *   activeFilters={activeFilters}
 *   onFiltersChange={setActiveFilters}
 * />
 * ```
 */
export function PaletteFilterBar({
  filters,
  activeFilters,
  onFiltersChange,
  className,
}: PaletteFilterBarProps) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const getActiveValues = useCallback(
    (key: string): string[] => activeFilters.find((f) => f.key === key)?.values ?? [],
    [activeFilters]
  );

  const toggleValue = useCallback(
    (filterKey: string, valueId: string) => {
      const existing = activeFilters.find((f) => f.key === filterKey);
      if (existing) {
        const newValues = existing.values.includes(valueId)
          ? existing.values.filter((v) => v !== valueId)
          : [...existing.values, valueId];

        if (newValues.length === 0) {
          onFiltersChange(activeFilters.filter((f) => f.key !== filterKey));
        } else {
          onFiltersChange(
            activeFilters.map((f) => (f.key === filterKey ? { ...f, values: newValues } : f))
          );
        }
      } else {
        onFiltersChange([...activeFilters, { key: filterKey, values: [valueId] }]);
      }
    },
    [activeFilters, onFiltersChange]
  );

  const closeDropdown = useCallback(() => setOpenKey(null), []);

  if (filters.length === 0) return null;

  const hasActiveFilters = activeFilters.length > 0;

  return (
    <div
      data-slot="palette-filter-bar"
      className={cn(
        'flex items-center gap-1.5 border-b border-border-default px-3 py-2',
        className
      )}
    >
      {filters.map((filterDef) => {
        const activeValues = getActiveValues(filterDef.key);
        const isOpen = openKey === filterDef.key;
        const hasActive = activeValues.length > 0;
        const anchorRef = { current: buttonRefs.current.get(filterDef.key) ?? null };

        return (
          <div key={filterDef.key}>
            {/* Filter key button */}
            <button
              ref={(el) => {
                if (el) buttonRefs.current.set(filterDef.key, el);
              }}
              data-slot="palette-filter-button"
              data-filter-key={filterDef.key}
              data-active={hasActive}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setOpenKey(isOpen ? null : filterDef.key)}
              className={cn(
                'flex h-6 items-center gap-1 rounded-md px-2',
                'text-xs font-medium',
                'border transition-colors duration-150',
                'outline-none focus-visible:ring-1 focus-visible:ring-ai',
                hasActive
                  ? 'border-brand/30 bg-brand/10 text-brand hover:bg-brand/15'
                  : [
                      'border-border-default bg-surface-interactive text-muted-foreground',
                      'hover:text-foreground hover:border-border-default/80',
                    ],
                isOpen && !hasActive && 'border-border-default/80 text-foreground',
                isOpen && hasActive && 'bg-brand/15'
              )}
            >
              <span>{filterDef.label}</span>
              {hasActive && (
                <span
                  data-slot="palette-filter-count"
                  className="flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-brand/20 px-1 text-[10px] leading-none text-brand"
                >
                  {activeValues.length}
                </span>
              )}
              <ChevronDownIcon
                className={cn('size-3 transition-transform duration-150', isOpen && 'rotate-180')}
              />
            </button>

            {/* Dropdown rendered via portal to escape overflow:hidden */}
            {isOpen && (
              <FilterDropdown
                filterDef={filterDef}
                activeValues={activeValues}
                anchorRef={anchorRef as React.RefObject<HTMLButtonElement>}
                onToggleValue={(valueId) => toggleValue(filterDef.key, valueId)}
                onClose={closeDropdown}
              />
            )}
          </div>
        );
      })}

      {/* Clear all */}
      {hasActiveFilters && (
        <button
          data-slot="palette-filter-clear"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onFiltersChange([]);
            setOpenKey(null);
          }}
          className={cn(
            'ml-auto flex h-6 items-center gap-1 rounded-md px-2',
            'text-xs text-muted-foreground',
            'transition-colors hover:text-foreground',
            'outline-none focus-visible:ring-1 focus-visible:ring-ai'
          )}
        >
          <XIcon className="size-3" />
          <span>Clear</span>
        </button>
      )}
    </div>
  );
}
