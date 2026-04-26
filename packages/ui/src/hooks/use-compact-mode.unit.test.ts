import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCompactMode } from './use-compact-mode';

function createMatchMedia(matches: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  const mql = {
    matches,
    media: '',
    onchange: null,
    addEventListener: vi.fn((event: string, cb: (e: MediaQueryListEvent) => void) => {
      if (event === 'change') listeners.push(cb);
    }),
    removeEventListener: vi.fn((event: string, cb: (e: MediaQueryListEvent) => void) => {
      if (event === 'change') {
        const idx = listeners.indexOf(cb);
        if (idx !== -1) listeners.splice(idx, 1);
      }
    }),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    _fire(newMatches: boolean) {
      mql.matches = newMatches;
      for (const cb of listeners) {
        cb({ matches: newMatches } as MediaQueryListEvent);
      }
    },
  };
  return mql;
}

describe('useCompactMode', () => {
  let mql: ReturnType<typeof createMatchMedia>;

  beforeEach(() => {
    mql = createMatchMedia(false);
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => mql)
    );
  });

  it('returns false when window is wider than breakpoint', () => {
    mql = createMatchMedia(false);
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => mql)
    );

    const { result } = renderHook(() => useCompactMode());
    expect(result.current).toBe(false);
  });

  it('returns true when window is narrower than breakpoint', () => {
    mql = createMatchMedia(true);
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => mql)
    );

    const { result } = renderHook(() => useCompactMode());
    expect(result.current).toBe(true);
  });

  it('uses default breakpoint of 768', () => {
    renderHook(() => useCompactMode());
    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 767px)');
  });

  it('accepts a custom breakpoint', () => {
    renderHook(() => useCompactMode(1024));
    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 1023px)');
  });

  it('responds to media query changes', () => {
    mql = createMatchMedia(false);
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => mql)
    );

    const { result } = renderHook(() => useCompactMode());
    expect(result.current).toBe(false);

    act(() => {
      mql._fire(true);
    });
    expect(result.current).toBe(true);

    act(() => {
      mql._fire(false);
    });
    expect(result.current).toBe(false);
  });

  it('cleans up listener on unmount', () => {
    mql = createMatchMedia(false);
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => mql)
    );

    const { unmount } = renderHook(() => useCompactMode());
    unmount();

    expect(mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
