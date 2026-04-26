/**
 * EntityWidgetContext — Allows host apps to inject custom entity widget renderers
 *
 * @ai-context
 * - Provides EntityWidgetProvider + useEntityWidgetRenderer hook
 * - Custom renderer returns ReactNode for entity UI, or null to fall back to default chip/card
 * - No visual component; context-only module
 *
 * @example
 * <EntityWidgetProvider renderer={(props) => <MyWidget {...props} />}>
 *   <Chat />
 * </EntityWidgetProvider>
 */

import { createContext, useContext, type ReactNode } from 'react';

/** Props passed to a custom entity widget renderer. */
export interface EntityWidgetRendererProps {
  /** Full entity URI (e.g., "@vienna//github_pr/owner/repo/123") */
  uri: string;
  /** Entity type (e.g., "github_pr") */
  entityType: string;
  /** Parsed path segments (e.g., ["owner", "repo", "123"]) */
  pathSegments: string[];
  /** Decoded label (if present in the URI) */
  label?: string;
  /** true = inline chip, false = block card */
  compact: boolean;
  /** ID of the message this widget appears in */
  messageId: string;
  /** Whether this card is detachable (floats when scrolled out of view) */
  detachable?: boolean;
}

/**
 * Return a ReactNode to render custom UI, or null to fall back
 * to the default chip/card rendering.
 */
export type EntityWidgetRenderer = (props: EntityWidgetRendererProps) => ReactNode | null;

const EntityWidgetCtx = createContext<EntityWidgetRenderer | null>(null);

export function EntityWidgetProvider({
  renderer,
  children,
}: {
  renderer: EntityWidgetRenderer;
  children: ReactNode;
}) {
  return <EntityWidgetCtx.Provider value={renderer}>{children}</EntityWidgetCtx.Provider>;
}

/** Returns the custom entity widget renderer, or null if none is provided. */
export function useEntityWidgetRenderer(): EntityWidgetRenderer | null {
  return useContext(EntityWidgetCtx);
}
