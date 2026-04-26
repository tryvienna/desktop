/**
 * SelectionCaptureWrapper — Auto-captures text selections in drawer content areas
 *
 * @ai-context
 * - Wraps drawer content; listens for native selectionchange events
 * - Shows "Ask Vienna" SelectionPopover when text is selected
 * - Uses useDrawerSelectionCapture hook for NanoContext creation
 * - data-slot="selection-capture-wrapper"
 *
 * @example
 * <SelectionCaptureWrapper drawerId="d1" drawerTitle="Entity Viewer">
 *   <DrawerContent />
 * </SelectionCaptureWrapper>
 */

import { useRef, useEffect, useCallback } from 'react';

import { useDrawerSelectionCapture } from './use-drawer-selection-capture';
import { SelectionPopover } from './selection-popover';
import type { SelectionChangeEvent } from './types';

/**
 * Walk up from a selection's common ancestor to extract data-nano-* attributes.
 * This allows content (e.g. DiffView) to annotate DOM elements with file metadata
 * that enriches the captured nanocontext.
 */
function extractNanoMetadata(
  selection: Selection,
  container: HTMLElement,
): Record<string, string> | undefined {
  const range = selection.getRangeAt(0);
  let node: Node | null = range.commonAncestorContainer;

  while (node && node !== container) {
    if (node instanceof HTMLElement) {
      const filePath = node.dataset['nanoFilePath'];
      if (filePath) {
        const metadata: Record<string, string> = { filePath };
        const language = node.dataset['nanoLanguage'];
        if (language) metadata.language = language;
        return metadata;
      }
    }
    node = node.parentNode;
  }

  return undefined;
}

export interface SelectionCaptureWrapperProps {
  drawerId: string;
  drawerTitle?: string;
  entityUri?: string;
  disabled?: boolean;
  children: React.ReactNode;
}

export function SelectionCaptureWrapper({
  drawerId,
  drawerTitle,
  entityUri,
  disabled = false,
  children,
}: SelectionCaptureWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isMouseDownRef = useRef(false);
  const lastMouseUpRef = useRef<{ x: number; y: number; timestamp: number } | null>(null);

  const { handleSelectionChange, handleCapture, showPopover, popoverPosition } =
    useDrawerSelectionCapture({
      drawerId,
      drawerTitle,
      entityUri,
      disabled,
      containerRef,
    });

  const handleNativeSelectionRef = useRef<() => void>(() => {});

  const handleMouseDown = useCallback(() => {
    isMouseDownRef.current = true;
  }, []);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    isMouseDownRef.current = false;
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    lastMouseUpRef.current = {
      x: e.clientX - containerRect.left,
      y: e.clientY - containerRect.top,
      timestamp: Date.now(),
    };
    handleNativeSelectionRef.current();
  }, []);

  useEffect(() => {
    if (disabled) return;
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mouseup', handleMouseUp);
    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mouseup', handleMouseUp);
    };
  }, [disabled, handleMouseDown, handleMouseUp]);

  const handleNativeSelection = useCallback(() => {
    if (disabled) return;

    if (isMouseDownRef.current) return;

    const selection = document.getSelection();
    if (!selection || selection.isCollapsed || !containerRef.current) {
      handleSelectionChange({
        hasSelection: false,
        selectedText: '',
      });
      return;
    }

    const range = selection.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) {
      handleSelectionChange({
        hasSelection: false,
        selectedText: '',
      });
      return;
    }

    const selectedText = selection.toString();
    if (!selectedText.trim()) {
      handleSelectionChange({
        hasSelection: false,
        selectedText: '',
      });
      return;
    }

    const mouseUp = lastMouseUpRef.current;
    const mouseUpIsRecent = mouseUp !== null && Date.now() - mouseUp.timestamp < 300;

    let viewportPosition: SelectionChangeEvent['viewportPosition'];
    if (mouseUpIsRecent && mouseUp) {
      viewportPosition = { x: mouseUp.x, y: mouseUp.y };
    } else {
      const rect = range.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      viewportPosition = {
        x: rect.right - containerRect.left,
        y: rect.bottom - containerRect.top,
        width: rect.width,
        height: rect.height,
      };
    }

    const metadata = extractNanoMetadata(selection, containerRef.current);
    handleSelectionChange({ hasSelection: true, selectedText, viewportPosition, metadata });
  }, [disabled, handleSelectionChange]);
  handleNativeSelectionRef.current = handleNativeSelection;

  useEffect(() => {
    if (disabled) return;

    document.addEventListener('selectionchange', handleNativeSelection);
    return () => {
      document.removeEventListener('selectionchange', handleNativeSelection);
    };
  }, [disabled, handleNativeSelection]);

  return (
    <div
      ref={containerRef}
      data-slot="selection-capture-wrapper"
      className="relative flex flex-col flex-1 min-h-0"
    >
      {children}
      {showPopover && (
        <SelectionPopover
          visible
          position={popoverPosition}
          onCapture={handleCapture}
          containerRef={containerRef}
        />
      )}
    </div>
  );
}

SelectionCaptureWrapper.displayName = 'SelectionCaptureWrapper';
