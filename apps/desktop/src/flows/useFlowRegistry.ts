/**
 * useFlowRegistry — Shared hook for command palette flow definitions.
 *
 * @ai-context
 * Used by both GlobalShortcuts (overlay palette) and ChatView (inline / palette).
 * Reads active workstream state from context to build flows with correct callbacks.
 */

import { useCallback, useMemo, useRef } from 'react';
import type { FlowDefinition } from '@vienna/chat-ui';
import {
  useQuery,
  useMutation,
  GET_ARCHIVED_WORKSTREAMS,
  APPLY_TAG_TO_WORKSTREAM,
  REMOVE_TAG_FROM_WORKSTREAM,
} from '@vienna/graphql/client';
import { useActiveWorkstreamId, useWorkstreamList, useWorkstreamActions } from '../renderer/contexts/WorkstreamContext';
import { useWorkstreamGroups } from '../renderer/hooks/useWorkstreamGroups';
import { toUIStatus } from '../renderer/utils/workstream-status';
import { formatRelativeTime } from '../components/drawer/workstream-settings/helpers';
import { fuzzyMatch } from '../keybindings/utils';
import { createFlowRegistry } from './command-flows';

export interface FlowRegistryDeps {
  /** Claude commands with hasFlow and body (need argument input) */
  claudeCommands?: Array<{ id: string; title: string; body: string }>;
}

