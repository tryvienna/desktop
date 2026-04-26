/**
 * LinkedEntityEditContext — Context provider for entity context editing
 *
 * @ai-context
 * - Provides resolveContext / saveOverride / hasOverride to EntityLinkWidget
 * - Host app supplies implementations; widget degrades gracefully when absent
 * - useLinkedEntityEdit() returns null when no provider is mounted
 *
 * @example
 * <LinkedEntityEditProvider value={editFns}><EntityLinkWidget ... /></LinkedEntityEditProvider>
 */

import { createContext, useContext, type ReactNode } from 'react';

export interface LinkedEntityEditContextValue {
  resolveContext: (entityUri: string) => Promise<string>;
  saveOverride: (entityUri: string, contextOverride: string | null) => Promise<void>;
  hasOverride: (entityUri: string) => boolean;
  getOverride: (entityUri: string) => string | null;
}

const LinkedEntityEditCtx = createContext<LinkedEntityEditContextValue | null>(null);

export function LinkedEntityEditProvider({
  value,
  children,
}: {
  value: LinkedEntityEditContextValue;
  children: ReactNode;
}) {
  return <LinkedEntityEditCtx.Provider value={value}>{children}</LinkedEntityEditCtx.Provider>;
}

/** Returns null if no provider is mounted (graceful degradation). */
export function useLinkedEntityEdit(): LinkedEntityEditContextValue | null {
  return useContext(LinkedEntityEditCtx);
}
