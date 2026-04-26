import { memo, useCallback } from 'react';
import { ArrowUpCircle } from 'lucide-react';
import { Button } from '@tryvienna/ui';
import { useDrawerActions } from '../lib/drawer';
import { releaseNotesContent } from './drawer/content';
import { useUpdateAvailable, isActionableUpdate } from '../hooks/useUpdateAvailable';

export const UpdateButton = memo(function UpdateButton() {
  const state = useUpdateAvailable();
  const { openFull } = useDrawerActions();

  const handleClick = useCallback(() => {
    if (!isActionableUpdate(state)) return;
    openFull(
      releaseNotesContent(
        state.latestVersion,
        state.releaseNotes,
        state.downloadUrl,
        state.publishedAt,
      ),
    );
  }, [openFull, state]);

  if (!isActionableUpdate(state)) {
    return null;
  }

  return (
    <Button
      data-testid="update-button"
      variant="ghost"
      size="default"
      className="w-full justify-start gap-3 px-4 py-3 text-[var(--text-brand)]"
      onClick={handleClick}
    >
      <div className="relative">
        <ArrowUpCircle size={18} />
        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[var(--brand-primary)] animate-pulse" />
      </div>
      Update Available
    </Button>
  );
});
