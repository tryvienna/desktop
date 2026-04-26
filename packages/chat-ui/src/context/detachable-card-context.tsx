/**
 * DetachableCardContext — Manages floating picture-in-picture entity cards
 *
 * @ai-context
 * - Cards float when source message scrolls out of view
 * - Supports dismiss (persisted to localStorage) and reattach
 * - Stack position calculated from bottom-right corner
 * - useDetachableCards() throws; useDetachableCardsSafe() returns null
 *
 * @example
 * <DetachableCardProvider storageKey="ws-123">
 *   <Chat />
 * </DetachableCardProvider>
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';

import type { ParsedEntityURI } from '../utils/entity-uri';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DetachedCard {
  id: string;
  entity: ParsedEntityURI;
  position: { x: number; y: number };
  floatingContent?: ReactNode;
}

export interface DetachableCardContextValue {
  /** Currently floating cards */
  detachedCards: DetachedCard[];
  /** Float a card */
  detach: (card: Omit<DetachedCard, 'position'>, manual?: boolean) => void;
  /** Remove float and optionally scroll back into view */
  reattach: (cardId: string) => void;
  /** Close float permanently */
  dismiss: (cardId: string) => void;
  /** Update floating position */
  updatePosition: (cardId: string, position: { x: number; y: number }) => void;
  /** Check if a card is currently detached */
  isDetached: (cardId: string) => boolean;
  /** Check if a card has been dismissed */
  isDismissed: (cardId: string) => boolean;
  /** Clear all dismissed state */
  clearDismissed: () => void;
  /** Callback for reattach scroll (set by message list) */
  onReattachScroll?: (cardId: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const BASE_BOTTOM_OFFSET = 24;
const BASE_RIGHT_OFFSET = 24;
const CARD_STACK_GAP = 16;
const CARD_HEIGHT = 72;

// ─────────────────────────────────────────────────────────────────────────────
// Persistence Helpers
// ─────────────────────────────────────────────────────────────────────────────

function loadDismissedIds(storageKey: string): Set<string> {
  try {
    const raw = localStorage.getItem(`detachable-dismissed-${storageKey}`);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveDismissedIds(storageKey: string, ids: Set<string>): void {
  try {
    localStorage.setItem(`detachable-dismissed-${storageKey}`, JSON.stringify([...ids]));
  } catch {
    // localStorage unavailable
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const DetachableCardCtx = createContext<DetachableCardContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export interface DetachableCardProviderProps {
  children: ReactNode;
  /** Storage key for dismissed state persistence */
  storageKey?: string;
  /** Callback when a card requests scroll-back-into-view */
  onReattachScroll?: (cardId: string) => void;
}

export function DetachableCardProvider({
  children,
  storageKey,
  onReattachScroll,
}: DetachableCardProviderProps) {
  const [detachedCards, setDetachedCards] = useState<DetachedCard[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() =>
    storageKey ? loadDismissedIds(storageKey) : new Set()
  );

  // Persist dismissed IDs
  useEffect(() => {
    if (storageKey) {
      saveDismissedIds(storageKey, dismissedIds);
    }
  }, [storageKey, dismissedIds]);

  const calculatePosition = useCallback(
    (stackIndex: number) => ({
      x: window.innerWidth - BASE_RIGHT_OFFSET,
      y: BASE_BOTTOM_OFFSET + stackIndex * (CARD_HEIGHT + CARD_STACK_GAP),
    }),
    []
  );

  const detach = useCallback(
    (card: Omit<DetachedCard, 'position'>, manual = false) => {
      // Don't re-float dismissed cards unless manually triggered
      if (!manual && dismissedIds.has(card.id)) return;

      setDetachedCards((prev) => {
        if (prev.some((c) => c.id === card.id)) return prev;
        const position = calculatePosition(prev.length);
        return [...prev, { ...card, position }];
      });
    },
    [dismissedIds, calculatePosition]
  );

  const reattach = useCallback(
    (cardId: string) => {
      setDetachedCards((prev) => prev.filter((c) => c.id !== cardId));
      // Un-dismiss so it can float again
      setDismissedIds((prev) => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
      onReattachScroll?.(cardId);
    },
    [onReattachScroll]
  );

  const dismiss = useCallback((cardId: string) => {
    setDetachedCards((prev) => prev.filter((c) => c.id !== cardId));
    setDismissedIds((prev) => new Set(prev).add(cardId));
  }, []);

  const updatePosition = useCallback((cardId: string, position: { x: number; y: number }) => {
    setDetachedCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, position } : c)));
  }, []);

  const isDetached = useCallback(
    (cardId: string) => detachedCards.some((c) => c.id === cardId),
    [detachedCards]
  );

  const isDismissed = useCallback((cardId: string) => dismissedIds.has(cardId), [dismissedIds]);

  const clearDismissed = useCallback(() => {
    setDismissedIds(new Set());
  }, []);

  const value = useMemo(
    (): DetachableCardContextValue => ({
      detachedCards,
      detach,
      reattach,
      dismiss,
      updatePosition,
      isDetached,
      isDismissed,
      clearDismissed,
      onReattachScroll,
    }),
    [
      detachedCards,
      detach,
      reattach,
      dismiss,
      updatePosition,
      isDetached,
      isDismissed,
      clearDismissed,
      onReattachScroll,
    ]
  );

  return <DetachableCardCtx.Provider value={value}>{children}</DetachableCardCtx.Provider>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

export function useDetachableCards(): DetachableCardContextValue {
  const ctx = useContext(DetachableCardCtx);
  if (!ctx) {
    throw new Error('useDetachableCards must be used within a DetachableCardProvider');
  }
  return ctx;
}

/** Safe version — returns null outside provider */
export function useDetachableCardsSafe(): DetachableCardContextValue | null {
  return useContext(DetachableCardCtx);
}
