/**
 * StoreDetailView — Plugin detail view for the store drawer.
 *
 * Shows plugin info, install/uninstall CTA, and overview content.
 * All state derives from GraphQL via useRegistryPlugins().
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Download, Check, Trash2, HardDrive, Unplug, Loader2, ArrowUpCircle, Copy, CheckCheck, AlertCircle, X } from 'lucide-react';
import { Button, Badge, Tabs, TabsList, TabsTrigger, TabsContent, Markdown } from '@tryvienna/ui';
import { getApi } from '@vienna/ipc/renderer';
import { api } from '../../ipc';
import { useRegistryPlugins } from './use-registry-plugins';
import type { PluginCardData } from './StoreListView';
import { CustomizePanel } from './CustomizePanel';
import { usePluginSystem, usePluginSystemVersion, usePluginErrors } from '../../renderer/contexts/PluginSystemContext';
import { useLoadedPlugins } from '../../renderer/hooks/useLoadedPlugins';
import { useDeveloperMode } from '../../renderer/hooks/useDeveloperMode';
import { rendererLogger } from '../../renderer/logger';

const logger = rendererLogger.child({ component: 'StoreDetailView' });

interface StoreDetailViewProps {
  card: PluginCardData;
  initialTab?: string;
}

/** Fetch README content from the main process. */
function usePluginReadme(pluginId: string): { content: string | null; loading: boolean } {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setContent(null);
    const ipc = getApi(api);
    ipc.plugin.getPluginReadme({ pluginId })
      .then(({ content: md }) => {
        setContent(md);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [pluginId]);

  return { content, loading };
}

export function StoreDetailView({ card, initialTab }: StoreDetailViewProps) {
  const {
    installedPlugins,
    install: installFromRegistry,
    uninstall: uninstallFromRegistry,
    update: updateFromRegistry,
    installingId,
    uninstallingId,
    updatingId,
  } = useRegistryPlugins();
  const system = usePluginSystem();
  usePluginSystemVersion(); // subscribe to plugin changes for reactive updates
  const { errors: pluginErrors, dismissError } = usePluginErrors();

  const { plugins: loadedPlugins } = useLoadedPlugins();

  // Derive local status from the live PluginSystem — after unload the plugin
  // is unregistered, so isLocal flips to false and the UI updates reactively.
  const isLocal = card.source === 'local' && !!system.getPlugin(card.id);
  const localPath = loadedPlugins.find((p) => p.id === card.id && p.source === 'local')?.localPath;

  // Derive live install state from GraphQL data, not the static card snapshot.
  // Local plugins are not in the install DB but are already loaded at runtime.
  const liveInstalled = installedPlugins.find((p) => p.id === card.id);
  const installed = !!liveInstalled || isLocal;
  const hasUpdate = liveInstalled?.hasUpdate ?? false;

  const { content: readmeContent, loading: readmeLoading } = usePluginReadme(card.id);
  const devMode = useDeveloperMode();

  // Fetch the dev callback port for building test install links
  const [devPort, setDevPort] = useState<number | null>(null);
  useEffect(() => {
    if (!devMode) return;
    const ipc = getApi(api);
    ipc.plugin.getDevInstallPort({}).then(({ port }) => setDevPort(port)).catch((err) => {
      logger.debug('Failed to fetch dev install port', { error: String(err) });
    });
  }, [devMode]);

  const devInstallUrl = useMemo(() => {
    if (!devMode || !devPort || !card.repo) return null;
    const params = new URLSearchParams({
      repo: card.repo,
      name: card.name,
      slug: card.id,
    });
    return `http://localhost:${devPort}/plugin/install?${params.toString()}`;
  }, [devMode, devPort, card.repo, card.name, card.id]);

  const [copied, setCopied] = useState(false);
  const handleCopyDevUrl = useCallback(() => {
    if (!devInstallUrl) return;
    void navigator.clipboard.writeText(devInstallUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [devInstallUrl]);

  const isInstalling = installingId === card.id;
  const isUninstalling = uninstallingId === card.id;
  const isUpdating = updatingId === card.id;

  const resolveInitialTab = () => {
    if (initialTab === 'customize' && !installed) return 'readme';
    return initialTab ?? 'readme';
  };
  const [activeTab, setActiveTab] = useState(resolveInitialTab);

  const handleInstall = useCallback(async () => {
    await installFromRegistry(card.id);
  }, [card.id, installFromRegistry]);

  const handleUninstall = useCallback(async () => {
    await uninstallFromRegistry(card.id);
  }, [card.id, uninstallFromRegistry]);

  const handleUpdate = useCallback(async () => {
    await updateFromRegistry(card.id);
  }, [card.id, updateFromRegistry]);

  const handleUnloadLocal = useCallback(async () => {
    const ipc = getApi(api);
    await ipc.plugin.unloadLocalPlugin({ pluginId: card.id });
  }, [card.id]);

  // ── README content ──
  const readmeTab = (
    <div className="flex flex-col gap-3">
      {readmeLoading && (
        <p className="text-sm text-muted-foreground">Loading...</p>
      )}
      {!readmeLoading && readmeContent && (
        <Markdown content={readmeContent} size="sm" />
      )}
      {!readmeLoading && !readmeContent && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No README.md found for this plugin.
          </p>
        </div>
      )}
    </div>
  );

  // ── Overview content ──
  const overviewContent = (
    <div className="flex flex-col gap-5">
      {card.version && (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Version</h3>
          <p className="text-sm text-foreground">{card.version}</p>
        </div>
      )}
      {card.author && (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Author</h3>
          <p className="text-sm text-foreground">{card.author}</p>
        </div>
      )}
      {card.source && (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Source</h3>
          <p className="text-sm text-foreground capitalize">{card.source}</p>
        </div>
      )}
      {isLocal && localPath && (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Local Path</h3>
          <p className="break-all font-mono text-xs text-foreground">{localPath}</p>
        </div>
      )}
      {card.tags.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tags</h3>
          <div className="flex flex-wrap gap-1.5">
            {card.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[11px]">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {devInstallUrl && (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Dev Install Link</h3>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded-md bg-muted px-2 py-1.5 text-[11px] text-foreground/80">
              {devInstallUrl}
            </code>
            <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={handleCopyDevUrl}>
              {copied ? <CheckCheck className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const showCustomize = installed && !isLocal;
  const pluginError = pluginErrors.get(card.id) ?? null;

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header + CTA */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">{card.name}</h2>
            {isLocal && (
              <Badge variant="outline" className="gap-1 text-[10px] text-blue-500 border-blue-500/30">
                <HardDrive className="size-3" />
                Local
              </Badge>
            )}
          </div>
          {card.author && (
            <p className="text-xs text-muted-foreground">by {card.author}</p>
          )}
        </div>

        {card.description && (
          <p className="text-sm leading-relaxed text-foreground/90">{card.description}</p>
        )}

        {/* Install / Uninstall / Update CTA */}
        <div className="flex items-center gap-2">
          {installed ? (
            <>
              {hasUpdate && (
                <Button variant="default" size="sm" className="gap-1.5" onClick={handleUpdate} disabled={isUpdating}>
                  {isUpdating ? <Loader2 className="size-3 animate-spin" /> : <ArrowUpCircle className="size-3" />}
                  Update
                </Button>
              )}
              {!hasUpdate && (
                <Button variant="outline" size="sm" className="gap-1.5" disabled>
                  <Check className="size-3" />
                  Installed
                </Button>
              )}
              {isLocal ? (
                <Button variant="ghost" size="sm" className="gap-1.5 text-destructive" onClick={handleUnloadLocal}>
                  <Unplug className="size-3" />
                  Unload
                </Button>
              ) : (
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={handleUninstall} disabled={isUninstalling}>
                  {isUninstalling ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                  Uninstall
                </Button>
              )}
            </>
          ) : (
            <Button variant="default" size="sm" className="gap-1.5" onClick={handleInstall} disabled={isInstalling}>
              {isInstalling ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}
              Install
            </Button>
          )}
        </div>
      </div>

      {/* Plugin error banner */}
      {pluginError && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">
              Failed to load
              {pluginError.phase !== 'bundle' && (
                <span className="ml-1 font-normal opacity-70">({pluginError.phase})</span>
              )}
            </p>
            <p className="mt-0.5 break-all font-mono text-xs opacity-80">
              {pluginError.error}
            </p>
          </div>
          <button
            type="button"
            onClick={() => dismissError(card.id)}
            className="ml-auto shrink-0 opacity-60 transition-opacity hover:opacity-100"
            aria-label="Dismiss error"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Tabbed content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="readme">README</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {showCustomize && <TabsTrigger value="customize">Customize</TabsTrigger>}
        </TabsList>
        <TabsContent value="readme">{readmeTab}</TabsContent>
        <TabsContent value="overview">{overviewContent}</TabsContent>
        {showCustomize && (
          <TabsContent value="customize">
            <CustomizePanel pluginId={card.id} pluginName={card.name} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
