/**
 * useGitDiffStatus — Fetches git diff summary data for all directories in a workstream.
 *
 * @ai-context
 * - Aggregates branch diff + working tree diff across all workstream directories
 * - Only queries directories that have a non-default branch selected
 * - Refetches when refreshKey from useGitRefreshTrigger changes
 * - Returns total additions/deletions for the footer indicator
 * - Returns per-directory breakdown for the drawer
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApolloClient } from '@vienna/graphql/client';
import {
  GET_GIT_DIFF_SUMMARY,
  GET_GIT_WORKING_TREE_SUMMARY,
} from '@vienna/graphql/client';
import { useDirectoryBranchState } from './useDirectoryBranchState';
import { useGitRefreshTrigger } from './useGitRefreshTrigger';
import { DEFAULT_BRANCHES } from '../utils/git';

export interface DirectoryDiffStatus {
  path: string;
  name: string;
  effectivePath: string;
  branch: string;
  baseBranch: string;
  /** Branch diff (commits vs base) */
  branchAdditions: number;
  branchDeletions: number;
  /** Working tree diff (uncommitted) */
  workingAdditions: number;
  workingDeletions: number;
}

export interface GitDiffStatusResult {
  /** Total lines added across all directories (branch + working tree) */
  totalAdditions: number;
  /** Total lines deleted across all directories (branch + working tree) */
  totalDeletions: number;
  /** Whether data is currently loading */
  isLoading: boolean;
  /** Per-directory breakdown */
  directories: DirectoryDiffStatus[];
  /** Manually trigger a refresh */
  refetch: () => void;
  /** Refresh key for downstream consumers */
  refreshKey: number;
}

export function useGitDiffStatus(workstreamId: string | null): GitDiffStatusResult {
  const client = useApolloClient();
  const { directories: branchDirs } = useDirectoryBranchState(workstreamId);
  const { refreshKey, triggerRefresh } = useGitRefreshTrigger(workstreamId);
  const [diffData, setDiffData] = useState<DirectoryDiffStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fetchVersion = useRef(0);

  // Directories with non-default branch overrides
  const activeDirectories = useMemo(
    () =>
      branchDirs.filter(
        (d) =>
          d.isGitRepo &&
          d.selectedBranch &&
          !DEFAULT_BRANCHES.has(d.selectedBranch),
      ),
    [branchDirs],
  );

  const fetchDiffData = useCallback(async () => {
    if (activeDirectories.length === 0) {
      setDiffData([]);
      return;
    }

    const version = ++fetchVersion.current;
    setIsLoading(true);

    try {
      const results = await Promise.all(
        activeDirectories.map(async (dir) => {
          const [branchResult, workingResult] = await Promise.all([
            client.query({
              query: GET_GIT_DIFF_SUMMARY,
              variables: { path: dir.effectivePath, base: dir.baseBranch },
              fetchPolicy: 'network-only',
            }).catch(() => null),
            client.query({
              query: GET_GIT_WORKING_TREE_SUMMARY,
              variables: { path: dir.effectivePath },
              fetchPolicy: 'network-only',
            }).catch(() => null),
          ]);

          return {
            path: dir.path,
            name: dir.name,
            effectivePath: dir.effectivePath,
            branch: dir.selectedBranch!,
            baseBranch: dir.baseBranch,
            branchAdditions: branchResult?.data?.gitDiffSummary?.additions ?? 0,
            branchDeletions: branchResult?.data?.gitDiffSummary?.deletions ?? 0,
            workingAdditions: workingResult?.data?.gitWorkingTreeSummary?.additions ?? 0,
            workingDeletions: workingResult?.data?.gitWorkingTreeSummary?.deletions ?? 0,
          };
        }),
      );

      // Only update if this is still the latest fetch
      if (version === fetchVersion.current) {
        setDiffData(results);
      }
    } finally {
      if (version === fetchVersion.current) {
        setIsLoading(false);
      }
    }
  }, [activeDirectories, client]);

  // Fetch on mount and when refreshKey changes
  useEffect(() => {
    void fetchDiffData();
  }, [fetchDiffData, refreshKey]);

  const totals = useMemo(() => {
    let totalAdditions = 0;
    let totalDeletions = 0;
    for (const d of diffData) {
      totalAdditions += d.branchAdditions + d.workingAdditions;
      totalDeletions += d.branchDeletions + d.workingDeletions;
    }
    return { totalAdditions, totalDeletions };
  }, [diffData]);

  return {
    ...totals,
    isLoading,
    directories: diffData,
    refetch: triggerRefresh,
    refreshKey,
  };
}
