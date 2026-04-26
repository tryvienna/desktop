/**
 * PluginMissingDepsHandler — Watches for plugin dependency errors on startup
 * and shows an install dialog.
 *
 * Sits inside PluginSystemProvider and monitors the error map for
 * phase='dependencies' errors. Shows the InstallDependenciesDialog
 * for each one sequentially.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { getApi } from '@vienna/ipc/renderer';
import { api } from '../../ipc';
import { usePluginErrors } from '../../renderer/contexts/PluginSystemContext';
import { InstallDependenciesDialog, type MissingDepsInfo } from './InstallDependenciesDialog';

export function PluginMissingDepsHandler() {
  const { errors, dismissError } = usePluginErrors();
  const [currentDeps, setCurrentDeps] = useState<(MissingDepsInfo & { pluginId: string }) | null>(null);
  const shownRef = useRef(new Set<string>());

  // Watch for new dependency errors and show the dialog for the first unseen one
  useEffect(() => {
    for (const [pluginId, err] of errors) {
      if (
        err.phase === 'dependencies' &&
        err.missingDependencies &&
        err.pluginDir &&
        err.packageManager &&
        !shownRef.current.has(pluginId)
      ) {
        shownRef.current.add(pluginId);
        setCurrentDeps({
          pluginId,
          pluginDir: err.pluginDir,
          packageManager: err.packageManager,
        });
        break;
      }
    }
  }, [errors]);

  const handleClose = useCallback(() => {
    if (currentDeps) {
      // Allow the dialog to re-appear if a new dependency error is emitted
      // (e.g., user retries manually and it fails again)
      shownRef.current.delete(currentDeps.pluginId);
      dismissError(currentDeps.pluginId);
    }
    setCurrentDeps(null);
  }, [currentDeps, dismissError]);

  const handleInstalled = useCallback(async (pluginDir: string) => {
    const pluginId = currentDeps?.pluginId;
    if (pluginId) {
      // Clear from shown so the dialog can re-appear if the reload
      // still fails with missing deps (e.g., partial install)
      shownRef.current.delete(pluginId);
      dismissError(pluginId);
    }
    setCurrentDeps(null);
    // Re-attempt loading the plugin after deps are installed
    try {
      const ipc = getApi(api);
      await ipc.plugin.loadLocalPlugin({ directoryPath: pluginDir });
    } catch {
      // Will show as a normal error if it fails again
    }
  }, [currentDeps, dismissError]);

  return (
    <InstallDependenciesDialog
      info={currentDeps}
      onClose={handleClose}
      onInstalled={handleInstalled}
    />
  );
}
