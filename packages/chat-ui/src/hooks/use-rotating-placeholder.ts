/**
 * useRotatingPlaceholder — Cycles through educational hint texts with fade transitions
 *
 * @ai-context
 * - Rotates between base placeholder and hint strings on a timer
 * - Returns { placeholder, isTransitioning } for CSS fade control
 * - Pauses when document is hidden; resets on hasMessages change
 *
 * @example
 * const { placeholder, isTransitioning } = useRotatingPlaceholder({ hints: ['Tip 1', 'Tip 2'] });
 */

import { useEffect, useState, useRef } from 'react';

export interface UseRotatingPlaceholderOptions {
  hints?: string[];
  basePlaceholder?: string | ((hasMessages: boolean) => string);
  interval?: number;
  fadeDuration?: number;
  hasMessages?: boolean;
  enabled?: boolean;
}

export interface UseRotatingPlaceholderReturn {
  placeholder: string;
  isTransitioning: boolean;
}

const DEFAULT_HINTS = [
  'Type @ to mention entities',
  'Type / for commands',
  'Attach files with + button',
];

export function useRotatingPlaceholder(
  options: UseRotatingPlaceholderOptions = {}
): UseRotatingPlaceholderReturn {
  const {
    hints = DEFAULT_HINTS,
    basePlaceholder,
    interval = 5000,
    fadeDuration = 200,
    hasMessages = false,
    enabled = true,
  } = options;

  const baseText =
    basePlaceholder ?? ((hasMsg: boolean) => (hasMsg ? 'Reply...' : 'How can I help?'));
  const getBase = () => (typeof baseText === 'function' ? baseText(hasMessages) : baseText);

  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Reset on hasMessages change
  useEffect(() => {
    if (!enabled) return;
    setCurrentIndex(-1);
    setIsTransitioning(false);
  }, [hasMessages, enabled]);

  // Rotation logic — single setTimeout chain instead of setInterval + nested setTimeout
  useEffect(() => {
    if (!enabled || hints.length === 0) return;

    function scheduleNext() {
      timerRef.current = setTimeout(() => {
        if (document.hidden) {
          // Retry after a short delay when tab is hidden
          scheduleNext();
          return;
        }
        setIsTransitioning(true);
        timerRef.current = setTimeout(() => {
          setCurrentIndex((prev) => {
            if (prev === -1) return 0;
            if (prev >= hints.length - 1) return -1;
            return prev + 1;
          });
          setIsTransitioning(false);
          scheduleNext();
        }, fadeDuration);
      }, interval);
    }

    scheduleNext();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, hints, interval, fadeDuration]);

  if (!enabled) return { placeholder: getBase(), isTransitioning: false };

  const placeholder = currentIndex === -1 ? getBase() : (hints[currentIndex] ?? getBase());
  return { placeholder, isTransitioning };
}
