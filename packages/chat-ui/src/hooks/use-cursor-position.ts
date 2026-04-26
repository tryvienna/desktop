/**
 * useCursorPosition — Tracks cursor position in ContentEditable for autocomplete popover positioning
 *
 * @ai-context
 * - Returns { position, update } where position has offset, node, nodeOffset, rect
 * - Listens to selectionchange events for reactive tracking
 * - Disable tracking when not needed for performance
 *
 * @example
 * const { position } = useCursorPosition({ elementRef, enabled: isAutocompleteActive });
 */

import { useState, useCallback, useEffect } from 'react';

import type { CursorPosition } from '../types/input';
import { getCharacterOffsetFromStart } from '../utils/content-editable-dom';

export interface UseCursorPositionOptions {
  /** ContentEditable element ref */
  elementRef: React.RefObject<HTMLDivElement | null>;
  /** Enable tracking (disable when not needed for performance) */
  enabled?: boolean;
}

export interface UseCursorPositionReturn {
  /** Current cursor position */
  position: CursorPosition | null;
  /** Manually update cursor position (call on selection change) */
  update: () => void;
}

export function useCursorPosition(options: UseCursorPositionOptions): UseCursorPositionReturn {
  const { elementRef, enabled = true } = options;
  const [position, setPosition] = useState<CursorPosition | null>(null);

  const update = useCallback(() => {
    if (!enabled || !elementRef.current) {
      setPosition(null);
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setPosition(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    const nodeOffset = range.startOffset;

    const offset = getCharacterOffsetFromStart(elementRef.current, node, nodeOffset);

    let rect: DOMRect | null = null;
    try {
      const rects = range.getClientRects();
      if (rects.length > 0) {
        rect = rects[0];
      } else {
        const tempSpan = document.createElement('span');
        tempSpan.textContent = '\u200B';
        range.insertNode(tempSpan);
        rect = tempSpan.getBoundingClientRect();
        tempSpan.remove();
      }
    } catch {
      // Ignore errors
    }

    setPosition({ offset, node, nodeOffset, rect });
  }, [enabled, elementRef]);

  useEffect(() => {
    if (!enabled) return;

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || !elementRef.current) return;

      const node = selection.anchorNode;
      if (!node || !elementRef.current.contains(node)) return;

      update();
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [enabled, elementRef, update]);

  return { position, update };
}
