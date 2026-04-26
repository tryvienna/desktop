/**
 * FeedPluginsList — Shows installed plugins with feed canvases and toggles to
 * inject/remove `@vienna//plugin/{id}` references in the current feed.md file.
 *
 * @ai-context
 * - Opened via in-drawer navigation from FeedEditorDrawer
 * - Reads/writes feed.md via feed IPC (same as FeedEditorDrawer)
 * - Toggle ON appends `@vienna//plugin/{id}` line to the file
 * - Toggle OFF removes the matching line
 * - Triggers feed refresh after each toggle
 */

import { useCallback, useEffect, useState } from 'react';
import { Switch } from '@tryvienna/ui';
import type { PluginIcon, ResolvedFeedCanvas } from '@tryvienna/sdk';
import { getApi } from '@vienna/ipc/renderer';
import { api } from '../../ipc/index';
import { DrawerContainer } from '../../lib/drawer';
import type { DrawerContentDescriptor } from '../../lib/drawer';
import { getFeedPluginsPayload } from './content';
import { usePluginSystem } from '../../renderer/contexts/PluginSystemContext';
import { emitFeedRefresh } from '../feed/use-feed';
import { Puzzle } from 'lucide-react';

export interface FeedPluginsListProps {
  content: DrawerContentDescriptor;
}

interface PluginListItem {
  id: string;
  name: string;
  icon: PluginIcon | undefined;
  label: string;
  description: string | undefined;
  enabled: boolean;
}

/** Escape special regex characters in a string. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Check whether a plugin reference line exists in feed content. */
function hasPluginLine(content: string, pluginId: string): boolean {
  const re = new RegExp(`^@vienna//plugin/${escapeRegExp(pluginId)}(\\?.*)?$`, 'm');
  return re.test(content);
}

/** Append a plugin reference line to feed content. */
function addPluginLine(content: string, pluginId: string): string {
  const trimmed = content.trimEnd();
  return trimmed ? `${trimmed}\n\n@vienna//plugin/${pluginId}\n` : `@vienna//plugin/${pluginId}\n`;
}

/** Remove a plugin reference line from feed content. */
function removePluginLine(content: string, pluginId: string): string {
  const re = new RegExp(`\\n?@vienna//plugin/${escapeRegExp(pluginId)}(\\?[^\\n]*)?\\n?`, 'g');
  return content.replace(re, '\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

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

export function FeedPluginsList({ content }: FeedPluginsListProps) {
  const payload = getFeedPluginsPayload(content);
  const filePath = payload?.filePath ?? '';
  const projectId = payload?.projectId ?? '__global__';

  const system = usePluginSystem();
  const feedCanvases = system?.getFeedCanvases() ?? [];

  const [fileContent, setFileContent] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const handleToggle = useCallback(
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

  // Build list of plugins with their metadata
  const plugins: PluginListItem[] = feedCanvases.map((canvas: ResolvedFeedCanvas) => {
    const plugin = system?.getPlugin(canvas.pluginId);
    return {
      id: canvas.pluginId,
      name: plugin?.name ?? canvas.pluginId,
      icon: plugin?.icon,
      label: canvas.config.label,
      description: canvas.config.description,
      enabled: isLoaded && hasPluginLine(fileContent, canvas.pluginId),
    };
  });

  return (
    <DrawerContainer title="Feed Plugins" contentClassName="!overflow-y-auto">
      {!isLoaded ? (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          Loading...
        </div>
      ) : plugins.length === 0 ? (
        <div className="flex h-32 flex-col items-center justify-center gap-2 text-center">
          <Puzzle className="h-6 w-6 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No plugins with feed canvases installed</p>
        </div>
      ) : (
        <div className="flex flex-col gap-px">
          {plugins.map((plugin) => (
            <div
              key={plugin.id}
              className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-accent/50"
            >
              <div className="flex size-7 items-center justify-center rounded-md bg-accent">
                {plugin.icon ? (
                  <PluginIconRenderer icon={plugin.icon} />
                ) : (
                  <Puzzle className="size-3.5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">{plugin.name}</div>
                {plugin.description && (
                  <div className="text-xs text-muted-foreground">
                    <span className={expandedId === plugin.id ? '' : 'line-clamp-1'}>
                      {plugin.description}
                    </span>
                    <button
                      onClick={() => setExpandedId(expandedId === plugin.id ? null : plugin.id)}
                      className="ml-1 cursor-pointer text-[11px] underline decoration-muted-foreground/40 underline-offset-2 text-muted-foreground/70 hover:text-foreground hover:decoration-foreground/40 transition-colors"
                    >
                      {expandedId === plugin.id ? 'less' : 'more'}
                    </button>
                  </div>
                )}
              </div>
              <Switch
                checked={plugin.enabled}
                disabled={togglingId !== null}
                onCheckedChange={(checked: boolean) => handleToggle(plugin.id, checked)}
                className="shrink-0 scale-90 data-[state=checked]:bg-foreground data-[state=unchecked]:bg-muted"
              />
            </div>
          ))}
        </div>
      )}
    </DrawerContainer>
  );
}
