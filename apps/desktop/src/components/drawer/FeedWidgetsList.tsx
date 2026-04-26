/**
 * FeedWidgetsList — Combined toggle list for built-in widgets and plugin feed canvases.
 *
 * @ai-context
 * - Opened via in-drawer navigation from FeedEditorDrawer ("Widgets" button)
 * - Two sections: "Built-in" (native widgets) and "Plugins" (plugin feed canvases)
 * - Toggle ON appends `@vienna//widget/{id}?params` or `@vienna//plugin/{id}` to feed.md
 * - Toggle OFF removes the matching line
 * - Triggers feed refresh after each toggle
 */

import { useCallback, useEffect, useState } from 'react';
import { Switch } from '@tryvienna/ui';
import type { PluginIcon, ResolvedFeedCanvas } from '@tryvienna/sdk';
import type { LucideIcon } from 'lucide-react';
import { getApi } from '@vienna/ipc/renderer';
import { api } from '../../ipc/index';
import { DrawerContainer } from '../../lib/drawer';
import type { DrawerContentDescriptor } from '../../lib/drawer';
import { getFeedWidgetsPayload } from './content';
import { usePluginSystem } from '../../renderer/contexts/PluginSystemContext';
import { emitFeedRefresh } from '../feed/use-feed';
import { getAllNativeWidgets, type NativeFeedWidgetConfig } from '../feed/widgets';
import { Puzzle, Blocks } from 'lucide-react';

export interface FeedWidgetsListProps {
  content: DrawerContentDescriptor;
}

// ─────────────────────────────────────────────────────────────────────────────
// Line helpers — same pattern as FeedPluginsList but for widget URIs
// ─────────────────────────────────────────────────────────────────────────────

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Plugin line helpers

function hasPluginLine(content: string, pluginId: string): boolean {
  const re = new RegExp(`^@vienna//plugin/${escapeRegExp(pluginId)}(\\?.*)?$`, 'm');
  return re.test(content);
}

function addPluginLine(content: string, pluginId: string): string {
  const trimmed = content.trimEnd();
  return trimmed ? `${trimmed}\n\n@vienna//plugin/${pluginId}\n` : `@vienna//plugin/${pluginId}\n`;
}

