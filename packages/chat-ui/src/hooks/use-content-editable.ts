/**
 * useContentEditable — Manages ContentEditable state with entity chips and paste blobs
 *
 * @ai-context
 * - Core input hook: handles text extraction, DOM manipulation, paste handling
 * - Large pastes (>500 chars or >10 lines) become inline paste chips
 * - Entity chips are non-editable inline spans with data-entity-* attributes
 * - Returns ref, value, handlers (handleInput, handleKeyDown, handlePaste), and pasteMapRef
 *
 * @example
 * const { ref, handleInput, handleKeyDown, handlePaste } = useContentEditable({ onSubmit });
 */

import { useRef, useCallback, useEffect, useState } from 'react';

import type { InputValue } from '../types/input';
import type { PasteBlob } from '../utils/paste-markup';
import { extractTextWithEntities } from '../utils/content-editable-dom';
import {
  PASTE_CHAR_THRESHOLD,
  PASTE_LINE_THRESHOLD,
  PASTE_PREVIEW_LENGTH,
  setSessionPasteContent,
  getSessionPasteContent,
} from '../utils/paste-markup';

// ─────────────────────────────────────────────────────────────────────────────
// Options & Return Types
// ─────────────────────────────────────────────────────────────────────────────

export interface UseContentEditableOptions {
  /** Callback when content changes */
  onChange?: (value: InputValue) => void;
  /** Callback when Enter is pressed (without Shift) */
  onSubmit?: (value: InputValue) => void;
  /** Callback when Escape is pressed */
  onEscape?: () => void;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Called with File objects when clipboard contains files/images on paste */
  onFilePaste?: (files: File[]) => void;
  /** Called when a paste chip in the contentEditable is clicked */
  onPasteChipClick?: (pasteId: string) => void;
}

export interface UseContentEditableReturn {
  /** Ref to attach to the contentEditable div */
  ref: React.RefObject<HTMLDivElement | null>;
  /** Current input value */
  value: InputValue;
  /** Whether the input is empty */
  isEmpty: boolean;
  /** Character count (excludes paste chip placeholders) */
  characterCount: number;
  /** Clear the input */
  clear: () => void;
  /** Clear the input via execCommand so it's undoable with CMD+Z */
  softClear: () => void;
  /** Set the input value programmatically */
  setValue: (value: string | InputValue) => void;
  /** Focus the input */
  focus: () => void;
  /** Get current plain text with entity/paste markup */
  getPlainText: () => string;
  /** Insert text at cursor position */
  insertText: (text: string) => void;
  /** Handle input event — attach to onInput */
  handleInput: (e: React.FormEvent<HTMLDivElement>) => void;
  /** Handle keydown event — attach to onKeyDown */
  handleKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  /** Handle paste event — attach to onPaste */
  handlePaste: (e: React.ClipboardEvent<HTMLDivElement>) => void;
  /** Map of pasteId -> full text content (for serialization at submit time) */
  pasteMapRef: React.MutableRefObject<Map<string, string>>;
  /** True while a paste event is being processed (suppresses palette triggers) */
  isPastingRef: React.MutableRefObject<boolean>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Paste Chip Styles
// ─────────────────────────────────────────────────────────────────────────────

const PASTE_CHIP_STYLES: Partial<CSSStyleDeclaration> = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '0.88em',
  fontFamily: 'inherit',
  verticalAlign: 'baseline',
  margin: '0 2px',
  userSelect: 'none',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  backgroundColor: 'oklch(75.4% 0.12 83.6 / 0.12)',
  color: 'var(--text-brand, oklch(75.4% 0.12 83.6))',
  border: '1px solid oklch(75.4% 0.12 83.6 / 0.3)',
  lineHeight: '1.4',
};

const PASTE_CHIP_UNAVAILABLE_STYLES: Partial<CSSStyleDeclaration> = {
  ...PASTE_CHIP_STYLES,
  backgroundColor: 'rgba(156, 163, 175, 0.12)',
  color: 'rgb(156, 163, 175)',
  border: '1px solid rgba(156, 163, 175, 0.3)',
  cursor: 'default',
};

