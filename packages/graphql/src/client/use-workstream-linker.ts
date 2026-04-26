/**
 * useWorkstreamLinker — Hook for linking entities to workstreams.
 *
 * Encapsulates all GraphQL queries/mutations for workstream linking.
 * Returns linked workstreams, available workstreams, and action callbacks
 * that match the WorkstreamSection / WorkstreamHeaderAction props from @tryvienna/ui.
 *
 * @example
 * const linker = useWorkstreamLinker({
 *   entityUri: '@vienna//github_pr/owner/repo/42',
 *   entityType: 'github_pr',
 *   entityTitle: 'Fix login bug',
 *   projectId: 'proj-1',
 * });
 *
 * <WorkstreamHeaderAction
 *   entityId={entityUri}
 *   entityTitle={title}
 *   linkedWorkstreams={linker.linkedWorkstreams}
 *   activeWorkstreams={linker.activeWorkstreams}
 *   onStartWorkstream={linker.startWorkstream}
 *   onAddToWorkstream={linker.linkWorkstream}
 * />
 */

import { useCallback, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client/react/hooks';
import {
  GET_WORKSTREAMS_BY_ENTITY,
  GET_WORKSTREAMS_BY_PROJECT,
  LINK_WORKSTREAM_ENTITY,
  UNLINK_WORKSTREAM_ENTITY,
  CREATE_WORKSTREAM,
  SET_WORKSTREAM_IN_FOCUS,
} from './operations';

// ─────────────────────────────────────────────────────────────────────────────
// Types — structurally compatible with @tryvienna/ui's LinkedWorkstream / ActiveWorkstream
// ─────────────────────────────────────────────────────────────────────────────

export type WorkstreamLinkStatus =
  | 'created' | 'active' | 'ai_working' | 'has_updates'
  | 'waiting_review' | 'paused' | 'completed' | 'archived';

export type WorkstreamRelationship = 'source' | 'linked' | 'created' | 'mentioned';

export interface LinkerLinkedWorkstream {
  id: string;
  title: string;
  status: WorkstreamLinkStatus;
  relationship: WorkstreamRelationship;
}

export interface LinkerActiveWorkstream {
  id: string;
  title: string;
  status: 'active' | 'paused' | 'completed';
}

export interface UseWorkstreamLinkerOptions {
  entityUri: string;
  entityType: string;
  entityTitle?: string;
  projectId?: string;
  onNavigate?: (workstreamId: string) => void;
}

export interface WorkstreamLinkerResult {
  linkedWorkstreams: LinkerLinkedWorkstream[];
  activeWorkstreams: LinkerActiveWorkstream[];
  linkWorkstream: (workstreamId: string) => Promise<void>;
  unlinkWorkstream: (workstream: LinkerLinkedWorkstream) => Promise<void>;
  startWorkstream: (entityId: string, entityTitle: string) => Promise<void>;
  navigateToWorkstream: (workstream: LinkerLinkedWorkstream) => void;
  loading: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Status Mapping
// ─────────────────────────────────────────────────────────────────────────────

function mapStatus(status: string): WorkstreamLinkStatus {
  switch (status) {
    case 'active': return 'active';
    case 'processing': return 'ai_working';
    case 'waiting_permission': return 'waiting_review';
    case 'completed_unviewed': return 'has_updates';
    case 'needs_review': return 'waiting_review';
    case 'idle': return 'paused';
    case 'archived': return 'archived';
    default: return 'created';
  }
}

function mapActiveStatus(status: string): 'active' | 'paused' | 'completed' {
  switch (status) {
    case 'active':
    case 'processing':
    case 'waiting_permission':
    case 'completed_unviewed':
    case 'needs_review':
      return 'active';
    case 'idle':
      return 'paused';
    case 'archived':
      return 'completed';
    default:
      return 'active';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useWorkstreamLinker(options: UseWorkstreamLinkerOptions): WorkstreamLinkerResult {
  const { entityUri, entityType, entityTitle, projectId, onNavigate } = options;

  const { data: linkedData, loading: linkedLoading, refetch: refetchLinked } = useQuery(
    GET_WORKSTREAMS_BY_ENTITY,
    { variables: { entityUri }, fetchPolicy: 'cache-and-network' },
  );

  const { data: projectWsData, loading: projectLoading } = useQuery(
    GET_WORKSTREAMS_BY_PROJECT,
    {
      variables: { projectId: projectId! },
      skip: !projectId,
      fetchPolicy: 'cache-and-network',
    },
  );

  const [linkMutation] = useMutation(LINK_WORKSTREAM_ENTITY);
  const [unlinkMutation] = useMutation(UNLINK_WORKSTREAM_ENTITY);
  const [createMutation] = useMutation(CREATE_WORKSTREAM);
  const [setFocusMutation] = useMutation(SET_WORKSTREAM_IN_FOCUS);

  const linkedWorkstreams: LinkerLinkedWorkstream[] = useMemo(() => {
    const links = linkedData?.workstreamsByEntity ?? [];
    return links
      .filter((link) => link.workstream != null)
      .map((link) => ({
        id: link.workstream!.id!,
        title: link.workstream!.title ?? 'Untitled',
        status: mapStatus(link.workstream!.status ?? 'idle'),
        relationship: link.groupId ? ('linked' as const) : ('source' as const),
      }));
  }, [linkedData]);

  const linkedIds = useMemo(
    () => new Set(linkedWorkstreams.map((w) => w.id)),
    [linkedWorkstreams],
  );

  const activeWorkstreams: LinkerActiveWorkstream[] = useMemo(() => {
    const all = projectWsData?.workstreamsByProject ?? [];
    return all
      .filter((ws) => (ws.status as string) !== 'archived' && !linkedIds.has(ws.id!))
      .map((ws) => ({
        id: ws.id!,
        title: ws.title ?? 'Untitled',
        status: mapActiveStatus(ws.status ?? 'idle'),
      }));
  }, [projectWsData, linkedIds]);

  const linkWorkstream = useCallback(
    async (workstreamId: string) => {
      await linkMutation({
        variables: { workstreamId, entityUri, entityType, entityTitle },
      });
      await refetchLinked();
    },
    [linkMutation, entityUri, entityType, entityTitle, refetchLinked],
  );

  const unlinkWorkstream = useCallback(
    async (workstream: LinkerLinkedWorkstream) => {
      await unlinkMutation({
        variables: { workstreamId: workstream.id, entityUri },
      });
      await refetchLinked();
    },
    [unlinkMutation, entityUri, refetchLinked],
  );

  const startWorkstream = useCallback(
    async (_entityId: string, title: string) => {
      if (!projectId) return;

      const result = await createMutation({
        variables: { input: { projectId, title } },
      });

      const newId = result.data?.createWorkstream?.workstream?.id;
      if (!newId) return;

      await Promise.all([
        linkMutation({
          variables: { workstreamId: newId, entityUri, entityType, entityTitle: title },
        }),
        setFocusMutation({ variables: { id: newId } }),
      ]);

      await refetchLinked();
      onNavigate?.(newId);
    },
    [projectId, createMutation, linkMutation, setFocusMutation, entityUri, entityType, entityTitle, refetchLinked, onNavigate],
  );

  const navigateToWorkstream = useCallback(
    (workstream: LinkerLinkedWorkstream) => {
      void setFocusMutation({ variables: { id: workstream.id } });
      onNavigate?.(workstream.id);
    },
    [setFocusMutation, onNavigate],
  );

  return {
    linkedWorkstreams,
    activeWorkstreams,
    linkWorkstream,
    unlinkWorkstream,
    startWorkstream,
    navigateToWorkstream,
    loading: linkedLoading || projectLoading,
  };
}
