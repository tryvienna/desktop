/**
 * useDirectoryBranchState — Shared hook for directory/branch selection.
 *
 * Self-sufficient data fetching hook used by both the compact BranchPicker
 * (top bar) and the full DirectoryBranchSection (settings drawer).
 *
 * Fetches directories with branch info, loads branches per directory,
 * and handles branch selection including worktree creation.
 *
 * @ai-context
 * - Shared by BranchPicker (compact top bar) and DirectoryBranchSection (drawer)
 * - Uses GET_DIRECTORIES_WITH_BRANCH_INFO for directory state
 * - Uses GET_GIT_BRANCHES per directory for branch lists with worktree info
 * - Uses SET_BRANCH_SELECTION (with createWorktree flag) and REMOVE_BRANCH_SELECTION
 * - Selecting HEAD branch removes override; selecting non-HEAD sets override + creates worktree
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { createRendererLogger } from '@vienna/logger/renderer';
import {
  useQuery,
  useMutation,
  useApolloClient,
  GET_DIRECTORIES_WITH_BRANCH_INFO,
  GET_GIT_BRANCHES,
  SET_BRANCH_SELECTION,
  REMOVE_BRANCH_SELECTION,
  RESTART_WORKSTREAM_AGENT,
} from '@vienna/graphql/client';
import type {
  GetDirectoriesWithBranchInfoQuery,
  GetGitBranchesQuery,
} from '@vienna/graphql/client/generated/graphql';
import { toast } from '@tryvienna/ui';
import { getDirectoryName } from '../utils/git';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

const logger = createRendererLogger();

export type BranchListItemData = NonNullable<GetGitBranchesQuery['gitBranches']>[number];

type DirectoryWithBranchInfoData = NonNullable<
  GetDirectoriesWithBranchInfoQuery['directoriesWithBranchInfo']
>[number];

export interface DirectoryBranchState {
  path: string;
  name: string;
  effectivePath: string;
  isGitRepo: boolean;
  /** The override branch (null = using default HEAD branch) */
  selectedBranch: string | null;
  worktreePath: string | null;
  baseBranch: string;
  inherited: boolean;
  branches: BranchListItemData[] | null;
  isLoading: boolean;
  error: string | null;
}

export interface BranchSelectionEvent {
  directoryPath: string;
  branch: string;
  needsWorktree: boolean;
  worktreePath: string | null;
}

