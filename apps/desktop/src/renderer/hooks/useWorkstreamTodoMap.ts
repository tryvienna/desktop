/**
 * useWorkstreamTodoMap — Tracks per-workstream TODO state for the sidebar.
 *
 * Subscribes to IPC agent events and watches for TodoWrite tool calls.
 * Also initializes from existing cached chat stores (for workstreams already visited).
 *
 * @ai-context
 * - Returns Map<workstreamId, { completed, total }> for all workstreams with active TODOs
 * - Only updates on TodoWrite tool_start events (not every text delta)
 * - Lightweight: no per-store subscriptions, just one IPC listener
 * - Used by useWorkstreamsNavSections to decide icon rendering
 */

import { useEffect, useRef, useState } from 'react';
import { getEvents } from '@vienna/ipc/renderer';
import { events } from '../../ipc';
import { getWorkstreamStore, getCachedWorkstreamIds } from './useWorkstreamChat';
import type { LatestTodoState, TodoItem } from '@vienna/chat-ui';

/** Extract TODO state from a chat store's state (same logic as useChatLatestTodo) */
function extractTodoState(storeState: {
  messages: Map<string, { toolUses: Array<{ name: string; input?: Record<string, unknown> }> }>;
  messageOrder: string[];
}): LatestTodoState | null {
  const { messages, messageOrder } = storeState;
  for (let i = messageOrder.length - 1; i >= 0; i--) {
    const msg = messages.get(messageOrder[i]!);
    if (!msg) continue;
    for (let j = msg.toolUses.length - 1; j >= 0; j--) {
      const tu = msg.toolUses[j]!;
      if (tu.name === 'TodoWrite' && Array.isArray(tu.input?.todos)) {
        const todos = tu.input.todos as TodoItem[];
        const completed = todos.filter((t: TodoItem) => t.status === 'completed').length;
        return {
          todos,
          completed,
          total: todos.length,
          hasActive: todos.some((t: TodoItem) => t.status !== 'completed'),
        };
      }
    }
  }
  return null;
}

export interface TodoSummary {
  completed: number;
  total: number;
  hasActive: boolean;
}

/**
 * Returns a map of workstream ID → TODO summary for workstreams with active TODOs.
 * Updates reactively when TodoWrite tool calls arrive via IPC.
 */
export function useWorkstreamTodoMap(): Map<string, TodoSummary> {
  const [todoMap, setTodoMap] = useState<Map<string, TodoSummary>>(() => new Map());
  const initializedRef = useRef(false);

  // Initialize from existing cached stores (workstreams already visited)
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const initial = new Map<string, TodoSummary>();
    for (const id of getCachedWorkstreamIds()) {
      const store = getWorkstreamStore(id);
      if (!store) continue;
      const state = extractTodoState(store.getState());
      if (state?.hasActive) {
        initial.set(id, { completed: state.completed, total: state.total, hasActive: state.hasActive });
      }
    }
    if (initial.size > 0) setTodoMap(initial);
  }, []);

  // Subscribe to IPC events for live TodoWrite updates
  useEffect(() => {
    const ipcEvents = getEvents(events);
    const unsub = ipcEvents.workstream.onAgentEvent((payload) => {
      const evt = payload.event;

      // Catch TodoWrite at tool_start (full input available)
      if (evt.type === 'tool_start' && evt.tool.name === 'TodoWrite') {
        const todos = evt.tool.input?.todos;
        if (Array.isArray(todos)) {
          const completed = (todos as TodoItem[]).filter((t) => t.status === 'completed').length;
          const hasActive = (todos as TodoItem[]).some((t) => t.status !== 'completed');
          const total = todos.length;

          setTodoMap((prev) => {
            const next = new Map(prev);
            if (hasActive) {
              next.set(payload.workstreamId, { completed, total, hasActive });
            } else {
              // All complete or empty — remove from map
              next.delete(payload.workstreamId);
            }
            return next;
          });
        }
      }
    });
    return unsub;
  }, []);

  return todoMap;
}
