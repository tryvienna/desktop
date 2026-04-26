/**
 * useFocusTrap — Keyboard focus cycling within a container element.
 *
 * @ai-context
 * - Traps Tab/Shift+Tab within the container (cycles between first and last focusable)
 * - autoFocus: focuses first focusable element on mount (default: true)
 * - restoreFocus: restores focus to previously active element on unmount (default: true)
 * - onEscape: callback when Escape is pressed
 * - Focusable selectors: a[href], buttons, textareas, inputs, selects, [tabindex >= 0]
 * - Filters out hidden/disabled elements
 * - Returns a ref to attach to the container div
 */

import { useRef, useEffect, useCallback } from 'react';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export interface UseFocusTrapOptions {
  active: boolean;
  autoFocus?: boolean;
  restoreFocus?: boolean;
  onEscape?: () => void;
}

export function useFocusTrap({
  active,
  autoFocus = true,
  restoreFocus = true,
  onEscape,
}: UseFocusTrapOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
    ).filter(
      (el) => !el.hidden && el.offsetParent !== null && el.tabIndex >= 0
    );
  }, []);

  // Auto-focus and save previous focus
  useEffect(() => {
    if (!active) return;

    previousFocusRef.current = document.activeElement;

    if (autoFocus) {
      requestAnimationFrame(() => {
        const elements = getFocusableElements();
        if (elements.length > 0) {
          elements[0]!.focus();
        }
      });
    }

    return () => {
      if (restoreFocus && previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, [active, autoFocus, restoreFocus, getFocusableElements]);

  // Keyboard handler
  useEffect(() => {
    if (!active) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && onEscape) {
        onEscape();
        return;
      }

      if (e.key !== 'Tab') return;

      const elements = getFocusableElements();
      if (elements.length === 0) return;

      const first = elements[0]!;
      const last = elements[elements.length - 1]!;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    const container = containerRef.current;
    container?.addEventListener('keydown', handleKeyDown);
    return () => container?.removeEventListener('keydown', handleKeyDown);
  }, [active, onEscape, getFocusableElements]);

  return containerRef;
}
