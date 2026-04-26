/**
 * usePluginMenuBarItems — Renders plugin menu-bar canvases into the TopBar.
 *
 * Returns a React element containing all plugin menu-bar icon buttons,
 * sorted by priority. Each button opens a popover with the plugin's content.
 * Only one popover can be open at a time.
 */

import { useMemo, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useApolloClient } from '@apollo/client';
import type { CanvasLogger, PluginHostApi } from '@tryvienna/sdk';
import { PluginDataProvider } from '@tryvienna/sdk/react';
import { getApi } from '@vienna/ipc/renderer';
import {
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@tryvienna/ui';
import { usePluginSystem, usePluginSystemVersion, usePluginErrors } from '../contexts/PluginSystemContext';
import { useActiveWorkstreamId } from '../contexts/WorkstreamContext';
import { useInstalledPluginIds } from '../../components/store/use-registry-plugins';
import { useResolvedTheme } from '../contexts/ResolvedThemeContext';
import { PluginErrorBoundary } from '../../components/PluginErrorBoundary';
import { useDrawerActions } from '../../lib/drawer';
import { pluginDrawerContent } from '../../components/drawer/content';
import { useActionForm } from '../../providers/ActionFormProvider';
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

export function usePluginMenuBarItems(): ReactNode {
  const pluginSystem = usePluginSystem();
  const pluginVersion = usePluginSystemVersion();
  const installedIds = useInstalledPluginIds();
  const { errors: pluginErrors } = usePluginErrors();
  const [openId, setOpenId] = useState<string | null>(null);
  const { openTab, openFull } = useDrawerActions();
  const { showPluginActionForm } = useActionForm();
  const apolloClient = useApolloClient();
  const activeWorkstreamId = useActiveWorkstreamId();
  const resolvedTheme = useResolvedTheme();

  const allMenuBarItems = useMemo(
    () => pluginSystem.getMenuBarItems(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pluginSystem, pluginVersion],
  );

  const menuBarItems = useMemo(
    () => allMenuBarItems.filter(({ pluginId }) => installedIds.has(pluginId)),
    [allMenuBarItems, installedIds],
  );

  const pluginLoggers = useMemo(() => {
    const loggers = new Map<string, CanvasLogger>();
    for (const { pluginId } of menuBarItems) {
      loggers.set(pluginId, rendererLogger.child({ plugin: pluginId, canvas: 'menu-bar' }));
    }
    return loggers;
  }, [menuBarItems]);

  const hostApis = useMemo(() => {
    const apis = new Map<string, PluginHostApi>();
    for (const { pluginId } of menuBarItems) {
      apis.set(pluginId, createHostApi(pluginId));
    }
    return apis;
  }, [menuBarItems]);

  const handleOpenChange = useCallback(
    (pluginId: string, open: boolean) => {
      setOpenId(open ? pluginId : null);
    },
    [],
  );

  const createOpenPluginDrawer = useCallback(
    (pluginId: string) => (payload: Record<string, unknown>) => {
      setOpenId(null);
      if (payload.view === 'settings') {
        openFull(pluginDrawerContent(pluginId, payload));
        return;
      }
      const label = payload.label as string | undefined;
      openTab({
        id: `plugin:${pluginId}:${JSON.stringify(payload)}`,
        label: label ?? pluginId,
        initialContent: pluginDrawerContent(pluginId, payload),
      });
    },
    [openTab, openFull],
  );

  return useMemo(() => {
    if (menuBarItems.length === 0) return null;

    return (
      <TooltipProvider>
        <div className="flex items-center gap-1">
          {menuBarItems.map(({ pluginId, config }) => {
            const error = pluginErrors.get(pluginId);
            if (error) return null;

            const IconComponent = config.icon;
            const ContentComponent = config.component;
            const logger = pluginLoggers.get(pluginId)!;
            const hostApi = hostApis.get(pluginId)!;
            const isOpen = openId === pluginId;

            return (
              <PluginDataProvider key={pluginId} client={apolloClient} hostApi={hostApi} activeWorkstreamId={activeWorkstreamId} resolvedTheme={resolvedTheme} pluginId={pluginId}>
                <Popover
                  open={isOpen}
                  onOpenChange={(open) => handleOpenChange(pluginId, open)}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" aria-label={config.label}>
                          <PluginErrorBoundary pluginId={pluginId} resetKey={pluginVersion}>
                            <IconComponent pluginId={pluginId} hostApi={hostApi} logger={logger} />
                          </PluginErrorBoundary>
                        </Button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    {!isOpen && <TooltipContent>{config.label}</TooltipContent>}
                  </Tooltip>
                  <PopoverContent align="end" side="bottom" className="w-auto p-3">
                    <PluginErrorBoundary pluginId={pluginId} resetKey={pluginVersion}>
                      <ContentComponent
                        pluginId={pluginId}
                        onClose={() => setOpenId(null)}
                        openPluginDrawer={createOpenPluginDrawer(pluginId)}
                        showActionForm={showPluginActionForm}
                        hostApi={hostApi}
                        logger={logger}
                      />
                    </PluginErrorBoundary>
                  </PopoverContent>
                </Popover>
              </PluginDataProvider>
            );
          })}
        </div>
      </TooltipProvider>
    );
  }, [menuBarItems, pluginErrors, pluginLoggers, hostApis, openId, pluginVersion, handleOpenChange, createOpenPluginDrawer, showPluginActionForm, apolloClient, activeWorkstreamId, resolvedTheme]);
}
