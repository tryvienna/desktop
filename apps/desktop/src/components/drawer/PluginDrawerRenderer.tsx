/**
 * PluginDrawerRenderer — Renders a plugin's own drawer canvas component.
 *
 * Looks up the plugin's drawer canvas in the PluginSystem and renders it
 * with full PluginDrawerCanvasProps. Falls back to IntegrationSettingsDrawer
 * if the plugin doesn't have a drawer canvas.
 *
 * @ai-context
 * - Plugin's drawer component comes from the evaluated renderer bundle
 * - Wrapped in PluginErrorBoundary for crash isolation
 * - Provides drawer navigation actions (open, push, pop, close)
 * - Same hostApi pattern as usePluginNavSections
 */

import { useMemo, useCallback } from 'react';
import { useApolloClient } from '@apollo/client';
import type { CanvasLogger, PluginHostApi, PluginDrawerActions } from '@tryvienna/sdk';
import { PluginDataProvider } from '@tryvienna/sdk/react';
import { getApi } from '@vienna/ipc/renderer';
import type { DrawerContentDescriptor } from '../../lib/drawer';
import { useDrawerActions } from '../../lib/drawer';
import { DrawerContainer } from '../../lib/drawer';
import { usePluginSystem, usePluginSystemVersion } from '../../renderer/contexts/PluginSystemContext';
import { useActiveWorkstreamId } from '../../renderer/contexts/WorkstreamContext';
import { PluginErrorBoundary } from '../PluginErrorBoundary';
import { useResolvedTheme } from '../../renderer/contexts/ResolvedThemeContext';
import { IntegrationSettingsDrawer } from './integration-settings';
import { getPluginDrawerInfo, entityDrawerTab } from './content';
import { useActionForm } from '../../providers/ActionFormProvider';
import { rendererLogger } from '../../renderer/logger';
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

export function PluginDrawerRenderer({ content }: { content: DrawerContentDescriptor }) {
  const system = usePluginSystem();
  const version = usePluginSystemVersion();
  const info = getPluginDrawerInfo(content);
  const { openFull, openTab, close } = useDrawerActions();
  const apolloClient = useApolloClient();
  const activeWorkstreamId = useActiveWorkstreamId();
  const resolvedTheme = useResolvedTheme();

  const hostApi = useMemo(() => createHostApi(info?.pluginId ?? ''), [info?.pluginId]);
  const { showPluginActionForm } = useActionForm();

  const openEntityDrawer = useCallback(
    (uri: string) => {
      openTab(entityDrawerTab(uri));
    },
    [openTab],
  );

  if (!info) return null;

  const { pluginId, payload } = info;
  const drawerCanvas = system.getDrawerCanvas(pluginId);

  // If the plugin has no drawer canvas, fall back to generic credential management
  if (!drawerCanvas) {
    return <IntegrationSettingsDrawer content={content} />;
  }

  const Component = drawerCanvas.config.component;
  const FooterComponent = drawerCanvas.config.footer;
  const logger: CanvasLogger = rendererLogger.child({ plugin: pluginId, canvas: 'drawer' });

  // Build drawer navigation actions
  const drawerActions: PluginDrawerActions = {
    close: () => close(),
    open: (newPayload: Record<string, unknown>) => {
      openFull({ contentId: `plugin:${pluginId}`, payload: newPayload });
    },
    push: (newPayload: Record<string, unknown>) => {
      openFull({ contentId: `plugin:${pluginId}`, payload: newPayload });
    },
    pop: () => close(),
    canPop: false,
  };

  const canvasProps = {
    pluginId,
    payload,
    drawer: drawerActions,
    openEntityDrawer,
    showActionForm: showPluginActionForm,
    hostApi,
    logger,
  };

  return (
    <PluginErrorBoundary pluginId={pluginId} resetKey={version}>
      <PluginDataProvider client={apolloClient} hostApi={hostApi} activeWorkstreamId={activeWorkstreamId} resolvedTheme={resolvedTheme} pluginId={pluginId}>
        <DrawerContainer
          title={drawerCanvas.config.label}
          footer={FooterComponent ? <FooterComponent {...canvasProps} /> : undefined}
        >
          <Component {...canvasProps} />
        </DrawerContainer>
      </PluginDataProvider>
    </PluginErrorBoundary>
  );
}
