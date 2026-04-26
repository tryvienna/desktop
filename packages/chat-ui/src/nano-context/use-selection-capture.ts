/**
 * useSelectionCapture — Reusable hook for capturing text selections and creating NanoContext
 *
 * @ai-context
 * - Domain-agnostic: callers provide a createContext factory
 * - Returns selection state, popover position, handleCapture, clearSelection
 * - Attaches context to NanoContextProvider on capture
 *
 * @example
 * const { showPopover, popoverPosition, handleCapture } = useSelectionCapture({ createContext: myFactory });
 */

import { useState, useCallback, useEffect, useRef } from 'react';

import { useNanoContextOptional } from './nano-context-provider';
import type {
  NanoContext,
  SelectionChangeEvent,
  UseSelectionCaptureOptions,
  UseSelectionCaptureReturn,
} from './types';

const DEFAULT_POSITION = { x: 0, y: 0 };
const defaultShouldShowPopover = (text: string) => text.trim().length > 0;

export function useSelectionCapture<TContext extends NanoContext>({
  createContext,
  shouldShowPopover = defaultShouldShowPopover,
  containerRef,
}: UseSelectionCaptureOptions<TContext>): UseSelectionCaptureReturn {
  const nanoContext = useNanoContextOptional();

  const [selection, setSelection] = useState<{
    hasSelection: boolean;
    selectedText: string;
    metadata?: Record<string, string>;
  }>({
    hasSelection: false,
    selectedText: '',
  });

  const [popoverPosition, setPopoverPosition] = useState<{ x: number; y: number }>(
    DEFAULT_POSITION
  );
  const [showPopover, setShowPopover] = useState(false);
  const isCapturingRef = useRef(false);

  const shouldShowPopoverRef = useRef(shouldShowPopover);
  shouldShowPopoverRef.current = shouldShowPopover;

  const createContextRef = useRef(createContext);
  createContextRef.current = createContext;

  const handleSelectionChange = useCallback((event: SelectionChangeEvent) => {
    if (isCapturingRef.current) return;

    if (event.hasSelection && shouldShowPopoverRef.current(event.selectedText)) {
      setSelection({
        hasSelection: true,
        selectedText: event.selectedText,
        metadata: event.metadata,
      });
      const pos = event.viewportPosition;
      setPopoverPosition(pos ? { x: pos.x, y: pos.y } : DEFAULT_POSITION);
      setShowPopover(true);
    } else {
      setSelection({
        hasSelection: false,
        selectedText: '',
      });
      setShowPopover(false);
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelection({
      hasSelection: false,
      selectedText: '',
    });
    setShowPopover(false);
  }, []);

  const handleCapture = useCallback(() => {
    if (!selection.hasSelection || !selection.selectedText || !nanoContext) {
      return;
    }

    isCapturingRef.current = true;

    try {
      const context = createContextRef.current(selection.selectedText, selection.metadata);
      nanoContext.attachContext(context);
      clearSelection();

      // Focus the chat input so the user can start typing immediately
      requestAnimationFrame(() => {
        nanoContext.focusInput();
      });
    } finally {
      requestAnimationFrame(() => {
        isCapturingRef.current = false;
      });
    }
  }, [selection, nanoContext, clearSelection]);

  useEffect(() => {
    if (!showPopover) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (isCapturingRef.current) return;

      if (containerRef?.current && !containerRef.current.contains(event.target as Node)) {
        clearSelection();
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [showPopover, containerRef, clearSelection]);

  return {
    selection,
    handleSelectionChange,
    handleCapture,
    clearSelection,
    showPopover,
    popoverPosition,
  };
}
