/**
 * FeedNavigationContext — Provides a navigate callback to feed card components.
 *
 * Used by built-in components (LinkCard, ListCard) to detect @vienna// URIs
 * and route them through the host app's entity drawer system instead of
 * opening them as regular links.
 */

import { createContext, useContext } from 'react';

export type FeedNavigateHandler = (uri: string) => void;

const FeedNavigationContext = createContext<FeedNavigateHandler | null>(null);

export const FeedNavigationProvider = FeedNavigationContext.Provider;

/** Returns the navigate handler, or null if not provided. */
export function useFeedNavigate(): FeedNavigateHandler | null {
  return useContext(FeedNavigationContext);
}

/** Check if a string is a @vienna// entity URI. */
export function isEntityUri(href: string): boolean {
  return href.startsWith('@vienna//');
}
