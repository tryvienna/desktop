/**
 * useWorkstreamChat — Bridges IPC workstream events to a chat store.
 *
 * Creates a Zustand chat store per workstream, subscribes to workstream IPC
 * events, and provides callbacks for sending messages, approving permissions, etc.
 *
 * @ai-context
 * - One store PER WORKSTREAM — persists across switches for instant switching
 * - Stores and IPC connections live in module-level caches (survive re-mounts)
 * - First visit to a workstream: create store → connect IPC → replay history
 * - Subsequent visits: reuse existing store (instant switch, no replay)
 * - Background events: IPC connections stay alive, events flow into stores
 * - LRU eviction limits memory (MAX_CACHED_WORKSTREAMS)
 * - EventSubscription in connectWorkstream filters by workstreamId (workstream isolation)
 * - History replay via GraphQL mutation → events flow through same IPC channel
 * - All callbacks are stable refs (useCallback) to prevent child re-renders
 * - connectEventSource provides RAF delta coalescing for streaming text
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from '@vienna/graphql/client';
import {
  SEND_WORKSTREAM_MESSAGE,
  RESPOND_WORKSTREAM_PERMISSION,
  REVOKE_PERMISSION_RULE,
  INTERRUPT_WORKSTREAM_AGENT,
  COMPACT_WORKSTREAM_CONVERSATION,
  REPLAY_WORKSTREAM_HISTORY,
  LOAD_MORE_WORKSTREAM_HISTORY,
  REWIND_WORKSTREAM_CONVERSATION,
} from '@vienna/graphql/client';
import { createChatStore, connectEventSource, type EventSubscription } from '@vienna/chat-ui';
import { getEvents } from '@vienna/ipc/renderer';
import { events } from '../../ipc';
import { rendererLogger } from '../logger';

const log = rendererLogger.child({ hook: 'useWorkstreamChat' });

// ── Per-workstream persistent stores ──────────────────────────────────────
// Each workstream gets its own Zustand store and IPC event connection.
// Stores persist across workstream switches for instant switching.
// Background events continue flowing into stores via persistent connections.
// LRU eviction limits memory usage.

const MAX_CACHED_WORKSTREAMS = 10;

interface WorkstreamConnection {
  unsubscribe: () => void;
  replayCompleted: boolean;
  replayVersion: number;
  /** Cursor for scroll-back pagination (DB event ID of the oldest loaded event) */
  oldestEventId: number | null;
}

const storeCache = new Map<string, ReturnType<typeof createChatStore>>();
const connectionCache = new Map<string, WorkstreamConnection>();
let fallbackStore: ReturnType<typeof createChatStore> | null = null;

/** Read-only access to a workstream's cached chat store (if it has been visited). */
export function getWorkstreamStore(workstreamId: string): ReturnType<typeof createChatStore> | null {
  return storeCache.get(workstreamId) ?? null;
}

/** All workstream IDs that currently have a cached chat store. */
export function getCachedWorkstreamIds(): string[] {
  return Array.from(storeCache.keys());
}

function getOrCreateStore(workstreamId: string): ReturnType<typeof createChatStore> {
  let store = storeCache.get(workstreamId);
  if (!store) {
    store = createChatStore(log);
    storeCache.set(workstreamId, store);
    log.info('Created persistent store', { workstreamId, cacheSize: storeCache.size });
  }
  return store;
}