// ─────────────────────────────────────────────────────────────────────────────
// DOM Chip Builders
// ─────────────────────────────────────────────────────────────────────────────

function buildPasteChipElement(blob: PasteBlob): HTMLElement {
  const chip = document.createElement('span');
  chip.className = 'paste-chip-inline';
  chip.contentEditable = 'false';
  chip.setAttribute('data-paste-id', blob.id);
  chip.setAttribute('data-paste-preview', blob.preview);
  chip.setAttribute('data-paste-chars', String(blob.charCount));
  chip.setAttribute('data-paste-lines', String(blob.lineCount));
  Object.assign(chip.style, PASTE_CHIP_STYLES);

  const iconSpan = document.createElement('span');
  iconSpan.textContent = '\uD83D\uDCCB';
  iconSpan.style.fontSize = '0.85em';
  iconSpan.style.lineHeight = '1';
  iconSpan.style.flexShrink = '0';

  const truncatedPreview =
    blob.preview.length > 40 ? blob.preview.slice(0, 40) + '\u2026' : blob.preview;
  const previewSpan = document.createElement('span');
  previewSpan.className = 'paste-chip-preview';
  previewSpan.textContent = truncatedPreview;
  previewSpan.style.maxWidth = '180px';
  previewSpan.style.overflow = 'hidden';
  previewSpan.style.textOverflow = 'ellipsis';
  previewSpan.style.whiteSpace = 'nowrap';

  const statsSpan = document.createElement('span');
  statsSpan.className = 'paste-chip-stats';
  statsSpan.textContent = `${blob.charCount.toLocaleString()} chars \u00B7 ${blob.lineCount} lines`;
  statsSpan.style.opacity = '0.65';
  statsSpan.style.fontSize = '0.85em';
  statsSpan.style.flexShrink = '0';

  chip.appendChild(iconSpan);
  chip.appendChild(previewSpan);
  chip.appendChild(statsSpan);

  return chip;
}

