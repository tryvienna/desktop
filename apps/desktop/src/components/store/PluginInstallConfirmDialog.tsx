/**
 * PluginInstallConfirmDialog — Confirmation modal for deep-link plugin installs.
 *
 * Listens for the `onPluginInstallRequest` IPC event (emitted by the main
 * process when a deep link is received) and shows an AlertDialog from the
 * design system. If the plugin is already installed, offers an "Override"
 * option; otherwise shows "Install" / "Cancel".
 */

import { useState, useCallback, useEffect } from 'react';
import { Download, RefreshCw, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@tryvienna/ui';
import { getApi, getEvents } from '@vienna/ipc/renderer';
import { api, events } from '../../ipc';

interface InstallRequest {
  slug: string;
  name: string;
  repo: string;
  dir?: string;
  alreadyInstalled: boolean;
}

export function PluginInstallConfirmDialog() {
  const [request, setRequest] = useState<InstallRequest | null>(null);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listen for deep link install requests from main process
  useEffect(() => {
    const eventSubs = getEvents(events);
    const unsub = eventSubs.plugin.onPluginInstallRequest((payload) => {
      // Ignore new requests while an install is in progress
      setInstalling((prev) => {
        if (prev) return prev;
        setRequest(payload);
        setError(null);
        return false;
      });
    });
    return unsub;
  }, []);

  const handleInstall = useCallback(async (override: boolean) => {
    if (!request) return;
    setInstalling(true);
    setError(null);

    try {
      const ipc = getApi(api);
      const result = await ipc.plugin.installFromSource({
        slug: request.slug,
        name: request.name,
        repo: request.repo,
        dir: request.dir,
        override,
      });

      if (!result.success) {
        setError(result.error ?? 'Installation failed');
        setInstalling(false);
        return;
      }

      setInstalling(false);
      setRequest(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setInstalling(false);
    }
  }, [request]);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open && !installing) {
      setRequest(null);
      setError(null);
    }
  }, [installing]);

  const shortRepo = request?.repo.replace('https://github.com/', '') ?? '';

  return (
    <AlertDialog open={!!request} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Download className="size-5" />
            Install Plugin
          </AlertDialogTitle>
          <AlertDialogDescription>
            {request?.alreadyInstalled
              ? `"${request.name}" is already installed. Would you like to reinstall it?`
              : `Install "${request?.name}" from GitHub?`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-3 pt-1">
          <div className="rounded-md bg-muted px-3 py-2 font-mono text-sm text-muted-foreground">
            {shortRepo}{request?.dir ? `/${request.dir}` : ''}
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={installing}>Cancel</AlertDialogCancel>
          {request?.alreadyInstalled ? (
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void handleInstall(true); }}
              disabled={installing}
            >
              {installing ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                  Reinstalling...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-1.5 size-4" />
                  Override
                </>
              )}
            </AlertDialogAction>
          ) : (
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void handleInstall(false); }}
              disabled={installing}
            >
              {installing ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                  Installing...
                </>
              ) : (
                'Install'
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
