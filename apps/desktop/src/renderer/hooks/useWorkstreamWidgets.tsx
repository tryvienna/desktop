/**
 * useWorkstreamWidgets — Resolves workstream-widget canvases for linked entities.
 *
 * Queries the active workstream's linked entities, checks which entity types
 * have a workstreamWidget UI component, and returns rendered elements wrapped
 * in PluginDataProvider + PluginErrorBoundary.
 */

import { useMemo, type ReactElement } from 'react';
import { useQuery } from '@apollo/client';
import { useApolloClient } from '@apollo/client';
import type { CanvasLogger, PluginHostApi } from '@tryvienna/sdk';
import { PluginDataProvider } from '@tryvienna/sdk/react';
import { GET_WORKSTREAM_LINKED_ENTITIES } from '@vienna/graphql/client';
import { getApi } from '@vienna/ipc/renderer';
import { usePluginSystem, usePluginSystemVersion } from '../contexts/PluginSystemContext';
import { useActiveWorkstreamId } from '../contexts/WorkstreamContext';
import { useResolvedTheme } from '../contexts/ResolvedThemeContext';
import { PluginErrorBoundary } from '../../components/PluginErrorBoundary';
import { rendererLogger } from '../logger';
import { api } from '../../ipc';

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
 * Returns rendered workstream-widget elements for all linked entities
 * whose entity type defines a workstreamWidget UI component.
 */
export function useWorkstreamWidgets(): ReactElement[] {
  const system = usePluginSystem();
  const version = usePluginSystemVersion();
  const activeWorkstreamId = useActiveWorkstreamId();
  const apolloClient = useApolloClient();
  const resolvedTheme = useResolvedTheme();

  const { data } = useQuery(GET_WORKSTREAM_LINKED_ENTITIES, {
    variables: { workstreamId: activeWorkstreamId! },
    skip: !activeWorkstreamId,
    fetchPolicy: 'cache-and-network',
  });

  const linkedEntities = data?.workstreamLinkedEntities ?? [];

  return useMemo(() => {
    const elements: ReactElement[] = [];

    for (const entity of linkedEntities) {
      const resolved = system.getWorkstreamWidget(entity.entityType);
      if (!resolved) continue;

      const { pluginId, component: Component } = resolved;
      const hostApi = createHostApi(pluginId);
      const logger: CanvasLogger = rendererLogger.child({
        plugin: pluginId,
        canvas: 'workstream-widget',
        entityType: entity.entityType,
      });

      elements.push(
        <PluginErrorBoundary key={entity.entityUri} pluginId={pluginId} resetKey={version}>
          <PluginDataProvider client={apolloClient} hostApi={hostApi} activeWorkstreamId={activeWorkstreamId} resolvedTheme={resolvedTheme}>
            <Component
              uri={entity.entityUri}
              hostApi={hostApi}
              logger={logger}
            />
          </PluginDataProvider>
        </PluginErrorBoundary>,
      );
    }

    return elements;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [system, version, linkedEntities, apolloClient, activeWorkstreamId, resolvedTheme]);
}
