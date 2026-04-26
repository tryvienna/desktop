/**
 * DrawerProvider — Combined provider that mounts both state and actions contexts.
 *
 * @ai-context
 * - Uses useReducer with the extracted drawerReducer for state management
 * - Mounts DrawerStateContext (re-renders) and DrawerActionsContext (stable refs)
 * - Derived state (isOpen, isTabbed, isFull, activeTab) computed via useMemo
 * - All actions wrapped in useCallback for stable identity in DrawerActionsContext
 * - close() in full mode returns to tabbed if tabs exist (preserves tab session)
 * - openTab() auto-generates tab IDs and switches to tabbed mode if needed
 * - Accepts optional initialState partial for width persistence integration
 * - Accepts optional onStateChange callback for persistence
 */

import {
  useReducer,
  useMemo,
  useCallback,
  useEffect,
  useId,
  type ReactNode,
} from 'react';
import type {
  DrawerState,
  DrawerStateContextValue,
  DrawerActionsContextValue,
  DrawerContentDescriptor,
  DrawerStackItem,
  DrawerTab,
  OpenTabOptions,
} from './types';
import { drawerReducer, INITIAL_DRAWER_STATE } from './reducer';
import { DrawerStateContext } from './DrawerStateContext';
import { DrawerActionsContext } from './DrawerActionsContext';

export interface DrawerProviderProps {
  children: ReactNode;
  initialState?: Partial<DrawerState>;
  onStateChange?: (state: DrawerState) => void;
}

export function DrawerProvider({
  children,
  initialState: initialStateProp,
  onStateChange,
}: DrawerProviderProps) {
  const idPrefix = useId();

  const [state, dispatch] = useReducer(
    drawerReducer,
    initialStateProp
      ? { ...INITIAL_DRAWER_STATE, ...initialStateProp }
      : INITIAL_DRAWER_STATE
  );

  // Notify on state changes (for persistence)
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  // ── Derived State ─────────────────────────────────────────────────────

  const stateValue = useMemo<DrawerStateContextValue>(() => ({
    state,
    isOpen: state.mode.type !== 'closed',
    isTabbed: state.mode.type === 'tabbed',
    isFull: state.mode.type === 'full',
    activeTab: state.tabs.find((t) => t.id === state.activeTabId) ?? null,
  }), [state]);

  // ── Actions (all useCallback for stable refs) ────────────────────────

  const openTabbed = useCallback(() => {
    dispatch({ type: 'SET_MODE', mode: { type: 'tabbed' } });
  }, []);

  const openFull = useCallback((content: DrawerContentDescriptor) => {
    dispatch({ type: 'SET_MODE', mode: { type: 'full', content } });
  }, []);

  const close = useCallback(() => {
    if (state.mode.type === 'full' && state.tabs.length > 0) {
      dispatch({ type: 'SET_MODE', mode: { type: 'tabbed' } });
    } else {
      dispatch({ type: 'SET_MODE', mode: { type: 'closed' } });
    }
  }, [state.mode.type, state.tabs.length]);

  const setWidth = useCallback((width: number) => {
    dispatch({ type: 'SET_WIDTH', width });
  }, []);

  const openTab = useCallback(
    (options: OpenTabOptions) => {
      const tabId =
        options.id ??
        `${idPrefix}-tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const initialStack: DrawerStackItem[] = [];
      if (options.initialContent) {
        initialStack.push({
          content: options.initialContent,
          title: options.initialTitle ?? options.label,
        });
      }

      const tab: DrawerTab = {
        id: tabId,
        label: options.label,
        icon: options.icon,
        stack: initialStack,
        closable: options.closable ?? true,
        labelLoading: options.labelLoading,
      };

      if (state.mode.type !== 'tabbed') {
        dispatch({ type: 'SET_MODE', mode: { type: 'tabbed' } });
      }

      dispatch({ type: 'OPEN_TAB', tab });
    },
    [idPrefix, state.mode.type]
  );

  const closeTab = useCallback((tabId: string) => {
    dispatch({ type: 'CLOSE_TAB', tabId });
  }, []);

  const setActiveTab = useCallback((tabId: string) => {
    dispatch({ type: 'SET_ACTIVE_TAB', tabId });
  }, []);

  const reorderTabs = useCallback((fromIndex: number, toIndex: number) => {
    dispatch({ type: 'REORDER_TABS', fromIndex, toIndex });
  }, []);

  const updateTabStack = useCallback((tabId: string, stack: DrawerStackItem[]) => {
    dispatch({ type: 'UPDATE_TAB_STACK', tabId, stack });
  }, []);

  const updateTabLabel = useCallback((tabId: string, label: string) => {
    dispatch({ type: 'UPDATE_TAB_LABEL', tabId, label });
  }, []);

  const updateTabDirty = useCallback((tabId: string, isDirty: boolean) => {
    dispatch({ type: 'UPDATE_TAB_DIRTY', tabId, isDirty });
  }, []);

  // ── Actions Context Value ─────────────────────────────────────────────

  const actionsValue = useMemo<DrawerActionsContextValue>(
    () => ({
      openTabbed,
      openFull,
      close,
      setWidth,
      openTab,
      closeTab,
      setActiveTab,
      reorderTabs,
      updateTabStack,
      updateTabLabel,
      updateTabDirty,
    }),
    [
      openTabbed,
      openFull,
      close,
      setWidth,
      openTab,
      closeTab,
      setActiveTab,
      reorderTabs,
      updateTabStack,
      updateTabLabel,
      updateTabDirty,
    ]
  );

  return (
    <DrawerStateContext.Provider value={stateValue}>
      <DrawerActionsContext.Provider value={actionsValue}>
        {children}
      </DrawerActionsContext.Provider>
    </DrawerStateContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Convenience Hook
// ═══════════════════════════════════════════════════════════════════════════

/** Convenience: state + actions combined (re-renders on state changes) */
export { useDrawerState, useDrawerStateOptional } from './DrawerStateContext';
export { useDrawerActions, useDrawerActionsOptional } from './DrawerActionsContext';
