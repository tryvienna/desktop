/**
 * PluginDataContext — Provides a pre-configured Apollo client to plugin hooks.
 *
 * The host app wraps plugin components with <PluginDataProvider> passing in its
 * already-configured Apollo client. Plugin hooks (useEntity, useEntities, etc.)
 * read from this context internally — plugins never import Apollo directly.
 */
import { createContext, useContext } from 'react';
import type { ApolloClient } from '@apollo/client/core';
import type { PluginHostApi } from '../canvas';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyApolloClient = ApolloClient<any>;

/** Resolved theme mode — always 'dark' or 'light', never 'system'. */
export type ResolvedTheme = 'dark' | 'light';

export interface PluginDataContextValue {
  client: AnyApolloClient;
  hostApi?: PluginHostApi;
  /** ID of the currently active workstream, or null if none is selected. */
  activeWorkstreamId?: string | null;
  /** Resolved theme — 'dark' or 'light' (system preference already resolved). */
  resolvedTheme?: ResolvedTheme;
  /** Plugin ID — set by the host app, used to auto-identify the caller in mutations. */
  pluginId?: string;
}

export const PluginDataContext = createContext<PluginDataContextValue | null>(null);

export function usePluginClient(): AnyApolloClient {
  const ctx = useContext(PluginDataContext);
  if (!ctx) {
    throw new Error(
      'usePluginClient must be used within a <PluginDataProvider>. ' +
      'The host app must wrap plugin components with this provider.',
    );
  }
  return ctx.client;
}

export function useHostApi(): PluginHostApi {
  const ctx = useContext(PluginDataContext);
  if (!ctx?.hostApi) {
    throw new Error(
      'useHostApi must be used within a <PluginDataProvider> that provides a hostApi. ' +
      'The host app must pass hostApi to PluginDataProvider.',
    );
  }
  return ctx.hostApi;
}

/**
 * Returns the ID of the currently active workstream, or null if none is selected.
 * Re-renders when the active workstream changes.
 */
export function useActiveWorkstreamId(): string | null {
  const ctx = useContext(PluginDataContext);
  if (!ctx) {
    throw new Error(
      'useActiveWorkstreamId must be used within a <PluginDataProvider>.',
    );
  }
  return ctx.activeWorkstreamId ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Theme
// ─────────────────────────────────────────────────────────────────────────────

export interface ThemeInfo {
  /** The resolved theme — 'dark' or 'light' (system preference already resolved). */
  resolvedTheme: ResolvedTheme;
}

/**
 * Returns the current theme information.
 * Re-renders when the theme changes.
 */
/**
 * Returns the plugin ID of the current plugin, or undefined if not in a plugin context.
 */
export function usePluginId(): string | undefined {
  const ctx = useContext(PluginDataContext);
  return ctx?.pluginId;
}

export function useTheme(): ThemeInfo {
  const ctx = useContext(PluginDataContext);
  if (!ctx) {
    throw new Error(
      'useTheme must be used within a <PluginDataProvider>.',
    );
  }
  return { resolvedTheme: ctx.resolvedTheme ?? 'light' };
}
