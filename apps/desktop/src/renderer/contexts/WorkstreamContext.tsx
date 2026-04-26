/**
 * WorkstreamContext — Manages workstream state for the renderer.
 *
 * Split into two contexts for performance:
 * - WorkstreamStateContext: triggers re-renders on state changes
 * - WorkstreamActionsContext: stable refs, never triggers re-renders
 *
 * @ai-context
 * - Fetches workstreams via GraphQL query
 * - Subscribes to IPC events for real-time status updates
 * - Updates Apollo cache directly from IPC (no refetch)
 * - Auto-creates default project on first launch
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  useQuery,
  useMutation,
  useApolloClient,
  GET_PROJECTS,
  CREATE_PROJECT,
  GET_WORKSTREAMS_BY_PROJECT,
  GET_ARCHIVED_WORKSTREAMS,
  CREATE_WORKSTREAM,
  ARCHIVE_WORKSTREAM,
  UNARCHIVE_WORKSTREAM,
  PIN_WORKSTREAM,
  UNPIN_WORKSTREAM,
  DELETE_WORKSTREAM,
  SET_WORKSTREAM_IN_FOCUS,
  UPDATE_WORKSTREAM,
  SWITCH_WORKSTREAM_MODEL,
  CLEAR_WORKSTREAM_CONVERSATION,
  COMPACT_WORKSTREAM_CONVERSATION,
} from '@vienna/graphql/client';
import type { WorkstreamStatus } from '@vienna/graphql/client/generated/graphql';
import { DEFAULT_MODEL } from '../../components/domain';
import { getEvents } from '@vienna/ipc/renderer';
import { events } from '../../ipc';
import { useAuth } from '../../providers/AuthProvider';
import { usePersistedState, readScoped, writeScoped } from '../../storage';

// ─── Structural sharing ──────────────────────────────────────────────────────

/** Shallow-compare two workstream objects. */
function workstreamEqual(a: Workstream, b: Workstream): boolean {
  return (
    a.id === b.id &&
    a.title === b.title &&
    a.status === b.status &&
    a.model === b.model &&
    a.isPinned === b.isPinned &&
    a.isRoutineWorkstream === b.isRoutineWorkstream &&
    a.groupId === b.groupId &&
    a.messageCount === b.messageCount &&
    a.lastActivityAt === b.lastActivityAt &&
    a.createdAt === b.createdAt &&
    a.updatedAt === b.updatedAt &&
    a.inFocus === b.inFocus
  );
}

/**
 * Stabilize a workstreams array: reuse previous object references for unchanged
 * items and return the previous array reference if nothing changed at all.
 * This prevents 11+ context consumers from re-rendering on no-op cache updates.
 */
function useStableWorkstreams(next: Workstream[]): Workstream[] {
  const prevRef = useRef<Workstream[]>(next);

  return useMemo(() => {
    const prev = prevRef.current;
    if (prev.length !== next.length) {
      prevRef.current = next;
      return next;
    }

    let changed = false;
    const merged = next.map((ws, i) => {
      const old = prev[i];
      if (old && workstreamEqual(old, ws)) return old;
      changed = true;
      return ws;
    });

    if (!changed) return prev;
    prevRef.current = merged;
    return merged;
  }, [next]);
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
}

export interface Workstream {
  id: string;
  title: string;
  status: WorkstreamStatus;
  model: string | null;
  isPinned: boolean;
  isRoutineWorkstream: boolean;
  groupId: string | null;
  messageCount: number;
  lastActivityAt: string | number | null;
  archivedAt: string | number | null;
  createdAt: string | number;
  updatedAt: string | number;
  inFocus: boolean;
}

interface WorkstreamListValue {
  projectId: string | null;
  projects: Project[];
  workstreams: Workstream[];
  loading: boolean;
  error: Error | null;
}

