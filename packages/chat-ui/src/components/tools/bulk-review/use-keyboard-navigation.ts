/**
 * useKeyboardNavigation — Vim-like keyboard navigation for the bulk review panel
 *
 * @ai-context
 * - j/k navigation, Enter/a approve, Escape/d deny, Shift+Enter/Shift+A approve all
 * - Auto-expands focused item, cleans up selection on change removal
 * - Returns focusedId, selectedIds, expandedIds, and navigation methods
 */

import { useCallback, useEffect, useState, useMemo } from 'react';

import { createRendererLogger } from '@vienna/logger/renderer';
import type { PendingChange, KeyboardShortcuts } from './types';

const logger = createRendererLogger().child({ service: 'useKeyboardNavigation' });

interface UseKeyboardNavigationProps {
  changes: PendingChange[];
  enabled: boolean;
  shortcuts?: Partial<KeyboardShortcuts>;
  onApprove: (requestId: string) => void;
  onDeny: (requestId: string) => void;
  onApproveAll: () => void;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  autoExpandFocused?: boolean;
  /** When true, all items start expanded and focusing doesn't collapse others */
  initialExpandAll?: boolean;
}

interface UseKeyboardNavigationReturn {
  focusedId: string | null;
  selectedIds: Set<string>;
  expandedIds: Set<string>;
  setFocusedId: (id: string | null) => void;
  toggleSelection: (id: string) => void;
  toggleExpanded: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  hasSelection: boolean;
  focusNext: () => void;
  focusPrev: () => void;
}

const DEFAULT_KEYBOARD_SHORTCUTS: KeyboardShortcuts = {
  next: ['j', 'ArrowDown'],
  prev: ['k', 'ArrowUp'],
  approve: ['Enter', 'a'],
  deny: ['Escape', 'd'],
  toggleSelect: ['x', ' '],
  selectAll: ['Ctrl+a'],
  toggleExpand: ['e', 'Tab'],
  approveAll: ['Shift+Enter', 'Shift+A'],
};

function matchesShortcut(event: KeyboardEvent, shortcuts: string[]): boolean {
  return shortcuts.some((shortcut) => {
    const parts = shortcut.split('+');
    const key = parts.pop()!;
    const modifiers = parts;
    const requiresShift = modifiers.includes('Shift');

    // When Shift is a modifier, compare keys case-insensitively because
    // event.key may be uppercase or lowercase depending on the platform.
    const keyMatches = requiresShift
      ? event.key.toLowerCase() === key.toLowerCase()
      : event.key === key;

    return (
      keyMatches &&
      event.shiftKey === requiresShift &&
      event.ctrlKey === modifiers.includes('Ctrl') &&
      event.altKey === modifiers.includes('Alt') &&
      event.metaKey === modifiers.includes('Meta')
    );
  });
}

