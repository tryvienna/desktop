// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePersistedState } from './storage';

beforeEach(() => {
  localStorage.clear();
});

describe('usePersistedState', () => {
  it('returns the default value when localStorage is empty', () => {
    const { result } = renderHook(() => usePersistedState('sidebarWidth'));
    expect(result.current[0]).toBe(256);
  });

  it('reads a valid stored value from localStorage', () => {
    localStorage.setItem('vienna:sidebar:width', '200');
    const { result } = renderHook(() => usePersistedState('sidebarWidth'));
    expect(result.current[0]).toBe(200);
  });

  it('falls back to default when stored value fails schema validation', () => {
    localStorage.setItem('vienna:sidebar:width', '"-not-a-number"');
    const { result } = renderHook(() => usePersistedState('sidebarWidth'));
    expect(result.current[0]).toBe(256);
  });

  it('falls back to default when stored value is negative (fails positive() check)', () => {
    localStorage.setItem('vienna:sidebar:width', '-10');
    const { result } = renderHook(() => usePersistedState('sidebarWidth'));
    expect(result.current[0]).toBe(256);
  });

  it('falls back to default when stored value is not valid JSON', () => {
    localStorage.setItem('vienna:sidebar:width', '{broken');
    const { result } = renderHook(() => usePersistedState('sidebarWidth'));
    expect(result.current[0]).toBe(256);
  });

  it('persists updates to localStorage', () => {
    const { result } = renderHook(() => usePersistedState('sidebarWidth'));

    act(() => {
      result.current[1](300);
    });

    expect(result.current[0]).toBe(300);
    expect(localStorage.getItem('vienna:sidebar:width')).toBe('300');
  });

  it('works with a different registry key (panelWidth)', () => {
    const { result } = renderHook(() => usePersistedState('panelWidth'));
    expect(result.current[0]).toBe(400);

    act(() => {
      result.current[1](600);
    });

    expect(result.current[0]).toBe(600);
    expect(localStorage.getItem('vienna:panel:width')).toBe('600');
  });

  it('falls back to default when stored value is a float (fails int() check)', () => {
    localStorage.setItem('vienna:sidebar:width', '200.5');
    const { result } = renderHook(() => usePersistedState('sidebarWidth'));
    expect(result.current[0]).toBe(256);
  });

  describe('functional updater support', () => {
    it('accepts a function updater that receives the current value', () => {
      localStorage.setItem('vienna:sidebar:width', '200');
      const { result } = renderHook(() => usePersistedState('sidebarWidth'));

      act(() => {
        result.current[1]((prev) => prev + 100);
      });

      expect(result.current[0]).toBe(300);
      expect(localStorage.getItem('vienna:sidebar:width')).toBe('300');
    });

    it('persists the result of a functional update to localStorage', () => {
      const { result } = renderHook(() => usePersistedState('sidebarWidth'));

      act(() => {
        result.current[1]((prev) => prev * 2);
      });

      // default is 256, so 256 * 2 = 512
      expect(result.current[0]).toBe(512);
      expect(localStorage.getItem('vienna:sidebar:width')).toBe('512');
    });

    it('chains multiple functional updates correctly', () => {
      const { result } = renderHook(() => usePersistedState('sidebarWidth'));

      act(() => {
        result.current[1]((prev) => prev + 10); // 256 + 10 = 266
        result.current[1]((prev) => prev + 10); // 266 + 10 = 276
      });

      expect(result.current[0]).toBe(276);
      expect(localStorage.getItem('vienna:sidebar:width')).toBe('276');
    });
  });
});

describe('usePersistedState – sidebarExpansionState', () => {
  const STORAGE_KEY = 'vienna:sidebar:expansionState';

  it('returns the default expansion state when localStorage is empty', () => {
    const { result } = renderHook(() => usePersistedState('sidebarExpansionState'));
    expect(result.current[0]).toEqual({
      sections: [],
      items: [],
      collapsedSections: [],
    });
  });

  it('restores persisted expansion state from localStorage', () => {
    const stored = {
      sections: ['workstreams', 'directories'],
      items: ['folder-1', 'folder-2'],
      collapsedSections: ['routines'],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    const { result } = renderHook(() => usePersistedState('sidebarExpansionState'));
    expect(result.current[0]).toEqual(stored);
  });

  it('persists collapsedSections updates to localStorage', () => {
    const { result } = renderHook(() => usePersistedState('sidebarExpansionState'));

    const newState = {
      sections: [],
      items: [],
      collapsedSections: ['workstreams', 'routines'],
    };

    act(() => {
      result.current[1](newState);
    });

    expect(result.current[0]).toEqual(newState);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.collapsedSections).toEqual(['workstreams', 'routines']);
  });

  it('persists expanded items (folder tree state) to localStorage', () => {
    const { result } = renderHook(() => usePersistedState('sidebarExpansionState'));

    const stateWithItems = {
      sections: ['directories'],
      items: ['dir-src', 'dir-src/components'],
      collapsedSections: [],
    };

    act(() => {
      result.current[1](stateWithItems);
    });

    expect(result.current[0]).toEqual(stateWithItems);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(stateWithItems);
  });

  it('survives a round-trip: write → unmount → remount reads same state', () => {
    const saved = {
      sections: ['workstreams'],
      items: ['folder-a'],
      collapsedSections: ['directories', 'routines'],
    };

    // First mount: write state
    const { result, unmount } = renderHook(() => usePersistedState('sidebarExpansionState'));
    act(() => {
      result.current[1](saved);
    });
    unmount();

    // Second mount: should read back the same state
    const { result: result2 } = renderHook(() => usePersistedState('sidebarExpansionState'));
    expect(result2.current[0]).toEqual(saved);
  });

  it('supports functional updater for expansion state', () => {
    const initial = {
      sections: ['workstreams'],
      items: [],
      collapsedSections: ['routines'],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));

    const { result } = renderHook(() => usePersistedState('sidebarExpansionState'));

    // Simulate expanding a folder and un-collapsing a section (like reveal-file does)
    act(() => {
      result.current[1]((prev) => ({
        ...prev,
        items: [...prev.items, 'folder-new'],
        collapsedSections: (prev.collapsedSections ?? []).filter((id) => id !== 'routines'),
      }));
    });

    expect(result.current[0]).toEqual({
      sections: ['workstreams'],
      items: ['folder-new'],
      collapsedSections: [],
    });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(result.current[0]);
  });

  it('falls back to default when stored value has wrong shape', () => {
    // Missing required 'sections' field
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: ['a'] }));
    const { result } = renderHook(() => usePersistedState('sidebarExpansionState'));
    expect(result.current[0]).toEqual({
      sections: [],
      items: [],
      collapsedSections: [],
    });
  });

  it('falls back to default when stored value is not valid JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json{{{');
    const { result } = renderHook(() => usePersistedState('sidebarExpansionState'));
    expect(result.current[0]).toEqual({
      sections: [],
      items: [],
      collapsedSections: [],
    });
  });

  it('falls back to default when stored arrays contain non-strings', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      sections: [123, true],
      items: [],
      collapsedSections: [],
    }));
    const { result } = renderHook(() => usePersistedState('sidebarExpansionState'));
    expect(result.current[0]).toEqual({
      sections: [],
      items: [],
      collapsedSections: [],
    });
  });

  it('accepts state without collapsedSections (optional field)', () => {
    const stored = { sections: ['a'], items: ['b'] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    const { result } = renderHook(() => usePersistedState('sidebarExpansionState'));
    expect(result.current[0]).toEqual({ sections: ['a'], items: ['b'] });
  });
});
