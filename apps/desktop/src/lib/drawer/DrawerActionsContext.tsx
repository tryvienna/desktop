/**
 * DrawerActionsContext — Stable action refs for the drawer system.
 *
 * @ai-context
 * - Part of the dual-context pattern: this context never triggers re-renders
 * - All actions are wrapped in useCallback for stable identity
 * - Paired with DrawerStateContext (triggers re-renders on state changes)
 * - useDrawerActions() throws outside DrawerProvider; useDrawerActionsOptional() returns null
 * - Components that only call drawer actions (e.g., FooterActions) use this to avoid re-renders
 */

import { createContext, useContext } from 'react';
import type { DrawerActionsContextValue } from './types';

const DrawerActionsContext = createContext<DrawerActionsContextValue | null>(null);

export { DrawerActionsContext };

/** Drawer actions — stable refs, never causes re-renders */
export function useDrawerActions(): DrawerActionsContextValue {
  const ctx = useContext(DrawerActionsContext);
  if (!ctx) throw new Error('useDrawerActions must be used within a DrawerProvider');
  return ctx;
}

/** Optional variant — returns null outside DrawerProvider */
export function useDrawerActionsOptional(): DrawerActionsContextValue | null {
  return useContext(DrawerActionsContext);
}
