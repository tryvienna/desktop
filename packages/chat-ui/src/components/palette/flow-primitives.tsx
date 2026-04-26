/**
 * Flow Primitives — Reusable building blocks for command palette flow screens
 *
 * @ai-context
 * - FlowScreen: layout container for flow steps
 * - FlowHeader: title bar with back button and progress dots
 * - FlowList: keyboard-navigable list reusing PaletteResultItem
 * - FlowListItem: standalone selectable row
 * - FlowConfirmation: confirm/cancel dialog with keyboard left/right/Enter
 * - All components use FlowKeyboardContext for event delegation
 */

import { memo, useState, useEffect, useRef, useContext, useCallback } from 'react';
import type { ReactNode } from 'react';

import { cn } from '@tryvienna/ui';

import { FlowKeyboardContext } from './flow-keyboard-context';
import { PaletteResultsList, PaletteResultItem, PaletteSection } from './primitives';

// ═══════════════════════════════════════════════════════════════════════════════
// FLOW SCREEN
// ═══════════════════════════════════════════════════════════════════════════════

interface FlowScreenProps {
  children: ReactNode;
  className?: string;
}

/**
 * Container for a flow screen -- consistent padding/layout with the palette.
 */
export const FlowScreen = memo(function FlowScreen({ children, className }: FlowScreenProps) {
  return (
    <div
      data-slot="flow-screen"
      className={cn('flex flex-col w-full flex-1 min-h-0 overflow-y-auto', className)}
    >
      {children}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// FLOW HEADER
// ═══════════════════════════════════════════════════════════════════════════════

interface FlowHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  screenIndex?: number;
  totalScreens?: number;
}

/**
 * Header with title, optional back button, and progress dots.
 */
export const FlowHeader = memo(function FlowHeader({
  title,
  subtitle,
  onBack,
  screenIndex,
  totalScreens,
}: FlowHeaderProps) {
  return (
    <div
      data-slot="flow-header"
      className="flex items-center gap-2 px-3 py-2 border-b border-border-default"
    >
      {onBack && (
        <button
          onClick={onBack}
          className="bg-transparent border-none cursor-pointer px-1 py-0.5 text-muted-foreground text-sm leading-none hover:text-foreground transition-colors"
          aria-label="Go back"
        >
          ←
        </button>
      )}

      <div className="flex-1 min-w-0">
        <div className="text-md font-semibold text-foreground">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground mt-px">{subtitle}</div>}
      </div>

      {/* Progress dots */}
      {totalScreens != null && totalScreens > 1 && screenIndex != null && (
        <div className="flex gap-1 items-center">
          {Array.from({ length: totalScreens }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-colors duration-150',
                i === screenIndex ? 'bg-brand' : 'bg-border-default'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// FLOW LIST
// ═══════════════════════════════════════════════════════════════════════════════

export interface FlowListItemData {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  metadata?: ReactNode;
  checked?: boolean;
  className?: string;
  onSelect: () => void;
}

interface FlowListProps {
  items: FlowListItemData[];
  initialIndex?: number;
}

/**
 * Keyboard-navigable list for flow screens.
 *
 * Reuses PaletteResultItem for consistent styling with the main palette.
 * Handles up/down arrow keys for navigation and Enter for selection -- the
 * same UX as the main command palette page.
 *
 * Keyboard events are handled via two paths for reliability:
 * 1. Context registration -- CommandPaletteWithFlows forwards events through
 *    its capture-phase document listener (proven, reliable).
 * 2. Direct document listener -- fallback for when FlowList is used outside
 *    of CommandPaletteWithFlows.
 */
export function FlowList({ items, initialIndex = 0 }: FlowListProps) {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const itemsRef = useRef(items);
  const selectedRef = useRef(selectedIndex);
  itemsRef.current = items;
  selectedRef.current = selectedIndex;

  const flowKeyboard = useContext(FlowKeyboardContext);

  // Stable keyboard handler -- uses refs to avoid stale closures
  const handleKeyDown = useCallback((e: KeyboardEvent): boolean => {
    const currentItems = itemsRef.current;
    if (currentItems.length === 0) return false;

    switch (e.key) {
      case 'ArrowDown':
        setSelectedIndex((prev) => (prev < currentItems.length - 1 ? prev + 1 : 0));
        return true;
      case 'ArrowUp':
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : currentItems.length - 1));
        return true;
      case 'Enter':
        currentItems[selectedRef.current]?.onSelect();
        return true;
      default:
        return false;
    }
  }, []);

  // Register with parent context (primary keyboard path)
  useEffect(() => {
    flowKeyboard?.register(handleKeyDown);
    return () => flowKeyboard?.unregister();
  }, [flowKeyboard, handleKeyDown]);

  // Direct document listener (fallback keyboard path)
  useEffect(() => {
    // Skip if context is available -- parent handles events via capture phase
    if (flowKeyboard) return;

    const listener = (e: KeyboardEvent) => {
      if (handleKeyDown(e)) {
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [flowKeyboard, handleKeyDown]);

  return (
    <PaletteResultsList>
      {items.map((item, index) => (
        <PaletteResultItem
          key={item.id}
          title={item.label}
          subtitle={item.description}
          icon={item.icon}
          checked={item.checked}
          selected={index === selectedIndex}
          onSelect={item.onSelect}
          onHover={() => setSelectedIndex(index)}
        />
      ))}
    </PaletteResultsList>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLOW LIST ITEM (STANDALONE)
// ═══════════════════════════════════════════════════════════════════════════════

interface FlowListItemProps {
  label: string;
  description?: string;
  icon?: ReactNode;
  selected?: boolean;
  checked?: boolean;
  onSelect: () => void;
  onHover?: () => void;
}

/**
 * Standalone selectable row -- use FlowList for keyboard-navigable lists.
 */
export const FlowListItem = memo(function FlowListItem({
  label,
  description,
  icon,
  selected,
  checked,
  onSelect,
  onHover,
}: FlowListItemProps) {
  return (
    <PaletteResultItem
      title={label}
      subtitle={description}
      icon={icon}
      checked={checked}
      selected={selected}
      onSelect={onSelect}
      onHover={onHover}
    />
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// FLOW SEARCHABLE LIST
// ═══════════════════════════════════════════════════════════════════════════════

export interface FlowSearchableListSection {
  id: string;
  label: string;
  items: FlowListItemData[];
}

export interface FlowSearchableListProps {
  /** Sections to display. When a single section, the header is hidden. */
  sections: FlowSearchableListSection[];
  /** Placeholder for the search input. */
  placeholder?: string;
  /** Current search query (controlled). */
  query: string;
  /** Called when the search query changes. */
  onQueryChange: (query: string) => void;
  /** Rendered when there are no items across all sections. */
  emptyMessage?: string;
  /**
   * Multi-select submit callback. When provided, changes keyboard behavior:
   * - Space toggles the focused item (calls onSelect)
   * - Enter calls onSubmit instead of onSelect
   */
  onSubmit?: () => void;
}

/**
 * Searchable, sectioned list for flow screens.
 *
 * Combines a search input with a sectioned, keyboard-navigable list.
 * The search input auto-focuses on mount. Up/Down/Enter are handled for
 * list navigation; typing is captured by the search input.
 *
 * Sections are rendered with PaletteSection headers. Keyboard navigation
 * spans across all sections as a flat list.
 */
export function FlowSearchableList({
  sections,
  placeholder = 'Search...',
  query,
  onQueryChange,
  emptyMessage = 'No results',
  onSubmit,
}: FlowSearchableListProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const mouseMovedRef = useRef(false);

  // Flatten all items for keyboard navigation
  const flatItems = sections.flatMap((s) => s.items);
  const flatItemsRef = useRef(flatItems);
  const selectedRef = useRef(selectedIndex);
  const onSubmitRef = useRef(onSubmit);
  flatItemsRef.current = flatItems;
  selectedRef.current = selectedIndex;
  onSubmitRef.current = onSubmit;

  const flowKeyboard = useContext(FlowKeyboardContext);

  // Auto-focus search input
  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard handler for navigation
  const handleKeyDown = useCallback((e: KeyboardEvent): boolean => {
    const items = flatItemsRef.current;
    if (items.length === 0) return false;

    switch (e.key) {
      case 'ArrowDown':
        setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
        return true;
      case 'ArrowUp':
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
        return true;
      case ' ':
        // In multi-select mode, Space toggles the focused item
        if (onSubmitRef.current) {
          items[selectedRef.current]?.onSelect();
          return true;
        }
        return false;
      case 'Enter':
        // In multi-select mode, Enter submits; otherwise Enter selects
        if (onSubmitRef.current) {
          onSubmitRef.current();
        } else {
          items[selectedRef.current]?.onSelect();
        }
        return true;
      default:
        return false;
    }
  }, []);

  // Register with flow keyboard context
  useEffect(() => {
    flowKeyboard?.register(handleKeyDown);
    return () => flowKeyboard?.unregister();
  }, [flowKeyboard, handleKeyDown]);

  // Fallback document listener
  useEffect(() => {
    if (flowKeyboard) return;
    const listener = (e: KeyboardEvent) => {
      if (handleKeyDown(e)) e.preventDefault();
    };
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [flowKeyboard, handleKeyDown]);

  let flatIndex = 0;

  return (
    <div
      data-slot="flow-searchable-list"
      className="flex flex-col flex-1 min-h-0"
      onMouseMove={() => { mouseMovedRef.current = true; }}
    >
      {/* Search input */}
      <div className="px-3 py-2 border-b border-border-default">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          data-slot="flow-searchable-list-input"
        />
      </div>

      {/* Results */}
      <PaletteResultsList>
        {flatItems.length === 0 && (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        )}
        {sections.map((section) => (
          <div key={section.id}>
            {sections.length > 1 && <PaletteSection title={section.label} />}
            {section.items.map((item) => {
              const currentFlatIndex = flatIndex++;
              return (
                <PaletteResultItem
                  key={item.id}
                  title={item.label}
                  subtitle={item.description}
                  icon={item.icon}
                  metadata={item.metadata}
                  checked={item.checked}
                  selected={currentFlatIndex === selectedIndex}
                  onSelect={item.onSelect}
                  onHover={() => {
                    if (mouseMovedRef.current) setSelectedIndex(currentFlatIndex);
                  }}
                  className={item.className}
                />
              );
            })}
          </div>
        ))}
      </PaletteResultsList>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLOW CONFIRMATION
// ═══════════════════════════════════════════════════════════════════════════════

interface FlowConfirmationProps {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirm/cancel dialog layout for destructive or important actions.
 *
 * Keyboard: Enter to activate focused button, left/right to switch between
 * Cancel and Confirm. Escape is handled by the parent flow container.
 * Default focus is on Confirm so Enter immediately confirms.
 */
export const FlowConfirmation = memo(function FlowConfirmation({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'default',
  onConfirm,
  onCancel,
}: FlowConfirmationProps) {
  const [focused, setFocused] = useState<'cancel' | 'confirm'>('confirm');
  const focusedRef = useRef(focused);
  focusedRef.current = focused;
  const onConfirmRef = useRef(onConfirm);
  const onCancelRef = useRef(onCancel);
  onConfirmRef.current = onConfirm;
  onCancelRef.current = onCancel;

  const flowKeyboard = useContext(FlowKeyboardContext);

  const handleKeyDown = useCallback((e: KeyboardEvent): boolean => {
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowRight':
        setFocused((prev) => (prev === 'confirm' ? 'cancel' : 'confirm'));
        return true;
      case 'Enter':
        if (focusedRef.current === 'confirm') {
          onConfirmRef.current();
        } else {
          onCancelRef.current();
        }
        return true;
      default:
        return false;
    }
  }, []);

  useEffect(() => {
    flowKeyboard?.register(handleKeyDown);
    return () => flowKeyboard?.unregister();
  }, [flowKeyboard, handleKeyDown]);

  useEffect(() => {
    if (flowKeyboard) return;
    const listener = (e: KeyboardEvent) => {
      if (handleKeyDown(e)) e.preventDefault();
    };
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [flowKeyboard, handleKeyDown]);

  return (
    <div data-slot="flow-confirmation" className="flex flex-col p-4 gap-3">
      <div className="text-sm font-semibold text-foreground">{title}</div>

      {message && <div className="text-md text-muted-foreground leading-relaxed">{message}</div>}

      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className={cn(
            'px-4 py-1.5 text-xs font-medium rounded-md bg-transparent text-muted-foreground cursor-pointer transition-colors',
            focused === 'cancel'
              ? 'ring-2 ring-ai border border-border-default'
              : 'border border-border-default hover:bg-surface-elevated'
          )}
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          className={cn(
            'px-4 py-1.5 text-xs font-medium border-none rounded-md text-white cursor-pointer transition-colors',
            confirmVariant === 'danger'
              ? 'bg-error hover:bg-error/90'
              : 'bg-brand hover:bg-brand/90',
            focused === 'confirm' && 'ring-2 ring-ai'
          )}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
});
