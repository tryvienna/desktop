/**
 * StoreListView — Browse/search view for the plugin store drawer.
 *
 * All state derives from GraphQL via useRegistryPlugins().
 * Registry plugins are the primary list; installed state is overlaid.
 */

import { useState, useMemo, useCallback } from 'react';
import { Search, Check, Plus, FolderOpen, Download, Loader2, ArrowUpCircle, HardDrive, SlidersHorizontal, AlertCircle } from 'lucide-react';
import { Input, Badge, Button, Popover, PopoverTrigger, PopoverContent } from '@tryvienna/ui';
import { getApi } from '@vienna/ipc/renderer';
import { api } from '../../ipc';
import { useLoadedPlugins } from '../../renderer/hooks/useLoadedPlugins';
import { useAddPluginToDirectories } from '../../renderer/hooks/useAddPluginToDirectories';
import { useRegistryPlugins } from './use-registry-plugins';
import { InstallDependenciesDialog, type MissingDepsInfo } from './InstallDependenciesDialog';
import { usePluginErrors } from '../../renderer/contexts/PluginSystemContext';

/** Canvas type keys used for filtering. */
export type CanvasType = 'nav-sidebar' | 'drawer' | 'menu-bar' | 'feed' | 'workstream-widget';

/** Unified card data derived entirely from GraphQL. */
export interface PluginCardData {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  category: string | null;
  tags: string[];
  author: string | null;
  version: string | null;
  installed: boolean;
  hasUpdate: boolean;
  enabled: boolean;
  source: string;
  /** GitHub repo URL (from registry or installed sourceRef). */
  repo: string | null;
  canvases: Record<CanvasType, boolean>;
}

const DEFAULT_CANVASES: Record<CanvasType, boolean> = { 'nav-sidebar': false, drawer: false, 'menu-bar': false, feed: false, 'workstream-widget': false };

/** Map a registry plugin + optional installed state to a PluginCardData. */
export function toPluginCardData(
  rp: { id?: string | null; name?: string | null; description?: string | null; icon?: string | null; category?: string | null; tags?: readonly (string | null)[] | null; author?: { name?: string | null } | null; version?: string | null; source?: string | null; repo?: string | null; canvases?: { navSidebar?: boolean | null; drawer?: boolean | null; menuBar?: boolean | null; feed?: boolean | null; workstreamWidget?: boolean | null } | null },
  inst?: { enabled?: boolean | null; hasUpdate?: boolean | null; sourceRef?: string | null } | null,
): PluginCardData {
  const c = rp.canvases;
  return {
    id: rp.id ?? '',
    name: rp.name ?? '',
    description: rp.description ?? '',
    icon: rp.icon ?? null,
    category: rp.category ?? null,
    tags: (rp.tags ?? []) as string[],
    author: rp.author?.name ?? null,
    version: rp.version ?? null,
    installed: !!inst,
    hasUpdate: inst?.hasUpdate ?? false,
    enabled: inst?.enabled ?? false,
    source: rp.source ?? 'inline',
    repo: rp.repo ?? inst?.sourceRef ?? null,
    canvases: c ? {
      'nav-sidebar': c.navSidebar ?? false,
      drawer: c.drawer ?? false,
      'menu-bar': c.menuBar ?? false,
      feed: c.feed ?? false,
      'workstream-widget': c.workstreamWidget ?? false,
    } : { ...DEFAULT_CANVASES },
  };
}

/** Human-readable labels for canvas types. */
const CANVAS_LABELS: Record<CanvasType, string> = {
  'nav-sidebar': 'Sidebar',
  drawer: 'Drawer',
  'menu-bar': 'Menu Bar',
  feed: 'Feed',
  'workstream-widget': 'Widget',
};

const ALL_CANVAS_TYPES: CanvasType[] = ['nav-sidebar', 'drawer', 'menu-bar', 'feed', 'workstream-widget'];

interface StoreListViewProps {
  onSelect: (card: PluginCardData) => void;
  onCreatePlugin?: () => void;
  /** Pre-fill the search input. */
  initialSearch?: string;
  /** Pre-select canvas type filters. */
  initialCanvasFilters?: string[];
}

