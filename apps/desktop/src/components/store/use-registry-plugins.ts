/**
 * useRegistryPlugins — React hook for managing registry plugins via GraphQL.
 *
 * Single source of truth for the plugin store UI. All state derives from
 * Apollo's normalized cache — no IPC or localStorage involved.
 *
 * Mutations use cache `update` callbacks for instant UI updates without
 * requiring a network round-trip to refetch the full list.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  useQuery,
  useMutation,
  GET_INSTALLED_PLUGINS,
  GET_REGISTRY_PLUGINS,
  INSTALL_PLUGIN,
  UNINSTALL_PLUGIN,
  UPDATE_PLUGIN,
  TOGGLE_PLUGIN_ENABLED,
} from '@vienna/graphql/client';
import { getEvents } from '@vienna/ipc/renderer';
import { events } from '../../ipc';
import { usePluginSystem, usePluginSystemVersion } from '../../renderer/contexts/PluginSystemContext';

/**
 * Lightweight hook that returns a Set of installed plugin IDs.
 * Derives from both the Apollo cache (registry-installed plugins) and the
 * renderer PluginSystem (which also includes local/customized plugins).
 * Used by canvas hooks (nav-sidebar, menu-bar) to gate rendering.
 */
export function useInstalledPluginIds(): Set<string> {
  const { data } = useQuery(GET_INSTALLED_PLUGINS);
  const system = usePluginSystem();
  const version = usePluginSystemVersion(); // re-compute when plugins change
  return useMemo(() => {
    const ids = new Set<string>();
    for (const p of data?.installedPlugins ?? []) {
      if (p.id) ids.add(p.id);
    }
    // Include locally loaded plugins that aren't in the install database
    for (const id of system.getPluginIds()) {
      ids.add(id);
    }
    return ids;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, system, version]);
}

export function useRegistryPlugins() {
  const {
    data: installedData,
    loading: installedLoading,
    refetch: refetchInstalled,
  } = useQuery(GET_INSTALLED_PLUGINS);

  const {
    data: registryData,
    loading: registryLoading,
  } = useQuery(GET_REGISTRY_PLUGINS);

  // Refetch installed plugins when the main process installs/uninstalls a plugin
  // (e.g. via deep link, which bypasses the GraphQL mutation path)
  useEffect(() => {
    const eventSubs = getEvents(events);
    const unsub = eventSubs.plugin.onPluginChanged(() => {
      void refetchInstalled();
    });
    return unsub;
  }, [refetchInstalled]);

  const [installMutation] = useMutation(INSTALL_PLUGIN, {
    update(cache, { data }) {
      const plugin = data?.installPlugin?.plugin;
      if (!plugin) return;
      cache.updateQuery({ query: GET_INSTALLED_PLUGINS }, (prev) => {
        if (!prev) return prev;
        const exists = prev.installedPlugins?.some((p) => p.id === plugin.id);
        if (exists) return prev;
        return { ...prev, installedPlugins: [...(prev.installedPlugins ?? []), plugin] };
      });
    },
  });

  const [uninstallMutation] = useMutation(UNINSTALL_PLUGIN, {
    // uninstallPlugin returns { success } — no InstalledPlugin object.
    // We manually evict from the cache using the pluginId variable.
  });

  const [updateMutation] = useMutation(UPDATE_PLUGIN);
  // update returns the full InstalledPlugin — Apollo auto-merges via normalization.

  const [toggleEnabledMutation] = useMutation(TOGGLE_PLUGIN_ENABLED);
  // toggle returns { id, enabled } — Apollo auto-merges via normalization.

  const [installingId, setInstallingId] = useState<string | null>(null);
  const [uninstallingId, setUninstallingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const installedPlugins = installedData?.installedPlugins ?? [];
  const registryPlugins = registryData?.registryPlugins ?? [];

  // Installed lookup for fast checks
  const installedMap = useMemo(() => {
    const map = new Map<string, { enabled: boolean; hasUpdate: boolean }>();
    for (const p of installedPlugins) {
      if (p.id) map.set(p.id, { enabled: p.enabled ?? false, hasUpdate: p.hasUpdate ?? false });
    }
    return map;
  }, [installedPlugins]);

  const install = useCallback(async (pluginId: string) => {
    setInstallingId(pluginId);
    try {
      const result = await installMutation({ variables: { pluginId } });
      return result.data?.installPlugin?.plugin ?? null;
    } finally {
      setInstallingId(null);
    }
  }, [installMutation]);

  const uninstall = useCallback(async (pluginId: string) => {
    setUninstallingId(pluginId);
    try {
      const result = await uninstallMutation({
        variables: { pluginId },
        update(cache, { data }) {
          if (!data?.uninstallPlugin?.success) return;
          // Remove from the installedPlugins list in cache
          cache.updateQuery({ query: GET_INSTALLED_PLUGINS }, (prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              installedPlugins: (prev.installedPlugins ?? []).filter((p) => p.id !== pluginId),
            };
          });
          // Evict the normalized InstalledPlugin entity
          const cacheId = cache.identify({ __typename: 'InstalledPlugin', id: pluginId });
          if (cacheId) {
            cache.evict({ id: cacheId });
          }
          cache.gc();
        },
        // Fallback: refetch the installed list to guarantee consistency
        refetchQueries: [{ query: GET_INSTALLED_PLUGINS }],
      });
      return result.data?.uninstallPlugin?.success ?? false;
    } finally {
      setUninstallingId(null);
    }
  }, [uninstallMutation]);

  const update = useCallback(async (pluginId: string) => {
    setUpdatingId(pluginId);
    try {
      const result = await updateMutation({ variables: { pluginId } });
      return result.data?.updatePlugin?.plugin ?? null;
    } finally {
      setUpdatingId(null);
    }
  }, [updateMutation]);

  const toggleEnabled = useCallback(async (pluginId: string, enabled: boolean) => {
    await toggleEnabledMutation({ variables: { pluginId, enabled } });
  }, [toggleEnabledMutation]);

  return {
    installedPlugins,
    registryPlugins,
    installedMap,
    loading: installedLoading || registryLoading,
    installingId,
    uninstallingId,
    updatingId,
    install,
    uninstall,
    update,
    toggleEnabled,
  };
}
