/**
 * DoubleEscapeStateMachine Unit Tests
 *
 * Tests the pure state machine logic for the double-escape interrupt pattern.
 * No DOM or React dependencies — fully testable in a node environment.
 *
 * Key scenarios:
 * - Single escape → pending → hint shown
 * - Double escape within window → fires interrupt
 * - Double escape outside window → second treated as first
 * - Hint auto-dismisses after timeout
 * - Reset clears all state
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DoubleEscapeStateMachine,
  HINT_DISPLAY_MS,
  type DoubleEscapeCallbacks,
} from '../use-double-escape-interrupt';

function createCallbacks(): DoubleEscapeCallbacks & {
  scheduledCallbacks: Array<{ callback: () => void; ms: number; cancelled: boolean }>;
  triggerScheduled: (index: number) => void;
} {
  const scheduled: Array<{ callback: () => void; ms: number; cancelled: boolean }> = [];

  return {
    onShowHint: vi.fn(),
    onHideHint: vi.fn(),
    onInterrupt: vi.fn(),
    schedule: (callback, ms) => {
      const entry = { callback, ms, cancelled: false };
      scheduled.push(entry);
      return () => {
        entry.cancelled = true;
      };
    },
    scheduledCallbacks: scheduled,
    /** Manually trigger a scheduled callback (simulates timer firing). */
    triggerScheduled: (index: number) => {
      const entry = scheduled[index];
      if (entry && !entry.cancelled) {
        entry.callback();
      }
    },
  };
}

describe('DoubleEscapeStateMachine', () => {
  let callbacks: ReturnType<typeof createCallbacks>;
  let machine: DoubleEscapeStateMachine;

  beforeEach(() => {
    callbacks = createCallbacks();
    machine = new DoubleEscapeStateMachine(callbacks);
  });

  it('starts in idle state', () => {
    expect(machine.state).toBe('idle');
  });

  it('first escape transitions to pending and shows hint', () => {
    const result = machine.pressEscape();

    expect(result).toBe('pending');
    expect(machine.state).toBe('pending');
    expect(callbacks.onShowHint).toHaveBeenCalledTimes(1);
    expect(callbacks.onInterrupt).not.toHaveBeenCalled();
  });

  it('first escape schedules a single hint/window timer', () => {
    machine.pressEscape();

    // Single unified timer: hint visibility = double-escape window
    expect(callbacks.scheduledCallbacks).toHaveLength(1);
    expect(callbacks.scheduledCallbacks[0]!.ms).toBe(HINT_DISPLAY_MS);
  });

  it('second escape within window fires interrupt', () => {
    machine.pressEscape(); // First
    const result = machine.pressEscape(); // Second (window still open)

    expect(result).toBe('fired');
    expect(machine.state).toBe('idle'); // Resets after firing
    expect(callbacks.onInterrupt).toHaveBeenCalledTimes(1);
    expect(callbacks.onHideHint).toHaveBeenCalled();
  });

  it('escape after hint expires is treated as new first escape', () => {
    machine.pressEscape(); // First

    // Simulate hint/window timeout firing
    callbacks.triggerScheduled(0); // Hint expired → state goes back to idle
    expect(machine.state).toBe('idle');
    expect(callbacks.onHideHint).toHaveBeenCalledTimes(1);

    // Next escape is a fresh first escape
    const result = machine.pressEscape();
    expect(result).toBe('pending');
    expect(machine.state).toBe('pending');
    expect(callbacks.onInterrupt).not.toHaveBeenCalled();
    expect(callbacks.onShowHint).toHaveBeenCalledTimes(2); // Called twice (once per first-escape)
  });

  it('double escape cancels timer', () => {
    machine.pressEscape();
    machine.pressEscape();

    expect(callbacks.scheduledCallbacks[0]!.cancelled).toBe(true);
  });

  it('reset clears state and hides hint', () => {
    machine.pressEscape();
    expect(machine.state).toBe('pending');

    machine.reset();

    expect(machine.state).toBe('idle');
    expect(callbacks.onHideHint).toHaveBeenCalled();
    expect(callbacks.scheduledCallbacks[0]!.cancelled).toBe(true);
  });

  it('reset from idle is a no-op (does not throw)', () => {
    expect(() => machine.reset()).not.toThrow();
    expect(machine.state).toBe('idle');
  });

  it('non-Escape keys do not affect state (handled by caller)', () => {
    // The state machine only exposes pressEscape() — key filtering
    // is the caller's responsibility. Verify the machine stays idle.
    expect(machine.state).toBe('idle');
  });

  it('multiple rapid escapes: third escape after fired starts new cycle', () => {
    machine.pressEscape(); // → pending
    machine.pressEscape(); // → fired → idle
    expect(callbacks.onInterrupt).toHaveBeenCalledTimes(1);

    // Third escape starts a new cycle
    const result = machine.pressEscape();
    expect(result).toBe('pending');
    expect(callbacks.onShowHint).toHaveBeenCalledTimes(2);
    expect(callbacks.onInterrupt).toHaveBeenCalledTimes(1); // Still 1
  });

  it('reset after interrupt allows re-entry', () => {
    machine.pressEscape();
    machine.pressEscape();
    expect(callbacks.onInterrupt).toHaveBeenCalledTimes(1);

    machine.reset();

    machine.pressEscape();
    machine.pressEscape();
    expect(callbacks.onInterrupt).toHaveBeenCalledTimes(2);
  });

  it('cancelled timer does not fire callback', () => {
    machine.pressEscape();
    machine.reset(); // Cancels timer

    // onHideHint was called by reset() — record count
    const hideHintCallCount = (callbacks.onHideHint as ReturnType<typeof vi.fn>).mock.calls.length;

    // Try to trigger cancelled timer — should be a no-op
    callbacks.triggerScheduled(0);
    expect((callbacks.onHideHint as ReturnType<typeof vi.fn>).mock.calls.length).toBe(hideHintCallCount);
  });
});
