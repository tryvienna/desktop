/**
 * TagStatusContext — Allows host apps to inject live tag status lookups
 *
 * @ai-context
 * - Provides TagStatusProvider + useTagStatus hook
 * - Host app provides a function that returns live status for a workstream tag
 * - Used by TagExecutionWidget to show up-to-date status after completion
 * - No visual component; context-only module
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';

export interface LiveTagStatus {
  tagName: string;
  status: string;
}

/**
 * Given a workstreamId, returns the current status of all tags on that workstream.
 * Returns empty array if no data available.
 */
export type TagStatusLookup = (workstreamId: string) => LiveTagStatus[];

export interface TagStatusContextValue {
  lookup: TagStatusLookup;
  onNavigateToWorkstream?: (workstreamId: string) => void;
}

const TagStatusCtx = createContext<TagStatusContextValue | null>(null);

export function TagStatusProvider({
  lookup,
  onNavigateToWorkstream,
  children,
}: {
  lookup: TagStatusLookup;
  onNavigateToWorkstream?: (workstreamId: string) => void;
  children: ReactNode;
}) {
  const value = useMemo<TagStatusContextValue>(
    () => ({ lookup, onNavigateToWorkstream }),
    [lookup, onNavigateToWorkstream],
  );
  return <TagStatusCtx.Provider value={value}>{children}</TagStatusCtx.Provider>;
}

/** Returns the tag status context, or null if none is provided. */
export function useTagStatusLookup(): TagStatusContextValue | null {
  return useContext(TagStatusCtx);
}
