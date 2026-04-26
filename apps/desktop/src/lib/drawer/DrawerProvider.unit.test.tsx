// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { DrawerProvider } from './DrawerProvider';
import { useDrawerState, useDrawerStateOptional } from './DrawerStateContext';
import { useDrawerActions, useDrawerActionsOptional } from './DrawerActionsContext';

function wrapper({ children }: { children: ReactNode }) {
  return <DrawerProvider>{children}</DrawerProvider>;
}

function wrapperWith(props: Partial<React.ComponentProps<typeof DrawerProvider>>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <DrawerProvider {...props}>{children}</DrawerProvider>;
  };
}

describe('DrawerProvider', () => {
  describe('initial state', () => {
    it('starts closed with default width', () => {
      const { result } = renderHook(() => useDrawerState(), { wrapper });
      expect(result.current.state.mode).toEqual({ type: 'closed' });
      expect(result.current.state.width).toBe(400);
      expect(result.current.isOpen).toBe(false);
      expect(result.current.isTabbed).toBe(false);
      expect(result.current.isFull).toBe(false);
      expect(result.current.activeTab).toBeNull();
    });

    it('accepts partial initial state', () => {
      const { result } = renderHook(() => useDrawerState(), {
        wrapper: wrapperWith({ initialState: { width: 600 } }),
      });
      expect(result.current.state.width).toBe(600);
    });
  });

  describe('useDrawerState', () => {
    it('throws outside DrawerProvider', () => {
      expect(() => {
        renderHook(() => useDrawerState());
      }).toThrow('useDrawerState must be used within a DrawerProvider');
    });
  });

  describe('useDrawerStateOptional', () => {
    it('returns null outside DrawerProvider', () => {
      const { result } = renderHook(() => useDrawerStateOptional());
      expect(result.current).toBeNull();
    });
  });

  describe('useDrawerActions', () => {
    it('throws outside DrawerProvider', () => {
      expect(() => {
        renderHook(() => useDrawerActions());
      }).toThrow('useDrawerActions must be used within a DrawerProvider');
    });
  });

  describe('useDrawerActionsOptional', () => {
    it('returns null outside DrawerProvider', () => {
      const { result } = renderHook(() => useDrawerActionsOptional());
      expect(result.current).toBeNull();
    });
  });

  describe('drawer actions', () => {
    it('openFull sets full mode', () => {
      const { result } = renderHook(
        () => ({ state: useDrawerState(), actions: useDrawerActions() }),
        { wrapper }
      );
      act(() => {
        result.current.actions.openFull({ contentId: 'test' });
      });
      expect(result.current.state.isFull).toBe(true);
      expect(result.current.state.isOpen).toBe(true);
      expect(result.current.state.state.mode).toEqual({
        type: 'full',
        content: { contentId: 'test' },
      });
    });

    it('openTabbed sets tabbed mode', () => {
      const { result } = renderHook(
        () => ({ state: useDrawerState(), actions: useDrawerActions() }),
        { wrapper }
      );
      act(() => {
        result.current.actions.openTabbed();
      });
      expect(result.current.state.isTabbed).toBe(true);
    });

    it('close from full mode returns to tabbed if tabs exist', () => {
      const { result } = renderHook(
        () => ({ state: useDrawerState(), actions: useDrawerActions() }),
        { wrapper }
      );
      // Open a tab first, then go full
      act(() => {
        result.current.actions.openTab({
          label: 'Tab 1',
          initialContent: { contentId: 'c1' },
        });
      });
      act(() => {
        result.current.actions.openFull({ contentId: 'settings' });
      });
      expect(result.current.state.isFull).toBe(true);
      act(() => {
        result.current.actions.close();
      });
      expect(result.current.state.isTabbed).toBe(true);
    });

    it('close from full mode with no tabs closes entirely', () => {
      const { result } = renderHook(
        () => ({ state: useDrawerState(), actions: useDrawerActions() }),
        { wrapper }
      );
      act(() => {
        result.current.actions.openFull({ contentId: 'test' });
      });
      act(() => {
        result.current.actions.close();
      });
      expect(result.current.state.isOpen).toBe(false);
    });

    it('setWidth updates width', () => {
      const { result } = renderHook(
        () => ({ state: useDrawerState(), actions: useDrawerActions() }),
        { wrapper }
      );
      act(() => {
        result.current.actions.setWidth(500);
      });
      expect(result.current.state.state.width).toBe(500);
    });

    it('openTab adds a tab and activates it', () => {
      const { result } = renderHook(
        () => ({ state: useDrawerState(), actions: useDrawerActions() }),
        { wrapper }
      );
      act(() => {
        result.current.actions.openTab({
          id: 'tab-1',
          label: 'Tab 1',
          initialContent: { contentId: 'content-1' },
        });
      });
      expect(result.current.state.state.tabs).toHaveLength(1);
      expect(result.current.state.activeTab?.id).toBe('tab-1');
      expect(result.current.state.isTabbed).toBe(true);
    });

    it('closeTab removes a tab', () => {
      const { result } = renderHook(
        () => ({ state: useDrawerState(), actions: useDrawerActions() }),
        { wrapper }
      );
      act(() => {
        result.current.actions.openTab({ id: 'a', label: 'A' });
        result.current.actions.openTab({ id: 'b', label: 'B' });
      });
      act(() => {
        result.current.actions.closeTab('b');
      });
      expect(result.current.state.state.tabs).toHaveLength(1);
    });
  });

  describe('onStateChange callback', () => {
    it('fires when state changes', () => {
      const onStateChange = vi.fn();
      const { result } = renderHook(
        () => ({ state: useDrawerState(), actions: useDrawerActions() }),
        { wrapper: wrapperWith({ onStateChange }) }
      );
      act(() => {
        result.current.actions.openFull({ contentId: 'test' });
      });
      expect(onStateChange).toHaveBeenCalled();
      const lastCall = onStateChange.mock.calls[onStateChange.mock.calls.length - 1]![0];
      expect(lastCall.mode.type).toBe('full');
    });
  });

  describe('dual context stability', () => {
    it('actions context identity is stable across state changes', () => {
      const actionRefs: unknown[] = [];
      const { result } = renderHook(
        () => {
          const actions = useDrawerActions();
          actionRefs.push(actions.openFull);
          return { state: useDrawerState(), actions };
        },
        { wrapper }
      );
      act(() => {
        result.current.actions.setWidth(500);
      });
      // openFull should be the same reference across renders
      expect(actionRefs[0]).toBe(actionRefs[actionRefs.length - 1]);
    });
  });
});