export interface UseDirectoryBranchStateResult {
  directories: DirectoryBranchState[];
  isLoading: boolean;
  creatingWorktrees: Set<string>;
  handleBranchSelect: (event: BranchSelectionEvent) => Promise<void>;
  refetch: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════════════════════════

export function useDirectoryBranchState(
  workstreamId: string | null,
): UseDirectoryBranchStateResult {
  const client = useApolloClient();
  const [directories, setDirectories] = useState<DirectoryBranchState[]>([]);
  const [creatingWorktrees, setCreatingWorktrees] = useState<Set<string>>(new Set());

  // Fetch directories with branch info
  const {
    data: dirsData,
    loading: dirsLoading,
    refetch: refetchDirs,
  } = useQuery(GET_DIRECTORIES_WITH_BRANCH_INFO, {
    variables: { workstreamId: workstreamId! },
    skip: !workstreamId,
    fetchPolicy: 'cache-and-network',
  });

  // Mutations
  const [setBranchSelection] = useMutation(SET_BRANCH_SELECTION);
  const [removeBranchSelection] = useMutation(REMOVE_BRANCH_SELECTION);
  const [restartAgent] = useMutation(RESTART_WORKSTREAM_AGENT);

  // Sync directory states from query data, preserving loaded branches
  useEffect(() => {
    const dirs = dirsData?.directoriesWithBranchInfo ?? [];
    setDirectories((prev) => {
      const prevByPath = new Map(prev.map((d) => [d.path, d]));
      return dirs.map((dir: DirectoryWithBranchInfoData): DirectoryBranchState => {
        const path = dir.path ?? '';
        const existing = prevByPath.get(path);
        return {
          path,
          name: dir.label || getDirectoryName(path),
          effectivePath: dir.effectivePath ?? path,
          isGitRepo: existing?.isGitRepo ?? true,
          selectedBranch: dir.branch ?? null,
          worktreePath: dir.worktreePath ?? null,
          baseBranch: dir.baseBranch ?? 'main',
          inherited: dir.isInherited ?? false,
          // Preserve already-loaded branches instead of resetting to null
          branches: existing?.branches ?? null,
          isLoading: existing ? existing.isLoading : true,
          error: existing?.error ?? null,
        };
      });
    });
  }, [dirsData]);

  // Track which directories have had branch fetches initiated
  const fetchingBranchesRef = useRef<Set<string>>(new Set());

  // Fetch branches for each directory
  useEffect(() => {
    if (directories.length === 0) return;

    const loadBranches = async (dirPath: string) => {
      try {
        const result = await client.query<GetGitBranchesQuery>({
          query: GET_GIT_BRANCHES,
          variables: { path: dirPath },
          fetchPolicy: 'network-only',
        });

        const branches = result.data?.gitBranches ?? [];
        setDirectories((prev) =>
          prev.map((d) =>
            d.path === dirPath
              ? { ...d, branches, isLoading: false, isGitRepo: branches.length > 0 }
              : d,
          ),
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        setDirectories((prev) =>
          prev.map((d) =>
            d.path === dirPath
              ? { ...d, branches: null, isLoading: false, isGitRepo: false, error: msg }
              : d,
          ),
        );
      }
    };

    for (const dir of directories) {
      if (dir.branches === null && dir.isLoading && !fetchingBranchesRef.current.has(dir.path)) {
        fetchingBranchesRef.current.add(dir.path);
        loadBranches(dir.path);
      }
    }
  }, [directories, client]);

  // Reset fetch tracking when directories change from query data
  useEffect(() => {
    const currentPaths = new Set(directories.map((d) => d.path));
    for (const path of fetchingBranchesRef.current) {
      if (!currentPaths.has(path)) {
        fetchingBranchesRef.current.delete(path);
      }
    }
  }, [directories]);

  // Refetch directory-related queries (best-effort, don't block on failure)
  const refetchRelatedQueries = useCallback(async () => {
    try {
      await client.refetchQueries({
        include: ['GetDirectoriesWithBranchInfo', 'GetWorkstream'],
      });
    } catch {
      // Non-critical: UI state is already updated optimistically
    }
  }, [client]);

  // Handle branch selection
  const handleBranchSelect = useCallback(
    async (event: BranchSelectionEvent) => {
      if (!workstreamId) return;

      const dirState = directories.find((d) => d.path === event.directoryPath);
      const baseBranch = dirState?.baseBranch ?? 'main';

      // Check if the user is selecting the current/HEAD branch
      const headBranch = dirState?.branches?.find((b) => b.isCurrent);
      const isSelectingHead = headBranch && event.branch === headBranch.name;

      try {
        if (isSelectingHead) {
          // Selecting HEAD branch = remove override, go back to default
          if (dirState?.selectedBranch) {
            // Update UI immediately (optimistic)
            setDirectories((prev) =>
              prev.map((d) =>
                d.path === event.directoryPath
                  ? {
                      ...d,
                      selectedBranch: null,
                      worktreePath: null,
                      effectivePath: d.path,
                    }
                  : d,
              ),
            );

            await removeBranchSelection({
              variables: { workstreamId, directoryPath: event.directoryPath },
            });

            // Restart agent so it picks up the new directory paths
            restartAgent({ variables: { id: workstreamId } }).catch(() => {
              toast.error('Failed to restart agent — it may still use old paths');
            });

            await refetchRelatedQueries();
          }
          return;
        }

        // Non-HEAD branch: set selection with createWorktree flag
        if (event.needsWorktree) {
          setCreatingWorktrees((prev) => new Set([...prev, event.directoryPath]));
        }

        const result = await setBranchSelection({
          variables: {
            workstreamId,
            directoryPath: event.directoryPath,
            branch: event.branch,
            baseBranch,
            createWorktree: event.needsWorktree,
            worktreePath: event.worktreePath,
          },
        });

        const returnedWorktreePath =
          result.data?.setBranchSelection?.branchSelection?.worktreePath ?? event.worktreePath;

        // Update UI immediately (optimistic)
        setDirectories((prev) =>
          prev.map((d) =>
            d.path === event.directoryPath
              ? {
                  ...d,
                  selectedBranch: event.branch,
                  worktreePath: returnedWorktreePath,
                  effectivePath: returnedWorktreePath || d.path,
                  branches:
                    d.branches?.map((b) =>
                      b.name === event.branch
                        ? { ...b, hasWorktree: true, worktreePath: returnedWorktreePath }
                        : b,
                    ) ?? null,
                }
              : d,
          ),
        );

        // Restart agent so it picks up the new directory paths
        restartAgent({ variables: { id: workstreamId } }).catch(() => {
              toast.error('Failed to restart agent — it may still use old paths');
            });

        await refetchRelatedQueries();
      } catch (error) {
        logger.error('Failed to select branch', {
          error: error instanceof Error ? error.message : String(error),
          directoryPath: event.directoryPath,
          branch: event.branch,
        });
      } finally {
        setCreatingWorktrees((prev) => {
          const next = new Set(prev);
          next.delete(event.directoryPath);
          return next;
        });
      }
    },
    [workstreamId, directories, setBranchSelection, removeBranchSelection, restartAgent, refetchRelatedQueries],
  );

  const refetch = useCallback(() => {
    refetchDirs();
  }, [refetchDirs]);

  return {
    directories,
    isLoading: dirsLoading,
    creatingWorktrees,
    handleBranchSelect,
    refetch,
  };
}
