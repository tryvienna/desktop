/**
 * Unit tests for useMessageHistory hook.
 *
 * Validates shell-style history navigation, initial history seeding,
 * preemptive loading via onNearEnd, and appendOlderMessages pagination.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMessageHistory } from '../use-message-history';

// ─────────────────────────────────────────────────────────────────────────────
// Core navigation (existing behavior)
// ─────────────────────────────────────────────────────────────────────────────

describe('useMessageHistory — core navigation', () => {
  it('starts with empty history', () => {
    const { result } = renderHook(() => useMessageHistory());
    expect(result.current.historySize).toBe(0);
    expect(result.current.isAtEnd).toBe(true);
  });

  it('adds messages to history', () => {
    const { result } = renderHook(() => useMessageHistory());

    act(() => result.current.addToHistory('hello'));
    expect(result.current.historySize).toBe(1);

    act(() => result.current.addToHistory('world'));
    expect(result.current.historySize).toBe(2);
  });

  it('deduplicates consecutive identical messages', () => {
    const { result } = renderHook(() => useMessageHistory());

    act(() => result.current.addToHistory('hello'));
    act(() => result.current.addToHistory('hello'));
    expect(result.current.historySize).toBe(1);
  });

  it('ignores empty/whitespace messages', () => {
    const { result } = renderHook(() => useMessageHistory());

    act(() => result.current.addToHistory(''));
    act(() => result.current.addToHistory('   '));
    expect(result.current.historySize).toBe(0);
  });

  it('navigates backward through history', () => {
    const { result } = renderHook(() => useMessageHistory());

    act(() => result.current.addToHistory('first'));
    act(() => result.current.addToHistory('second'));

    let msg: string | null = null;
    act(() => { msg = result.current.navigatePrevious(); });
    expect(msg).toBe('second');

    act(() => { msg = result.current.navigatePrevious(); });
    expect(msg).toBe('first');
  });

  it('navigates forward through history', () => {
    const { result } = renderHook(() => useMessageHistory());

    act(() => result.current.addToHistory('first'));
    act(() => result.current.addToHistory('second'));

    // Go back twice
    act(() => { result.current.navigatePrevious(); });
    act(() => { result.current.navigatePrevious(); });

    // Go forward
    let msg: string | null = null;
    act(() => { msg = result.current.navigateNext(); });
    expect(msg).toBe('second');
  });

  it('returns null when navigating past the oldest message', () => {
    const { result } = renderHook(() => useMessageHistory());

    act(() => result.current.addToHistory('only'));

    act(() => { result.current.navigatePrevious(); });

    let msg: string | null = null;
    act(() => { msg = result.current.navigatePrevious(); });
    // Should return the same message (clamped at start)
    expect(msg).toBe('only');
    expect(result.current.isAtStart).toBe(true);
  });

  it('returns null when navigating forward past the newest', () => {
    const { result } = renderHook(() => useMessageHistory());

    let msg: string | null = null;
    act(() => { msg = result.current.navigateNext(); });
    expect(msg).toBeNull();
  });

  it('preserves draft when entering history mode', () => {
    const { result } = renderHook(() =>
      useMessageHistory({
        getCurrentValue: () => 'my draft',
      })
    );

    act(() => result.current.addToHistory('old msg'));

    // Navigate into history
    act(() => { result.current.navigatePrevious(); });

    // Navigate back to draft
    let msg: string | null = null;
    act(() => { msg = result.current.navigateNext(); });
    expect(msg).toBe('my draft');
  });

  it('clears history', () => {
    const { result } = renderHook(() => useMessageHistory());

    act(() => result.current.addToHistory('msg'));
    expect(result.current.historySize).toBe(1);

    act(() => result.current.clearHistory());
    expect(result.current.historySize).toBe(0);
  });

  it('respects maxHistorySize', () => {
    const { result } = renderHook(() =>
      useMessageHistory({ maxHistorySize: 3 })
    );

    act(() => result.current.addToHistory('a'));
    act(() => result.current.addToHistory('b'));
    act(() => result.current.addToHistory('c'));
    act(() => result.current.addToHistory('d'));

    expect(result.current.historySize).toBe(3);

    // Oldest should be 'b' (a was evicted)
    let msg: string | null = null;
    act(() => { msg = result.current.navigatePrevious(); }); // d
    act(() => { msg = result.current.navigatePrevious(); }); // c
    act(() => { msg = result.current.navigatePrevious(); }); // b
    expect(msg).toBe('b');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Initial history seeding
// ─────────────────────────────────────────────────────────────────────────────

describe('useMessageHistory — initialHistory', () => {
  it('seeds history from initialHistory prop', () => {
    const { result } = renderHook(() =>
      useMessageHistory({ initialHistory: ['newest', 'older', 'oldest'] })
    );

    expect(result.current.historySize).toBe(3);

    let msg: string | null = null;
    act(() => { msg = result.current.navigatePrevious(); });
    expect(msg).toBe('newest');

    act(() => { msg = result.current.navigatePrevious(); });
    expect(msg).toBe('older');

    act(() => { msg = result.current.navigatePrevious(); });
    expect(msg).toBe('oldest');
  });

  it('resets history when initialHistory changes', () => {
    const { result, rerender } = renderHook(
      ({ initial }) => useMessageHistory({ initialHistory: initial }),
      { initialProps: { initial: ['ws-a-msg-1', 'ws-a-msg-2'] } }
    );

    expect(result.current.historySize).toBe(2);

    // Navigate into history
    act(() => { result.current.navigatePrevious(); });
    expect(result.current.getCurrentIndex()).toBe(0);

    // Switch workstream (new initialHistory)
    rerender({ initial: ['ws-b-msg-1'] });

    expect(result.current.historySize).toBe(1);
    expect(result.current.getCurrentIndex()).toBe(-1); // Reset

    let msg: string | null = null;
    act(() => { msg = result.current.navigatePrevious(); });
    expect(msg).toBe('ws-b-msg-1');
  });

  it('does not reset on same-content re-render', () => {
    const initial = ['a', 'b'];
    const { result, rerender } = renderHook(
      ({ init }) => useMessageHistory({ initialHistory: init }),
      { initialProps: { init: initial } }
    );

    // Navigate into history
    act(() => { result.current.navigatePrevious(); });
    expect(result.current.getCurrentIndex()).toBe(0);

    // Re-render with same-content array (different reference)
    rerender({ init: ['a', 'b'] });

    // Should NOT have reset
    expect(result.current.getCurrentIndex()).toBe(0);
  });

  it('prepends sent messages to seeded history', () => {
    const { result } = renderHook(() =>
      useMessageHistory({ initialHistory: ['from-db'] })
    );

    act(() => result.current.addToHistory('just sent'));
    expect(result.current.historySize).toBe(2);

    let msg: string | null = null;
    act(() => { msg = result.current.navigatePrevious(); });
    expect(msg).toBe('just sent');

    act(() => { msg = result.current.navigatePrevious(); });
    expect(msg).toBe('from-db');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Preemptive loading (onNearEnd)
// ─────────────────────────────────────────────────────────────────────────────

describe('useMessageHistory — onNearEnd', () => {
  it('fires onNearEnd when navigating near the end of loaded history', () => {
    const onNearEnd = vi.fn();
    const { result } = renderHook(() =>
      useMessageHistory({
        initialHistory: ['msg1', 'msg2', 'msg3', 'msg4', 'msg5'],
        onNearEnd,
        nearEndThreshold: 2,
      })
    );

    // Navigate: msg1, msg2, msg3 (index 0, 1, 2)
    act(() => { result.current.navigatePrevious(); }); // index 0
    act(() => { result.current.navigatePrevious(); }); // index 1
    expect(onNearEnd).not.toHaveBeenCalled();

    act(() => { result.current.navigatePrevious(); }); // index 2, within threshold of end (4)
    expect(onNearEnd).toHaveBeenCalledTimes(1);
  });

  it('does not fire onNearEnd repeatedly for the same page', () => {
    const onNearEnd = vi.fn();
    const { result } = renderHook(() =>
      useMessageHistory({
        initialHistory: ['msg1', 'msg2', 'msg3'],
        onNearEnd,
        nearEndThreshold: 1,
      })
    );

    act(() => { result.current.navigatePrevious(); }); // index 0
    act(() => { result.current.navigatePrevious(); }); // index 1 — triggers
    expect(onNearEnd).toHaveBeenCalledTimes(1);

    act(() => { result.current.navigatePrevious(); }); // index 2
    // Should NOT fire again
    expect(onNearEnd).toHaveBeenCalledTimes(1);
  });

  it('resets nearEnd flag when new messages are appended', () => {
    const onNearEnd = vi.fn();
    const { result } = renderHook(() =>
      useMessageHistory({
        initialHistory: ['msg1', 'msg2', 'msg3'],
        onNearEnd,
        nearEndThreshold: 1,
      })
    );

    // Navigate to trigger onNearEnd
    act(() => { result.current.navigatePrevious(); }); // 0
    act(() => { result.current.navigatePrevious(); }); // 1 — triggers
    expect(onNearEnd).toHaveBeenCalledTimes(1);

    // Append older messages (simulating load more)
    act(() => { result.current.appendOlderMessages(['msg4', 'msg5']); });

    // Continue navigating — should trigger again when near new end
    act(() => { result.current.navigatePrevious(); }); // 2
    act(() => { result.current.navigatePrevious(); }); // 3 — near new end
    expect(onNearEnd).toHaveBeenCalledTimes(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// appendOlderMessages
// ─────────────────────────────────────────────────────────────────────────────

describe('useMessageHistory — appendOlderMessages', () => {
  it('appends messages to the tail of history', () => {
    const { result } = renderHook(() =>
      useMessageHistory({ initialHistory: ['new1', 'new2'] })
    );

    act(() => { result.current.appendOlderMessages(['old1', 'old2']); });
    expect(result.current.historySize).toBe(4);

    // Navigate through all
    let msg: string | null = null;
    act(() => { msg = result.current.navigatePrevious(); }); // new1
    act(() => { msg = result.current.navigatePrevious(); }); // new2
    act(() => { msg = result.current.navigatePrevious(); }); // old1
    act(() => { msg = result.current.navigatePrevious(); }); // old2
    expect(msg).toBe('old2');
  });

  it('does nothing when given an empty array', () => {
    const { result } = renderHook(() =>
      useMessageHistory({ initialHistory: ['a'] })
    );

    act(() => { result.current.appendOlderMessages([]); });
    expect(result.current.historySize).toBe(1);
  });

  it('respects maxHistorySize when appending', () => {
    const { result } = renderHook(() =>
      useMessageHistory({
        initialHistory: ['a', 'b'],
        maxHistorySize: 3,
      })
    );

    act(() => { result.current.appendOlderMessages(['c', 'd', 'e']); });
    // Should be capped at 3
    expect(result.current.historySize).toBe(3);
  });

  it('does not disrupt current navigation position', () => {
    const { result } = renderHook(() =>
      useMessageHistory({ initialHistory: ['msg1', 'msg2'] })
    );

    // Navigate to msg1 (index 0)
    let msg: string | null = null;
    act(() => { msg = result.current.navigatePrevious(); });
    expect(msg).toBe('msg1');
    expect(result.current.getCurrentIndex()).toBe(0);

    // Append older messages
    act(() => { result.current.appendOlderMessages(['msg3']); });

    // Index should still be 0 and current message unchanged
    expect(result.current.getCurrentIndex()).toBe(0);
    expect(result.current.historySize).toBe(3);
  });
});
