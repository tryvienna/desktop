/**
 * useCustomizedPlugins — Loads customized plugin definitions into the renderer.
 *
 * On mount, queries the main process for customized plugins, fetches their
 * renderer bundles, evaluates them, and replaces built-in definitions in the
 * PluginSystem. Listens for plugin change events to hot-reload.
 *
 * Must be rendered inside PluginSystemProvider.
 */

import { useEffect, useRef } from 'react';
import type { PluginDefinition } from '@tryvienna/sdk';
import { getApi, getEvents } from '@vienna/ipc/renderer';
import { api, events } from '../../ipc';
import { evaluateRendererBundle } from '../../lib/plugin-runtime/component-loader';
import { usePluginSystem, useNotifyPluginChanged, type PluginError } from '../contexts/PluginSystemContext';
import { rendererLogger } from '../logger';

const logger = rendererLogger.child({ component: 'useCustomizedPlugins' });

/** Stores builtin definitions so they can be restored after unloading customized plugins. */
const builtinDefinitions = new Map<string, PluginDefinition>();

/**
 * Evaluate a renderer bundle and register the resulting PluginDefinition.
 * Returns true on success. On failure, dispatches a plugin-error event.
 */
function loadCustomizedPlugin(
  system: ReturnType<typeof usePluginSystem>,
  pluginId: string,
  code: string,
): boolean {
  try {
    const definition = evaluateRendererBundle(code, pluginId) as PluginDefinition;

    if (!definition || typeof definition !== 'object' || !definition.id) {
      const msg = 'Invalid plugin definition from renderer bundle (missing id)';
      logger.error(msg, { pluginId });
      dispatchPluginError(pluginId, msg);
      return false;
    }

    // Save the builtin definition before replacing it (only on first replace)
    const existingBuiltin = system.getPlugin(pluginId);
    if (!builtinDefinitions.has(pluginId) && existingBuiltin) {
      builtinDefinitions.set(pluginId, existingBuiltin);
    }

    // Replace existing registration
    system.unregisterPlugin(pluginId);
    system.registerPlugin(definition);

    logger.info('Loaded customized plugin in renderer', {
      pluginId,
      entities: definition.entities.length,
    });
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Failed to load customized plugin in renderer', {
      pluginId,
      error: message,
    });
    dispatchPluginError(pluginId, message);
    return false;
  }
}

/**
 * Restore the builtin plugin definition after unloading a customized one.
 */
function restoreBuiltinPlugin(
  system: ReturnType<typeof usePluginSystem>,
  pluginId: string,
): void {
  const builtin = builtinDefinitions.get(pluginId);

  system.unregisterPlugin(pluginId);

  if (builtin) {
    system.registerPlugin(builtin);
    builtinDefinitions.delete(pluginId);
    logger.info('Restored builtin plugin in renderer', { pluginId });
  } else {
    logger.info('Unregistered local plugin from renderer (no builtin to restore)', { pluginId });
  }
}

/** Dispatch a renderer-side plugin error via custom DOM event. */
function dispatchPluginError(pluginId: string, error: string) {
  const detail: PluginError = { pluginId, error, phase: 'renderer', timestamp: Date.now() };
  // eslint-disable-next-line no-restricted-properties
  window.dispatchEvent(new CustomEvent('plugin:error', { detail }));
}

/**
 * Hook that initializes customized plugins and listens for hot-reload events.
 * Call once at the top level of the app (inside PluginSystemProvider).
 */
export function useCustomizedPlugins(): void {
  const system = usePluginSystem();
  const notifyPluginChanged = useNotifyPluginChanged();
  const systemRef = useRef(system);
  systemRef.current = system;

  useEffect(() => {
    const ipc = getApi(api);
    const eventSubs = getEvents(events);
    let cancelled = false;

    // Load all customized plugins on mount
    async function initializeCustomizedPlugins() {
      try {
        const { plugins } = await ipc.plugin.getCustomizedPlugins({});
        if (cancelled || plugins.length === 0) return;

        let changed = false;
        for (const { pluginId } of plugins) {
          const { code } = await ipc.plugin.getRendererBundle({ pluginId });
          if (cancelled) return;
          if (code) {
            const ok = loadCustomizedPlugin(systemRef.current, pluginId, code);
            if (ok) changed = true;
          }
        }

        if (changed) {
          notifyPluginChanged();
        }
      } catch (err) {
        logger.error('Failed to initialize customized plugins', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    initializeCustomizedPlugins();

    // Listen for hot-reload events
    const unsubChanged = eventSubs.plugin.onPluginChanged(async ({ pluginId, action }) => {
      logger.info('Plugin change event received', { pluginId, action });

      if (action === 'unloaded') {
        restoreBuiltinPlugin(systemRef.current, pluginId);
        notifyPluginChanged();
        return;
      }

      // loaded or reloaded — fetch new bundle
      try {
        const { code } = await ipc.plugin.getRendererBundle({ pluginId });
        if (code) {
          loadCustomizedPlugin(systemRef.current, pluginId, code);
          notifyPluginChanged();
        }
      } catch (err) {
        logger.error('Failed to hot-reload customized plugin', {
          pluginId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });

    return () => {
      cancelled = true;
      unsubChanged();
    };
  }, [notifyPluginChanged]);
}