export function useFlowRegistry(deps?: FlowRegistryDeps): Record<string, FlowDefinition> {
  const activeWorkstreamId = useActiveWorkstreamId();
  const { projectId, workstreams } = useWorkstreamList();
  const { setActiveWorkstream, switchWorkstreamModel, clearConversation, compactConversation, archiveWorkstream, unarchiveWorkstream, pinWorkstream, unpinWorkstream, deleteWorkstream } = useWorkstreamActions();
  const {
    groups,
    createGroup,
    renameGroup,
    pinGroup,
    unpinGroup,
    deleteGroup,
    archiveGroup,
    addWorkstreamToGroup,
    removeWorkstreamFromGroup,
  } = useWorkstreamGroups(projectId);

  // Archived workstreams (separate query — workstreamsByProject excludes archived)
  const { data: archivedData } = useQuery(GET_ARCHIVED_WORKSTREAMS, {
    variables: { projectId: projectId! },
    skip: !projectId,
  });

  // Tag mutations
  const [applyTag] = useMutation(APPLY_TAG_TO_WORKSTREAM);
  const [removeTag] = useMutation(REMOVE_TAG_FROM_WORKSTREAM);

  // Use refs so the browse flow doesn't need to be recreated on every workstream change
  const workstreamsRef = useRef(workstreams);
  const activeIdRef = useRef(activeWorkstreamId);
  const groupsRef = useRef(groups);
  const archivedWorkstreams = useMemo(() =>
    (archivedData?.archivedWorkstreams ?? [])
      .filter((ws): ws is typeof ws & { id: string; title: string; status: string } =>
        Boolean(ws.id && ws.title && ws.status))
      .map((ws) => ({
        id: ws.id,
        title: ws.title,
        status: ws.status,
        isPinned: false,
        lastActivityAt: ws.updatedAt ?? null,
      })),
    [archivedData],
  );
  const archivedRef = useRef(archivedWorkstreams);
  workstreamsRef.current = workstreams;
  activeIdRef.current = activeWorkstreamId;
  groupsRef.current = groups;
  archivedRef.current = archivedWorkstreams;

  const getWorkstreams = useCallback(() => workstreamsRef.current, []);
  const getArchivedWorkstreams = useCallback(() => archivedRef.current, []);
  const getActiveWorkstreamId = useCallback(() => activeIdRef.current, []);
  const getGroups = useCallback(() => groupsRef.current, []);

  const activeModel = useMemo(() => {
    if (!activeWorkstreamId) return undefined;
    return workstreams.find((ws) => ws.id === activeWorkstreamId)?.model ?? undefined;
  }, [workstreams, activeWorkstreamId]);

  const sharedWorkstreamConfig = useMemo(() => ({
    getWorkstreams,
    getActiveWorkstreamId,
    toUIStatus: (status: string) => toUIStatus(status as any),
    formatRelativeTime: (time: string | number) => formatRelativeTime(time),
    fuzzyMatch,
  }), [getWorkstreams, getActiveWorkstreamId]);

  return useMemo(
    () => createFlowRegistry({
      currentModel: activeModel,
      onModelChange: async (modelId) => {
        if (activeWorkstreamId) {
          await switchWorkstreamModel(activeWorkstreamId, modelId);
        }
      },
      onClear: async () => {
        if (activeWorkstreamId) {
          await clearConversation(activeWorkstreamId);
        }
      },
      onCompact: (instructions?: string) => {
        if (activeWorkstreamId) {
          compactConversation(activeWorkstreamId, instructions);
        }
      },
      workstreamBrowse: {
        ...sharedWorkstreamConfig,
        onSelect: (id) => setActiveWorkstream(id),
      },
      workstreamArchive: {
        ...sharedWorkstreamConfig,
        onAction: (id) => archiveWorkstream(id),
      },
      workstreamDelete: {
        ...sharedWorkstreamConfig,
        onAction: (id) => deleteWorkstream(id),
      },
      workstreamUnarchive: {
        ...sharedWorkstreamConfig,
        getWorkstreams: getArchivedWorkstreams,
        onAction: (id) => unarchiveWorkstream(id),
      },
      workstreamPin: {
        ...sharedWorkstreamConfig,
        onAction: (id) => pinWorkstream(id),
      },
      workstreamUnpin: {
        ...sharedWorkstreamConfig,
        onAction: (id) => unpinWorkstream(id),
      },
      moveToGroup: {
        getWorkstreams: () => workstreamsRef.current.map((ws) => ({
          id: ws.id,
          title: ws.title,
          status: ws.status,
          groupId: ws.groupId ?? null,
        })),
        getGroups,
        getActiveWorkstreamId,
        onMove: (workstreamId, groupId) => {
          if (groupId) {
            addWorkstreamToGroup(workstreamId, groupId);
          } else {
            removeWorkstreamFromGroup(workstreamId);
          }
        },
        toUIStatus: (status) => toUIStatus(status as any),
        fuzzyMatch,
      },
      groupCreate: {
        onCreate: (name) => { createGroup(name); },
      },
      groupRename: {
        getGroups,
        onRename: (groupId, name) => { renameGroup(groupId, name); },
        fuzzyMatch,
      },
      groupPin: {
        getGroups,
        onPin: (groupId) => { pinGroup(groupId); },
        onUnpin: (groupId) => { unpinGroup(groupId); },
        fuzzyMatch,
      },
      bulkArchive: {
        getWorkstreams: () => workstreamsRef.current.map((ws) => ({
          id: ws.id,
          title: ws.title,
          status: ws.status,
          groupId: ws.groupId,
          archivedAt: ws.archivedAt,
        })),
        getGroups,
        onArchive: async (ids) => {
          for (const id of ids) {
            archiveWorkstream(id);
          }
        },
        toUIStatus: (status) => toUIStatus(status as any),
        fuzzyMatch,
      },
      bulkDelete: {
        getWorkstreams: () => workstreamsRef.current.map((ws) => ({
          id: ws.id,
          title: ws.title,
          status: ws.status,
          groupId: ws.groupId,
          archivedAt: ws.archivedAt,
        })),
        getGroups,
        onDelete: async (ids) => {
          const deleteSet = new Set(ids);
          // If the active workstream is being deleted, switch to a surviving one first
          if (activeIdRef.current && deleteSet.has(activeIdRef.current)) {
            const survivor = workstreamsRef.current.find((ws) => !deleteSet.has(ws.id));
            setActiveWorkstream(survivor?.id ?? null);
          }
          for (const id of ids) {
            deleteWorkstream(id);
          }
        },
        toUIStatus: (status) => toUIStatus(status as any),
        fuzzyMatch,
      },
      groupArchive: {
        getGroups,
        onArchive: (groupId) => { archiveGroup(groupId); },
        fuzzyMatch,
      },
      groupDelete: {
        getGroups,
        onDelete: (groupId) => { deleteGroup(groupId); },
        fuzzyMatch,
      },
      tags: projectId ? {
        ...sharedWorkstreamConfig,
        projectId,
        onApply: async (workstreamId: string, tagName: string) => {
          await applyTag({ variables: { workstreamId, tagName } });
        },
        onRemove: async (workstreamId: string, tagName: string) => {
          await removeTag({ variables: { workstreamId, tagName } });
        },
      } : undefined,
      claudeCommands: deps?.claudeCommands,
    }),
    [activeModel, activeWorkstreamId, switchWorkstreamModel, clearConversation, compactConversation, setActiveWorkstream, archiveWorkstream, unarchiveWorkstream, pinWorkstream, unpinWorkstream, deleteWorkstream, sharedWorkstreamConfig, getWorkstreams, getArchivedWorkstreams, getActiveWorkstreamId, getGroups, addWorkstreamToGroup, removeWorkstreamFromGroup, createGroup, renameGroup, pinGroup, unpinGroup, deleteGroup, archiveGroup, projectId, applyTag, removeTag, deps?.claudeCommands]
  );
}
