/**
 * BranchStatusBar — Subtle indicator below the chat input showing active branch selections
 * with inline diff counts per directory.
 *
 * Format: git-icon  dirName → branchName +N -M · dirName2 → branchName2 +N -M
 *
 * @ai-context
 * - Rendered below ChatInput via the footer slot
 * - Reads from useDirectoryBranchState (same hook as BranchPicker)
 * - Uses useGitDiffStatus for per-directory diff counts
 * - Only shows non-default branches (filters out main/master/develop/dev)
 * - Diff counts are clickable → opens GitDiffReviewDrawerPanel
 */

import { memo, useCallback, useMemo } from 'react';
import { GitBranch, Loader2 } from 'lucide-react';
import { useDirectoryBranchState } from '../renderer/hooks/useDirectoryBranchState';
import { useGitDiffStatus, type DirectoryDiffStatus } from '../renderer/hooks/useGitDiffStatus';
import { useActionForm } from '../providers/ActionFormProvider';
import { useDrawerActions } from '../lib/drawer';
import { gitDiffReviewContent } from './drawer/content';
import { DEFAULT_BRANCHES } from '../renderer/utils/git';

interface BranchStatusBarProps {
  workstreamId: string;
  className?: string;
}

export const BranchStatusBar = memo(function BranchStatusBar({ workstreamId, className }: BranchStatusBarProps) {
  const { directories, creatingWorktrees } = useDirectoryBranchState(workstreamId);
  const { directories: diffDirs } = useGitDiffStatus(workstreamId);
  const { pendingWorktreeWorkstreamId } = useActionForm();
  const { openFull } = useDrawerActions();

  const activeBranches = useMemo(() => {
    return directories
      .filter((d) => d.isGitRepo && d.selectedBranch && !DEFAULT_BRANCHES.has(d.selectedBranch))
      .map((d) => ({ name: d.name, branch: d.selectedBranch!, path: d.path }));
  }, [directories]);

  // Index diff data by directory path for O(1) lookup
  const diffByPath = useMemo(() => {
    const map = new Map<string, DirectoryDiffStatus>();
    for (const d of diffDirs) map.set(d.path, d);
    return map;
  }, [diffDirs]);

  const isCreatingWorktree =
    pendingWorktreeWorkstreamId === workstreamId || creatingWorktrees.size > 0;

  const handleDiffClick = useCallback(() => {
    openFull(gitDiffReviewContent(workstreamId));
  }, [openFull, workstreamId]);

  return (
    <div className={`pt-1 pl-2 flex items-center h-6 ${className ?? ''}`}>
      {isCreatingWorktree ? (
        <div className="text-[11px] text-muted-foreground/70 flex items-center gap-1">
          <Loader2 className="size-3 opacity-60 shrink-0 animate-spin" />
          <span>Creating worktree…</span>
        </div>
      ) : activeBranches.length > 0 && (
        <div className="text-[11px] text-muted-foreground/70 flex items-center gap-1 flex-wrap">
          <GitBranch className="size-3 opacity-60 shrink-0" />
          <span>
            {activeBranches.map((sel, i) => {
              const diff = diffByPath.get(sel.path);
              const adds = diff ? diff.branchAdditions + diff.workingAdditions : 0;
              const dels = diff ? diff.branchDeletions + diff.workingDeletions : 0;
              const hasDiff = adds > 0 || dels > 0;

              return (
                <span key={sel.name}>
                  {i > 0 && <span className="mx-0.5 opacity-50">&middot;</span>}
                  <span className="opacity-80">{sel.name}</span>
                  <span className="opacity-50">{' \u2192 '}</span>
                  <span>{sel.branch}</span>
                  {hasDiff && (
                    <button
                      type="button"
                      onClick={handleDiffClick}
                      className="ml-1 font-mono text-[10px] cursor-pointer bg-transparent border-none p-0 hover:opacity-80 transition-opacity"
                      aria-label={`${adds} additions, ${dels} deletions in ${sel.name}. Click to review.`}
                    >
                      {adds > 0 && <span className="text-emerald-500">+{adds}</span>}
                      {adds > 0 && dels > 0 && <span className="opacity-50">{' '}</span>}
                      {dels > 0 && <span className="text-red-400">-{dels}</span>}
                    </button>
                  )}
                </span>
              );
            })}
          </span>
        </div>
      )}
    </div>
  );
});
