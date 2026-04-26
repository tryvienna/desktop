/**
 * useWorkstreamGroups — Fetches and manages workstream groups for a project.
 *
 * Provides groups list and mutation callbacks for the navigation sidebar.
 * Groups are fetched via GraphQL and cached by Apollo.
 *
 * @ai-context
 * - Returns groups array and actions (pin, unpin, create, etc.)
 * - Designed to be composed with useWorkstreamsNavSections
 * - Groups are sorted: pinned first, then by updatedAt
 */

import { useCallback, useMemo } from 'react';
import {
  useQuery,
  useMutation,
  GET_WORKSTREAMS_BY_PROJECT,
  GET_WORKSTREAM_GROUPS_BY_PROJECT,
  CREATE_WORKSTREAM_GROUP,
  UPDATE_WORKSTREAM_GROUP,
  PIN_WORKSTREAM_GROUP,
  UNPIN_WORKSTREAM_GROUP,
  DELETE_WORKSTREAM_GROUP,
  ARCHIVE_WORKSTREAM_GROUP,
  ADD_WORKSTREAM_TO_GROUP,
  REMOVE_WORKSTREAM_FROM_GROUP,
} from '@vienna/graphql/client';
import type { WorkstreamGroup } from './useWorkstreamsNavSections';

// ─── Hook ───────────────────────────────────────────────────────────────────

export interface UseWorkstreamGroupsResult {
  groups: WorkstreamGroup[];
  loading: boolean;
  createGroup: (name: string, emoji?: string | null) => Promise<string | null>;
  renameGroup: (id: string, name: string) => Promise<void>;
  updateGroupEmoji: (id: string, emoji: string | null) => Promise<void>;
  pinGroup: (id: string) => void;
  unpinGroup: (id: string) => void;
  deleteGroup: (id: string) => void;
  archiveGroup: (id: string) => void;
  addWorkstreamToGroup: (workstreamId: string, groupId: string) => void;
  removeWorkstreamFromGroup: (workstreamId: string) => void;
}

export function useWorkstreamGroups(projectId: string | null): UseWorkstreamGroupsResult {
  const { data, loading } = useQuery(GET_WORKSTREAM_GROUPS_BY_PROJECT, {
    variables: { projectId: projectId! },
    skip: !projectId,
    fetchPolicy: 'cache-and-network',
  });

  const groups = useMemo<WorkstreamGroup[]>(() => {
    const raw = data?.workstreamGroupsByProject;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((g): g is NonNullable<typeof g> => g != null && g.id != null)
      .map((g) => ({
        id: g.id!,
        name: g.name ?? 'Unnamed Group',
        emoji: g.emoji ?? null,
        isPinned: g.isPinned ?? false,
        autoCreateWorktrees: g.autoCreateWorktrees ?? false,
      }));
  }, [data]);

  const groupRefetchQueries = useMemo(() =>
    projectId
      ? [{ query: GET_WORKSTREAM_GROUPS_BY_PROJECT, variables: { projectId } }]
      : [],
    [projectId],
  );

  const workstreamRefetchQueries = useMemo(() =>
    projectId
      ? [{ query: GET_WORKSTREAMS_BY_PROJECT, variables: { projectId } }]
      : [],
    [projectId],
  );

  const [createGroupMut] = useMutation(CREATE_WORKSTREAM_GROUP);
  const [updateGroupMut] = useMutation(UPDATE_WORKSTREAM_GROUP);
  const [pinGroupMut] = useMutation(PIN_WORKSTREAM_GROUP);
  const [unpinGroupMut] = useMutation(UNPIN_WORKSTREAM_GROUP);
  const [deleteGroupMut] = useMutation(DELETE_WORKSTREAM_GROUP);
  const [archiveGroupMut] = useMutation(ARCHIVE_WORKSTREAM_GROUP);
  const [addToGroupMut] = useMutation(ADD_WORKSTREAM_TO_GROUP);
  const [removeFromGroupMut] = useMutation(REMOVE_WORKSTREAM_FROM_GROUP);

  const createGroup = useCallback(
    async (name: string, emoji?: string | null): Promise<string | null> => {
      if (!projectId) return null;
      const { data: result } = await createGroupMut({
        variables: { input: { projectId, name, emoji: emoji ?? undefined } },
        refetchQueries: groupRefetchQueries,
      });
      return result?.createWorkstreamGroup?.group?.id ?? null;
    },
    [projectId, createGroupMut, groupRefetchQueries],
  );

  const renameGroup = useCallback(
    async (id: string, name: string): Promise<void> => {
      await updateGroupMut({
        variables: { id, input: { name } },
        refetchQueries: groupRefetchQueries,
      });
    },
    [updateGroupMut, groupRefetchQueries],
  );

  const updateGroupEmoji = useCallback(
    async (id: string, emoji: string | null): Promise<void> => {
      await updateGroupMut({
        variables: { id, input: { emoji } },
        refetchQueries: groupRefetchQueries,
      });
    },
    [updateGroupMut, groupRefetchQueries],
  );

  const pinGroup = useCallback(
    (id: string) => { pinGroupMut({ variables: { id }, refetchQueries: groupRefetchQueries }); },
    [pinGroupMut, groupRefetchQueries],
  );

  const unpinGroup = useCallback(
    (id: string) => { unpinGroupMut({ variables: { id }, refetchQueries: groupRefetchQueries }); },
    [unpinGroupMut, groupRefetchQueries],
  );

  const deleteGroup = useCallback(
    (id: string) => { deleteGroupMut({ variables: { id }, refetchQueries: [...groupRefetchQueries, ...workstreamRefetchQueries] }); },
    [deleteGroupMut, groupRefetchQueries, workstreamRefetchQueries],
  );

  const archiveGroup = useCallback(
    (id: string) => { archiveGroupMut({ variables: { id }, refetchQueries: [...groupRefetchQueries, ...workstreamRefetchQueries] }); },
    [archiveGroupMut, groupRefetchQueries, workstreamRefetchQueries],
  );

  const addWorkstreamToGroupCb = useCallback(
    (workstreamId: string, groupId: string) => {
      addToGroupMut({ variables: { workstreamId, groupId }, refetchQueries: workstreamRefetchQueries });
    },
    [addToGroupMut, workstreamRefetchQueries],
  );

  const removeWorkstreamFromGroupCb = useCallback(
    (workstreamId: string) => {
      removeFromGroupMut({ variables: { workstreamId }, refetchQueries: workstreamRefetchQueries });
    },
    [removeFromGroupMut, workstreamRefetchQueries],
  );

  return {
    groups,
    loading,
    createGroup,
    renameGroup,
    updateGroupEmoji,
    pinGroup,
    unpinGroup,
    deleteGroup,
    archiveGroup,
    addWorkstreamToGroup: addWorkstreamToGroupCb,
    removeWorkstreamFromGroup: removeWorkstreamFromGroupCb,
  };
}
