/**
 * DiffIndicator — Inline diff summary (+N -M) in the chat footer.
 *
 * @ai-context
 * - Rendered between BranchStatusBar and TokenUsageSummary in the footer
 * - Uses useGitDiffStatus to get aggregated diff counts
 * - Clickable — opens the GitDiffReviewDrawerPanel via openFull
 * - Hidden when there are no changes or workstream has no non-default branch
 * - Styling matches BranchStatusBar (text-[11px], muted)
 */

import { memo, useCallback } from 'react';
import { cn } from '@tryvienna/ui';
import { useGitDiffStatus } from '../renderer/hooks/useGitDiffStatus';
import { useDrawerActions } from '../lib/drawer';
import { gitDiffReviewContent } from './drawer/content';

interface DiffIndicatorProps {
  workstreamId: string;
}

export const DiffIndicator = memo(function DiffIndicator({
  workstreamId,
}: DiffIndicatorProps) {
  const { totalAdditions, totalDeletions, isLoading } =
    useGitDiffStatus(workstreamId);
  const { openFull } = useDrawerActions();

  const handleClick = useCallback(() => {
    openFull(gitDiffReviewContent(workstreamId));
  }, [openFull, workstreamId]);

  if (isLoading && totalAdditions === 0 && totalDeletions === 0) return null;
  if (totalAdditions === 0 && totalDeletions === 0) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'flex items-center gap-1 px-1.5 py-0.5 rounded',
        'text-[11px] font-mono',
        'border-none bg-transparent cursor-pointer',
        'hover:bg-surface-hover transition-colors duration-100',
        '[app-region:no-drag]',
      )}
      aria-label={`${totalAdditions} additions, ${totalDeletions} deletions. Click to review changes.`}
    >
      {totalAdditions > 0 && (
        <span className="text-emerald-500">+{totalAdditions}</span>
      )}
      {totalDeletions > 0 && (
        <span className="text-red-400">-{totalDeletions}</span>
      )}
    </button>
  );
});
