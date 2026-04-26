/**
 * useCommandTrigger — Detects /commands in ContentEditable with autocomplete
 *
 * @ai-context
 * - Monitors input for '/' trigger character to detect slash command queries
 * - executeCommand() replaces the trigger text with optional replacement
 * - Returns { trigger, isActive, executeCommand, cancel }
 *
 * @example
 * const { trigger, isActive, executeCommand } = useCommandTrigger({ elementRef });
 */

import { useState, useCallback, useEffect } from 'react';

import type { Trigger } from '../types/input';
import { getCaretCharacterOffsetWithin, findNodeAtOffset } from '../utils/content-editable-dom';

export interface UseCommandTriggerOptions {
  /** ContentEditable element ref */
  elementRef: React.RefObject<HTMLDivElement | null>;
  /** Trigger character (default: '/') */
  triggerChar?: string;
  /** Callback when trigger is detected */
  onTrigger?: (trigger: Trigger | null) => void;
  /** Enable command detection */
  enabled?: boolean;
}

export interface UseCommandTriggerReturn {
  /** Current active trigger (if any) */
  trigger: Trigger | null;
  /** Whether command autocomplete is active */
  isActive: boolean;
  /** Execute command (replace trigger text with result) */
  executeCommand: (replacementText?: string) => void;
  /** Cancel command autocomplete */
  cancel: () => void;
}

export function useCommandTrigger(options: UseCommandTriggerOptions): UseCommandTriggerReturn {
  const { elementRef, triggerChar = '/', onTrigger, enabled = true } = options;

  const [trigger, setTrigger] = useState<Trigger | null>(null);

  const detectTrigger = useCallback(() => {
    if (!enabled || !elementRef.current) return null;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    if (!range.collapsed) return null;

    const textContent = elementRef.current.innerText || '';
    const cursorOffset = getCaretCharacterOffsetWithin(elementRef.current);
    if (cursorOffset === null) return null;

    const textBeforeCursor = textContent.slice(0, cursorOffset);
    const lastTriggerIndex = textBeforeCursor.lastIndexOf(triggerChar);
    if (lastTriggerIndex === -1) return null;

    if (lastTriggerIndex > 0) {
      const charBeforeTrigger = textBeforeCursor[lastTriggerIndex - 1];
      if (charBeforeTrigger && !/[\s\n]/.test(charBeforeTrigger)) return null;
    }

    const query = textBeforeCursor.slice(lastTriggerIndex + 1);
    if (/[\s\n]/.test(query)) return null;

    return {
      type: 'command' as const,
      character: triggerChar,
      query,
      position: { start: lastTriggerIndex, end: cursorOffset },
    };
  }, [enabled, elementRef, triggerChar]);

  const updateTrigger = useCallback(() => {
    const detectedTrigger = detectTrigger();
    setTrigger(detectedTrigger);
    onTrigger?.(detectedTrigger);
  }, [detectTrigger, onTrigger]);

  const executeCommand = useCallback(
    (replacementText = '') => {
      if (!trigger || !elementRef.current) return;

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const { node, offset } = findNodeAtOffset(elementRef.current, trigger.position.start);

      if (node && node.nodeType === Node.TEXT_NODE) {
        const textNode = node as Text;
        const textBefore = textNode.textContent?.slice(0, offset) || '';
        const textAfter = textNode.textContent?.slice(offset + trigger.query.length + 1) || '';

        textNode.textContent = textBefore + replacementText + textAfter;

        const range = selection.getRangeAt(0);
        range.setStart(textNode, textBefore.length + replacementText.length);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      setTrigger(null);
      onTrigger?.(null);
      elementRef.current.dispatchEvent(new Event('input', { bubbles: true }));
    },
    [trigger, elementRef, onTrigger]
  );

  const cancel = useCallback(() => {
    setTrigger(null);
    onTrigger?.(null);
  }, [onTrigger]);

  useEffect(() => {
    if (!enabled || !elementRef.current) return;

    const element = elementRef.current;

    const handleInput = () => {
      setTimeout(updateTrigger, 0);
    };

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || !element.contains(selection.anchorNode)) return;
      setTimeout(updateTrigger, 0);
    };

    element.addEventListener('input', handleInput);
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      element.removeEventListener('input', handleInput);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [enabled, elementRef, updateTrigger]);

  return {
    trigger,
    isActive: trigger !== null,
    executeCommand,
    cancel,
  };
}
