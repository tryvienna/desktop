/**
 * FeedRenderer — Top-level component that renders an array of feed items
 * with smart auto-layout.
 *
 * Supports three item kinds:
 * - **spec**: json-render specs rendered via <Renderer /> (AI-generated or inline)
 * - **plugin**: Plugin feed canvas components rendered directly
 * - **entity**: Entity feedCard components rendered directly
 *
 * Auto-layout groups consecutive small cards (StatCard, ProgressCard) into
 * responsive grid rows of 2–3, while larger cards span full width.
 */

import { useMemo, useCallback, type ComponentType, type ReactNode } from 'react';
import { Renderer, JSONUIProvider } from '@json-render/react';
import type { ComponentRegistry } from '@json-render/react';
import type { FeedCardSpec, FeedItem } from './types';
import { BUILT_IN_COMPONENTS } from './registry';
import { FeedNavigationProvider, type FeedNavigateHandler } from './FeedNavigationContext';
import { FeedItemErrorBoundary } from './FeedItemErrorBoundary';

/** Props passed to plugin feed canvas components by the renderer. */
export interface PluginFeedRenderProps {
  pluginId: string;
  data: Record<string, unknown>;
  hostApi?: unknown;
  onNavigate?: FeedNavigateHandler;
}

/** Props passed to entity feedCard components by the renderer. */
export interface EntityFeedCardRenderProps {
  uri: string;
  onNavigate?: FeedNavigateHandler;
}

/** Props passed to native feed widget components by the renderer. */
export interface WidgetFeedRenderProps {
  widgetId: string;
  props: Record<string, unknown>;
  onNavigate?: FeedNavigateHandler;
}

export interface FeedRendererProps {
  /** Feed items to render (specs, plugin canvases, entity feed cards) */
  items: FeedItem[];
  /** Combined component registry (built-in + plugin components) for json-render */
  registry?: ComponentRegistry;
  /** Plugin feed canvas components keyed by pluginId */
  pluginFeedComponents?: Record<string, ComponentType<PluginFeedRenderProps>>;
  /** Entity feedCard components keyed by entity type */
  entityFeedCards?: Record<string, ComponentType<EntityFeedCardRenderProps>>;
  /** Native feed widget components keyed by widgetId */
  widgetFeedComponents?: Record<string, ComponentType<WidgetFeedRenderProps>>;
  /** Whether the AI is currently generating (text deltas arriving) */
  isStreaming?: boolean;
  /** Whether we're waiting for the AI to start responding */
  isLoading?: boolean;
  /** Whether a refresh is in progress (existing content stays visible) */
  isRefreshing?: boolean;
  /** Factory that creates a PluginHostApi for a given pluginId (passed to plugin feed components). */
  createHostApi?: (pluginId: string) => unknown;
  /** Called when a user clicks a @vienna// entity URI in a feed card */
  onNavigate?: FeedNavigateHandler;
  /** Called when a feed item's error boundary catches a render error. */
  onItemError?: (error: Error, item: FeedItem) => void;
  /** Render extra action buttons in the per-item error fallback (e.g., "Ask Vienna to fix"). */
  renderItemErrorActions?: (error: Error, item: FeedItem) => ReactNode;
  className?: string;
}

/** Fallback component rendered for unknown element types. */
function UnknownComponent() {
  return null;
}

/** Card types that render compactly and should group into grid rows. */
const COMPACT_TYPES = new Set(['StatCard', 'ProgressCard']);

/** Get the root element type from a spec. */
function getRootType(spec: FeedCardSpec): string {
  const root = spec.spec.elements[spec.spec.root];
  return root?.type ?? '';
}

/** Check if a FeedItem is a compact spec card. */
function isCompactItem(item: FeedItem): boolean {
  if (item.kind !== 'spec') return false;
  return COMPACT_TYPES.has(getRootType(item.cardSpec));
}

interface LayoutGroup {
  kind: 'full' | 'grid';
  items: FeedItem[];
  startIndex: number;
}

/**
 * Group consecutive compact spec cards into grid rows, everything else full-width.
 */