function connectWorkstream(
  workstreamId: string,
  store: ReturnType<typeof createChatStore>
): WorkstreamConnection {
  let conn = connectionCache.get(workstreamId);
  if (conn) {
    // LRU touch: delete + re-insert moves to end
    storeCache.delete(workstreamId);
    storeCache.set(workstreamId, store);
    return conn;
  }

  // Create subscription with per-event logging
  const subscription: EventSubscription = {
    onEvent(callback) {
      const ipcEvents = getEvents(events);
      return ipcEvents.workstream.onAgentEvent((payload) => {
        if (payload.workstreamId !== workstreamId) return;

        const evt = payload.event;
        const isHighFrequency = evt.type === 'text_delta' || evt.type === 'tool_input_delta';
        (isHighFrequency ? log.debug : log.info).call(log, 'IPC event received', {
          workstreamId: payload.workstreamId,
          eventType: evt.type,
          isFromHistory: payload.isFromHistory ?? false,
          messageId: 'messageId' in evt ? evt.messageId : undefined,
          ...(evt.type === 'tool_start' ? { toolName: evt.tool.name, toolId: evt.tool.id, inputKeys: Object.keys(evt.tool.input) } : {}),
          ...(evt.type === 'tool_permission_needed' ? { toolName: evt.toolName, toolId: evt.toolId, requestId: evt.requestId, inputKeys: Object.keys(evt.input) } : {}),
          ...(evt.type === 'tool_running' ? { toolId: evt.toolId, approvalMethod: evt.approvalMethod } : {}),
          ...(evt.type === 'tool_result' ? { toolId: evt.toolId, success: evt.result.success, resultError: evt.result.error, resultOutput: evt.result.output?.substring(0, 200) } : {}),
          ...(evt.type === 'tool_input_delta' ? { toolId: evt.toolId, chunkLen: evt.partialJson.length } : {}),
          ...(evt.type === 'error' ? { errorCode: evt.code, errorMessage: evt.message, retryable: evt.retryable } : {}),
          ...(evt.type === 'rate_limited' ? { limitType: evt.limitType, resetsAt: evt.resetsAt } : {}),
        });

        callback({
          sessionId: payload.workstreamId,
          event: payload.event,
          isFromHistory: payload.isFromHistory,
          dbEventId: payload.dbEventId,
        });
      });
    },
  };

  const unsubscribe = connectEventSource(subscription, store, workstreamId, log);
  conn = { unsubscribe, replayCompleted: false, replayVersion: 0, oldestEventId: null };
  connectionCache.set(workstreamId, conn);

  // LRU touch for store
  storeCache.delete(workstreamId);
  storeCache.set(workstreamId, store);

  log.info('Connected persistent event source', { workstreamId });

  // LRU eviction
  while (storeCache.size > MAX_CACHED_WORKSTREAMS) {
    const oldest = storeCache.keys().next().value;
    if (!oldest) break;
    log.info('Evicting workstream entry (LRU)', { workstreamId: oldest });
    storeCache.delete(oldest);
    const oldConn = connectionCache.get(oldest);
    if (oldConn) {
      oldConn.unsubscribe();
      connectionCache.delete(oldest);
    }
  }

  return conn;
}

export interface UseWorkstreamChatResult {
  store: ReturnType<typeof createChatStore>;
  isReplaying: boolean;
  sendMessage: (
    text: string,
    contentBlocks?: Array<{ type: string; source?: { type: string; media_type: string; data: string } }>,
    imageAttachments?: Array<{ name: string; mimeType: string; size: number; previewUrl: string }>,
    options?: {
      /** Text shown in the user bubble (defaults to text). */
      displayText?: string;
      /** Skill activations shown as an expandable widget on the user message. */
      skillActivations?: Array<{ id: string; name: string; body?: string }>;
      /** Shell execution result rendered as a terminal card below the user bubble. */
      shellExecution?: { command: string; cwd: string; stdout: string; stderr: string; exitCode: number | null; durationMs: number };
    },
  ) => Promise<void>;
  approvePermission: (requestId: string, scope: 'once' | 'session' | 'permanent') => void;
  denyPermission: (requestId: string, message?: string) => Promise<void>;
  revokeRule: (toolName: string, scope: 'session' | 'persistent') => void;
  interrupt: () => void;
  compact: (instructions?: string) => void;
  /** Rewind conversation to a specific event (by dbEventId), optionally specifying role */
  rewindConversation: (eventId: number, role?: string) => Promise<void>;
  /** Load older messages for scroll-back pagination */
  loadMore: () => void;
}

