/**
 * ChatContext — React context providing the Zustand chat store to the component tree
 *
 * @ai-context
 * - ChatProvider wraps the app with the store + optional IPC event subscription
 * - Granular selector hooks (useChatStore, useChatMessages, useChatStreaming, etc.)
 * - useShallow used for multi-field selectors to prevent unnecessary re-renders
 * - No visual component; context-only module
 *
 * @example
 * <ChatProvider store={store} subscription={ipcEvents} sessionId="abc">
 *   <Chat />
 * </ChatProvider>
 */

import { createContext, useContext, useEffect, useMemo, useRef } from 'react';

import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

import type { ChatStore } from '../store/chat-store';
import type { createChatStore } from '../store/chat-store';
import type { EventSubscription } from '../adapters/ipc-event-source';
import { connectEventSource } from '../adapters/ipc-event-source';

// ─── Todo Types ──────────────────────────────────────────────────────────────

export interface TodoItem {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm?: string;
}

export interface LatestTodoState {
  todos: TodoItem[];
  completed: number;
  total: number;
  hasActive: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────

type StoreApi = ReturnType<typeof createChatStore>;

const ChatStoreContext = createContext<StoreApi | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────

export interface ChatProviderProps {
  store: StoreApi;
  subscription?: EventSubscription;
  sessionId?: string;
  children: React.ReactNode;
}

export function ChatProvider({ store, subscription, sessionId, children }: ChatProviderProps) {
  const connectedRef = useRef(false);

  // Connect event source when subscription + sessionId are provided
  useEffect(() => {
    if (!subscription || !sessionId || connectedRef.current) return;
    connectedRef.current = true;

    const unsubscribe = connectEventSource(subscription, store, sessionId);

    return () => {
      unsubscribe();
      connectedRef.current = false;
    };
  }, [store, subscription, sessionId]);

  return <ChatStoreContext.Provider value={store}>{children}</ChatStoreContext.Provider>;
}

// ─── Hooks ────────────────────────────────────────────────────────────────

function useChatStoreApi(): StoreApi {
  const store = useContext(ChatStoreContext);
  if (!store) {
    throw new Error('useChatStore must be used within a ChatProvider');
  }
  return store;
}

/** Select a slice of chat state. Re-renders only when the selected value changes. */
export function useChatStore<T>(selector: (state: ChatStore) => T): T {
  return useStore(useChatStoreApi(), selector);
}

/** Get all messages in order — memoized to avoid new array references on unrelated state changes.
 *  Recomputes when messages Map ref changes (non-delta events), messageOrder changes (new messages),
 *  or _streamingTick increments (in-place delta mutations). */
export function useChatMessages() {
  const store = useChatStoreApi();
  const messages = useStore(store, (s) => s.messages);
  const messageOrder = useStore(store, (s) => s.messageOrder);
  const tick = useStore(store, (s) => s._streamingTick);
  return useMemo(
    () => messageOrder.map((id) => messages.get(id)!).filter(Boolean),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick signals in-place Map mutations
    [messages, messageOrder, tick],
  );
}

/** Get a single message by ID */
export function useChatMessage(id: string) {
  return useChatStore((s) => s.messages.get(id));
}

/** Get message groups for rendering */
export function useChatMessageGroups() {
  return useChatStore((s) => s.messageGroups);
}

/** Streaming state — useShallow prevents re-render when values haven't changed */
export function useChatStreaming() {
  return useChatStore(
    useShallow((s) => ({
      isStreaming: s.isStreaming,
      isThinking: s.isThinking,
      isAgentBusy: s.isAgentBusy,
      isPreparingResponse: s.isPreparingResponse,
      streamingMessageId: s.streamingMessageId,
    }))
  );
}

/** Token usage */
export function useChatUsage() {
  return useChatStore((s) => s.usage);
}

/** Current error */
export function useChatError() {
  return useChatStore((s) => s.error);
}

/** Store actions (stable references — returns only action functions, not state) */
export function useChatActions() {
  return useChatStore(
    useShallow((s) => ({
      processEvent: s.processEvent,
      startReplay: s.startReplay,
      endReplay: s.endReplay,
      reset: s.reset,
      getMessages: s.getMessages,
      getMessage: s.getMessage,
      getToolUse: s.getToolUse,
    }))
  );
}

// ─── Granular Subscriptions ──────────────────────────────────────────────
// Fine-grained hooks that prevent unnecessary re-renders by subscribing
// to specific slices of state. Mirrors drift-v2 ChatContext hooks.

/** Whether the agent is actively working (streaming or tool use) */
export function useChatAgentBusy() {
  return useChatStore((s) => s.isAgentBusy);
}

/** Whether the assistant is in thinking mode */
export function useChatThinking() {
  return useChatStore((s) => s.isThinking);
}

/** Whether a response is being prepared (after user sends, before assistant starts) */
export function useChatPreparing() {
  return useChatStore((s) => s.isPreparingResponse);
}

/** Current turn: streaming message ID for tracking the active response */
export function useChatCurrentTurn() {
  return useChatStore(
    useShallow((s) => ({
      streamingMessageId: s.streamingMessageId,
      isStreaming: s.isStreaming,
    }))
  );
}

/** Interrupt UI state: pending hint + typewriter skip flag */
export function useChatInterruptState() {
  return useChatStore(
    useShallow((s) => ({
      isPendingInterrupt: s.isPendingInterrupt,
      skipTypewriter: s.skipTypewriter,
    }))
  );
}

/** Interrupt actions: setPendingInterrupt + setSkipTypewriter */
export function useChatInterruptActions() {
  return useChatStore(
    useShallow((s) => ({
      setPendingInterrupt: s.setPendingInterrupt,
      setSkipTypewriter: s.setSkipTypewriter,
    }))
  );
}

/** History loading state for scroll-back pagination */
export function useChatHistoryState() {
  return useChatStore(
    useShallow((s) => ({
      hasMoreHistory: s.hasMoreHistory,
      isLoadingMoreHistory: s.isLoadingMoreHistory,
    }))
  );
}

/** Latest TodoWrite state — scans messages in reverse for the most recent TodoWrite tool use */
export function useChatLatestTodo(): LatestTodoState | null {
  const store = useChatStoreApi();
  const messages = useStore(store, (s) => s.messages);
  const messageOrder = useStore(store, (s) => s.messageOrder);
  const tick = useStore(store, (s) => s._streamingTick);

  return useMemo(() => {
    for (let i = messageOrder.length - 1; i >= 0; i--) {
      const msg = messages.get(messageOrder[i]!);
      if (!msg) continue;
      for (let j = msg.toolUses.length - 1; j >= 0; j--) {
        const tu = msg.toolUses[j]!;
        if (tu.name === 'TodoWrite' && Array.isArray(tu.input?.todos)) {
          const todos = tu.input.todos as TodoItem[];
          const completed = todos.filter((t) => t.status === 'completed').length;
          return {
            todos,
            completed,
            total: todos.length,
            hasActive: todos.some((t) => t.status !== 'completed'),
          };
        }
      }
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick signals in-place Map mutations
  }, [messages, messageOrder, tick]);
}
