/**
 * DrawerNavigationContext — Per-tab navigation stack management.
 *
 * @ai-context
 * - Two providers: DrawerNavigationProvider (tab-synced) and StandaloneDrawerNavigationProvider
 * - Tab-synced variant reads stack from DrawerStateContext, writes via DrawerActionsContext.updateTabStack
 * - Standalone variant manages its own stack via useState (used for full-mode content)
 * - API: push/pop/replace/reset for stack navigation, refresh for content reload
 * - refresh() increments a refreshKey counter usable as a React key to force re-mount
 * - updateCurrentTitle() mutates the top stack item title (e.g., when async data loads)
 */

import {
  createContext,
  useContext,
  useCallback,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  DrawerNavigationContextValue,
  DrawerContentDescriptor,
  DrawerStackItem,
} from './types';
import { useDrawerState } from './DrawerStateContext';
import { useDrawerActions } from './DrawerActionsContext';

const DrawerNavigationContext = createContext<DrawerNavigationContextValue | null>(null);

// ═══════════════════════════════════════════════════════════════════════════
// Tab-Synced Provider
// ═══════════════════════════════════════════════════════════════════════════

export interface DrawerNavigationProviderProps {
  children: ReactNode;
  tabId: string;
}

export function DrawerNavigationProvider({
  children,
  tabId,
}: DrawerNavigationProviderProps) {
  const { state } = useDrawerState();
  const { updateTabStack } = useDrawerActions();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const tab = state.tabs.find((t) => t.id === tabId);
  const stack = tab?.stack ?? [];
  const current = stack.length > 0 ? stack[stack.length - 1]! : null;
  const canGoBack = stack.length > 1;

  // Keep a ref to the current stack so callbacks are stable (don't depend on stack).
  const stackRef = useRef(stack);
  stackRef.current = stack;

  const push = useCallback(
    (content: DrawerContentDescriptor, title: string) => {
      updateTabStack(tabId, [...stackRef.current, { content, title }]);
    },
    [tabId, updateTabStack]
  );

  const pop = useCallback(() => {
    if (stackRef.current.length <= 1) return;
    updateTabStack(tabId, stackRef.current.slice(0, -1));
  }, [tabId, updateTabStack]);

  const replace = useCallback(
    (content: DrawerContentDescriptor, title: string) => {
      const s = stackRef.current;
      if (s.length === 0) {
        updateTabStack(tabId, [{ content, title }]);
      } else {
        const newStack = [...s];
        newStack[newStack.length - 1] = { content, title };
        updateTabStack(tabId, newStack);
      }
    },
    [tabId, updateTabStack]
  );

  const reset = useCallback(
    (content: DrawerContentDescriptor, title: string) => {
      updateTabStack(tabId, [{ content, title }]);
    },
    [tabId, updateTabStack]
  );

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setRefreshKey((k) => k + 1);
    await new Promise((resolve) => setTimeout(resolve, 100));
    setIsRefreshing(false);
  }, []);

  const updateCurrentTitle = useCallback(
    (title: string) => {
      const s = stackRef.current;
      if (s.length === 0) return;
      const top = s[s.length - 1]!;
      // Bail out if title hasn't changed to avoid unnecessary state updates
      if (top.title === title) return;
      const newStack = [...s];
      newStack[newStack.length - 1] = { ...top, title };
      updateTabStack(tabId, newStack);
    },
    [tabId, updateTabStack]
  );

  const value: DrawerNavigationContextValue = {
    stack,
    current,
    canGoBack,
    push,
    pop,
    replace,
    reset,
    refresh,
    refreshKey,
    isRefreshing,
    updateCurrentTitle,
  };

  return (
    <DrawerNavigationContext.Provider value={value}>
      {children}
    </DrawerNavigationContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Standalone Provider (for full-mode content)
// ═══════════════════════════════════════════════════════════════════════════

export interface StandaloneDrawerNavigationProviderProps {
  children: ReactNode;
  initialStack?: DrawerStackItem[];
}

export function StandaloneDrawerNavigationProvider({
  children,
  initialStack = [],
}: StandaloneDrawerNavigationProviderProps) {
  const [stack, setStack] = useState<DrawerStackItem[]>(initialStack);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const current = stack.length > 0 ? stack[stack.length - 1]! : null;
  const canGoBack = stack.length > 1;

  const push = useCallback((content: DrawerContentDescriptor, title: string) => {
    setStack((s) => [...s, { content, title }]);
  }, []);

  const pop = useCallback(() => {
    setStack((s) => (s.length <= 1 ? s : s.slice(0, -1)));
  }, []);

  const replace = useCallback((content: DrawerContentDescriptor, title: string) => {
    setStack((s) => {
      if (s.length === 0) return [{ content, title }];
      const newStack = [...s];
      newStack[newStack.length - 1] = { content, title };
      return newStack;
    });
  }, []);

  const reset = useCallback((content: DrawerContentDescriptor, title: string) => {
    setStack([{ content, title }]);
  }, []);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setRefreshKey((k) => k + 1);
    await new Promise((resolve) => setTimeout(resolve, 100));
    setIsRefreshing(false);
  }, []);

  const updateCurrentTitle = useCallback((title: string) => {
    setStack((s) => {
      if (s.length === 0) return s;
      const newStack = [...s];
      newStack[newStack.length - 1] = { ...newStack[newStack.length - 1]!, title };
      return newStack;
    });
  }, []);

  const value: DrawerNavigationContextValue = {
    stack,
    current,
    canGoBack,
    push,
    pop,
    replace,
    reset,
    refresh,
    refreshKey,
    isRefreshing,
    updateCurrentTitle,
  };

  return (
    <DrawerNavigationContext.Provider value={value}>
      {children}
    </DrawerNavigationContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Hooks
// ═══════════════════════════════════════════════════════════════════════════

export function useDrawerNavigation(): DrawerNavigationContextValue {
  const ctx = useContext(DrawerNavigationContext);
  if (!ctx) throw new Error('useDrawerNavigation must be used within a DrawerNavigationProvider');
  return ctx;
}

export function useDrawerNavigationOptional(): DrawerNavigationContextValue | null {
  return useContext(DrawerNavigationContext);
}
