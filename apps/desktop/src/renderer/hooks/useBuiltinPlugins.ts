/**
 * useBuiltinPlugins — Loads builtin plugin definitions into the renderer PluginSystem.
 *
 * On mount, fetches the list of loaded plugins from main, then fetches
 * each plugin's renderer bundle, evaluates it, and registers the resulting
 * PluginDefinition into the renderer's PluginSystem. This gives the renderer
 * access to canvas React components (nav-sidebar, drawer, menu-bar).
 *
 * Must be rendered inside PluginSystemProvider.
 */

import { useEffect, useRef, useState } from 'react';
import type { PluginDefinition } from '@tryvienna/sdk';
import { getApi } from '@vienna/ipc/renderer';
import { api } from '../../ipc';
import { evaluateRendererBundle } from '../../lib/plugin-runtime/component-loader';
import { usePluginSystem, useNotifyPluginChanged } from '../contexts/PluginSystemContext';
import { rendererLogger } from '../logger';

const logger = rendererLogger.child({ component: 'useBuiltinPlugins' });

/**
 * Hook that loads all builtin plugins into the renderer's PluginSystem.
 * Call once at the top level of the app (inside PluginSystemProvider).
 * Returns true once all builtin plugins have been loaded.
 */
export function useBuiltinPlugins(): boolean {
  const system = usePluginSystem();
  const notifyPluginChanged = useNotifyPluginChanged();
  const systemRef = useRef(system);
  systemRef.current = system;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const ipc = getApi(api);
    let cancelled = false;

    async function loadBuiltinPlugins() {
      try {
        const { plugins } = await ipc.plugin.getLoadedPlugins({});
        if (cancelled || plugins.length === 0) {
          setReady(true);
          return;
        }

        let changed = false;

        // Batch-fetch all renderer bundles in a single IPC call
        const pluginIds = plugins
          .filter((p) => !systemRef.current.getPlugin(p.id))
          .map((p) => p.id);
        if (pluginIds.length === 0) { setReady(true); return; }

        const { bundles } = await ipc.plugin.getRendererBundles({ pluginIds });
        if (cancelled) return;

        for (const pluginInfo of plugins) {
          if (cancelled) return;
          if (systemRef.current.getPlugin(pluginInfo.id)) continue;

          try {
            const code = bundles[pluginInfo.id];
            if (code) {
              const definition = evaluateRendererBundle(code, pluginInfo.id) as PluginDefinition;
              if (definition && typeof definition === 'object' && definition.id) {
                systemRef.current.registerPlugin(definition);
                changed = true;
                logger.info('Loaded builtin plugin in renderer', {
                  pluginId: pluginInfo.id,
                  hasNavSidebar: !!definition.canvases?.['nav-sidebar'],
                  hasDrawer: !!definition.canvases?.drawer,
                });
              }
            }
          } catch (err) {
            logger.warn('Failed to load builtin plugin renderer bundle', {
              pluginId: pluginInfo.id,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }

        if (changed) {
          notifyPluginChanged();
        }
      } catch (err) {
        logger.error('Failed to load builtin plugins', {
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    loadBuiltinPlugins();

    return () => {
      cancelled = true;
    };
  }, [notifyPluginChanged]);

  return ready;
}
