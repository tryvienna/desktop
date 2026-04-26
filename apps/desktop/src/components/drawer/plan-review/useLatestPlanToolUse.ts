/**
 * useLatestPlanToolUse — Subscribes to the chat store and returns the latest
 * ExitPlanMode tool use, so the drawer auto-updates when a new plan arrives.
 *
 * @ai-context
 * - Walks messages BACKWARDS for O(1) best-case (latest plan is near the end)
 * - Returns null when no plan tool use exists
 * - Uses useSyncExternalStore + structural equality (isEqual) to avoid
 *   unnecessary re-renders when store emits but plan data hasn't changed
 * - Used by: PlanReviewDrawer
 */

import { useCallback, useRef, useSyncExternalStore } from 'react';

import type { createChatStore } from '@vienna/chat-ui';

type ChatStoreApi = ReturnType<typeof createChatStore>;

export interface PlanToolUseInfo {
  id: string;
  plan: string;
  requestId: string | undefined;
  status: 'pending' | 'pending_permission' | 'running' | 'complete' | 'error';
  isStreaming: boolean;
}

function getLatestPlanToolUse(store: ChatStoreApi): PlanToolUseInfo | null {
  const state = store.getState();
  const order = state.messageOrder;

  // Walk backwards — the latest plan is almost always in the last few messages
  for (let i = order.length - 1; i >= 0; i--) {
    const msg = state.messages.get(order[i]!);
    if (!msg) continue;
    // Walk tool uses backwards within the message too
    for (let j = msg.toolUses.length - 1; j >= 0; j--) {
      const tu = msg.toolUses[j]!;
      if (tu.name === 'ExitPlanMode') {
        const plan = typeof tu.input?.plan === 'string' ? tu.input.plan : '';
        return {
          id: tu.id,
          plan,
          requestId: tu.requestId,
          status: tu.status,
          isStreaming: tu.isStreaming ?? false,
        };
      }
    }
  }

  return null;
}

/** Compares two PlanToolUseInfo values for structural equality */
function isEqual(a: PlanToolUseInfo | null, b: PlanToolUseInfo | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.plan === b.plan &&
    a.requestId === b.requestId &&
    a.status === b.status &&
    a.isStreaming === b.isStreaming
  );
}

export function useLatestPlanToolUse(store: ChatStoreApi | null): PlanToolUseInfo | null {
  const cachedRef = useRef<PlanToolUseInfo | null>(null);

  const getSnapshot = useCallback(() => {
    if (!store) return null;
    const next = getLatestPlanToolUse(store);
    if (isEqual(cachedRef.current, next)) {
      return cachedRef.current;
    }
    cachedRef.current = next;
    return next;
  }, [store]);

  return useSyncExternalStore(
    store ? store.subscribe : emptySubscribe,
    getSnapshot,
  );
}

function emptySubscribe() {
  return () => {};
}
