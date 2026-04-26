/**
 * DrawerStateContext — Read-only state context for the drawer system.
 *
 * @ai-context
 * - Part of the dual-context pattern: this context triggers re-renders on state changes
 * - Paired with DrawerActionsContext (stable refs, never re-renders)
 * - Contains: state atom, derived booleans (isOpen/isTabbed/isFull), activeTab
 * - useDrawerState() throws outside DrawerProvider; useDrawerStateOptional() returns null
 * - Consumers that only need actions should use useDrawerActions() instead to avoid re-renders
 */

import { createContext, useContext } from 'react';
import type { DrawerStateContextValue } from './types';

const DrawerStateContext = createContext<DrawerStateContextValue | null>(null);

export { DrawerStateContext };

/** Full drawer state — re-renders on any state change */
export function useDrawerState(): DrawerStateContextValue {
  const ctx = useContext(DrawerStateContext);
  if (!ctx) throw new Error('useDrawerState must be used within a DrawerProvider');
  return ctx;
}

/** Optional variant — returns null outside DrawerProvider */
export function useDrawerStateOptional(): DrawerStateContextValue | null {
  return useContext(DrawerStateContext);
}
