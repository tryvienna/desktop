/**
 * useLoadedPlugins — Fetches serializable plugin metadata from the main process.
 *
 * On mount, calls the getLoadedPlugins IPC endpoint to get the list of
 * plugins loaded by the main process. Also subscribes to plugin change
 * events to refresh automatically when plugins are loaded/reloaded/unloaded.
 */

import { useState, useEffect, useCallback } from 'react';
import { getApi, getEvents } from '@vienna/ipc/renderer';
import { api, events } from '../../ipc';
import type { PluginInfo } from '../../ipc/plugin/contract';

export function useLoadedPlugins(): {
  plugins: PluginInfo[];
  loading: boolean;
  refresh: () => void;
} {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlugins = useCallback(() => {
    const ipc = getApi(api);
    ipc.plugin.getLoadedPlugins({}).then(({ plugins: loaded }) => {
      setPlugins(loaded);
      setLoading(false);
    }).catch(() => {
      // Handler may not be configured yet
      setLoading(false);
    });
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  // Subscribe to plugin change events to auto-refresh
  useEffect(() => {
    const eventSubs = getEvents(events);
    const unsub = eventSubs.plugin.onPluginChanged(() => {
      fetchPlugins();
    });
    return unsub;
  }, [fetchPlugins]);

  return { plugins, loading, refresh: fetchPlugins };
}
