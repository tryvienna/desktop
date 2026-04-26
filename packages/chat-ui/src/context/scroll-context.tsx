/**
 * ScrollContext — State machine for chat scroll management
 *
 * @ai-context
 * - States: idle -> user_scrolling -> momentum -> idle; also auto_scrolling
 * - Auto-scroll enabled when user is at bottom; disabled on upward wheel
 * - Supports scroll state persistence + restoration across chat switches
 * - useScroll() throws outside provider; useScrollSafe() returns null
 *
 * @example
 * <ScrollProvider storage={storage} storageKey="session-1">
 *   <ChatMessageList />
 * </ScrollProvider>
 */

import { createContext, useContext, useCallback, useRef, useMemo, type ReactNode } from 'react';

import type {
  ChatScrollState,
  ScrollStateStorage,
  VisibleMessageInfo,
} from '../types/scroll-state';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ScrollState = 'idle' | 'user_scrolling' | 'auto_scrolling' | 'momentum';

export interface ScrollContextValue {
  /** Ref to attach to the scrollable container */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Current scroll state */
  state: ScrollState;
  /** Whether auto-scroll is enabled (user is at bottom) */
  isAutoScrollEnabled: boolean;
  /** Check if scrolled to exact bottom (≤1px tolerance) */
  isAtBottom: () => boolean;
  /** Check if scrolled near bottom (configurable threshold) */
  isNearBottom: (threshold?: number) => boolean;
  /** Scroll to bottom */
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  /** Scroll a specific message into view */
  scrollToMessage: (messageId: string) => void;
  /** Handle wheel event — only mechanism that disables auto-scroll */
  onWheelEvent: (deltaY: number) => void;
  /** Handle user scroll (call from onScroll) */
  onUserScroll: () => void;
  /** Handle scroll end (mouseup/touchend) */
  onUserScrollEnd: () => void;
  /** Notify of new content — triggers auto-scroll if enabled */
  onNewContent: () => void;
  /** Report visible messages for persistence */
  reportVisibleMessages: (messages: VisibleMessageInfo[]) => void;
  /** Get current state for persistence */
  getScrollState: () => ChatScrollState | null;
  /** Restore scroll state from storage */
  restoreScrollState: (state: ChatScrollState) => void;
  /** Enable auto-scroll programmatically */
  enableAutoScroll: () => void;
  /** Disable auto-scroll programmatically */
  disableAutoScroll: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const ScrollCtx = createContext<ScrollContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const SCROLL_END_DEBOUNCE = 150;
const BOTTOM_TOLERANCE = 1;
const NEAR_BOTTOM_THRESHOLD = 100;
const RESTORE_MAX_RETRIES = 10;

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export interface ScrollProviderProps {
  children: ReactNode;
  /** Storage adapter for scroll state persistence */
  storage?: ScrollStateStorage;
  /** Storage key (e.g., workstream/session ID) */
  storageKey?: string;
  /** Initial auto-scroll state */
  initialAutoScroll?: boolean;
}

export function ScrollProvider({
  children,
  storage: _storage,
  storageKey: _storageKey,
  initialAutoScroll = true,
}: ScrollProviderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<ScrollState>('idle');
  const autoScrollRef = useRef(initialAutoScroll);
  const scrollEndTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const visibleMessagesRef = useRef<VisibleMessageInfo[]>([]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const isAtBottom = useCallback((): boolean => {
    const el = containerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_TOLERANCE;
  }, []);

  const isNearBottom = useCallback((threshold = NEAR_BOTTOM_THRESHOLD): boolean => {
    const el = containerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
  }, []);

  // ── Scroll Actions ──────────────────────────────────────────────────────

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'instant') => {
    const el = containerRef.current;
    if (!el) return;

    stateRef.current = 'auto_scrolling';
    autoScrollRef.current = true;

    if (behavior === 'instant') {
      el.scrollTop = el.scrollHeight;
      stateRef.current = 'idle';
    } else {
      el.scrollTo({ top: el.scrollHeight, behavior });
      // Transition back to idle after smooth scroll completes
      setTimeout(() => {
        stateRef.current = 'idle';
      }, 300);
    }
  }, []);

  const scrollToMessage = useCallback((messageId: string) => {
    const el = containerRef.current;
    if (!el) return;

    const messageEl = el.querySelector(`[data-message-id="${messageId}"]`);
    if (messageEl) {
      messageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      autoScrollRef.current = false;
      return;
    }

    // Fallback: use MutationObserver to wait for the element
    let retries = 0;
    const observer = new MutationObserver(() => {
      const target = el.querySelector(`[data-message-id="${messageId}"]`);
      if (target) {
        observer.disconnect();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        autoScrollRef.current = false;
      } else if (++retries > RESTORE_MAX_RETRIES) {
        observer.disconnect();
      }
    });
    observer.observe(el, { childList: true, subtree: true });
  }, []);

