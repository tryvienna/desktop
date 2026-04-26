/**
 * FeedSection — Renders the home feed below quick actions.
 *
 * Subscribes to the feed workstream, renders feed items
 * using the FeedRenderer, and provides refresh + edit buttons.
 */

import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { FeedRenderer, createFeedRegistry } from '@tryvienna/ui/feed';
import type { FeedItem, WidgetFeedRenderProps } from '@tryvienna/ui/feed';
import type { FeedCanvasProps, EntityFeedCardProps, PluginHostApi } from '@tryvienna/sdk';
import { getAllNativeWidgets } from './widgets';
import { PluginDataProvider } from '@tryvienna/sdk/react';
import { useApolloClient } from '@apollo/client';
import type { ComponentType } from 'react';
import {
  CREATE_WORKSTREAM,
  SEND_WORKSTREAM_MESSAGE,
} from '@vienna/graphql/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@tryvienna/ui';
import { useFeed } from './use-feed';
import { useWorkstreamList, useActiveWorkstreamId, useWorkstreamActions } from '../../renderer/contexts/WorkstreamContext';
import { usePluginSystem, usePluginSystemVersion } from '../../renderer/contexts/PluginSystemContext';
import type { PluginError } from '../../renderer/contexts/PluginSystemContext';
import { useLoadedPlugins } from '../../renderer/hooks/useLoadedPlugins';
import { useResolvedTheme } from '../../renderer/contexts/ResolvedThemeContext';
import { useDrawerActions } from '../../lib/drawer';
import { feedEditorTab, entityDrawerTab, pluginDrawerContent, pluginStoreContent } from '../drawer/content';
import { getApi } from '@vienna/ipc/renderer';
import { api } from '../../ipc/index';
import { RefreshCw, Pencil, Globe, FolderOpen, User, Plus, Rss, Puzzle } from 'lucide-react';
import { usePersistedState } from '../../storage';

interface FeedFileInfo {
  tier: 'profile' | 'global' | 'project';
  path: string;
  exists: boolean;
  label: string;
}

