/**
 * useGroupDirectoryBranchState — Directory/branch state for group settings.
 *
 * Fetches group directories and branch selections, loads branches per directory,
 * and provides callbacks for setting/removing branch selections.
 *
 * @ai-context
 * - Used by GroupSettingsDrawer to show directory/branch configuration
 * - Uses GET_GROUP_DIRECTORIES_WITH_BRANCHES for group data
 * - Uses GET_GIT_BRANCHES per directory for branch lists
 * - Uses SET_GROUP_BRANCH_SELECTION / REMOVE_GROUP_BRANCH_SELECTION for mutations
 * - Simpler than useDirectoryBranchState — no worktree creation (that's per-workstream)
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { createRendererLogger } from '@vienna/logger/renderer';
import {
  useQuery,
  useMutation,
  useApolloClient,
  GET_GROUP_DIRECTORIES_WITH_BRANCHES,
  GET_GIT_BRANCHES,
  SET_GROUP_BRANCH_SELECTION,
  REMOVE_GROUP_BRANCH_SELECTION,
  ADD_GROUP_DIRECTORY,
  REMOVE_GROUP_DIRECTORY,
  UPDATE_GROUP_AUTO_CREATE_WORKTREES,
} from '@vienna/graphql/client';
import type { GetGitBranchesQuery } from '@vienna/graphql/client/generated/graphql';
import { getDirectoryName } from '../utils/git';

const logger = createRendererLogger();

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export type BranchListItemData = NonNullable<GetGitBranchesQuery['gitBranches']>[number];

export interface GroupDirectoryState {
  path: string;
  name: string;
  label: string | null;
  isGitRepo: boolean;
  /** The selected default branch for this directory (null = no default) */
  selectedBranch: string | null;
  baseBranch: string;
  branches: BranchListItemData[] | null;
  isLoading: boolean;
  error: string | null;
}

