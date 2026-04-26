/**
 * useMessageHistory — Shell-style sent message history with arrow key navigation
 *
 * @ai-context
 * - Stores up to maxHistorySize messages (default 50)
 * - navigatePrevious/navigateNext cycle through history
 * - Preserves draft text when entering history mode
 * - Supports seeding from external data via `initialHistory` (e.g. from database)
 * - Supports preemptive loading via `onNearEnd` callback when user navigates
 *   close to the oldest loaded message
 * - `appendOlderMessages` merges paginated results into the tail of the history
 *
 * @example
 * const { addToHistory, navigatePrevious, navigateNext } = useMessageHistory();
 *
 * @example — with database seeding and preemptive loading
 * const { addToHistory, navigatePrevious, navigateNext, appendOlderMessages } =
 *   useMessageHistory({
 *     initialHistory: ['newest msg', 'older msg'],
 *     onNearEnd: () => fetchMoreMessages(),
 *   });
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseMessageHistoryOptions {
  maxHistorySize?: number;
  onRestore?: (message: string) => void;
  getCurrentValue?: () => string;
  /**
   * Pre-loaded history from an external source (e.g. database), newest first.
   * Seeds the history array on mount and resets it when the reference changes
   * due to a context switch (e.g. workstream change).
   */
  initialHistory?: string[];
  /**
   * Called when the user navigates within `nearEndThreshold` items of the
   * oldest loaded message. Use this to trigger preemptive loading of older
   * messages so navigation feels seamless.
   */
  onNearEnd?: () => void;
  /**
   * How many items from the end of the loaded history triggers `onNearEnd`.
   * @default 3
   */
  nearEndThreshold?: number;
}

export interface UseMessageHistoryReturn {
  addToHistory: (message: string) => void;
  navigatePrevious: () => string | null;
  navigateNext: () => string | null;
  clearHistory: () => void;
  getCurrentIndex: () => number;
  isAtStart: boolean;
  isAtEnd: boolean;
  historySize: number;
  /**
   * Append older messages to the tail of the history (for pagination).
   * Messages should be in newest-first order relative to each other,
   * and all older than the current tail.
   */
  appendOlderMessages: (messages: string[]) => void;
}

export function useMessageHistory(options: UseMessageHistoryOptions = {}): UseMessageHistoryReturn {
  const {
    maxHistorySize = 50,
    onRestore,
    getCurrentValue,
    initialHistory,
    onNearEnd,
    nearEndThreshold = 3,
  } = options;

  const [history, setHistory] = useState<string[]>(initialHistory ?? []);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const draftRef = useRef('');
  const getCurrentValueRef = useRef(getCurrentValue);
  getCurrentValueRef.current = getCurrentValue;

  // Track whether onNearEnd has been called for the current loaded set
  // to avoid firing it repeatedly during the same navigation session.
  const nearEndFiredRef = useRef(false);

  const onNearEndRef = useRef(onNearEnd);
  onNearEndRef.current = onNearEnd;

  // Reset history when initialHistory changes (e.g. workstream switch).
  // We use a fingerprint (length + first + last item) to detect meaningful
  // changes rather than reacting to every reference change.
  const initialHistoryFingerprintRef = useRef('');
  useEffect(() => {
    const fingerprint = initialHistory
      ? `${initialHistory.length}:${initialHistory[0] ?? ''}:${initialHistory[initialHistory.length - 1] ?? ''}`
      : '';
    if (fingerprint !== initialHistoryFingerprintRef.current) {
      initialHistoryFingerprintRef.current = fingerprint;
      setHistory(initialHistory ?? []);
      setCurrentIndex(-1);
      draftRef.current = '';
      nearEndFiredRef.current = false;
    }
  }, [initialHistory]);

  const addToHistory = useCallback(
    (message: string) => {
      const trimmed = message.trim();
      if (!trimmed) return;
      setHistory((prev) => {
        if (prev[0] === trimmed) return prev;
        return [trimmed, ...prev].slice(0, maxHistorySize);
      });
      setCurrentIndex(-1);
      draftRef.current = '';
    },
    [maxHistorySize]
  );

  const navigatePrevious = useCallback(() => {
    if (history.length === 0) return null;
    setCurrentIndex((prev) => {
      if (prev === -1) draftRef.current = getCurrentValueRef.current?.() ?? '';
      if (prev >= history.length - 1) return prev;
      const next = prev + 1;
      onRestore?.(history[next]);

      // Fire onNearEnd when approaching the oldest loaded message
      if (
        !nearEndFiredRef.current &&
        onNearEndRef.current &&
        next >= history.length - 1 - nearEndThreshold
      ) {
        nearEndFiredRef.current = true;
        onNearEndRef.current();
      }

      return next;
    });
    const idx = currentIndex === -1 ? 0 : Math.min(currentIndex + 1, history.length - 1);
    return history[idx];
  }, [history, currentIndex, onRestore, nearEndThreshold]);

  const navigateNext = useCallback(() => {
    if (currentIndex === -1) return null;
    setCurrentIndex((prev) => {
      if (prev <= 0) {
        onRestore?.(draftRef.current);
        return -1;
      }
      const next = prev - 1;
      onRestore?.(history[next]);
      return next;
    });
    if (currentIndex <= 0) return draftRef.current;
    return history[currentIndex - 1];
  }, [history, currentIndex, onRestore]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
    draftRef.current = '';
    nearEndFiredRef.current = false;
  }, []);

  const appendOlderMessages = useCallback((messages: string[]) => {
    if (messages.length === 0) return;
    setHistory((prev) => [...prev, ...messages].slice(0, maxHistorySize));
    // Reset the near-end flag so it can fire again for the next page
    nearEndFiredRef.current = false;
  }, [maxHistorySize]);

  return {
    addToHistory,
    navigatePrevious,
    navigateNext,
    clearHistory,
    getCurrentIndex: useCallback(() => currentIndex, [currentIndex]),
    isAtStart: currentIndex >= history.length - 1,
    isAtEnd: currentIndex === -1,
    historySize: history.length,
    appendOlderMessages,
  };
}
