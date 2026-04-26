/**
 * DetachableContext — Manages detachable card state.
 *
 * Simple model:
 * - Inline: DetachableCard renders children normally
 * - Detached: FloatingCardLayer renders content in a portal
 * - Fullscreen: FloatingCardLayer renders content fullscreen
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RegisteredCard {
  id: string;
  content: ReactNode;
  title?: string;
  size: { width: number; height: number };
}

export interface DetachedState {
  position: { x: number; y: number };
}

export interface PlaybackState {
  currentTime: number;
  playing: boolean;
}

export interface DetachableContextValue {
  registeredCards: Map<string, RegisteredCard>;
  detachedStates: Map<string, DetachedState>;
  fullscreenCardId: string | null;

  /** Playback state per card — ref-based, no re-renders. */
  playbackStates: Map<string, PlaybackState>;

  register: (card: RegisteredCard) => void;
  unregister: (id: string) => void;
  detach: (id: string) => void;
  reattach: (id: string) => void;
  dismiss: (id: string) => void;
  updatePosition: (id: string, pos: { x: number; y: number }) => void;
  enterFullscreen: (id: string) => void;
  exitFullscreen: () => void;
  isDetached: (id: string) => boolean;
  isFullscreen: (id: string) => boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const BASE_BOTTOM = 24;
const BASE_RIGHT = 24;
const STACK_GAP = 12;

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const DetachableCtx = createContext<DetachableContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function DetachableCardProvider({ children }: { children: ReactNode }) {
  const [registeredCards, setRegisteredCards] = useState<Map<string, RegisteredCard>>(new Map());
  const [detachedStates, setDetachedStates] = useState<Map<string, DetachedState>>(new Map());
  const [fullscreenCardId, setFullscreenCardId] = useState<string | null>(null);
  const [preFullscreenState, setPreFullscreenState] = useState<'inline' | 'detached'>('inline');
  const playbackStatesRef = useRef(new Map<string, PlaybackState>());

  const register = useCallback((card: RegisteredCard) => {
    setRegisteredCards((prev) => {
      if (prev.has(card.id)) return prev;
      const next = new Map(prev);
      next.set(card.id, card);
      return next;
    });
  }, []);

  const unregister = useCallback((id: string) => {
    setRegisteredCards((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    setDetachedStates((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    setFullscreenCardId((prev) => (prev === id ? null : prev));
  }, []);

  const detach = useCallback((id: string) => {
    setDetachedStates((prev) => {
      if (prev.has(id)) return prev;
      const next = new Map(prev);
      let yOffset = 0;
      for (const [,] of prev) {
        yOffset += 180 + STACK_GAP;
      }
      next.set(id, { position: { x: BASE_RIGHT, y: BASE_BOTTOM + yOffset } });
      return next;
    });
  }, []);

  const reattach = useCallback((id: string) => {
    setFullscreenCardId((prev) => (prev === id ? null : prev));
    setDetachedStates((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    setFullscreenCardId((prev) => (prev === id ? null : prev));
    setDetachedStates((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    setRegisteredCards((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const updatePosition = useCallback((id: string, pos: { x: number; y: number }) => {
    setDetachedStates((prev) => {
      const existing = prev.get(id);
      if (!existing) return prev;
      const next = new Map(prev);
      next.set(id, { ...existing, position: pos });
      return next;
    });
  }, []);

  const enterFullscreen = useCallback((id: string) => {
    setDetachedStates((prev) => {
      setPreFullscreenState(prev.has(id) ? 'detached' : 'inline');
      return prev;
    });
    setFullscreenCardId(id);
  }, []);

  const exitFullscreen = useCallback(() => {
    setFullscreenCardId((prev) => {
      if (!prev) return null;
      if (preFullscreenState === 'inline') {
        setDetachedStates((ds) => {
          if (!ds.has(prev)) return ds;
          const next = new Map(ds);
          next.delete(prev);
          return next;
        });
      }
      return null;
    });
  }, [preFullscreenState]);

  const isDetached = useCallback(
    (id: string) => detachedStates.has(id),
    [detachedStates],
  );

  const isFullscreen = useCallback(
    (id: string) => fullscreenCardId === id,
    [fullscreenCardId],
  );

  const value = useMemo(
    (): DetachableContextValue => ({
      registeredCards,
      detachedStates,
      fullscreenCardId,
      playbackStates: playbackStatesRef.current,
      register,
      unregister,
      detach,
      reattach,
      dismiss,
      updatePosition,
      enterFullscreen,
      exitFullscreen,
      isDetached,
      isFullscreen,
    }),
    [registeredCards, detachedStates, fullscreenCardId, register, unregister, detach, reattach, dismiss, updatePosition, enterFullscreen, exitFullscreen, isDetached, isFullscreen],
  );

  return <DetachableCtx.Provider value={value}>{children}</DetachableCtx.Provider>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

export function useDetachable(): DetachableContextValue {
  const ctx = useContext(DetachableCtx);
  if (!ctx) throw new Error('useDetachable must be used within a DetachableCardProvider');
  return ctx;
}

export function useDetachableSafe(): DetachableContextValue | null {
  return useContext(DetachableCtx);
}