function buildUnavailablePasteChipElement(): HTMLElement {
  const chip = document.createElement('span');
  chip.className = 'paste-chip-inline paste-chip-unavailable';
  chip.contentEditable = 'false';
  Object.assign(chip.style, PASTE_CHIP_UNAVAILABLE_STYLES);

  const iconSpan = document.createElement('span');
  iconSpan.textContent = '\uD83D\uDCCB';
  iconSpan.style.fontSize = '0.85em';
  iconSpan.style.lineHeight = '1';
  iconSpan.style.flexShrink = '0';

  const labelSpan = document.createElement('span');
  labelSpan.textContent = 'Paste unavailable \u2014 please re-paste';
  labelSpan.style.fontStyle = 'italic';

  chip.appendChild(iconSpan);
  chip.appendChild(labelSpan);

  return chip;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useContentEditable(
  options: UseContentEditableOptions = {}
): UseContentEditableReturn {
  const {
    onChange,
    onSubmit,
    onEscape,
    disabled = false,
    autoFocus = false,
    onFilePaste,
    onPasteChipClick,
  } = options;

  const ref = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState<InputValue>({
    plainText: '',
    entities: [],
    attachments: [],
    html: '',
  });
  const [isEmpty, setIsEmpty] = useState(true);
  const [characterCount, setCharacterCount] = useState(0);

  const pasteMapRef = useRef<Map<string, string>>(new Map());
  const isPastingRef = useRef(false);

  const onPasteChipClickRef = useRef(onPasteChipClick);
  useEffect(() => {
    onPasteChipClickRef.current = onPasteChipClick;
  }, [onPasteChipClick]);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus();
    }
  }, [autoFocus]);

  // Delegated click handler for paste chips (works with both DOM-appended and execCommand-inserted chips)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleChipClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const chip = target.closest('.paste-chip-inline:not(.paste-chip-unavailable)');
      if (chip) {
        e.preventDefault();
        e.stopPropagation();
        const pasteId = chip.getAttribute('data-paste-id');
        if (pasteId) {
          onPasteChipClickRef.current?.(pasteId);
        }
      }
    };

    el.addEventListener('click', handleChipClick);
    return () => el.removeEventListener('click', handleChipClick);
  }, []);

  const getPlainText = useCallback((): string => {
    if (!ref.current) return '';
    return extractTextWithEntities(ref.current);
  }, []);

  const updateValue = useCallback(() => {
    if (!ref.current) return;

    const plainText = getPlainText();
    const newValue: InputValue = {
      plainText,
      entities: [],
      attachments: value.attachments,
      html: ref.current.innerHTML,
    };

    setValue(newValue);
    setIsEmpty(plainText.trim().length === 0);
    const countableText = plainText.replace(/\[paste:\/\/[^\]]+\]/g, '');
    setCharacterCount(countableText.length);
    onChange?.(newValue);
  }, [getPlainText, onChange, value.attachments]);

  const clear = useCallback(() => {
    if (!ref.current) return;

    ref.current.innerHTML = '';
    pasteMapRef.current.clear();
    const emptyValue: InputValue = {
      plainText: '',
      entities: [],
      attachments: [],
      html: '',
    };
    setValue(emptyValue);
    setIsEmpty(true);
    setCharacterCount(0);
    onChange?.(emptyValue);
  }, [onChange]);

  // Undo-friendly clear: selects all content and deletes via execCommand so the
  // browser's undo stack tracks it. CMD+Z / CMD+Shift+Z can restore the content.
  // Use this for ESC-to-clear; use `clear` for submit and other permanent clears.
  const softClear = useCallback(() => {
    if (!ref.current) return;
    if (ref.current.innerHTML === '') return;

    ref.current.focus();
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(ref.current);
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand('delete', false);
    }
    // No explicit updateValue() needed — execCommand('delete') fires a native input
    // event which React catches via onInput → handleInput → updateValue().
  }, []);

  const setValueProgrammatically = useCallback(
    (newValue: string | InputValue) => {
      if (!ref.current) return;

      const plainText = typeof newValue === 'string' ? newValue : newValue.plainText;

      const LIGHTWEIGHT_PASTE_RE = /\[paste:\/\/([a-zA-Z0-9_-]+)\]/g;
      LIGHTWEIGHT_PASTE_RE.lastIndex = 0;

      if (LIGHTWEIGHT_PASTE_RE.test(plainText)) {
        ref.current.innerHTML = '';
        LIGHTWEIGHT_PASTE_RE.lastIndex = 0;

        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = LIGHTWEIGHT_PASTE_RE.exec(plainText)) !== null) {
          if (match.index > lastIndex) {
            ref.current.appendChild(
              document.createTextNode(plainText.slice(lastIndex, match.index))
            );
          }

          const pasteId = match[1];
          const sessionContent = getSessionPasteContent(pasteId);

          if (sessionContent !== undefined) {
            pasteMapRef.current.set(pasteId, sessionContent);
            const preview = sessionContent
              .trimStart()
              .slice(0, PASTE_PREVIEW_LENGTH)
              .replace(/\n/g, ' ');
            const blob: PasteBlob = {
              id: pasteId,
              text: sessionContent,
              charCount: sessionContent.length,
              lineCount: sessionContent.split('\n').length,
              preview,
            };
            ref.current.appendChild(buildPasteChipElement(blob));
          } else {
            ref.current.appendChild(buildUnavailablePasteChipElement());
          }

          ref.current.appendChild(document.createTextNode(' '));
          lastIndex = match.index + match[0].length;
        }

        if (lastIndex < plainText.length) {
          ref.current.appendChild(document.createTextNode(plainText.slice(lastIndex)));
        }
      } else {
        if (typeof newValue === 'string') {
          ref.current.innerText = newValue;
        } else {
          ref.current.innerText = newValue.plainText;
        }
      }

      const selection = window.getSelection();
      if (selection && ref.current.lastChild) {
        const range = document.createRange();
        range.selectNodeContents(ref.current);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      updateValue();
    },
    [updateValue]
  );

  const focus = useCallback(() => {
    ref.current?.focus();
  }, []);

  const insertText = useCallback(
    (text: string) => {
      if (!ref.current) return;

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        ref.current.innerText += text;
      } else {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      updateValue();
    },
    [updateValue]
  );

  const handleInput = useCallback(
    (_e: React.FormEvent<HTMLDivElement>) => {
      updateValue();
    },
    [updateValue]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) {
        e.preventDefault();
        return;
      }

      // Delete entity/paste chips on Backspace when cursor is right after one.
      // The browser's default contentEditable behavior can strand the cursor
      // between chips or empty text nodes, making further deletion impossible.
      if (e.key === 'Backspace') {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && sel.isCollapsed) {
          const range = sel.getRangeAt(0);
          const node = range.startContainer;
          const offset = range.startOffset;

          // Cursor at start of a text node — check if previous sibling is a chip
          if (node.nodeType === Node.TEXT_NODE && offset === 0) {
            const prev = node.previousSibling;
            if (prev && prev instanceof HTMLElement && prev.contentEditable === 'false') {
              e.preventDefault();
              prev.remove();
              updateValue();
              return;
            }
          }

          // Cursor in element node (e.g. the contentEditable div itself)
          // pointing right after a chip child
          if (node.nodeType === Node.ELEMENT_NODE && offset > 0) {
            const child = node.childNodes[offset - 1];
            if (child && child instanceof HTMLElement && child.contentEditable === 'false') {
              e.preventDefault();
              child.remove();
              updateValue();
              return;
            }
          }
        }
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!isEmpty) {
          onSubmit?.(value);
          clear();
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onEscape?.();
      }
    },
    [disabled, isEmpty, value, onSubmit, onEscape, clear, updateValue]
  );

  const insertPlainText = useCallback(
    (text: string) => {
      // Use execCommand so the insertion is tracked by the browser's native undo stack.
      // Direct DOM manipulation (range.insertNode) bypasses undo, causing CMD+Z to skip pastes.
      document.execCommand('insertText', false, text);
      updateValue();
    },
    [updateValue]
  );

  const insertPasteChip = useCallback(
    (blob: PasteBlob) => {
      pasteMapRef.current.set(blob.id, blob.text);
      setSessionPasteContent(blob.id, blob.text);

      // Build chip element to get its HTML, then insert via execCommand so it's
      // tracked by the browser's native undo stack (CMD+Z will remove the chip).
      const chip = buildPasteChipElement(blob);
      document.execCommand('insertHTML', false, chip.outerHTML + ' ');

      updateValue();
    },
    [updateValue]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault();

      isPastingRef.current = true;
      requestAnimationFrame(() => {
        isPastingRef.current = false;
      });

      const clipboardFiles: File[] = [];
      if (e.clipboardData.items) {
        for (const item of Array.from(e.clipboardData.items)) {
          if (item.kind === 'file') {
            const file = item.getAsFile();
            if (file) clipboardFiles.push(file);
          }
        }
      }

      if (clipboardFiles.length > 0) {
        onFilePaste?.(clipboardFiles);
        const text = e.clipboardData.getData('text/plain');
        if (text) {
          insertPlainText(text);
        }
        return;
      }

      const text = e.clipboardData.getData('text/plain');
      if (!text) return;

      const lineCount = (text.match(/\n/g) || []).length + 1;
      if (text.length >= PASTE_CHAR_THRESHOLD || lineCount >= PASTE_LINE_THRESHOLD) {
        const id = crypto.randomUUID();
        const preview = text.trimStart().slice(0, PASTE_PREVIEW_LENGTH).replace(/\n/g, ' ');
        insertPasteChip({ id, text, charCount: text.length, lineCount, preview });
        return;
      }

      insertPlainText(text);
    },
    [insertPlainText, insertPasteChip, onFilePaste]
  );

  return {
    ref,
    value,
    isEmpty,
    characterCount,
    clear,
    softClear,
    setValue: setValueProgrammatically,
    focus,
    getPlainText,
    insertText,
    handleInput,
    handleKeyDown,
    handlePaste,
    pasteMapRef,
    isPastingRef,
  };
}
