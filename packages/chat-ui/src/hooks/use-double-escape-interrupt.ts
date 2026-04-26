/**
 * useDoubleEscapeInterrupt — Double-escape keyboard pattern for agent interruption
 *
 * Implements a safe two-step interrupt flow:
 * 1. First Escape → shows a "Press Esc again" hint
 * 2. Second Escape within HINT_DISPLAY_MS → triggers the interrupt callback
 *
 * Safety guards:
 * - Only active when `enabled` is true (typically when agent is busy)
 * - `disabled` prop suppresses activation (e.g., when sidebar/drawer is open)
 * - Hint auto-dismisses after HINT_DISPLAY_MS if second Escape not pressed
 *
 * The core state machine (DoubleEscapeStateMachine) is extracted as a pure,
 * testable class with no DOM or React dependencies.
 *
 * @module chat-ui/hooks/use-double-escape-interrupt
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * How long (ms) the "Press Esc again" hint stays visible.
 * The double-escape window is the same duration — the hint is the window.
 * This avoids a confusing gap where the hint is visible but the window has expired.
 */
export const HINT_DISPLAY_MS = 1500;

// ─────────────────────────────────────────────────────────────────────────────
// State Machine (pure, testable — no DOM or React dependencies)
// ─────────────────────────────────────────────────────────────────────────────

export type DoubleEscapeState = 'idle' | 'pending' | 'fired';

export interface DoubleEscapeCallbacks {
  onShowHint: () => void;
  onHideHint: () => void;
  onInterrupt: () => void;
  /** Schedule a callback after `ms`. Returns a cancel function. */
  schedule: (callback: () => void, ms: number) => () => void;
}

/**
 * Pure state machine for the double-escape interrupt pattern.
 * All side effects are delegated to the callbacks interface.
 */
export class DoubleEscapeStateMachine {
  state: DoubleEscapeState = 'idle';
  private cancelHint: (() => void) | null = null;

  constructor(private callbacks: DoubleEscapeCallbacks) {}

  /** Process an Escape key press. Returns the new state. */
  pressEscape(): DoubleEscapeState {
    if (this.state === 'pending') {
      // Second escape within window → fire interrupt
      this.cleanup();
      this.state = 'fired';
      this.callbacks.onHideHint();
      this.callbacks.onInterrupt();
      // Reset to idle after firing
      this.state = 'idle';
      return 'fired';
    }

    // First escape → enter pending state
    this.state = 'pending';
    this.callbacks.onShowHint();

    // Schedule hint auto-dismiss (also acts as the window expiry).
    // A single timer avoids the gap where the hint says "Press Esc again"
    // but the double-escape window has already closed.
    this.cancelHint = this.callbacks.schedule(() => {
      this.state = 'idle';
      this.callbacks.onHideHint();
    }, HINT_DISPLAY_MS);

    return 'pending';
  }

  /** Reset to idle and cancel all timers. */
  reset(): void {
    this.cleanup();
    this.state = 'idle';
    this.callbacks.onHideHint();
  }

  private cleanup(): void {
    this.cancelHint?.();
    this.cancelHint = null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// React Hook
// ─────────────────────────────────────────────────────────────────────────────

export interface UseDoubleEscapeInterruptOptions {
  /** Whether the interrupt pattern is active (true when agent is busy). */
  enabled: boolean;
  /** Additional flag to suppress activation (e.g., sidebar open). */
  disabled?: boolean;
  /** Callback fired on confirmed double-escape. */
  onInterrupt: () => void;
}

export interface UseDoubleEscapeInterruptReturn {
  /** True when hint should be shown (first Escape pressed, waiting for second). */
  showHint: boolean;
}

export function useDoubleEscapeInterrupt(
  options: UseDoubleEscapeInterruptOptions,
): UseDoubleEscapeInterruptReturn {
  const { enabled, disabled = false, onInterrupt } = options;
  const [showHint, setShowHint] = useState(false);
  const onInterruptRef = useRef(onInterrupt);
  onInterruptRef.current = onInterrupt;

  const machine = useMemo(() => {
    return new DoubleEscapeStateMachine({
      onShowHint: () => setShowHint(true),
      onHideHint: () => setShowHint(false),
      onInterrupt: () => onInterruptRef.current(),
      schedule: (callback, ms) => {
        const id = setTimeout(callback, ms);
        return () => clearTimeout(id);
      },
    });
  }, []); // Stable across renders — callbacks use refs

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Only stop propagation on the confirming (second) press so the
      // first Escape can still reach other handlers (close modals, etc.).
      const result = machine.pressEscape();
      if (result === 'fired') {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    [machine],
  );

  useEffect(() => {
    if (!enabled || disabled) {
      machine.reset();
      return;
    }

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
      machine.reset();
    };
  }, [enabled, disabled, handleKeyDown, machine]);

  return { showHint };
}