function buildLayout(items: FeedItem[]): LayoutGroup[] {
  const groups: LayoutGroup[] = [];
  let compactRun: FeedItem[] = [];
  let compactStart = 0;

  const flushCompact = () => {
    if (compactRun.length > 0) {
      groups.push({ kind: 'grid', items: compactRun, startIndex: compactStart });
      compactRun = [];
    }
  };

  for (let i = 0; i < items.length; i++) {
    if (isCompactItem(items[i])) {
      if (compactRun.length === 0) compactStart = i;
      compactRun.push(items[i]);
    } else {
      flushCompact();
      groups.push({ kind: 'full', items: [items[i]], startIndex: i });
    }
  }
  flushCompact();

  return groups;
}

/** Get a unique key for a feed item. */
function getItemKey(item: FeedItem): string {
  switch (item.kind) {
    case 'spec': return item.cardSpec.id;
    case 'plugin': return item.id;
    case 'entity': return item.id;
    case 'widget': return item.id;
  }
}

/**
 * Skeleton placeholder that mimics a diverse feed layout.
 */
function FeedSkeleton() {
  return (
    <div className="grid gap-3 animate-in fade-in duration-300">
      {/* Text card skeleton */}
      <div
        className="rounded-xl border border-border bg-card p-4 shadow-sm dark:bg-surface-interactive animate-in fade-in slide-in-from-bottom-1 duration-500 fill-mode-backwards"
        style={{ animationDelay: '0ms' }}
      >
        <div className="mb-3 h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-muted/60" style={{ animationDelay: '75ms' }} />
          <div className="h-3 w-3/4 animate-pulse rounded bg-muted/60" style={{ animationDelay: '150ms' }} />
        </div>
      </div>

      {/* Stat cards row skeleton */}
      <div
        className="grid grid-cols-3 gap-3 animate-in fade-in slide-in-from-bottom-1 duration-500 fill-mode-backwards"
        style={{ animationDelay: '100ms' }}
      >
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-sm dark:bg-surface-interactive">
            <div
              className="mb-2 h-2.5 w-14 animate-pulse rounded bg-muted"
              style={{ animationDelay: `${200 + i * 75}ms` }}
            />
            <div
              className="h-6 w-12 animate-pulse rounded bg-muted/60"
              style={{ animationDelay: `${250 + i * 75}ms` }}
            />
          </div>
        ))}
      </div>

      {/* List card skeleton */}
      <div
        className="rounded-xl border border-border bg-card p-4 shadow-sm dark:bg-surface-interactive animate-in fade-in slide-in-from-bottom-1 duration-500 fill-mode-backwards"
        style={{ animationDelay: '200ms' }}
      >
        <div className="mb-3 h-2.5 w-20 animate-pulse rounded bg-muted" />
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className="h-5 w-5 shrink-0 animate-pulse rounded bg-muted/60"
                style={{ animationDelay: `${350 + i * 75}ms` }}
              />
              <div
                className="h-3 animate-pulse rounded bg-muted/60"
                style={{ width: `${65 - i * 10}%`, animationDelay: `${350 + i * 75}ms` }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Render a single feed item. */
function FeedItemRenderer({
  item,
  registry,
  isStreaming,
  pluginFeedComponents,
  entityFeedCards,
  widgetFeedComponents,
  createHostApi,
  onNavigate,
}: {
  item: FeedItem;
  registry: ComponentRegistry;
  isStreaming?: boolean;
  pluginFeedComponents?: Record<string, ComponentType<PluginFeedRenderProps>>;
  entityFeedCards?: Record<string, ComponentType<EntityFeedCardRenderProps>>;
  widgetFeedComponents?: Record<string, ComponentType<WidgetFeedRenderProps>>;
  createHostApi?: (pluginId: string) => unknown;
  onNavigate?: FeedNavigateHandler;
}) {
  if (item.kind === 'spec') {
    return (
      <Renderer
        spec={item.cardSpec.spec}
        registry={registry}
        loading={isStreaming}
        fallback={UnknownComponent}
      />
    );
  }

  if (item.kind === 'plugin') {
    const PluginComponent = pluginFeedComponents?.[item.pluginId];
    if (!PluginComponent) return null;
    return (
      <PluginComponent
        pluginId={item.pluginId}
        data={item.props ?? {}}
        hostApi={createHostApi?.(item.pluginId)}
        onNavigate={onNavigate}
      />
    );
  }

  if (item.kind === 'entity') {
    const EntityComponent = entityFeedCards?.[item.entityType];
    if (!EntityComponent) return null;
    return (
      <EntityComponent
        uri={item.uri}
        onNavigate={onNavigate}
      />
    );
  }

  if (item.kind === 'widget') {
    const WidgetComponent = widgetFeedComponents?.[item.widgetId];
    if (!WidgetComponent) return null;
    return (
      <WidgetComponent
        widgetId={item.widgetId}
        props={item.props ?? {}}
        onNavigate={onNavigate}
      />
    );
  }

  return null;
}

export function FeedRenderer({
  items,
  registry,
  pluginFeedComponents,
  entityFeedCards,
  widgetFeedComponents,
  isStreaming,
  isLoading,
  isRefreshing,
  createHostApi,
  onNavigate,
  onItemError,
  renderItemErrorActions,
  className,
}: FeedRendererProps) {
  const effectiveRegistry = useMemo(
    () => registry ?? BUILT_IN_COMPONENTS,
    [registry],
  );

  const layout = useMemo(() => buildLayout(items), [items]);

  // Stable factories: create callbacks bound to a specific item
  const makeOnError = useCallback(
    (item: FeedItem) =>
      onItemError
        ? (error: Error) => onItemError(error, item)
        : undefined,
    [onItemError],
  );

  const makeRenderActions = useCallback(
    (item: FeedItem) =>
      renderItemErrorActions
        ? (error: Error) => renderItemErrorActions(error, item)
        : undefined,
    [renderItemErrorActions],
  );

  const showSkeleton = (isLoading || isStreaming) && items.length === 0;

  if (items.length === 0 && !isLoading && !isStreaming) {
    return null;
  }

  return (
    <FeedNavigationProvider value={onNavigate ?? null}>
      <JSONUIProvider registry={effectiveRegistry}>
        <div className={className}>
          {/* Refreshing indicator */}
          {isRefreshing && items.length > 0 && (
            <div className="mb-3 flex items-center gap-2 text-[11px] text-muted-foreground">
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
                <path d="M14.5 8a6.5 6.5 0 0 0-6.5-6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span>Updating feed...</span>
            </div>
          )}
          {showSkeleton ? (
            <FeedSkeleton />
          ) : (
            <div className="grid gap-3">
              {layout.map((group) => {
                if (group.kind === 'grid') {
                  const colClass = group.items.length >= 3 ? 'grid-cols-3' : 'grid-cols-2';
                  return (
                    <div
                      key={`grid-${group.startIndex}`}
                      className={`grid ${colClass} gap-3`}
                    >
                      {group.items.map((item, i) => (
                        <div
                          key={getItemKey(item)}
                          className="animate-in fade-in slide-in-from-bottom-1 duration-400 fill-mode-backwards"
                          style={{ animationDelay: `${(group.startIndex + i) * 50}ms` }}
                        >
                          <FeedItemErrorBoundary onError={makeOnError(item)} renderActions={makeRenderActions(item)}>
                            <FeedItemRenderer
                              item={item}
                              registry={effectiveRegistry}
                              isStreaming={isStreaming}
                              pluginFeedComponents={pluginFeedComponents}
                              entityFeedCards={entityFeedCards}
                              widgetFeedComponents={widgetFeedComponents}
                              createHostApi={createHostApi}
                              onNavigate={onNavigate}
                            />
                          </FeedItemErrorBoundary>
                        </div>
                      ))}
                    </div>
                  );
                }

                // Full-width item
                const item = group.items[0];
                return (
                  <div
                    key={getItemKey(item)}
                    className="animate-in fade-in slide-in-from-bottom-1 duration-400 fill-mode-backwards"
                    style={{ animationDelay: `${group.startIndex * 50}ms` }}
                  >
                    <FeedItemErrorBoundary onError={makeOnError(item)} renderActions={makeRenderActions(item)}>
                      <FeedItemRenderer
                        item={item}
                        registry={effectiveRegistry}
                        isStreaming={isStreaming}
                        pluginFeedComponents={pluginFeedComponents}
                        entityFeedCards={entityFeedCards}
                        widgetFeedComponents={widgetFeedComponents}
                        createHostApi={createHostApi}
                        onNavigate={onNavigate}
                      />
                    </FeedItemErrorBoundary>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </JSONUIProvider>
    </FeedNavigationProvider>
  );
}
