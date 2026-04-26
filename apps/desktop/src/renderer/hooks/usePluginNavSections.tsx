/**
 * usePluginNavSections — Renders installed plugin nav-sidebar canvas components.
 *
 * Queries the renderer's PluginSystem for all registered nav-sidebar canvases,
 * filters to installed plugins, wraps each in PluginErrorBoundary, and returns
 * the rendered elements for inclusion in the NavigationSidebar.
 */

import { useMemo, useCallback, type ReactElement } from 'react';
import { useApolloClient } from '@apollo/client';
import type { CanvasLogger, PluginHostApi } from '@tryvienna/sdk';
import { PluginDataProvider } from '@tryvienna/sdk/react';
import { getApi } from '@vienna/ipc/renderer';
import { usePluginSystem, usePluginSystemVersion } from '../contexts/PluginSystemContext';
import { useActiveWorkstreamId } from '../contexts/WorkstreamContext';
import { useInstalledPluginIds } from '../../components/store/use-registry-plugins';
import { useResolvedTheme } from '../contexts/ResolvedThemeContext';
import { PluginErrorBoundary } from '../../components/PluginErrorBoundary';
import { useDrawerActions } from '../../lib/drawer';
import { entityDrawerTab } from '../../components/drawer/content';
import { useActionForm } from '../../providers/ActionFormProvider';
import { rendererLogger } from '../logger';
import { api } from '../../ipc';

/**
 * Creates a PluginHostApi implementation backed by IPC calls to the main process.
 */
function createHostApi(pluginId: string): PluginHostApi {
  const ipc = getApi(api);
  return {
    getCredentialStatus: async (integrationId: string) => {
      const { keys } = await ipc.plugin.getCredentialStatus({ integrationId });
      return keys;
    },
    setCredential: async (integrationId: string, key: string, value: string) => {
      await ipc.plugin.setCredential({ integrationId, key, value });
    },
    removeCredential: async (integrationId: string, key: string) => {
      await ipc.plugin.removeCredential({ integrationId, key });
    },
    startOAuthFlow: async (integrationId: string, providerId: string) => {
      const result = await ipc.oauth.startFlow({ integrationId, providerId });
      return { success: result.success, error: result.error };
    },
    getOAuthStatus: async (integrationId: string) => {
      const result = await ipc.oauth.getStatus({ integrationId });
      return result.providers;
    },
    revokeOAuthToken: async (integrationId: string, providerId: string) => {
      const result = await ipc.oauth.revokeToken({ integrationId, providerId });
      return { success: result.success };
    },
    fetch: async (url: string, options?) => {
      return ipc.plugin.fetch({
        pluginId,
        url,
        method: options?.method,
        headers: options?.headers,
        body: options?.body,
      });
    },
    openExternal: async (url: string) => {
      await ipc.shell.openExternal({ url });
    },
  };
}

/**
 * Returns rendered nav-sidebar canvas elements for all installed plugins.
 * Each element is wrapped in a PluginErrorBoundary for crash isolation.
 */
export function usePluginNavSections(): ReactElement[] {
  const system = usePluginSystem();
  const version = usePluginSystemVersion();
  const installedIds = useInstalledPluginIds();
  const { openFull, openTab } = useDrawerActions();
  const { showPluginActionForm } = useActionForm();

  const openPluginDrawer = useCallback(
    (pluginId: string) => (payload: Record<string, unknown>) => {
      const content = { contentId: `plugin:${pluginId}`, payload };
      // Settings open full-view; everything else opens as a tab
      if (payload.view === 'settings') {
        openFull(content);
        return;
      }
      const label = (payload.label as string | undefined) ?? pluginId;
      openTab({
        id: `plugin:${pluginId}:${JSON.stringify(payload)}`,
        label,
        initialContent: content,
      });
    },
    [openFull, openTab],
  );

  const openEntityDrawer = useCallback(
    (uri: string) => {
      openTab(entityDrawerTab(uri));
    },
    [openTab],
  );

  const apolloClient = useApolloClient();
  const activeWorkstreamId = useActiveWorkstreamId();
  const resolvedTheme = useResolvedTheme();

  return useMemo(() => {
    const canvases = system.getNavCanvases();
    const elements: ReactElement[] = [];

    for (const { pluginId, config } of canvases) {
      if (!installedIds.has(pluginId)) continue;

      const Component = config.component;
      const logger: CanvasLogger = rendererLogger.child({ plugin: pluginId, canvas: 'nav-sidebar' });
      const hostApi = createHostApi(pluginId);

      elements.push(
        <PluginErrorBoundary key={pluginId} pluginId={pluginId} resetKey={version}>
          <PluginDataProvider client={apolloClient} hostApi={hostApi} activeWorkstreamId={activeWorkstreamId} resolvedTheme={resolvedTheme} pluginId={pluginId}>
            <Component
              pluginId={pluginId}
              openPluginDrawer={openPluginDrawer(pluginId)}
              openEntityDrawer={openEntityDrawer}
              showActionForm={showPluginActionForm}
              hostApi={hostApi}
              logger={logger}
            />
          </PluginDataProvider>
        </PluginErrorBoundary>,
      );
    }

    return elements;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [system, version, installedIds, openPluginDrawer, openEntityDrawer, showPluginActionForm, apolloClient, activeWorkstreamId, resolvedTheme]);
}
