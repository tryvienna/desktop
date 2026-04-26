// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { StandaloneDrawerNavigationProvider, useDrawerNavigation, useDrawerNavigationOptional } from './DrawerNavigationContext';

function wrapper({ children }: { children: ReactNode }) {
  return (
    <StandaloneDrawerNavigationProvider>{children}</StandaloneDrawerNavigationProvider>
  );
}

function wrapperWithStack(
  initialStack: Array<{ content: { contentId: string }; title: string }>
) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <StandaloneDrawerNavigationProvider initialStack={initialStack}>
        {children}
      </StandaloneDrawerNavigationProvider>
    );
  };
}

describe('StandaloneDrawerNavigationProvider', () => {
  describe('initial state', () => {
    it('starts with empty stack', () => {
      const { result } = renderHook(() => useDrawerNavigation(), { wrapper });
      expect(result.current.stack).toEqual([]);
      expect(result.current.current).toBeNull();
      expect(result.current.canGoBack).toBe(false);
    });

    it('accepts initial stack', () => {
      const initial = [{ content: { contentId: 'test' }, title: 'Test' }];
      const { result } = renderHook(() => useDrawerNavigation(), {
        wrapper: wrapperWithStack(initial),
      });
      expect(result.current.stack).toHaveLength(1);
      expect(result.current.current?.title).toBe('Test');
    });
  });

  describe('push', () => {
    it('adds item to stack', () => {
      const { result } = renderHook(() => useDrawerNavigation(), { wrapper });
      act(() => {
        result.current.push({ contentId: 'a' }, 'Page A');
      });
      expect(result.current.stack).toHaveLength(1);
      expect(result.current.current?.title).toBe('Page A');
    });

    it('enables canGoBack after second push', () => {
      const { result } = renderHook(() => useDrawerNavigation(), { wrapper });
      act(() => {
        result.current.push({ contentId: 'a' }, 'A');
        result.current.push({ contentId: 'b' }, 'B');
      });
      expect(result.current.canGoBack).toBe(true);
      expect(result.current.current?.title).toBe('B');
    });
  });

  describe('pop', () => {
    it('removes top item', () => {
      const initial = [
        { content: { contentId: 'a' }, title: 'A' },
        { content: { contentId: 'b' }, title: 'B' },
      ];
      const { result } = renderHook(() => useDrawerNavigation(), {
        wrapper: wrapperWithStack(initial),
      });
      act(() => {
        result.current.pop();
      });
      expect(result.current.stack).toHaveLength(1);
      expect(result.current.current?.title).toBe('A');
    });

    it('does not pop last item', () => {
      const initial = [{ content: { contentId: 'a' }, title: 'A' }];
      const { result } = renderHook(() => useDrawerNavigation(), {
        wrapper: wrapperWithStack(initial),
      });
      act(() => {
        result.current.pop();
      });
      expect(result.current.stack).toHaveLength(1);
    });
  });

  describe('replace', () => {
    it('replaces top item', () => {
      const initial = [{ content: { contentId: 'a' }, title: 'A' }];
      const { result } = renderHook(() => useDrawerNavigation(), {
        wrapper: wrapperWithStack(initial),
      });
      act(() => {
        result.current.replace({ contentId: 'b' }, 'B');
      });
      expect(result.current.stack).toHaveLength(1);
      expect(result.current.current?.title).toBe('B');
    });

    it('creates stack if empty', () => {
      const { result } = renderHook(() => useDrawerNavigation(), { wrapper });
      act(() => {
        result.current.replace({ contentId: 'a' }, 'A');
      });
      expect(result.current.stack).toHaveLength(1);
    });
  });

  describe('reset', () => {
    it('replaces entire stack', () => {
      const initial = [
        { content: { contentId: 'a' }, title: 'A' },
        { content: { contentId: 'b' }, title: 'B' },
      ];
      const { result } = renderHook(() => useDrawerNavigation(), {
        wrapper: wrapperWithStack(initial),
      });
      act(() => {
        result.current.reset({ contentId: 'c' }, 'C');
      });
      expect(result.current.stack).toHaveLength(1);
      expect(result.current.current?.title).toBe('C');
      expect(result.current.canGoBack).toBe(false);
    });
  });

  describe('refresh', () => {
    it('increments refreshKey', async () => {
      const { result } = renderHook(() => useDrawerNavigation(), { wrapper });
      const initial = result.current.refreshKey;
      await act(async () => {
        await result.current.refresh();
      });
      expect(result.current.refreshKey).toBe(initial + 1);
    });
  });

  describe('updateCurrentTitle', () => {
    it('updates the title of the top stack item', () => {
      const initial = [{ content: { contentId: 'a' }, title: 'Old Title' }];
      const { result } = renderHook(() => useDrawerNavigation(), {
        wrapper: wrapperWithStack(initial),
      });
      act(() => {
        result.current.updateCurrentTitle('New Title');
      });
      expect(result.current.current?.title).toBe('New Title');
    });

    it('does nothing on empty stack', () => {
      const { result } = renderHook(() => useDrawerNavigation(), { wrapper });
      act(() => {
        result.current.updateCurrentTitle('Whatever');
      });
      expect(result.current.stack).toHaveLength(0);
    });
  });
});

describe('useDrawerNavigation', () => {
  it('throws outside provider', () => {
    expect(() => {
      renderHook(() => useDrawerNavigation());
    }).toThrow('useDrawerNavigation must be used within a DrawerNavigationProvider');
  });
});

describe('useDrawerNavigationOptional', () => {
  it('returns null outside provider', () => {
    const { result } = renderHook(() => useDrawerNavigationOptional());
    expect(result.current).toBeNull();
  });
});