export interface UseGroupDirectoryBranchStateResult {
  directories: GroupDirectoryState[];
  isLoading: boolean;
  autoCreateWorktrees: boolean;
  handleBranchSelect: (dirPath: string, branch: string, baseBranch?: string) => Promise<void>;
  handleBranchRemove: (dirPath: string) => Promise<void>;
  handleAddDirectory: (path: string, label?: string) => Promise<void>;
  handleRemoveDirectory: (path: string) => Promise<void>;
  handleAutoCreateWorktreesChange: (enabled: boolean) => Promise<void>;
  refetch: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════════════════════════

export function useGroupDirectoryBranchState(
  groupId: string | null,
): UseGroupDirectoryBranchStateResult {
  const client = useApolloClient();
  const [directories, setDirectories] = useState<GroupDirectoryState[]>([]);

  const {
    data: groupData,
    loading: groupLoading,
    refetch: refetchGroup,
  } = useQuery(GET_GROUP_DIRECTORIES_WITH_BRANCHES, {
    variables: { groupId: groupId! },
    skip: !groupId,
    fetchPolicy: 'cache-and-network',
  });

  const [setGroupBranchSelectionMut] = useMutation(SET_GROUP_BRANCH_SELECTION);
  const [removeGroupBranchSelectionMut] = useMutation(REMOVE_GROUP_BRANCH_SELECTION);
  const [addGroupDirectoryMut] = useMutation(ADD_GROUP_DIRECTORY);
  const [removeGroupDirectoryMut] = useMutation(REMOVE_GROUP_DIRECTORY);
  const [updateAutoCreateMut] = useMutation(UPDATE_GROUP_AUTO_CREATE_WORKTREES);

  const autoCreateWorktrees = useMemo(() => {
    const group = (groupData as Record<string, Record<string, unknown>>)?.workstreamGroup;
    return (group?.autoCreateWorktrees as boolean) ?? false;
  }, [groupData]);

  // Sync directory states from query data
  useEffect(() => {
    const group = (groupData as Record<string, Record<string, unknown>>)?.workstreamGroup;
    if (!group) return;

    const dirs = (group.directories as Array<{ id: string; path: string; label: string | null }>) ?? [];
    const branchSels = (group.branchSelections as Array<{ directoryPath: string; branch: string; baseBranch: string }>) ?? [];
    const selMap = new Map(branchSels.map((s) => [s.directoryPath, s]));

    setDirectories((prev) => {
      const prevByPath = new Map(prev.map((d) => [d.path, d]));
      return dirs.map((dir): GroupDirectoryState => {
        const existing = prevByPath.get(dir.path);
        const sel = selMap.get(dir.path);
        return {
          path: dir.path,
          name: dir.label || getDirectoryName(dir.path),
          label: dir.label,
          isGitRepo: existing?.isGitRepo ?? true,
          selectedBranch: sel?.branch ?? null,
          baseBranch: sel?.baseBranch ?? 'main',
          branches: existing?.branches ?? null,
          isLoading: existing ? existing.isLoading : true,
          error: existing?.error ?? null,
        };
      });
    });
  }, [groupData]);

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

  // Reset fetch tracking when directories change
  useEffect(() => {
    const currentPaths = new Set(directories.map((d) => d.path));
    for (const path of fetchingBranchesRef.current) {
      if (!currentPaths.has(path)) {
        fetchingBranchesRef.current.delete(path);
      }
    }
  }, [directories]);

  const handleBranchSelect = useCallback(
    async (dirPath: string, branch: string, baseBranch?: string) => {
      if (!groupId) return;
      try {
        // Optimistic update
        setDirectories((prev) =>
          prev.map((d) =>
            d.path === dirPath ? { ...d, selectedBranch: branch, baseBranch: baseBranch ?? d.baseBranch } : d,
          ),
        );
        await setGroupBranchSelectionMut({
          variables: { groupId, directoryPath: dirPath, branch, baseBranch },
        });
        refetchGroup();
      } catch (error) {
        logger.error('Failed to set group branch selection', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [groupId, setGroupBranchSelectionMut, refetchGroup],
  );

  const handleBranchRemove = useCallback(
    async (dirPath: string) => {
      if (!groupId) return;
      try {
        setDirectories((prev) =>
          prev.map((d) =>
            d.path === dirPath ? { ...d, selectedBranch: null } : d,
          ),
        );
        await removeGroupBranchSelectionMut({
          variables: { groupId, directoryPath: dirPath },
        });
        refetchGroup();
      } catch (error) {
        logger.error('Failed to remove group branch selection', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [groupId, removeGroupBranchSelectionMut, refetchGroup],
  );

  const handleAddDirectory = useCallback(
    async (path: string, label?: string) => {
      if (!groupId) return;
      try {
        await addGroupDirectoryMut({ variables: { groupId, path, label } });
        refetchGroup();
      } catch (error) {
        logger.error('Failed to add group directory', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [groupId, addGroupDirectoryMut, refetchGroup],
  );

  const handleRemoveDirectory = useCallback(
    async (path: string) => {
      if (!groupId) return;
      try {
        await removeGroupDirectoryMut({ variables: { groupId, path } });
        refetchGroup();
      } catch (error) {
        logger.error('Failed to remove group directory', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [groupId, removeGroupDirectoryMut, refetchGroup],
  );

  const handleAutoCreateWorktreesChange = useCallback(
    async (enabled: boolean) => {
      if (!groupId) return;
      try {
        await updateAutoCreateMut({
          variables: { id: groupId, autoCreateWorktrees: enabled },
        });
        refetchGroup();
      } catch (error) {
        logger.error('Failed to update auto-create worktrees', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [groupId, updateAutoCreateMut, refetchGroup],
  );

  const refetch = useCallback(() => {
    refetchGroup();
  }, [refetchGroup]);

  return {
    directories,
    isLoading: groupLoading,
    autoCreateWorktrees,
    handleBranchSelect,
    handleBranchRemove,
    handleAddDirectory,
    handleRemoveDirectory,
    handleAutoCreateWorktreesChange,
    refetch,
  };
}
