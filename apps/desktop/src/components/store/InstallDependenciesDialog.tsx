/**
 * InstallDependenciesDialog — Modal shown when a local plugin has missing node_modules.
 *
 * Offers to run the detected package manager's install command and then retries loading.
 */

import { useState, useCallback } from 'react';
import { Loader2, Terminal, PackageOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
} from '@tryvienna/ui';
import { getApi } from '@vienna/ipc/renderer';
import { api } from '../../ipc';

export interface MissingDepsInfo {
  pluginDir: string;
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun';
}

interface InstallDependenciesDialogProps {
  info: MissingDepsInfo | null;
  onClose: () => void;
  /** Called after deps are installed and the plugin should be re-loaded. */
  onInstalled: (pluginDir: string) => void;
}

export function InstallDependenciesDialog({ info, onClose, onInstalled }: InstallDependenciesDialogProps) {
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInstall = useCallback(async () => {
    if (!info) return;
    setInstalling(true);
    setError(null);

    try {
      const ipc = getApi(api);
      const result = await ipc.plugin.installPluginDependencies({
        directoryPath: info.pluginDir,
        packageManager: info.packageManager,
      });

      if (!result.success) {
        setError(result.error ?? 'Install failed');
        setInstalling(false);
        return;
      }

      setInstalling(false);
      onInstalled(info.pluginDir);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setInstalling(false);
    }
  }, [info, onInstalled]);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open && !installing) {
      setError(null);
      onClose();
    }
  }, [installing, onClose]);

  const command = info ? `${info.packageManager} install` : '';
  const shortDir = info?.pluginDir.split('/').slice(-2).join('/') ?? '';

  return (
    <Dialog open={!!info} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageOpen className="size-5" />
            Missing Dependencies
          </DialogTitle>
          <DialogDescription>
            This plugin requires dependencies that haven&apos;t been installed yet.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 pt-1">
          <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 font-mono text-sm">
            <Terminal className="size-4 shrink-0 text-muted-foreground" />
            <span>{command}</span>
          </div>

          <p className="text-xs text-muted-foreground">
            This will run in <span className="font-mono">{shortDir}</span>
          </p>

          {error && (
            <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={installing}>
              Skip
            </Button>
            <Button onClick={handleInstall} disabled={installing}>
              {installing ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                  Installing...
                </>
              ) : (
                'Install'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