  // ── Scroll Event Handlers ──────────────────────────────────────────────

  const onWheelEvent = useCallback((deltaY: number) => {
    // Only disable auto-scroll on upward scroll (negative deltaY)
    if (deltaY < 0) {
      autoScrollRef.current = false;
      stateRef.current = 'user_scrolling';
    }
  }, []);

  const onUserScroll = useCallback(() => {
    if (stateRef.current === 'auto_scrolling') return;

    stateRef.current = 'user_scrolling';

    // Debounced scroll-end detection
    if (scrollEndTimerRef.current) {
      clearTimeout(scrollEndTimerRef.current);
    }
    scrollEndTimerRef.current = setTimeout(() => {
      stateRef.current = 'momentum';
      // Re-enable auto-scroll if user stopped at bottom
      if (isAtBottom()) {
        autoScrollRef.current = true;
      }
      stateRef.current = 'idle';
    }, SCROLL_END_DEBOUNCE);
  }, [isAtBottom]);

  const onUserScrollEnd = useCallback(() => {
    if (scrollEndTimerRef.current) {
      clearTimeout(scrollEndTimerRef.current);
    }
    if (isAtBottom()) {
      autoScrollRef.current = true;
    }
    stateRef.current = 'idle';
  }, [isAtBottom]);

  const onNewContent = useCallback(() => {
    if (autoScrollRef.current) {
      scrollToBottom('instant');
    }
  }, [scrollToBottom]);

  // ── Persistence ────────────────────────────────────────────────────────

  const reportVisibleMessages = useCallback((messages: VisibleMessageInfo[]) => {
    visibleMessagesRef.current = messages;
  }, []);

  const getScrollState = useCallback((): ChatScrollState | null => {
    const first = visibleMessagesRef.current[0];
    if (!first) return null;

    return {
      firstVisibleMessageId: first.messageId,
      offsetWithinMessage: first.offsetFromViewportTop,
      isAutoScrollEnabled: autoScrollRef.current,
      savedAt: Date.now(),
    };
  }, []);

  const restoreScrollState = useCallback(
    (state: ChatScrollState) => {
      if (state.isAutoScrollEnabled) {
        scrollToBottom('instant');
        return;
      }

      const el = containerRef.current;
      if (!el) return;

      let retries = 0;
      const tryRestore = () => {
        const messageEl = el.querySelector(`[data-message-id="${state.firstVisibleMessageId}"]`);
        if (messageEl) {
          const rect = messageEl.getBoundingClientRect();
          const containerRect = el.getBoundingClientRect();
          el.scrollTop = el.scrollTop + (rect.top - containerRect.top) - state.offsetWithinMessage;
          autoScrollRef.current = false;
          return;
        }

        if (++retries < RESTORE_MAX_RETRIES) {
          requestAnimationFrame(tryRestore);
        }
      };

      requestAnimationFrame(tryRestore);
    },
    [scrollToBottom]
  );

  const enableAutoScroll = useCallback(() => {
    autoScrollRef.current = true;
  }, []);

  const disableAutoScroll = useCallback(() => {
    autoScrollRef.current = false;
  }, []);

  // ── Context Value ──────────────────────────────────────────────────────

  const value = useMemo(
    (): ScrollContextValue => ({
      containerRef,
      state: stateRef.current,
      isAutoScrollEnabled: autoScrollRef.current,
      isAtBottom,
      isNearBottom,
      scrollToBottom,
      scrollToMessage,
      onWheelEvent,
      onUserScroll,
      onUserScrollEnd,
      onNewContent,
      reportVisibleMessages,
      getScrollState,
      restoreScrollState,
      enableAutoScroll,
      disableAutoScroll,
    }),
    [
      isAtBottom,
      isNearBottom,
      scrollToBottom,
      scrollToMessage,
      onWheelEvent,
      onUserScroll,
      onUserScrollEnd,
      onNewContent,
      reportVisibleMessages,
      getScrollState,
      restoreScrollState,
      enableAutoScroll,
      disableAutoScroll,
    ]
  );

  return <ScrollCtx.Provider value={value}>{children}</ScrollCtx.Provider>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useScroll(): ScrollContextValue {
  const ctx = useContext(ScrollCtx);
  if (!ctx) {
    throw new Error('useScroll must be used within a ScrollProvider');
  }
  return ctx;
}

/** Safe version — returns null outside provider */
export function useScrollSafe(): ScrollContextValue | null {
  return useContext(ScrollCtx);
}
