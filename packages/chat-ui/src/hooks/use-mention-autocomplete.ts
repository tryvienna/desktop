/**
 * useMentionAutocomplete — Detects @ mentions in ContentEditable with autocomplete
 *
 * @ai-context
 * - Monitors input for trigger character (default '@') to detect mention queries
 * - insertEntity() creates a styled, non-editable entity chip in the DOM
 * - Returns { trigger, isActive, insertEntity, cancel }
 *
 * @example
 * const { trigger, isActive, insertEntity } = useMentionAutocomplete({ elementRef });
 */

import { useState, useCallback, useEffect, useRef } from 'react';

import type { Trigger, Entity } from '../types/input';
import { buildEntityURI } from '../utils/entity-uri';
import {
  getEntityColors,
  getEntityIcon,
  ENTITY_CHIP_STYLES,
  ENTITY_CHIP_ICON_STYLES,
  ENTITY_CHIP_LABEL_STYLES,
} from '../utils/entity-styles';

export interface UseMentionAutocompleteOptions {
  /** ContentEditable element ref */
  elementRef: React.RefObject<HTMLDivElement | null>;
  /** Trigger character (default: '@') */
  triggerChar?: string;
  /** Callback when trigger is detected */
  onTrigger?: (trigger: Trigger | null) => void;
  /** Enable autocomplete */
  enabled?: boolean;
  /** Callback when an entity chip is clicked */
  onEntityClick?: (uri: string, entityType: string, entityId: string) => void;
}

export interface UseMentionAutocompleteReturn {
  /** Current active trigger (if any) */
  trigger: Trigger | null;
  /** Whether autocomplete is active */
  isActive: boolean;
  /** Insert entity at current trigger position */
  insertEntity: (entity: Entity) => void;
  /** Cancel autocomplete */
  cancel: () => void;
}

export function useMentionAutocomplete(
  options: UseMentionAutocompleteOptions
): UseMentionAutocompleteReturn {
  const { elementRef, triggerChar = '@', onTrigger, enabled = true, onEntityClick } = options;

  const [trigger, setTrigger] = useState<Trigger | null>(null);
  // Ref to the text node where the trigger was detected. Used by insertEntity
  // to splice the chip directly into the correct node, avoiding global offset
  // calculations that break with contentEditable=false entity chips present.
  const triggerNodeRef = useRef<Text | null>(null);

  const detectTrigger = useCallback(() => {
    if (!enabled || !elementRef.current) return null;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    if (!range.collapsed) return null;

    // Work directly with the caret's text node to avoid offset mismatches
    // caused by contentEditable=false entity chips. innerText, Range.toString(),
    // and textContent can disagree on how chip content is counted, breaking
    // global offset calculations on subsequent insertions.
    const caretNode = range.startContainer;
    const caretOffset = range.startOffset;

    if (caretNode.nodeType !== Node.TEXT_NODE) return null;

    const textInNode = caretNode.textContent || '';
    const textBeforeCaret = textInNode.slice(0, caretOffset);
    const triggerIndex = textBeforeCaret.lastIndexOf(triggerChar);
    if (triggerIndex === -1) return null;

    // Ensure trigger is at word boundary (start of node, or preceded by whitespace)
    if (triggerIndex > 0 && !/\s/.test(textBeforeCaret[triggerIndex - 1]!)) {
      return null;
    }

    const query = textBeforeCaret.slice(triggerIndex + 1);
    if (/\n/.test(query)) return null;

    triggerNodeRef.current = caretNode as Text;

    return {
      type: 'mention' as const,
      character: triggerChar,
      query,
      position: { start: triggerIndex, end: caretOffset },
    };
  }, [enabled, elementRef, triggerChar]);

  const updateTrigger = useCallback(() => {
    const detectedTrigger = detectTrigger();
    setTrigger(detectedTrigger);
    onTrigger?.(detectedTrigger);
  }, [detectTrigger, onTrigger]);

  const insertEntity = useCallback(
    (entity: Entity) => {
      if (!trigger || !elementRef.current) return;

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const label = entity.label || entity.id;
      const entityUri = entity.uri || buildEntityURI(entity.type, entity.id, label);
      const colors = getEntityColors(entity.type, entity.color);
      const icon = getEntityIcon(entity.type);

      const chip = document.createElement('span');
      chip.className = 'entity-chip-inline';
      chip.contentEditable = 'false';
      chip.setAttribute('data-entity-id', entity.id);
      chip.setAttribute('data-entity-type', entity.type);
      chip.setAttribute('data-entity-label', label);
      chip.setAttribute('data-entity-uri', entityUri);

      Object.assign(chip.style, ENTITY_CHIP_STYLES);
      chip.style.backgroundColor = colors.bg;
      chip.style.color = colors.text;
      chip.style.border = `1px solid ${colors.border}`;
      chip.style.cursor = onEntityClick ? 'pointer' : 'default';

      if (onEntityClick) {
        chip.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          onEntityClick(entityUri, entity.type, entity.id);
        });
      }

      const iconSpan = document.createElement('span');
      Object.assign(iconSpan.style, ENTITY_CHIP_ICON_STYLES);
      iconSpan.textContent = icon;

      const labelSpan = document.createElement('span');
      Object.assign(labelSpan.style, ENTITY_CHIP_LABEL_STYLES);
      labelSpan.textContent = label;

      chip.appendChild(iconSpan);
      chip.appendChild(labelSpan);

      const textNode = triggerNodeRef.current;
      const offset = trigger.position.start;

      if (textNode && textNode.nodeType === Node.TEXT_NODE && textNode.parentNode) {
        const textBefore = textNode.textContent?.slice(0, offset) || '';
        const textAfter = textNode.textContent?.slice(offset + trigger.query.length + 1) || '';
        const parent = textNode.parentNode;

        parent.insertBefore(document.createTextNode(textBefore), textNode);
        parent.insertBefore(chip, textNode);
        parent.insertBefore(document.createTextNode(' ' + textAfter), textNode);
        parent.removeChild(textNode);

        const newRange = document.createRange();
        newRange.setStartAfter(chip);
        newRange.setEndAfter(chip);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }

      triggerNodeRef.current = null;
      setTrigger(null);
      onTrigger?.(null);
      elementRef.current.dispatchEvent(new Event('input', { bubbles: true }));
    },
    [trigger, elementRef, onTrigger, onEntityClick]
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
    insertEntity,
    cancel,
  };
}