interface WorkstreamActions {
  setActiveWorkstream: (id: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  /** Navigate to a workstream and scroll to a specific message. */
  navigateToMessage: (workstreamId: string, messageId: string) => void;
  /** Pending scroll target messageId (consumed by ChatView on render). */
  scrollTarget: string | null;
  /** Consume the pending scroll target (returns and clears it). */
  consumeScrollTarget: () => string | null;
  switchProject: (id: string) => void;
  createWorkstream: (title?: string, groupId?: string) => Promise<string | null>;
  updateWorkstreamTitle: (id: string, title: string) => Promise<void>;
  switchWorkstreamModel: (id: string, model: string) => Promise<void>;
  clearConversation: (id: string) => Promise<void>;
  compactConversation: (id: string, instructions?: string) => void;
  archiveWorkstream: (id: string) => void;
  unarchiveWorkstream: (id: string) => void;
  pinWorkstream: (id: string) => void;
  unpinWorkstream: (id: string) => void;
  deleteWorkstream: (id: string) => void;
  markNeedsReview: (id: string) => void;
  togglePreviousWorkstream: () => void;
}

/** Active view mode — determines what the main content area renders. */
export type ViewMode = 'home' | 'inbox' | 'workstream';

// ─── Contexts ────────────────────────────────────────────────────────────────

const ActiveIdContext = createContext<string | null>(null);
const ViewModeContext = createContext<ViewMode>('home');
const WorkstreamListContext = createContext<WorkstreamListValue>({
  projectId: null,
  projects: [],
  workstreams: [],
  loading: true,
  error: null,
});
const WorkstreamActionsContext = createContext<WorkstreamActions | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

const DEFAULT_PROJECT_NAME = 'Default';

export function WorkstreamProvider({ children }: { children: ReactNode }) {
  const client = useApolloClient();
  const { userId } = useAuth();
  const [persistedProjectId, setPersistedProjectId] = usePersistedState('activeProjectId');
  const [projectId, setProjectIdState] = useState<string | null>(null);
  const [activeWorkstreamId, setActiveWorkstreamId] = useState<string | null>(
    () => (userId ? readScoped('activeWorkstreamId', userId) : null)
  );
  const activeIdRef = useRef<string | null>(activeWorkstreamId);
  const previousWorkstreamIdRef = useRef<string | null>(null);
  const scrollTargetRef = useRef<string | null>(null);
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);
  const [viewMode, setViewModeState] = useState<ViewMode>(
    activeWorkstreamId ? 'workstream' : 'home'
  );

  const setProjectId = useCallback(
    (id: string) => {
      setProjectIdState(id);
      setPersistedProjectId(id);
    },
    [setPersistedProjectId]
  );

  // ── Default project bootstrap ────────────────────────────────────────────
  const { data: projectsData, loading: projectsLoading } = useQuery(GET_PROJECTS);
  const [createProjectMut] = useMutation(CREATE_PROJECT);

