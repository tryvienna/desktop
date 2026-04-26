/**
 * ReleaseNotesDrawer — Shows release notes for a new version with an Update CTA.
 *
 * @ai-context
 * - Opened from the UpdateButton in the sidebar footer
 * - Renders markdown release notes using the shared Markdown component
 * - Footer has "Update" (downloads DMG and opens it) and "Not Now" buttons
 * - Download states: idle → downloading → done / error
 */

import { useCallback, useMemo, useState } from 'react';
import { DrawerBody, Markdown, Button } from '@tryvienna/ui';
import { getApi } from '@vienna/ipc/renderer';
import { api } from '../../ipc';
import type { DrawerContentDescriptor } from '../../lib/drawer';
import { DrawerContainer } from '../../lib/drawer';
import { useDrawerActionsOptional } from '../../lib/drawer/DrawerActionsContext';
import { getReleaseNotesPayload, type ReleaseNotesPayload } from './content';

type DownloadPhase = 'idle' | 'downloading' | 'opening' | 'error';

export function ReleaseNotesDrawer({ content }: { content: DrawerContentDescriptor }) {
  const payload = getReleaseNotesPayload(content);
  if (!payload) return null;
  return <ReleaseNotesDrawerInner payload={payload} />;
}

function ReleaseNotesDrawerInner({ payload }: { payload: ReleaseNotesPayload }) {
  const ipc = useMemo(() => getApi(api), []);
  const drawerActions = useDrawerActionsOptional();
  const [phase, setPhase] = useState<DownloadPhase>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const formattedDate = payload.publishedAt
    ? new Date(payload.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const handleUpdate = useCallback(async () => {
    setPhase('downloading');
    setErrorMsg('');

    try {
      const result = await ipc.system.downloadUpdate({});
      if (result.success) {
        setPhase('opening');
      } else {
        setErrorMsg(result.error ?? 'Download failed');
        setPhase('error');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Download failed');
      setPhase('error');
    }
  }, [ipc]);

  const handleDismiss = useCallback(() => {
    drawerActions?.close();
  }, [drawerActions]);

  const footer = (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border">
      {phase === 'error' && (
        <span className="text-xs text-destructive truncate">{errorMsg}</span>
      )}
      {phase === 'opening' && (
        <span className="text-xs text-muted-foreground">Opening installer...</span>
      )}
      {phase !== 'error' && phase !== 'opening' && <span />}
      <div className="flex gap-2 shrink-0">
        <Button variant="outline" size="sm" onClick={handleDismiss}>
          Not Now
        </Button>
        <Button
          variant="default"
          size="sm"
          disabled={!payload.downloadUrl || phase === 'downloading' || phase === 'opening'}
          onClick={handleUpdate}
        >
          {phase === 'downloading' ? 'Downloading...' : 'Update'}
        </Button>
      </div>
    </div>
  );

  return (
    <DrawerContainer title={`What's New in v${payload.version}`} footer={footer}>
      <DrawerBody>
        {formattedDate && (
          <p className="text-xs text-muted-foreground mb-4">Released {formattedDate}</p>
        )}
        <div className="prose prose-sm dark:prose-invert max-w-none px-1">
          <Markdown content={payload.releaseNotes} />
        </div>
      </DrawerBody>
    </DrawerContainer>
  );
}