export function useKeyboardNavigation({
  changes,
  enabled,
  shortcuts: customShortcuts,
  onApprove,
  onDeny,
  onApproveAll,
  onSelectionChange,
  autoExpandFocused = true,
  initialExpandAll = false,
}: UseKeyboardNavigationProps): UseKeyboardNavigationReturn {
  const [focusedId, setFocusedIdInternal] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const effectiveAutoExpand = autoExpandFocused && !initialExpandAll;

  const setFocusedId = useCallback(
    (id: string | null) => {
      setFocusedIdInternal(id);
      if (effectiveAutoExpand && id) {
        setExpandedIds(new Set([id]));
      }
    },
    [effectiveAutoExpand]
  );

  // When initialExpandAll is true, keep all items expanded as changes arrive.
  // Also prune stale IDs no longer in the changes list to prevent memory leaks.
  useEffect(() => {
    if (!initialExpandAll) return;
    const currentIds = new Set(changes.map((c) => c.requestId));
    setExpandedIds((prev) => {
      const next = new Set<string>();
      let changed = false;
      // Add all current changes
      for (const id of currentIds) {
        next.add(id);
        if (!prev.has(id)) changed = true;
      }
      // Detect removals
      if (prev.size !== next.size) changed = true;
      return changed ? next : prev;
    });
  }, [initialExpandAll, changes]);

  const shortcuts = useMemo(
    () => ({ ...DEFAULT_KEYBOARD_SHORTCUTS, ...customShortcuts }),
    [customShortcuts]
  );

  const changeIds = useMemo(() => changes.map((c) => c.requestId), [changes]);

  const focusNext = useCallback(() => {
    if (changeIds.length === 0) return;
    const currentIndex = focusedId ? changeIds.indexOf(focusedId) : -1;
    const nextIndex = currentIndex < changeIds.length - 1 ? currentIndex + 1 : 0;
    setFocusedId(changeIds[nextIndex]!);
  }, [changeIds, focusedId, setFocusedId]);

  const focusPrev = useCallback(() => {
    if (changeIds.length === 0) return;
    const currentIndex = focusedId ? changeIds.indexOf(focusedId) : 0;
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : changeIds.length - 1;
    setFocusedId(changeIds[prevIndex]!);
  }, [changeIds, focusedId, setFocusedId]);

  const toggleSelection = useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        onSelectionChange?.(next);
        return next;
      });
    },
    [onSelectionChange]
  );

  const selectAll = useCallback(() => {
    const allIds = new Set(changeIds);
    setSelectedIds(allIds);
    onSelectionChange?.(allIds);
  }, [changeIds, onSelectionChange]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    onSelectionChange?.(new Set());
  }, [onSelectionChange]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!enabled) {
      logger.debug('Keyboard navigation disabled', { changeCount: changes.length, enabled });
      return;
    }
    logger.debug('Keyboard navigation enabled', { changeCount: changes.length });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
        return;

      if (matchesShortcut(event, shortcuts.next)) {
        event.preventDefault();
        focusNext();
      } else if (matchesShortcut(event, shortcuts.prev)) {
        event.preventDefault();
        focusPrev();
      } else if (matchesShortcut(event, shortcuts.approve)) {
        event.preventDefault();
        logger.info('Approve single matched', { key: event.key, shiftKey: event.shiftKey, focusedId, selectedCount: selectedIds.size, changeCount: changes.length });
        if (selectedIds.size > 0) {
          selectedIds.forEach((id) => onApprove(id));
          clearSelection();
        } else if (focusedId) {
          onApprove(focusedId);
          focusNext();
        }
      } else if (matchesShortcut(event, shortcuts.approveAll)) {
        event.preventDefault();
        logger.info('Approve ALL matched', { key: event.key, shiftKey: event.shiftKey, changeCount: changes.length, pendingCount: changes.filter(c => !c.status).length });
        onApproveAll();
      } else if (matchesShortcut(event, shortcuts.deny)) {
        event.preventDefault();
        if (selectedIds.size > 0) {
          selectedIds.forEach((id) => onDeny(id));
          clearSelection();
        } else if (focusedId) {
          onDeny(focusedId);
          focusNext();
        }
      } else if (matchesShortcut(event, shortcuts.toggleSelect)) {
        event.preventDefault();
        if (focusedId) toggleSelection(focusedId);
      } else if (matchesShortcut(event, shortcuts.selectAll)) {
        event.preventDefault();
        selectAll();
      } else if (matchesShortcut(event, shortcuts.toggleExpand)) {
        event.preventDefault();
        if (focusedId) toggleExpanded(focusedId);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    enabled,
    changes,
    shortcuts,
    focusedId,
    selectedIds,
    focusNext,
    focusPrev,
    toggleSelection,
    toggleExpanded,
    selectAll,
    clearSelection,
    onApprove,
    onDeny,
    onApproveAll,
  ]);

  // Clean up selection when changes are removed
  useEffect(() => {
    const validIds = new Set(changeIds);
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => validIds.has(id)));
      if (next.size !== prev.size) onSelectionChange?.(next);
      return next;
    });
    if (focusedId && !validIds.has(focusedId)) {
      setFocusedId(changeIds[0] || null);
    }
  }, [changeIds, focusedId, onSelectionChange, setFocusedId]);

  return {
    focusedId,
    selectedIds,
    expandedIds,
    setFocusedId,
    toggleSelection,
    toggleExpanded,
    selectAll,
    clearSelection,
    hasSelection: selectedIds.size > 0,
    focusNext,
    focusPrev,
  };
}