  useEffect(() => {
    if (projectsLoading) return;

    const projects = projectsData?.projects;
    if (projects && projects.length > 0) {
      // Restore persisted project if it still exists, otherwise use first
      const persisted = persistedProjectId
        ? projects.find((p) => p.id === persistedProjectId)
        : null;
      const targetId = persisted?.id ?? projects[0]!.id!;
      setProjectId(targetId);
    } else if (projects && projects.length === 0) {
      createProjectMut({
        variables: { input: { name: DEFAULT_PROJECT_NAME } },
        onCompleted: (data) => {
          const id = data.createProject?.id;
          if (id) setProjectId(id);
        },
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps — persistedProjectId and setProjectId
  // are intentionally excluded: including persistedProjectId would re-run bootstrap on every
  // persist cycle, and setProjectId is stable (useCallback with stable deps).
  }, [projectsData, projectsLoading, createProjectMut]);

  // ── Workstream query ─────────────────────────────────────────────────────
  const {
    data: workstreamsData,
    loading: workstreamsLoading,
    error: workstreamsError,
  } = useQuery(GET_WORKSTREAMS_BY_PROJECT, {
    variables: { projectId: projectId! },
    skip: !projectId,
    fetchPolicy: 'cache-and-network',
  });

  const rawWorkstreams = useMemo<Workstream[]>(() => {
    const raw = workstreamsData?.workstreamsByProject;
    if (!raw) return [];
    return raw
      .filter((w): w is NonNullable<typeof w> & { id: string; title: string; status: WorkstreamStatus; groupId: string | null } =>
        w != null && w.id != null && w.title != null && w.status != null
      )
      .map((w) => ({
        id: w.id,
        title: w.title,
        status: w.status,
        model: w.model ?? null,
        isPinned: w.isPinned ?? false,
        isRoutineWorkstream: w.isRoutineWorkstream ?? false,
        groupId: w.groupId ?? null,
        messageCount: w.messageCount ?? 0,
        lastActivityAt: w.lastActivityAt ?? null,
        createdAt: w.createdAt!,
        updatedAt: w.updatedAt!,
        inFocus: w.inFocus ?? false,
      }));
  }, [workstreamsData]);

  // Stabilize array reference — prevents re-renders across 11+ consumers
  // when Apollo emits a new reference to structurally identical data.
  const workstreams = useStableWorkstreams(rawWorkstreams);

  // Ref-based access to workstreams for callbacks that shouldn't re-create on list changes
  const workstreamsRef = useRef<Workstream[]>(workstreams);
  useEffect(() => {
    workstreamsRef.current = workstreams;
  }, [workstreams]);

  // ── Sync server-driven focus to local state ─────────────────────────────
  // When a plugin (or any external caller) sets focus via the GraphQL mutation,
  // Apollo cache updates the workstream's `inFocus` field. This effect detects
  // the change and syncs the local activeWorkstreamId state to match.
  useEffect(() => {
    const focused = workstreams.find((ws) => ws.inFocus);
    if (!focused) return;
    if (focused.id !== activeIdRef.current) {
      if (activeIdRef.current !== null) {
        previousWorkstreamIdRef.current = activeIdRef.current;
      }
      activeIdRef.current = focused.id;
      setActiveWorkstreamId(focused.id);
      if (userId) writeScoped('activeWorkstreamId', userId, focused.id);
    }
  }, [workstreams, userId]);

  // ── IPC event subscriptions ──────────────────────────────────────────────
  useEffect(() => {
    const ipcEvents = getEvents(events);

    const unsubStatus = ipcEvents.workstream.onStatusChanged((payload) => {
      const { workstreamId, status } = payload;

      // Update Apollo cache directly — no refetch
      client.cache.modify({
        id: client.cache.identify({ __typename: 'Workstream', id: workstreamId }),
        fields: {
          status: () => status,
        },
      });

      // If this workstream is in focus and changed to completed_unviewed, mark as active
      if (status === 'completed_unviewed' && workstreamId === activeIdRef.current) {
        client.cache.modify({
          id: client.cache.identify({ __typename: 'Workstream', id: workstreamId }),
          fields: {
            status: () => 'active' as WorkstreamStatus,
          },
        });
      }
    });

    return () => {
      unsubStatus();
    };
  }, [client]);

  // ── Mutations ────────────────────────────────────────────────────────────
  const [createWorkstreamMut] = useMutation(CREATE_WORKSTREAM);
  const [archiveWorkstreamMut] = useMutation(ARCHIVE_WORKSTREAM);
  const [unarchiveWorkstreamMut] = useMutation(UNARCHIVE_WORKSTREAM);
  const [pinWorkstreamMut] = useMutation(PIN_WORKSTREAM);
  const [unpinWorkstreamMut] = useMutation(UNPIN_WORKSTREAM);
  const [deleteWorkstreamMut] = useMutation(DELETE_WORKSTREAM);
  const [setInFocusMut] = useMutation(SET_WORKSTREAM_IN_FOCUS);
  const [updateWorkstreamMut] = useMutation(UPDATE_WORKSTREAM);
  const [switchModelMut] = useMutation(SWITCH_WORKSTREAM_MODEL);
  const [clearConversationMut] = useMutation(CLEAR_WORKSTREAM_CONVERSATION);
  const [compactConversationMut] = useMutation(COMPACT_WORKSTREAM_CONVERSATION);

  // ── Projects list ──────────────────────────────────────────────────────
  const projects = useMemo<Project[]>(() => {
    const raw = projectsData?.projects;
    if (!raw) return [];
    return raw
      .filter((p): p is NonNullable<typeof p> & { id: string; name: string } =>
        p != null && p.id != null && p.name != null
      )
      .map((p) => ({ id: p.id, name: p.name }));
  }, [projectsData]);

  // ── Actions (stable refs) ────────────────────────────────────────────────
  // Validate persisted active workstream once workstreams have loaded.
  // If the persisted ID no longer exists, clear it.
  const hasValidatedRef = useRef(false);
  useEffect(() => {
    if (hasValidatedRef.current || workstreamsLoading || !workstreamsData) return;
    hasValidatedRef.current = true;

    const persistedId = activeIdRef.current;
    if (!persistedId) return;

    const exists = workstreams.some((ws) => ws.id === persistedId);
    if (exists) {
      // Notify server about the restored active workstream
      setInFocusMut({ variables: { id: persistedId } });
    } else {
      // Persisted workstream no longer exists — clear it
      activeIdRef.current = null;
      setActiveWorkstreamId(null);
      userId && writeScoped('activeWorkstreamId', userId, null);
    }
  }, [workstreamsLoading, workstreamsData]); // eslint-disable-line react-hooks/exhaustive-deps

  const switchProject = useCallback(
    (id: string) => {
      setProjectId(id);
      // Clear active workstream when switching projects
      activeIdRef.current = null;
      setActiveWorkstreamId(null);
      userId && writeScoped('activeWorkstreamId', userId, null);
    },
    [setProjectId, userId]
  );

  const setViewMode = useCallback(
    (mode: ViewMode) => {
      setViewModeState(mode);
    },
    []
  );

  const setActiveWorkstream = useCallback(
    (id: string | null) => {
      // Track previous selection so archive can fall back to it
      if (activeIdRef.current !== null && activeIdRef.current !== id) {
        previousWorkstreamIdRef.current = activeIdRef.current;
      }
      activeIdRef.current = id;
      setActiveWorkstreamId(id);
      setViewModeState(id ? 'workstream' : 'home');
      if (userId) writeScoped('activeWorkstreamId', userId, id);
      setInFocusMut({
        variables: { id },
        update: (cache) => {
          // Immediately update inFocus in cache so the sync effect doesn't fight
          for (const ws of workstreamsRef.current) {
            cache.modify({
              id: cache.identify({ __typename: 'Workstream', id: ws.id }),
              fields: { inFocus: () => ws.id === id },
            });
          }
        },
      });
    },
    [setInFocusMut, userId]
  );

  const navigateToMessage = useCallback(
    (workstreamId: string, messageId: string) => {
      scrollTargetRef.current = messageId;
      setScrollTarget(messageId);
      setActiveWorkstream(workstreamId);
    },
    [setActiveWorkstream]
  );

  const consumeScrollTarget = useCallback((): string | null => {
    const target = scrollTargetRef.current;
    scrollTargetRef.current = null;
    setScrollTarget(null);
    return target;
  }, []);

  const createWorkstream = useCallback(
    async (title?: string, groupId?: string): Promise<string | null> => {
      if (!projectId) return null;
      const { data } = await createWorkstreamMut({
        variables: {
          input: {
            projectId,
            title: title ?? 'New Workstream',
            model: DEFAULT_MODEL,
            ...(groupId ? { groupId } : {}),
          },
        },
        refetchQueries: [{ query: GET_WORKSTREAMS_BY_PROJECT, variables: { projectId } }],
      });
      const newId = data?.createWorkstream?.workstream?.id ?? null;
      if (newId) {
        setActiveWorkstream(newId);
      }
      return newId;
    },
    [projectId, createWorkstreamMut, setActiveWorkstream]
  );

  const updateWorkstreamTitle = useCallback(
    async (id: string, title: string): Promise<void> => {
      await updateWorkstreamMut({
        variables: { id, input: { title } },
      });
    },
    [updateWorkstreamMut]
  );

  const switchWorkstreamModel = useCallback(
    async (id: string, model: string): Promise<void> => {
      await switchModelMut({
        variables: { id, model },
      });
    },
    [switchModelMut]
  );

  const clearConversation = useCallback(
    async (id: string): Promise<void> => {
      await clearConversationMut({
        variables: { id },
      });
    },
    [clearConversationMut]
  );

  const compactConversation = useCallback(
    (id: string, instructions?: string) => {
      compactConversationMut({
        variables: { id, instructions },
      });
    },
    [compactConversationMut]
  );

  const archiveWorkstream = useCallback(
    (id: string) => {
      if (activeIdRef.current === id) {
        // Fall back to the previously selected workstream if still available,
        // then the first remaining workstream, then nothing.
        const available = workstreamsRef.current.filter((ws) => ws.id !== id);
        const prevId = previousWorkstreamIdRef.current;
        const fallback = available.find((ws) => ws.id === prevId) ?? available[0] ?? null;
        setActiveWorkstream(fallback?.id ?? null);
      }
      archiveWorkstreamMut({
        variables: { id },
        refetchQueries: projectId
          ? [
              { query: GET_WORKSTREAMS_BY_PROJECT, variables: { projectId } },
              { query: GET_ARCHIVED_WORKSTREAMS, variables: { projectId } },
            ]
          : [],
      });
    },
    [archiveWorkstreamMut, projectId, setActiveWorkstream]
  );

  const unarchiveWorkstream = useCallback(
    (id: string) => {
      unarchiveWorkstreamMut({
        variables: { id },
        refetchQueries: projectId
          ? [
              { query: GET_WORKSTREAMS_BY_PROJECT, variables: { projectId } },
              { query: GET_ARCHIVED_WORKSTREAMS, variables: { projectId } },
            ]
          : [],
      });
    },
    [unarchiveWorkstreamMut, projectId]
  );

  const pinWorkstream = useCallback(
    (id: string) => {
      pinWorkstreamMut({
        variables: { id },
        optimisticResponse: {
          pinWorkstream: {
            __typename: 'PinWorkstreamPayload' as const,
            workstream: { __typename: 'Workstream' as const, id, isPinned: true },
          },
        },
      });
    },
    [pinWorkstreamMut]
  );

  const unpinWorkstream = useCallback(
    (id: string) => {
      unpinWorkstreamMut({
        variables: { id },
        optimisticResponse: {
          unpinWorkstream: {
            __typename: 'UnpinWorkstreamPayload' as const,
            workstream: { __typename: 'Workstream' as const, id, isPinned: false },
          },
        },
      });
    },
    [unpinWorkstreamMut]
  );

  const deleteWorkstream = useCallback(
    (id: string) => {
      if (activeIdRef.current === id) {
        const available = workstreamsRef.current.filter((ws) => ws.id !== id);
        const prevId = previousWorkstreamIdRef.current;
        const fallback = available.find((ws) => ws.id === prevId) ?? available[0] ?? null;
        setActiveWorkstream(fallback?.id ?? null);
      }
      // Optimistic response so the UI removes the workstream immediately,
      // without waiting for the server to finish stopAgent + worktree cleanup.
      deleteWorkstreamMut({
        variables: { id },
        optimisticResponse: {
          deleteWorkstream: {
            __typename: 'DeleteWorkstreamPayload' as const,
            workstream: { __typename: 'Workstream' as const, id },
          },
        },
        update: (cache) => {
          // Remove the deleted workstream from the cached list query.
          // cache.evict() alone doesn't reliably trigger re-renders for list queries.
          if (projectId) {
            cache.updateQuery(
              { query: GET_WORKSTREAMS_BY_PROJECT, variables: { projectId } },
              (existing) => {
                if (!existing) return existing;
                return {
                  ...existing,
                  workstreamsByProject: existing.workstreamsByProject.filter(
                    (ws) => ws?.id !== id
                  ),
                };
              }
            );
          }
          cache.evict({ id: cache.identify({ __typename: 'Workstream', id }) });
          cache.gc();
        },
      });
    },
    [deleteWorkstreamMut, projectId, setActiveWorkstream]
  );

  const markNeedsReview = useCallback(
    (id: string) => {
      updateWorkstreamMut({
        variables: { id, input: { status: 'needs_review' } },
      });
    },
    [updateWorkstreamMut]
  );

  const togglePreviousWorkstream = useCallback(() => {
    const prevId = previousWorkstreamIdRef.current;
    if (!prevId) return;
    // Verify the previous workstream still exists in the current list
    const exists = workstreamsRef.current.some((ws) => ws.id === prevId);
    if (exists) {
      setActiveWorkstream(prevId);
    }
  }, [setActiveWorkstream]);

  // ── Context values ───────────────────────────────────────────────────────
  const listValue = useMemo<WorkstreamListValue>(
    () => ({
      projectId,
      projects,
      workstreams,
      loading: projectsLoading || workstreamsLoading,
      error: workstreamsError ? new Error(workstreamsError.message) : null,
    }),
    [projectId, projects, workstreams, projectsLoading, workstreamsLoading, workstreamsError]
  );

  const actions = useMemo<WorkstreamActions>(
    () => ({
      setActiveWorkstream,
      setViewMode,
      navigateToMessage,
      scrollTarget,
      consumeScrollTarget,
      switchProject,
      createWorkstream,
      updateWorkstreamTitle,
      switchWorkstreamModel,
      clearConversation,
      compactConversation,
      archiveWorkstream,
      unarchiveWorkstream,
      pinWorkstream,
      unpinWorkstream,
      deleteWorkstream,
      markNeedsReview,
      togglePreviousWorkstream,
    }),
    [
      setActiveWorkstream,
      setViewMode,
      navigateToMessage,
      scrollTarget,
      consumeScrollTarget,
      switchProject,
      createWorkstream,
      clearConversation,
      compactConversation,
      archiveWorkstream,
      unarchiveWorkstream,
      pinWorkstream,
      unpinWorkstream,
      deleteWorkstream,
      markNeedsReview,
      togglePreviousWorkstream,
    ]
  );

  return (
    <ActiveIdContext.Provider value={activeWorkstreamId}>
      <ViewModeContext.Provider value={viewMode}>
        <WorkstreamListContext.Provider value={listValue}>
          <WorkstreamActionsContext.Provider value={actions}>
            {children}
          </WorkstreamActionsContext.Provider>
        </WorkstreamListContext.Provider>
      </ViewModeContext.Provider>
    </ActiveIdContext.Provider>
  );
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

/** Active workstream ID only — re-renders only on navigation (primitive string comparison) */
export function useActiveWorkstreamId(): string | null {
  return useContext(ActiveIdContext);
}

/** Current view mode — re-renders when the view mode changes */
export function useViewMode(): ViewMode {
  return useContext(ViewModeContext);
}

/** Workstream list + project state — re-renders on any workstream mutation/status change */
export function useWorkstreamList(): WorkstreamListValue {
  return useContext(WorkstreamListContext);
}

/** Full workstream state (backward-compatible) — re-renders on any state change */
export function useWorkstreamState() {
  const list = useWorkstreamList();
  const activeWorkstreamId = useActiveWorkstreamId();
  return { ...list, activeWorkstreamId };
}

/** Workstream actions — stable refs, never causes re-renders */
export function useWorkstreamActions(): WorkstreamActions {
  const ctx = useContext(WorkstreamActionsContext);
  if (!ctx) throw new Error('useWorkstreamActions must be used within WorkstreamProvider');
  return ctx;
}

/** Convenience: state + actions (re-renders on state changes) */
export function useWorkstreams() {
  return { ...useWorkstreamState(), ...useWorkstreamActions() };
}
