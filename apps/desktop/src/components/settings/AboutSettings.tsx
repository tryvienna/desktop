import { useCallback, useEffect, useMemo, useState } from 'react';
import { getApi } from '@vienna/ipc/renderer';
import { Button } from '@tryvienna/ui';
import { ArrowUpCircle } from 'lucide-react';
import { api } from '../../ipc';
import { useDrawerActions } from '../../lib/drawer';
import { releaseNotesContent } from '../drawer/content';
import { useUpdateAvailable, isActionableUpdate, type UpdateState } from '../../hooks/useUpdateAvailable';

interface VersionInfo {
  app: string;
  commit: string;
  electron: string;
  node: string;
  chrome: string;
}

type CheckPhase = 'idle' | 'checking' | 'up-to-date' | 'error';

export function AboutSettings() {
  const ipc = useMemo(() => getApi(api), []);
  const { openFull } = useDrawerActions();
  const [versions, setVersions] = useState<VersionInfo | null>(null);
  const [checkPhase, setCheckPhase] = useState<CheckPhase>('idle');
  const polledState = useUpdateAvailable();
  const [manualResult, setManualResult] = useState<UpdateState | null>(null);

  // Manual check result takes priority over the background poll
  const updateState = manualResult ?? polledState;

  useEffect(() => {
    ipc.system.getVersions({}).then(setVersions);
  }, [ipc]);

  const handleCheckForUpdates = useCallback(async () => {
    setCheckPhase('checking');
    try {
      const result = await ipc.system.checkForUpdate({});
      setManualResult(result);
      setCheckPhase(result.available ? 'idle' : 'up-to-date');
    } catch {
      setCheckPhase('error');
    }
  }, [ipc]);

  const handleViewUpdate = useCallback(() => {
    if (!isActionableUpdate(updateState)) return;
    openFull(releaseNotesContent(
      updateState.latestVersion,
      updateState.releaseNotes,
      updateState.downloadUrl,
      updateState.publishedAt,
    ));
  }, [openFull, updateState]);

  if (!versions) return null;

  const hasUpdate = isActionableUpdate(updateState);

  return (
    <div className="grid gap-4">
      <div className="rounded-md border border-border p-4">
        <div className="grid gap-3 text-sm">
          <Row label="Version" value={versions.app} />
          <Row label="Commit" value={versions.commit} mono />
          <Row label="Electron" value={versions.electron} />
          <Row label="Node" value={versions.node} />
          <Row label="Chrome" value={versions.chrome} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {hasUpdate ? (
          <Button
            variant="outline"
            size="sm"
            className="text-[var(--text-brand)] border-[var(--brand-primary)]"
            onClick={handleViewUpdate}
          >
            <ArrowUpCircle size={14} className="mr-1.5" />
            New Version Available (v{updateState.latestVersion})
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={checkPhase === 'checking'}
            onClick={handleCheckForUpdates}
          >
            {checkPhase === 'checking' ? 'Checking...' : 'Check for Updates'}
          </Button>
        )}
        {checkPhase === 'up-to-date' && !hasUpdate && (
          <span className="text-sm text-muted-foreground">You're on the latest version.</span>
        )}
        {checkPhase === 'error' && (
          <span className="text-sm text-destructive">Failed to check for updates.</span>
        )}
      </div>

      <div className="text-center text-sm text-muted-foreground italic">
        <p>For Jess, my cornerstone, every single day.</p>
        <p>For our daughters, who made me believe in something bigger.</p>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? 'font-mono text-xs' : ''}>{value}</span>
    </div>
  );
}
