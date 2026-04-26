/**
 * PluginDataProvider — Host app wraps plugin components with this.
 *
 * Passes the pre-configured Apollo client into the plugin hook layer.
 * Plugins never need to know about Apollo; they just call useEntity(), etc.
 *
 * @example
 * ```tsx
 * // In the host app (apps/desktop):
 * import { PluginDataProvider } from '@tryvienna/sdk/react';
 *
 * <ApolloProvider client={client}>
 *   <PluginDataProvider client={client}>
 *     <PluginNavSections />
 *     <PluginDrawers />
 *   </PluginDataProvider>
 * </ApolloProvider>
 * ```
 */
import { createElement } from 'react';
import type { ReactNode } from 'react';
import type { ApolloClient } from '@apollo/client/core';
import type { PluginHostApi } from '../canvas';
import { PluginDataContext } from './PluginDataContext';
import type { ResolvedTheme } from './PluginDataContext';

interface PluginDataProviderProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: ApolloClient<any>;
  hostApi?: PluginHostApi;
  /** ID of the currently active workstream, or null if none is selected. */
  activeWorkstreamId?: string | null;
  /** Resolved theme — 'dark' or 'light' (system preference already resolved). */
  resolvedTheme?: ResolvedTheme;
  /** Plugin ID — auto-identifies the caller in mutations (e.g. inbox source). */
  pluginId?: string;
  children: ReactNode;
}

export function PluginDataProvider({ client, hostApi, activeWorkstreamId, resolvedTheme, pluginId, children }: PluginDataProviderProps) {
  return createElement(PluginDataContext.Provider, { value: { client, hostApi, activeWorkstreamId, resolvedTheme, pluginId } }, children);
}