export function FeedSection() {
  const { projectId } = useWorkstreamList();
  const activeWorkstreamId = useActiveWorkstreamId();
  const apolloClient = useApolloClient();
  const resolvedTheme = useResolvedTheme();
  const system = usePluginSystem();
  const pluginVersion = usePluginSystemVersion();
  const { openTab, openFull } = useDrawerActions();
  const { setActiveWorkstream } = useWorkstreamActions();
  const [feedFiles, setFeedFiles] = useState<FeedFileInfo[]>([]);
  const [feedEnabled, setFeedEnabled] = usePersistedState('feedEnabled');
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const { items, isLoading, isStreaming, isRefreshing, hasFeedConfig, refresh } = useFeed(projectId, feedEnabled);
  const { plugins: loadedPlugins } = useLoadedPlugins();

  const effectiveProjectId = projectId ?? '__global__';

  // Build set of locally-loaded plugin IDs (for "Ask Vienna to fix" button)
  const localPluginIds = useMemo(() => {
    const ids = new Set<string>();
    for (const p of loadedPlugins) {
      if (p.source === 'local' || p.source === 'customized') ids.add(p.id);
    }
    return ids;
  }, [loadedPlugins]);

  // Map entity types → plugin IDs (for error reporting)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const entityTypeToPluginId = useMemo(() => {
    if (!system) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const entity of system.getAllEntities()) {
      const drawer = system.getEntityDrawer(entity.type);
      if (drawer) map.set(entity.type, drawer.pluginId);
    }
    return map;
  }, [system, pluginVersion]);

  // Create a PluginHostApi for a given plugin (used by plugin feed canvases)
  const createHostApi = useCallback((pluginId: string): PluginHostApi => {
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
  }, []);

  // Intercept toggle: show onboarding modal when enabling
  const handleToggle = useCallback((checked: boolean) => {
    setFeedEnabled(checked);
    if (checked) {
      setShowOnboardingModal(true);
    }
  }, [setFeedEnabled]);

  const handleAddWidget = useCallback(() => {
    setShowOnboardingModal(false);
    openFull(pluginStoreContent({ canvasFilters: ['feed'] }));
  }, [openFull]);

  // Handle navigation from interactive feed cards
  const handleNavigate = useCallback((uri: string) => {
    if (uri.startsWith('@vienna//plugin/')) {
      // Plugin drawer navigation: @vienna//plugin/{pluginId}?key=val&...
      const withoutPrefix = uri.slice('@vienna//plugin/'.length);
      const [pluginId, queryString] = withoutPrefix.split('?', 2);
      const params = new URLSearchParams(queryString ?? '');
      const payload: Record<string, unknown> = {};
      for (const [key, value] of params) {
        payload[key] = value;
      }
      const label = (payload.label as string) ?? pluginId;
      openTab({
        id: `plugin:${pluginId}:${JSON.stringify(payload)}`,
        label,
        initialContent: pluginDrawerContent(pluginId, payload),
      });
    } else if (uri.startsWith('@vienna//workstream/')) {
      const workstreamId = uri.slice('@vienna//workstream/'.length).split('?')[0];
      if (workstreamId) setActiveWorkstream(workstreamId);
    } else if (uri.startsWith('@vienna//')) {
      openTab(entityDrawerTab(uri));
    } else if (uri.startsWith('http://') || uri.startsWith('https://')) {
      const ipc = getApi(api);
      ipc.shell.openExternal({ url: uri }).catch(() => {});
    }
  }, [openTab, setActiveWorkstream]);

  // Load feed file list when dropdown opens
  const loadFeedFiles = async () => {
    try {
      const ipc = getApi(api);
      const result = await ipc.feed.listFeedFiles({ projectId: effectiveProjectId });
      setFeedFiles(result.files);
    } catch {
      // Silently fail — dropdown will keep showing previous state or "Loading..."
    }
  };

  // Build json-render registry from built-in + plugin feed canvases
  const feedCanvases = system?.getFeedCanvases() ?? [];
  const registry = useMemo(() => {
    const pluginComponents = feedCanvases.map((canvas: { pluginId: string; config: { label: string; component: React.ComponentType<unknown> } }) => ({
      pluginId: canvas.pluginId,
      label: canvas.config.label,
      component: canvas.config.component,
    }));
    return createFeedRegistry(pluginComponents);
  }, [feedCanvases]);

  // Build plugin feed component map (pluginId → component) for direct rendering
  const pluginFeedComponents = useMemo(() => {
    const map: Record<string, ComponentType<FeedCanvasProps>> = {};
    for (const canvas of feedCanvases) {
      map[canvas.pluginId] = canvas.config.component;
    }
    return map;
  }, [feedCanvases]);

  // Build entity feedCard component map (entityType → component) for direct rendering
  const entityFeedCards = useMemo(() => {
    if (!system) return {};
    const map: Record<string, ComponentType<EntityFeedCardProps>> = {};
    for (const entity of system.getAllEntities()) {
      if (entity.ui?.feedCard) {
        map[entity.type] = entity.ui.feedCard;
      }
    }
    return map;
  }, [system]);

  // Build native widget component map (widgetId → component) for direct rendering
  const widgetFeedComponents = useMemo(() => {
    const map: Record<string, ComponentType<WidgetFeedRenderProps>> = {};
    for (const widget of getAllNativeWidgets()) {
      map[widget.id] = widget.component;
    }
    return map;
  }, []);

  // ── Feed item error handling ──────────────────────────────────────────
  const [isRequestingFix, setIsRequestingFix] = useState(false);

  /** Resolve the pluginId that owns a given feed item. */
  const getPluginIdForItem = useCallback((item: FeedItem): string | undefined => {
    if (item.kind === 'plugin') return item.pluginId;
    if (item.kind === 'entity') return entityTypeToPluginId.get(item.entityType);
    return undefined;
  }, [entityTypeToPluginId]);

  /** Dispatch plugin:error event when a feed item crashes. */
  const handleItemError = useCallback((error: Error, item: FeedItem) => {
    const pluginId = getPluginIdForItem(item);
    if (!pluginId) return;
    const detail: PluginError = {
      pluginId,
      error: error.message,
      phase: 'renderer',
      timestamp: Date.now(),
    };
    // eslint-disable-next-line no-restricted-properties
    window.dispatchEvent(new CustomEvent('plugin:error', { detail }));
  }, [getPluginIdForItem]);

  /** Create a workstream with the error details and ask Vienna to fix it. */
  const handleRequestFix = useCallback(async (error: Error, item: FeedItem) => {
    const pluginId = getPluginIdForItem(item);
    if (!pluginId || !projectId || isRequestingFix) return;

    setIsRequestingFix(true);
    const plugin = loadedPlugins.find((p) => p.id === pluginId);
    const pluginName = plugin?.name ?? pluginId;

    try {
      const result = await apolloClient.mutate({
        mutation: CREATE_WORKSTREAM,
        variables: {
          input: {
            projectId,
            title: `Fix ${pluginName} feed canvas error`,
            groupName: 'Plugins',
          },
        },
      });
      const workstreamId = result.data?.createWorkstream?.workstream?.id;
      if (!workstreamId) return;

      const errorText = `${error.name}: ${error.message}${error.stack ? `\n\n${error.stack}` : ''}`;
      await apolloClient.mutate({
        mutation: SEND_WORKSTREAM_MESSAGE,
        variables: {
          workstreamId,
          text: `The "${pluginName}" plugin's feed canvas threw an error at runtime. Here is the full error:\n\n\`\`\`\n${errorText}\n\`\`\`\n\nPlease investigate and fix this error in the plugin code.`,
        },
      });
    } catch {
      // Best-effort — don't crash the error UI
    } finally {
      setIsRequestingFix(false);
    }
  }, [getPluginIdForItem, projectId, isRequestingFix, loadedPlugins, apolloClient]);

  /** Render extra actions in the feed item error fallback. */
  const renderItemErrorActions = useCallback((error: Error, item: FeedItem): ReactNode => {
    const pluginId = getPluginIdForItem(item);
    if (!pluginId || !localPluginIds.has(pluginId)) return null;
    return (
      <button
        onClick={() => handleRequestFix(error, item)}
        disabled={isRequestingFix}
        className="rounded-md px-2 py-1 text-xs text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
      >
        {isRequestingFix ? 'Creating workstream...' : 'Ask Vienna to fix'}
      </button>
    );
  }, [getPluginIdForItem, localPluginIds, handleRequestFix]);

  const handleEditFile = (file: FeedFileInfo) => {
    openTab(feedEditorTab(file.path, file.tier, file.label, effectiveProjectId));
  };

  const handleCreateFeed = async () => {
    // Fetch feed files directly — can't rely on feedFiles state since
    // setState doesn't update until the next render.
    try {
      const ipc = getApi(api);
      const result = await ipc.feed.listFeedFiles({ projectId: effectiveProjectId });
      setFeedFiles(result.files);
      const globalFile = result.files.find((f: FeedFileInfo) => f.tier === 'global');
      if (globalFile) handleEditFile(globalFile);
    } catch {
      // Silently fail
    }
  };


  // Onboarding modal — shown every time feed is toggled on
  const onboardingModal = (
    <Dialog open={showOnboardingModal} onOpenChange={setShowOnboardingModal}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Your Feed</DialogTitle>
          <DialogDescription>
            The feed is your personalized home screen. Write natural language instructions
            in a feed.md file, and AI turns them into live cards — stats, lists, links, and more.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end pt-2">
          <button
            onClick={handleAddWidget}
            className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
          >
            <Puzzle className="h-4 w-4" />
            Add widget
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Feed disabled — show just the label + toggle inline
  if (!feedEnabled) {
    return (
      <div className="w-full max-w-2xl px-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Your feed</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Switch
                  checked={false}
                  onCheckedChange={handleToggle}
                  className="scale-75 data-[state=checked]:bg-foreground data-[state=unchecked]:bg-muted"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">Show feed</TooltipContent>
          </Tooltip>
        </div>
        {onboardingModal}
      </div>
    );
  }

  // Show empty state CTA if feed is enabled but no feed.md exists and nothing to show
  if (!hasFeedConfig && items.length === 0 && !isLoading) {
    return (
      <div className="w-full max-w-2xl px-4">
        <div className="rounded-lg border border-dashed p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
              <Rss className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-[13px] font-medium">Set up your feed</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Create a feed.md to get a personalized home screen powered by AI.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddWidget}
                className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-colors hover:bg-foreground/90"
              >
                <Puzzle className="h-3 w-3" />
                Add widget
              </button>
              <button
                onClick={handleCreateFeed}
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Plus className="h-3 w-3" />
                Create from scratch
              </button>
            </div>
          </div>
        </div>
        {onboardingModal}
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl px-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Your feed</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Switch
                  checked={feedEnabled}
                  onCheckedChange={handleToggle}
                  className="scale-75 data-[state=checked]:bg-foreground data-[state=unchecked]:bg-muted"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">{feedEnabled ? 'Hide feed' : 'Show feed'}</TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-1">
          <DropdownMenu onOpenChange={(open: boolean) => { if (open) loadFeedFiles(); }}>
            <DropdownMenuTrigger asChild>
              <button
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Edit feed.md"
              >
                <Pencil className="h-3 w-3" />
                Edit
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs">Edit feed instructions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {feedFiles.map((file) => (
                <DropdownMenuItem
                  key={file.path}
                  onClick={() => handleEditFile(file)}
                  className="flex items-center gap-2 text-xs"
                >
                  {file.tier === 'profile' ? (
                    <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  ) : file.tier === 'global' ? (
                    <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="flex-1 truncate">{file.label}</span>
                  {!file.exists && (
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/60">
                      <Plus className="h-2.5 w-2.5" />
                      new
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
              {feedFiles.length === 0 && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">Loading...</div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={refresh}
            disabled={isLoading || isStreaming || isRefreshing}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading || isStreaming || isRefreshing ? 'animate-spin' : ''}`} />
            {isLoading ? 'Loading' : isRefreshing ? 'Updating' : 'Refresh'}
          </button>
        </div>
      </div>
      <PluginDataProvider client={apolloClient} activeWorkstreamId={activeWorkstreamId} resolvedTheme={resolvedTheme}>
        <FeedRenderer
          items={items}
          registry={registry}
          pluginFeedComponents={pluginFeedComponents}
          entityFeedCards={entityFeedCards}
          widgetFeedComponents={widgetFeedComponents}
          isStreaming={isStreaming}
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          createHostApi={createHostApi}
          onNavigate={handleNavigate}
          onItemError={handleItemError}
          renderItemErrorActions={renderItemErrorActions}
        />
      </PluginDataProvider>
      {items.length > 0 && !isLoading && !isStreaming && (
        <button
          onClick={handleAddWidget}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 px-4 py-3 text-xs text-muted-foreground transition-colors hover:border-border hover:bg-accent/50 hover:text-foreground"
        >
          <Puzzle className="h-3.5 w-3.5" />
          Add widget
        </button>
      )}
      {onboardingModal}
    </div>
  );
}