const SCOPE_TO_BEHAVIOR = {
  once: { behavior: 'allow' as const, scope: 'once' as const },
  session: { behavior: 'allow' as const, scope: 'session' as const },
  permanent: { behavior: 'allow' as const, scope: 'permanent' as const },
};

export function useWorkstreamChat(workstreamId: string | null): UseWorkstreamChatResult {
  const [isReplaying, setIsReplaying] = useState(false);
  const drainTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadMoreDrainRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get or create persistent store for this workstream
  const store = workstreamId
    ? getOrCreateStore(workstreamId)
    : (fallbackStore ??= createChatStore(log));

  // ── GraphQL mutations ──────────────────────────────────────────────────
  const [sendMessageMut] = useMutation(SEND_WORKSTREAM_MESSAGE);
  const [respondPermissionMut] = useMutation(RESPOND_WORKSTREAM_PERMISSION);
  const [revokeRuleMut] = useMutation(REVOKE_PERMISSION_RULE);
  const [interruptMut] = useMutation(INTERRUPT_WORKSTREAM_AGENT);
  const [compactMut] = useMutation(COMPACT_WORKSTREAM_CONVERSATION);
  const [rewindMut] = useMutation(REWIND_WORKSTREAM_CONVERSATION);
  const [replayHistoryMut] = useMutation(REPLAY_WORKSTREAM_HISTORY);
  const [loadMoreHistoryMut] = useMutation(LOAD_MORE_WORKSTREAM_HISTORY);

  // ── Connect event source + replay history ──────────────────────────────
  useEffect(() => {
    if (!workstreamId) return;

    const conn = connectWorkstream(workstreamId, store);

    // If replay already completed, this is an instant switch!
    if (conn.replayCompleted) {
      log.info('Instant switch — replay already completed', {
        workstreamId,
        messageCount: store.getState().messageOrder.length,
      });

      // Mark all existing messages as history so animations (typewriter,
      // tool entrance, stagger) are skipped when components remount.
      // New live messages arriving after this point keep isFromHistory unset.
      const { messages } = store.getState();
      const updated = new Map(messages);
      let changed = false;
      for (const [id, msg] of updated) {
        if (!msg.isFromHistory) {
          updated.set(id, { ...msg, isFromHistory: true });
          changed = true;
        }
      }
      if (changed) {
        store.setState({ messages: updated });
      }

      setIsReplaying(false);
      return;
    }

    // First visit — need to replay history
    const version = ++conn.replayVersion;

    log.info('Starting history replay', { workstreamId, replayVersion: version });

    // Reset store for clean replay (no stale partial data from aborted replays)
    store.getState().reset();
    setIsReplaying(true);
    store.getState().startReplay();

    replayHistoryMut({ variables: { id: workstreamId } })
    .then((result) => {
      // Ignore stale completion — workstream was switched or replay restarted
      if (conn.replayVersion !== version) {
        log.warn('Ignoring stale replay completion', {
          workstreamId,
          staleVersion: version,
          currentVersion: conn.replayVersion,
        });
        return;
      }

      // Capture pagination cursor from the response
      const replayData = result.data?.replayWorkstreamHistory;
      const hasMore = replayData?.hasMore ?? false;
      const oldestEventId = replayData?.oldestEventId ?? null;

      log.info('Replay mutation resolved, waiting for IPC drain', { workstreamId, hasMore, oldestEventId });

      // The GraphQL mutation resolves BEFORE all IPC events are delivered.
      // Events continue arriving via IPC for ~100-200ms after the mutation
      // completes. We keep _isReplaying=true during this window so late
      // events are processed efficiently (no cloning, no flag updates,
      // no re-renders). After the drain period, endReplay finalizes state.
      drainTimeoutRef.current = setTimeout(() => {
        drainTimeoutRef.current = null;
        if (conn.replayVersion !== version) return;

        const messageCount = store.getState().messageOrder.length;
        log.info('IPC drain complete, finalizing replay', { workstreamId, messageCount });

        // endReplay deduplicates, sorts by timestamp, computes groups + creates fresh refs
        store.getState().endReplay();
        conn.replayCompleted = true;
        conn.oldestEventId = oldestEventId;
        store.getState().setHasMoreHistory(hasMore);
        setIsReplaying(false);
      }, 500);
    })
    .catch((err) => {
      log.error('History replay failed', { workstreamId, error: String(err) });
      if (conn.replayVersion === version) {
        store.getState().endReplay();
        // Leave replayCompleted=false so next visit retries replay
        setIsReplaying(false);
      }
    });

    return () => {
      // Clear any pending drain timers
      if (drainTimeoutRef.current) {
        clearTimeout(drainTimeoutRef.current);
        drainTimeoutRef.current = null;
      }
      if (loadMoreDrainRef.current) {
        clearTimeout(loadMoreDrainRef.current);
        loadMoreDrainRef.current = null;
      }
      // NOTE: We intentionally do NOT disconnect the event source or reset
      // the store. Persistent connections enable instant switching and
      // background event capture.
    };
  }, [workstreamId, store, replayHistoryMut]);

  // ── Stable callbacks ───────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (
      text: string,
      contentBlocks?: Array<{ type: string; source?: { type: string; media_type: string; data: string } }>,
      imageAttachments?: Array<{ name: string; mimeType: string; size: number; previewUrl: string }>,
      options?: {
        /** Text shown in the user bubble (defaults to text). */
        displayText?: string;
        /** Skill activations shown as an expandable widget on the user message. */
        skillActivations?: Array<{ id: string; name: string; body?: string }>;
        /** Shell execution result rendered as a terminal card below the user bubble. */
        shellExecution?: { command: string; cwd: string; stdout: string; stderr: string; exitCode: number | null; durationMs: number };
      },
    ) => {
      if (!workstreamId) return;
      const displayText = options?.displayText;
      const skillActivations = options?.skillActivations;
      const shellExecution = options?.shellExecution;
      log.info('Sending user message', { workstreamId, textLength: text.length, imageCount: imageAttachments?.length ?? 0, skillCount: skillActivations?.length ?? 0 });
      // Add user message to store immediately for responsive UI.
      // This creates a role:'user' message + sets isPreparingResponse atomically.
      // Text may contain [paste://...] markup — preserved for chip rendering in the UI.
      // The backend (SessionManager) decodes markup before sending to the AI provider.
      // displayText allows the bubble to show clean text while the full text (with e.g. skill injections) is sent to the backend.
      // When displayText differs from text, pass text as matchText so the backend's user_message event can match this optimistic message.
      // skillActivations are added as content blocks within the user message for inline rendering.
      store.getState().addUserMessage(displayText ?? text, displayText ? text : undefined, imageAttachments, skillActivations, shellExecution);

      // Build GraphQL variables — include image data when present
      const imageContentBlockVars = contentBlocks
        ?.filter((b): b is { type: 'image'; source: { type: string; media_type: string; data: string } } => b.type === 'image' && !!b.source)
        .map((b) => ({ mediaType: b.source.media_type, data: b.source.data }));

      const imageAttachmentVars = imageAttachments?.map((a) => ({
        name: a.name,
        mimeType: a.mimeType,
        size: a.size,
        previewUrl: a.previewUrl,
      }));

      await sendMessageMut({
        variables: {
          workstreamId,
          text,
          ...(imageAttachmentVars?.length ? { imageAttachments: imageAttachmentVars } : {}),
          ...(imageContentBlockVars?.length ? { imageContentBlocks: imageContentBlockVars } : {}),
        },
      }).catch((err) => log.error('sendMessage failed', { workstreamId, error: String(err) }));
    },
    [workstreamId, sendMessageMut, store]
  );

  const approvePermission = useCallback(
    (requestId: string, scope: 'once' | 'session' | 'permanent', updatedInput?: Record<string, unknown>) => {
      if (!workstreamId) return;
      log.info('Approving permission', { workstreamId, requestId, scope, hasUpdatedInput: !!updatedInput });

      // Optimistic UI: immediately transition tool from pending_permission → running
      const approvalMethod = scope === 'once' ? 'manual' : scope === 'session' ? 'session_rule' : 'persistent_rule';
      store.getState().resolvePermission(requestId, true, approvalMethod);

      // Send to backend
      const variables = {
        workstreamId,
        requestId,
        response: {
          ...SCOPE_TO_BEHAVIOR[scope],
          ...(updatedInput ? { updatedInput } : {}),
        },
      };
      log.info('Sending respondPermission mutation', { variables });
      respondPermissionMut({ variables })
        .then((result) => log.info('respondPermission mutation succeeded', { workstreamId, requestId, data: result.data }))
        .catch((err) => log.error('respondPermission mutation FAILED', { workstreamId, requestId, error: String(err) }));
    },
    [workstreamId, respondPermissionMut, store]
  );

  const denyPermission = useCallback(
    async (requestId: string, message?: string) => {
      if (!workstreamId) return;
      log.info('Denying permission', { workstreamId, requestId, hasMessage: !!message });

      // Optimistic UI: immediately transition tool from pending_permission → error
      store.getState().resolvePermission(requestId, false);

      // Send to backend
      try {
        await respondPermissionMut({
          variables: {
            workstreamId,
            requestId,
            response: {
              behavior: 'deny' as const,
              scope: 'once' as const,
              ...(message ? { message } : {}),
            },
          },
        });
      } catch (err) {
        log.error('denyPermission failed', { workstreamId, requestId, error: String(err) });
        throw err;
      }
    },
    [workstreamId, respondPermissionMut, store]
  );

  const revokeRule = useCallback(
    (toolName: string, scope: 'session' | 'persistent') => {
      if (!workstreamId) return;
      log.info('Revoking permission rule', { workstreamId, toolName, scope });
      revokeRuleMut({
        variables: { workstreamId, toolName, scope },
      }).catch((err) => log.error('revokeRule failed', { workstreamId, toolName, error: String(err) }));
    },
    [workstreamId, revokeRuleMut]
  );

  const interrupt = useCallback(() => {
    if (!workstreamId) return;
    interruptMut({ variables: { id: workstreamId } });
  }, [workstreamId, interruptMut]);

  const compact = useCallback((instructions?: string) => {
    if (!workstreamId) return;
    compactMut({ variables: { id: workstreamId, instructions } });
  }, [workstreamId, compactMut]);

  const rewindConversation = useCallback(async (eventId: number, role?: string) => {
    if (!workstreamId) return;
    log.info('Rewinding conversation', { workstreamId, eventId, role });

    // Find the message that matches this dbEventId so we can set it as the rewind target
    const state = store.getState();
    let targetMessageId: string | null = null;
    for (const id of state.messageOrder) {
      const msg = state.messages.get(id);
      if (msg?.dbEventId === eventId) {
        targetMessageId = id;
        break;
      }
    }

    if (!targetMessageId) {
      log.warn('Could not find message for eventId, falling back to full reload', { eventId });
      // Fallback: fire mutation and do a full replay
      await rewindMut({ variables: { id: workstreamId, eventId, role } });
      store.getState().reset();
      store.getState().startReplay();
      const result = await replayHistoryMut({ variables: { id: workstreamId } });
      await new Promise<void>((r) => setTimeout(r, 500));
      store.getState().endReplay();
      const conn = connectionCache.get(workstreamId);
      if (conn) {
        conn.replayCompleted = true;
        conn.oldestEventId = result.data?.replayWorkstreamHistory?.oldestEventId ?? null;
      }
      store.getState().setHasMoreHistory(result.data?.replayWorkstreamHistory?.hasMore ?? false);
      return;
    }

    // 1. Mark the rewind target — triggers CSS fade-out on messages after it
    store.getState().setRewindTarget(targetMessageId);

    // 2. Fire the rewind mutation in parallel with the animation
    // 600ms > CSS duration-500 to account for React render delay before transition starts
    const animationDelay = new Promise<void>((r) => setTimeout(r, 600));
    let mutationFailed = false;
    const mutationPromise = rewindMut({ variables: { id: workstreamId, eventId, role } }).catch((err) => {
      log.error('Rewind mutation failed', { workstreamId, eventId, error: String(err) });
      mutationFailed = true;
    });

    // Wait for both animation and mutation to complete
    await Promise.all([animationDelay, mutationPromise]);

    if (mutationFailed) {
      store.getState().setRewindTarget(null); // Cancel fade, clear _isRewinding
      return;
    }

    // 3. Prune the faded messages from the store
    store.getState().pruneAfterRewind();

    // 4. Update connection state — the backend broke the resume chain,
    //    so we mark replay as completed (the store already has the correct state)
    const conn = connectionCache.get(workstreamId);
    if (conn) {
      // Keep replayCompleted true — the store is already in the right state
      conn.replayCompleted = true;
    }

    log.info('Rewind complete (smooth)', { workstreamId, targetMessageId });
  }, [workstreamId, rewindMut, replayHistoryMut, store]);

  // Synchronous guard to prevent duplicate loadMore calls between scroll events
  // and the async store update. The store's isLoadingMoreHistory is set synchronously
  // but useChatHistoryState() re-renders asynchronously, so scroll events can fire
  // multiple loadMore calls before the guard kicks in.
  const isLoadingMoreRef = useRef(false);

  const loadMore = useCallback(() => {
    if (!workstreamId) return;
    if (isLoadingMoreRef.current) return;
    const conn = connectionCache.get(workstreamId);
    if (!conn) return;

    const { hasMoreHistory, isLoadingMoreHistory } = store.getState();
    if (!hasMoreHistory || isLoadingMoreHistory || conn.oldestEventId == null) return;

    isLoadingMoreRef.current = true;
    log.info('Loading more history', { workstreamId, beforeEventId: conn.oldestEventId });

    store.getState().setLoadingMoreHistory(true);
    store.getState().startReplay();

    loadMoreHistoryMut({
      variables: { id: workstreamId, beforeEventId: conn.oldestEventId },
    })
      .then((result) => {
        const data = result.data?.loadMoreWorkstreamHistory;
        const hasMore = data?.hasMore ?? false;
        const oldestEventId = data?.oldestEventId ?? null;

        log.info('LoadMore mutation resolved, waiting for IPC drain', {
          workstreamId,
          hasMore,
          oldestEventId,
        });

        // Same IPC drain pattern as initial replay
        loadMoreDrainRef.current = setTimeout(() => {
          loadMoreDrainRef.current = null;

          store.getState().endReplay();
          conn.oldestEventId = oldestEventId;
          store.getState().setHasMoreHistory(hasMore);
          store.getState().setLoadingMoreHistory(false);
          isLoadingMoreRef.current = false;

          log.info('LoadMore complete', {
            workstreamId,
            messageCount: store.getState().messageOrder.length,
            hasMore,
          });
        }, 500);
      })
      .catch((err) => {
        log.error('LoadMore failed', { workstreamId, error: String(err) });
        store.getState().endReplay();
        store.getState().setLoadingMoreHistory(false);
        isLoadingMoreRef.current = false;
      });
  }, [workstreamId, store, loadMoreHistoryMut]);

  return {
    store,
    isReplaying,
    sendMessage,
    approvePermission,
    denyPermission,
    revokeRule,
    interrupt,
    compact,
    rewindConversation,
    loadMore,
  };
}
