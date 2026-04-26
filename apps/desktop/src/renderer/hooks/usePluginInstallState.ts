/**
 * usePluginInstallState — Persistent install/uninstall state for plugins.
 *
 * Tracks which plugins are "installed" (enabled) via localStorage.
 * Default: plugins are NOT installed. Users must explicitly install them
 * via the Explore Plugins store drawer.
 */

import { useCallback, useMemo } from 'react';
import { usePersistedState } from '../../storage';

export function usePluginInstallState() {
  const [installMap, setInstallMap] = usePersistedState('pluginInstallState');

  const isInstalled = useCallback(
    (pluginId: string): boolean => {
      return installMap[pluginId] === true;
    },
    [installMap],
  );

  const install = useCallback(
    (pluginId: string) => {
      setInstallMap({ ...installMap, [pluginId]: true });
    },
    [installMap, setInstallMap],
  );

  const uninstall = useCallback(
    (pluginId: string) => {
      setInstallMap({ ...installMap, [pluginId]: false });
    },
    [installMap, setInstallMap],
  );

  const installedIds = useMemo(() => {
    return Object.entries(installMap)
      .filter(([, enabled]) => enabled === true)
      .map(([id]) => id);
  }, [installMap]);

  return { isInstalled, install, uninstall, installedIds };
}