function removePluginLine(content: string, pluginId: string): string {
  const re = new RegExp(`\\n?@vienna//plugin/${escapeRegExp(pluginId)}(\\?[^\\n]*)?\\n?`, 'g');
  return content.replace(re, '\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

// Widget line helpers

function hasWidgetLine(content: string, widgetId: string): boolean {
  const re = new RegExp(`^@vienna//widget/${escapeRegExp(widgetId)}(\\?.*)?$`, 'm');
  return re.test(content);
}

function addWidgetLine(content: string, widgetId: string, defaultParams?: Record<string, string>): string {
  const trimmed = content.trimEnd();
  let uri = `@vienna//widget/${widgetId}`;
  if (defaultParams && Object.keys(defaultParams).length > 0) {
    const params = new URLSearchParams(defaultParams).toString();
    uri += `?${params}`;
  }
  return trimmed ? `${trimmed}\n\n${uri}\n` : `${uri}\n`;
}

function removeWidgetLine(content: string, widgetId: string): string {
  const re = new RegExp(`\\n?@vienna//widget/${escapeRegExp(widgetId)}(\\?[^\\n]*)?\\n?`, 'g');
  return content.replace(re, '\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

// ─────────────────────────────────────────────────────────────────────────────
// Icon renderers
// ─────────────────────────────────────────────────────────────────────────────

function PluginIconRenderer({ icon }: { icon: PluginIcon }) {
  if ('svg' in icon) {
    return (
      <span
        className="inline-flex size-4 shrink-0 [&>svg]:size-full"
        dangerouslySetInnerHTML={{ __html: icon.svg }}
      />
    );
  }
  if ('png' in icon) {
    return <img src={`data:image/png;base64,${icon.png}`} className="size-4 shrink-0" alt="" />;
  }
  return <Puzzle className="size-4 shrink-0 text-muted-foreground" />;
}

function WidgetIconRenderer({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon className="size-4 shrink-0 text-muted-foreground" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Toggle Row — shared layout for both built-in widgets and plugins
// ─────────────────────────────────────────────────────────────────────────────

interface ToggleRowProps {
  icon: React.ReactNode;
  name: string;
  description?: string;
  enabled: boolean;
  disabled: boolean;
  onToggle: (checked: boolean) => void;
}

function ToggleRow({ icon, name, description, enabled, disabled, onToggle }: ToggleRowProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-accent/50">
      <div className="flex size-7 items-center justify-center rounded-md bg-accent">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground">{name}</div>
        {description && (
          <div className="text-xs text-muted-foreground">
            <span className={expanded ? '' : 'line-clamp-1'}>{description}</span>
            <button
              onClick={() => setExpanded(!expanded)}
              className="ml-1 cursor-pointer text-[11px] underline decoration-muted-foreground/40 underline-offset-2 text-muted-foreground/70 hover:text-foreground hover:decoration-foreground/40 transition-colors"
            >
              {expanded ? 'less' : 'more'}
            </button>
          </div>
        )}
      </div>
      <Switch
        checked={enabled}
        disabled={disabled}
        onCheckedChange={onToggle}
        className="shrink-0 scale-90 data-[state=checked]:bg-foreground data-[state=unchecked]:bg-muted"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Header
// ─────────────────────────────────────────────────────────────────────────────

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 pt-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
      {icon}
      {label}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function FeedWidgetsList({ content }: FeedWidgetsListProps) {
  const payload = getFeedWidgetsPayload(content);
  const filePath = payload?.filePath ?? '';
  const projectId = payload?.projectId ?? '__global__';

  const system = usePluginSystem();
  const feedCanvases = system?.getFeedCanvases() ?? [];
  const nativeWidgets = getAllNativeWidgets();

  const [fileContent, setFileContent] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Load file content
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ipc = getApi(api);
      const result = await ipc.feed.readFeedFile({ filePath, projectId });
      if (cancelled) return;
      setFileContent(result.exists ? result.content : '');
      setIsLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [filePath, projectId]);

  const handleWidgetToggle = useCallback(
    async (widgetId: string, enabled: boolean, defaultParams?: Record<string, string>) => {
      setTogglingId(widgetId);
      try {
        const newContent = enabled
          ? addWidgetLine(fileContent, widgetId, defaultParams)
          : removeWidgetLine(fileContent, widgetId);

        const ipc = getApi(api);
        const result = await ipc.feed.writeFeedFile({ filePath, content: newContent, projectId });
        if (result.success) {
          setFileContent(newContent);
          emitFeedRefresh();
        }
      } finally {
        setTogglingId(null);
      }
    },
    [fileContent, filePath, projectId],
  );

  const handlePluginToggle = useCallback(
    async (pluginId: string, enabled: boolean) => {
      setTogglingId(pluginId);
      try {
        const newContent = enabled
          ? addPluginLine(fileContent, pluginId)
          : removePluginLine(fileContent, pluginId);

        const ipc = getApi(api);
        const result = await ipc.feed.writeFeedFile({ filePath, content: newContent, projectId });
        if (result.success) {
          setFileContent(newContent);
          emitFeedRefresh();
        }
      } finally {
        setTogglingId(null);
      }
    },
    [fileContent, filePath, projectId],
  );

  // Build plugin list items
  const plugins: Array<{
    id: string;
    name: string;
    icon: PluginIcon | undefined;
    description: string | undefined;
    enabled: boolean;
  }> = feedCanvases.map((canvas: ResolvedFeedCanvas) => {
    const plugin = system?.getPlugin(canvas.pluginId);
    return {
      id: canvas.pluginId,
      name: plugin?.name ?? canvas.pluginId,
      icon: plugin?.icon,
      description: canvas.config.description,
      enabled: isLoaded && hasPluginLine(fileContent, canvas.pluginId),
    };
  });

  const hasAny = nativeWidgets.length > 0 || plugins.length > 0;

  return (
    <DrawerContainer title="Feed Widgets" contentClassName="!overflow-y-auto">
      {!isLoaded ? (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          Loading...
        </div>
      ) : !hasAny ? (
        <div className="flex h-32 flex-col items-center justify-center gap-2 text-center">
          <Blocks className="h-6 w-6 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No widgets available</p>
        </div>
      ) : (
        <div className="flex flex-col gap-px">
          {/* Built-in widgets */}
          {nativeWidgets.length > 0 && (
            <>
              <SectionLabel icon={<Blocks className="h-3 w-3" />} label="Built-in" />
              {nativeWidgets.map((widget: NativeFeedWidgetConfig) => (
                <ToggleRow
                  key={`widget:${widget.id}`}
                  icon={<WidgetIconRenderer icon={widget.icon} />}
                  name={widget.label}
                  description={widget.description}
                  enabled={isLoaded && hasWidgetLine(fileContent, widget.id)}
                  disabled={togglingId !== null}
                  onToggle={(checked) => handleWidgetToggle(widget.id, checked, widget.defaultParams)}
                />
              ))}
            </>
          )}

          {/* Plugin feed canvases */}
          {plugins.length > 0 && (
            <>
              <SectionLabel icon={<Puzzle className="h-3 w-3" />} label="Plugins" />
              {plugins.map((plugin) => (
                <ToggleRow
                  key={`plugin:${plugin.id}`}
                  icon={
                    plugin.icon ? (
                      <PluginIconRenderer icon={plugin.icon} />
                    ) : (
                      <Puzzle className="size-3.5 text-muted-foreground" />
                    )
                  }
                  name={plugin.name}
                  description={plugin.description}
                  enabled={plugin.enabled}
                  disabled={togglingId !== null}
                  onToggle={(checked) => handlePluginToggle(plugin.id, checked)}
                />
              ))}
            </>
          )}
        </div>
      )}
    </DrawerContainer>
  );
}
