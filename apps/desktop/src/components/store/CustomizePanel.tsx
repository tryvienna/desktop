/**
 * CustomizePanel — Plugin customization tab in the store detail view.
 *
 * Three states:
 * - Not customized: "Customize" button with progress during setup
 * - Customized: path display, reset button
 * - Error: error display with reset button
 */

import { useState, useEffect, useCallback } from 'react';
import { Pencil, RotateCcw, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button, Badge, ConfirmDialog } from '@tryvienna/ui';
import { useMutation, ADD_PROJECT_DIRECTORY, REMOVE_PROJECT_DIRECTORY } from '@vienna/graphql/client';
import { getApi, getEvents } from '@vienna/ipc/renderer';
import { api, events } from '../../ipc';
import { useWorkstreamList } from '../../renderer/contexts/WorkstreamContext';
import { rendererLogger } from '../../renderer/logger';

const logger = rendererLogger.child({ component: 'CustomizePanel' });

type ProgressStep = 'copying' | 'installing' | 'done' | 'error';

interface CustomizePanelProps {
  pluginId: string;
  pluginName: string;
}

export function CustomizePanel({ pluginId, pluginName }: CustomizePanelProps) {
  const [customizationPath, setCustomizationPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [customizing, setCustomizing] = useState(false);
  const [progressStep, setProgressStep] = useState<ProgressStep | null>(null);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const ipc = getApi(api);
  const { projectId } = useWorkstreamList();
  const [addDir] = useMutation(ADD_PROJECT_DIRECTORY);
  const [removeDir] = useMutation(REMOVE_PROJECT_DIRECTORY);

  // Fetch initial customization state
  const fetchState = useCallback(async () => {
    try {
      const { path } = await ipc.plugin.getCustomizationPath({ pluginId });
      setCustomizationPath(path);
      setError(null);
    } catch (err) {
      logger.warn('Failed to fetch customization path', {
        pluginId,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(false);
    }
  }, [pluginId, ipc]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Listen for progress and plugin change events
  useEffect(() => {
    const eventSubs = getEvents(events);

    const unsubProgress = eventSubs.plugin.onCustomizationProgress(({ pluginId: pid, step, message }) => {
      if (pid !== pluginId) return;
      setProgressStep(step);
      setProgressMessage(message);
      if (step === 'done') {
        setCustomizing(false);
        fetchState();
        // Add customization directory to project so it appears in the nav sidebar
        if (projectId) {
          ipc.plugin.getCustomizationPath({ pluginId }).then(({ path }) => {
            if (path) {
              addDir({ variables: { projectId, path, label: `${pluginName} (plugin)` } }).catch((err) => {
                logger.warn('Failed to add customization directory to project', {
                  pluginId,
                  error: err instanceof Error ? err.message : String(err),
                });
              });
            }
          }).catch(() => { /* path fetch failed — non-critical */ });
        }
      } else if (step === 'error') {
        setCustomizing(false);
        setError(message);
      }
    });

    const unsubChanged = eventSubs.plugin.onPluginChanged(({ pluginId: pid, action }) => {
      if (pid !== pluginId) return;
      if (action === 'unloaded') {
        setCustomizationPath(null);
        setProgressStep(null);
      } else {
        fetchState();
      }
    });

    const unsubError = eventSubs.plugin.onPluginError(({ pluginId: pid, error: err }) => {
      if (pid !== pluginId) return;
      setError(err);
    });

    return () => {
      unsubProgress();
      unsubChanged();
      unsubError();
    };
  }, [pluginId, fetchState]);

  const handleCustomize = useCallback(async () => {
    setCustomizing(true);
    setProgressStep(null);
    setProgressMessage('');
    setError(null);

    try {
      const result = await ipc.plugin.customizePlugin({ pluginId });
      if (!result.success) {
        setError(result.error ?? 'Customization failed');
        setCustomizing(false);
      }
      // On success, progress events will update state
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setCustomizing(false);
    }
  }, [pluginId, ipc]);

  const handleReset = useCallback(async () => {
    setResetting(true);
    const pathToRemove = customizationPath;
    try {
      const result = await ipc.plugin.resetPlugin({ pluginId });
      if (!result.success) {
        setError(result.error ?? 'Reset failed');
      } else {
        setCustomizationPath(null);
        setProgressStep(null);
        setError(null);
        // Remove customization directory from project
        if (projectId && pathToRemove) {
          removeDir({ variables: { projectId, path: pathToRemove } }).catch((err) => {
            logger.warn('Failed to remove customization directory from project', {
              pluginId,
              error: err instanceof Error ? err.message : String(err),
            });
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setResetting(false);
      setResetDialogOpen(false);
    }
  }, [pluginId, ipc, customizationPath, projectId, removeDir]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Checking customization status...</span>
      </div>
    );
  }

  // ── Customizing in progress ──
  if (customizing) {
    return (
      <div className="flex flex-col gap-3 py-4">
        <div className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Setting up customization...</span>
        </div>
        {progressStep && (
          <div className="flex flex-col gap-1.5 pl-6">
            <ProgressItem
              label="Copying source files"
              active={progressStep === 'copying'}
              done={progressStep === 'installing' || progressStep === 'done'}
            />
            <ProgressItem
              label="Installing dependencies"
              active={progressStep === 'installing'}
              done={progressStep === 'done'}
            />
          </div>
        )}
        {progressMessage && (
          <p className="text-xs text-muted-foreground pl-6">{progressMessage}</p>
        )}
      </div>
    );
  }

  // ── Customized state ──
  if (customizationPath) {
    return (
      <div className="flex flex-col gap-4 py-4">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="text-[11px] gap-1">
            <CheckCircle2 className="size-3" />
            Customized
          </Badge>
          <Badge variant="secondary" className="text-[11px]">
            Hot-reload active
          </Badge>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Customization path</span>
          <code className="rounded bg-muted px-2 py-1 text-[11px] font-mono text-foreground/80 break-all">
            {customizationPath}
          </code>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Edit the source files below to customize this plugin. Changes are detected automatically and hot-reloaded into the app.
        </p>

        {error && (
          <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 p-3">
            <AlertCircle className="size-4 shrink-0 text-destructive mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-destructive">Hot-reload error</span>
              <span className="text-xs text-muted-foreground">{error}</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-destructive hover:text-destructive"
            onClick={() => setResetDialogOpen(true)}
            disabled={resetting}
          >
            <RotateCcw className="size-3" />
            Reset to Default
          </Button>
        </div>

        <ConfirmDialog
          open={resetDialogOpen}
          onOpenChange={setResetDialogOpen}
          title="Reset plugin to default"
          description="This will delete your customizations and restore the original plugin. This cannot be undone."
          confirmLabel="Reset"
          variant="destructive"
          onConfirm={handleReset}
        />
      </div>
    );
  }

  // ── Not customized state ──
  return (
    <div className="flex flex-col gap-4 py-4">
      <p className="text-sm text-foreground/90 leading-relaxed">
        Create a customizable copy of this plugin&apos;s source code. You can then edit the files to change its behavior, and changes will be hot-reloaded into the app automatically.
      </p>

      {error && (
        <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 p-3">
          <AlertCircle className="size-4 shrink-0 text-destructive mt-0.5" />
          <span className="text-xs text-muted-foreground">{error}</span>
        </div>
      )}

      <Button variant="default" size="sm" className="gap-1.5 self-start" onClick={handleCustomize}>
        <Pencil className="size-3" />
        Customize Plugin
      </Button>
    </div>
  );
}

// ── Sub-component ──

function ProgressItem({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {done ? (
        <CheckCircle2 className="size-3 text-green-500" />
      ) : active ? (
        <Loader2 className="size-3 animate-spin text-muted-foreground" />
      ) : (
        <div className="size-3 rounded-full border border-border" />
      )}
      <span className={done ? 'text-muted-foreground' : active ? 'text-foreground' : 'text-muted-foreground/50'}>
        {label}
      </span>
    </div>
  );
}
