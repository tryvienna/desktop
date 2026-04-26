/**
 * IpcEventSource — Subscribes to IPC events and feeds the chat store
 *
 * This adapter bridges the IPC event channel (AgentEvents from main process)
 * to the Zustand chat store. It handles event coalescing for text_deltas
 * to reduce re-renders during streaming.
 *
 * @module chat-ui/adapters/ipc-event-source
 */

import type { AgentEvent } from '@vienna/agent-core';
import type { Logger } from '@vienna/logger';
import type { ChatStore } from '../store/chat-store';
import type { createChatStore } from '../store/chat-store';

export interface EventSubscription {
  onEvent: (
    callback: (payload: { sessionId: string; event: AgentEvent; isFromHistory?: boolean; dbEventId?: number }) => void
  ) => () => void;
}

/**
 * Connect an IPC event subscription to a chat store.
 * Returns an unsubscribe function.
 *
 * Coalesces text_delta events into animation frames to reduce
 * store updates from ~50/sec to ~16/sec during streaming.
 */
export function connectEventSource(
  subscription: EventSubscription,
  store: ReturnType<typeof createChatStore>,
  sessionId: string,
  logger?: Logger,
): () => void {
  const pendingDeltas = new Map<string, string>();
  let frameId: number | null = null;

  function flush() {
    for (const [messageId, text] of pendingDeltas) {
      logger?.debug('Flushing coalesced text delta', {
        messageId,
        textLength: text.length,
      });
      // Emit accumulated text as a single delta
      (store as { getState: () => ChatStore }).getState().processEvent({
        type: 'text_delta',
        messageId,
        text,
      });
    }
    pendingDeltas.clear();
    frameId = null;
  }

  function scheduleFlush() {
    if (frameId === null && typeof requestAnimationFrame !== 'undefined') {
      frameId = requestAnimationFrame(flush);
    } else if (frameId === null) {
      // Node.js fallback (tests)
      flush();
    }
  }

  const unsubscribe = subscription.onEvent((payload) => {
    if (payload.sessionId !== sessionId) return;

    const { event, isFromHistory, dbEventId } = payload;

    // Coalesce text_deltas during live streaming (not replay)
    if (event.type === 'text_delta' && !isFromHistory) {
      const existing = pendingDeltas.get(event.messageId) ?? '';
      pendingDeltas.set(event.messageId, existing + event.text);
      scheduleFlush();
      return;
    }

    // Non-text events flush pending deltas first, then process immediately
    if (pendingDeltas.size > 0) {
      if (frameId !== null && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
      flush();
    }

    logger?.debug('Processing event in store', {
      eventType: event.type,
      isFromHistory,
      messageId: 'messageId' in event ? event.messageId : undefined,
    });

    (store as { getState: () => ChatStore }).getState().processEvent(event, isFromHistory, dbEventId);
  });

  return () => {
    logger?.debug('Disconnecting event source', { sessionId });
    unsubscribe();
    if (frameId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(frameId);
    }
    pendingDeltas.clear();
  };
}