export function StoreListView({ onSelect, onCreatePlugin, initialSearch, initialCanvasFilters }: StoreListViewProps) {
  const {
    registryPlugins,
    installedPlugins,
    installedMap,
    loading,
    install,
    update,
    installingId,
    updatingId,
  } = useRegistryPlugins();
  const { plugins: loadedPlugins } = useLoadedPlugins();
  const { errors: pluginErrors } = usePluginErrors();
  const { addPluginDirectory } = useAddPluginToDirectories();
  const [searchQuery, setSearchQuery] = useState(initialSearch ?? '');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeCanvasFilters, setActiveCanvasFilters] = useState<Set<CanvasType>>(
    () => new Set((initialCanvasFilters ?? []).filter((c): c is CanvasType => ALL_CANVAS_TYPES.includes(c as CanvasType))),
  );
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [missingDeps, setMissingDeps] = useState<MissingDepsInfo | null>(null);

  const loadPlugin = useCallback(async (dirPath: string) => {
    const ipc = getApi(api);
    setLoadingLocal(true);
    setLoadError(null);
    try {
      const result = await ipc.plugin.loadLocalPlugin({ directoryPath: dirPath });
      if (!result.success) {
        if (result.missingDependencies && result.packageManager && result.pluginDir) {
          setMissingDeps({ pluginDir: result.pluginDir, packageManager: result.packageManager });
        } else {
          setLoadError(result.error ?? 'Failed to load plugin');
        }
      } else {
        await addPluginDirectory(dirPath);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingLocal(false);
    }
  }, [addPluginDirectory]);

  const handleLoadPlugin = useCallback(async () => {
    const ipc = getApi(api);
    setLoadError(null);
    const { path: dirPath } = await ipc.shell.pickDirectory({
      title: 'Select Vienna Plugin Directory',
    });
    if (!dirPath) return;
    await loadPlugin(dirPath);
  }, [loadPlugin]);

  const handleDepsInstalled = useCallback(async (pluginDir: string) => {
    setMissingDeps(null);
    await loadPlugin(pluginDir);
  }, [loadPlugin]);

  // Build a lookup of runtime canvas data from all loaded plugins.
  // This is auto-detected from the actual plugin code and always accurate.
  const loadedCanvasMap = useMemo(() => {
    const map = new Map<string, Record<CanvasType, boolean>>();
    for (const lp of loadedPlugins) {
      if (lp.canvases) map.set(lp.id, lp.canvases);
    }
    return map;
  }, [loadedPlugins]);

  // Merge registry plugins with installed state, then append any locally-loaded
  // plugins that aren't in the registry (loaded via "Load Plugin" button).
  const allPlugins = useMemo<PluginCardData[]>(() => {
    const registryIds = new Set<string>();
    const cards: PluginCardData[] = registryPlugins.map((rp) => {
      const id = rp.id ?? '';
      if (id) registryIds.add(id);
      const inst = id ? installedMap.get(id) : undefined;
      const card = toPluginCardData(rp, inst);
      // Prefer runtime canvas data over registry metadata for installed plugins
      const runtimeCanvases = loadedCanvasMap.get(id);
      if (runtimeCanvases) card.canvases = runtimeCanvases;
      return card;
    });

    // Append locally-loaded plugins that aren't in the registry
    for (const lp of loadedPlugins) {
      if (lp.source === 'local') {
        const lpCanvases = lp.canvases ?? DEFAULT_CANVASES;
        if (registryIds.has(lp.id)) {
          const idx = cards.findIndex((c) => c.id === lp.id);
          if (idx >= 0) {
            cards[idx] = { ...cards[idx], source: 'local', installed: true, enabled: true, canvases: lpCanvases };
          }
        } else {
          cards.push({
            id: lp.id,
            name: lp.name,
            description: lp.description ?? '',
            icon: null,
            category: null,
            tags: [],
            author: null,
            version: null,
            installed: true,
            hasUpdate: false,
            enabled: true,
            source: 'local',
            repo: null,
            canvases: lpCanvases,
          });
        }
      }
    }

    // Append installed plugins that aren't in the registry (e.g. installed via deep link)
    for (const ip of installedPlugins) {
      const id = ip.id ?? '';
      if (!id || registryIds.has(id)) continue;
      // Already added as a locally-loaded plugin above
      if (cards.some((c) => c.id === id)) continue;
      const runtimeCanvases = loadedCanvasMap.get(id);
      cards.push({
        id,
        name: ip.name ?? id,
        description: ip.description ?? '',
        icon: ip.icon ?? null,
        category: ip.category ?? null,
        tags: (ip.tags ?? []) as string[],
        author: ip.author ?? null,
        version: ip.version ?? null,
        installed: true,
        hasUpdate: ip.hasUpdate ?? false,
        enabled: ip.enabled ?? false,
        source: ip.source ?? 'github',
        repo: ip.sourceRef ?? null,
        canvases: runtimeCanvases ?? DEFAULT_CANVASES,
      });
    }

    return cards;
  }, [registryPlugins, installedPlugins, loadedPlugins, installedMap, loadedCanvasMap]);

  // Extract categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const p of allPlugins) {
      if (p.category) cats.add(p.category);
    }
    return ['All', ...Array.from(cats).sort()];
  }, [allPlugins]);

  const toggleCanvasFilter = useCallback((canvasType: CanvasType) => {
    setActiveCanvasFilters((prev) => {
      const next = new Set(prev);
      if (next.has(canvasType)) next.delete(canvasType);
      else next.add(canvasType);
      return next;
    });
  }, []);

  // Filter by search + category + canvas types
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allPlugins.filter((p) => {
      if (activeCategory !== 'All' && p.category !== activeCategory) return false;
      if (activeCanvasFilters.size > 0) {
        const hasMatchingCanvas = Array.from(activeCanvasFilters).some((ct) => p.canvases[ct]);
        if (!hasMatchingCanvas) return false;
      }
      if (q) {
        return (
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [allPlugins, searchQuery, activeCategory, activeCanvasFilters]);

  const handleInstall = useCallback(async (pluginId: string) => {
    await install(pluginId);
  }, [install]);

  const handleUpdate = useCallback(async (pluginId: string) => {
    await update(pluginId);
  }, [update]);

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Create Plugin + Load Plugin CTAs */}
      <div className="flex gap-2">
        {onCreatePlugin && (
          <Button variant="outline" className="flex-1 gap-2 border-dashed" onClick={onCreatePlugin}>
            <Plus className="size-4" />
            Create Plugin
          </Button>
        )}
        <Button
          variant="outline"
          className={`${onCreatePlugin ? 'flex-1' : 'w-full'} gap-2 border-dashed`}
          onClick={handleLoadPlugin}
          disabled={loadingLocal}
        >
          <FolderOpen className="size-4" />
          {loadingLocal ? 'Loading...' : 'Load Plugin'}
        </Button>
      </div>

      {/* Load error */}
      {loadError && (
        <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{loadError}</div>
      )}

      {/* Search + Canvas filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search plugins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="!pl-9"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`shrink-0 gap-1.5 px-2.5 ${activeCanvasFilters.size > 0 ? 'border-primary text-primary' : ''}`}
            >
              <SlidersHorizontal className="size-3.5" />
              {activeCanvasFilters.size > 0 && (
                <span className="text-[10px]">{activeCanvasFilters.size}</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-44 p-2">
            <div className="mb-1.5 px-1 text-[11px] font-medium text-muted-foreground">Canvas types</div>
            {ALL_CANVAS_TYPES.map((ct) => (
              <button
                key={ct}
                type="button"
                onClick={() => toggleCanvasFilter(ct)}
                className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-xs transition-colors hover:bg-accent"
              >
                <div className={`flex size-3.5 items-center justify-center rounded border ${
                  activeCanvasFilters.has(ct) ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                }`}>
                  {activeCanvasFilters.has(ct) && <Check className="size-2.5 text-primary-foreground" />}
                </div>
                {CANVAS_LABELS[ct]}
              </button>
            ))}
            {activeCanvasFilters.size > 0 && (
              <button
                type="button"
                onClick={() => setActiveCanvasFilters(new Set())}
                className="mt-1 w-full rounded-md px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                Clear filters
              </button>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Category tabs */}
      {categories.length > 2 && (
        <div className="flex gap-1 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs transition-colors ${
                activeCategory === cat
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Loading plugins...
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h3 className="mb-1 text-sm font-semibold text-foreground">No plugins found</h3>
          <p className="max-w-xs text-xs text-muted-foreground">
            {searchQuery
              ? `No plugins match "${searchQuery}".`
              : 'No plugins available. Sync your registries to discover plugins.'}
          </p>
        </div>
      )}

      {/* Result count */}
      {!loading && filtered.length > 0 && (
        <div className="text-xs text-muted-foreground">
          {filtered.length} plugin{filtered.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Plugin cards */}
      {filtered.length > 0 && (
        <div className="flex flex-col gap-2">
          {filtered.map((card) => (
            <PluginCard
              key={card.id}
              card={card}
              onClick={() => onSelect(card)}
              onInstall={handleInstall}
              onUpdate={handleUpdate}
              installingId={installingId}
              updatingId={updatingId}
              hasError={pluginErrors.has(card.id)}
            />
          ))}
        </div>
      )}

      {/* Install Dependencies Dialog */}
      <InstallDependenciesDialog
        info={missingDeps}
        onClose={() => setMissingDeps(null)}
        onInstalled={handleDepsInstalled}
      />
    </div>
  );
}

// ─── Plugin Card ────────────────────────────────────────────────────────────

interface PluginCardProps {
  card: PluginCardData;
  onClick: () => void;
  onInstall: (pluginId: string) => void;
  onUpdate: (pluginId: string) => void;
  installingId: string | null;
  updatingId: string | null;
  hasError?: boolean;
}

function PluginCard({ card, onClick, onInstall, onUpdate, installingId, updatingId, hasError }: PluginCardProps) {
  const isInstalling = installingId === card.id;
  const isUpdating = updatingId === card.id;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      className="flex flex-col gap-1.5 rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/40 cursor-pointer"
    >
      {/* Top row: category + status */}
      <div className="flex items-center gap-1.5">
        {card.category && (
          <Badge variant="outline" className="text-[10px]">{card.category}</Badge>
        )}
        <span className="ml-auto flex items-center gap-2">
          {hasError && (
            <span className="flex items-center gap-1 text-[10px] text-destructive">
              <AlertCircle className="size-3" />
              Error
            </span>
          )}
          {card.source === 'local' ? (
            <span className="flex items-center gap-1 text-[10px] text-blue-500">
              <HardDrive className="size-3" />
              Local
            </span>
          ) : card.installed ? (
            <span className="flex items-center gap-1 text-[10px] text-green-500">
              <Check className="size-3" />
              Installed
            </span>
          ) : null}
        </span>
      </div>

      {/* Name */}
      <h3 className="text-sm font-semibold text-foreground">{card.name}</h3>

      {/* Description */}
      {card.description && (
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {card.description}
        </p>
      )}

      {/* Metadata + action */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        {card.author && <span>by {card.author}</span>}
        {card.version && <span>v{card.version}</span>}
        {card.tags.length > 0 && <span>{card.tags.slice(0, 3).join(', ')}</span>}

        {/* Install / Update button */}
        <span className="ml-auto" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          {card.hasUpdate && (
            <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-[11px]" onClick={() => onUpdate(card.id)} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="size-3 animate-spin" /> : <ArrowUpCircle className="size-3" />}
              Update
            </Button>
          )}
          {!card.installed && (
            <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-[11px]" onClick={() => onInstall(card.id)} disabled={isInstalling}>
              {isInstalling ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}
              Install
            </Button>
          )}
        </span>
      </div>
    </div>
  );
}
