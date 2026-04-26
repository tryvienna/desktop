/**
 * ChatStore — Zustand store for chat UI state
 *
 * @ai-context
 * - State shape: messages (Map), messageOrder (string[]), messageGroups, streaming flags, usage, error
 * - processEvent() applies AgentEvents to state (same path for live + replay)
 * - Messages stored as Map for O(1) lookup; order tracked separately for stable iteration
 * - Replay optimization: startReplay()/endReplay() skip cloning + grouping during bulk load
 * - Actions: processEvent, startReplay, endReplay, reset, getMessages, getMessage, getToolUse
 *
 * @example
 * const store = createChatStore();
 * store.getState().processEvent(agentEvent);
 */

import { createStore } from 'zustand/vanilla';
import type { AgentEvent } from '@vienna/agent-core';
import type { Logger } from '@vienna/logger';

import type {
  Message,
  MessageGroup,
  TokenUsageState,
  ToolUse,
  ContentBlock,
  ImageAttachmentBlock,
  ShellExecutionBlock,
  BackgroundTask,
} from '../types/messages';

// ─────────────────────────────────────────────────────────────────────────────
// State Shape
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatState {
  messages: Map<string, Message>;
  messageOrder: string[];
  messageGroups: MessageGroup[];
  streamingMessageId: string | null;
  isStreaming: boolean;
  isThinking: boolean;
  isAgentBusy: boolean;
  isPreparingResponse: boolean;
  /** First Escape pressed, waiting for second to confirm interrupt. */
  isPendingInterrupt: boolean;
  /** When true, typewriter/streaming animations should fast-forward to completion. */
  skipTypewriter: boolean;
  error: { code: string; message: string } | null;
  usage: TokenUsageState;
  /** Monotonic counter incremented on in-place message mutations (text_delta, thinking_delta,
   *  tool_input_delta). Subscribers use this to detect changes without requiring a new Map
   *  reference, avoiding O(N) Map clones on every streaming tick (~16×/sec). */
  _streamingTick: number;
  /** Whether older history exists beyond what's currently loaded */
  hasMoreHistory: boolean;
  /** Whether a loadMore request is in flight */
  isLoadingMoreHistory: boolean;
  /** When set, messages after this message ID are being rewound (fading out). */
  rewindTargetMessageId: string | null;
  /** True while a rewind is in progress — guards against conversation_cleared race. */
  _isRewinding: boolean;
}

export interface ChatActions {
  processEvent: (event: AgentEvent, isFromHistory?: boolean, dbEventId?: number) => void;
  addUserMessage: (displayText: string, matchText?: string, imageAttachments?: Omit<ImageAttachmentBlock, 'type'>[], skillActivations?: Array<{ id: string; name: string; body?: string }>, shellExecution?: Omit<ShellExecutionBlock, 'type'>) => void;
  /** Optimistically resolve a pending permission by requestId (transitions tool to running/error). */
  resolvePermission: (requestId: string, approved: boolean, approvalMethod?: string) => void;
  /** Set pending interrupt state (first Escape pressed). */
  setPendingInterrupt: (pending: boolean) => void;
  /** Skip typewriter animations (fast-forward streaming text). */
  setSkipTypewriter: (skip: boolean) => void;
  /** Seed the store with cached messages for instant display during replay. */
  seedSnapshot: (snapshotMessages: Message[]) => void;
  startReplay: () => void;
  endReplay: () => void;
  reset: () => void;
  /** Mark a message as the rewind target — messages after it will fade out. */
  setRewindTarget: (messageId: string | null) => void;
  /** Remove all messages after the rewind target and clear the target. */
  pruneAfterRewind: () => void;
  setHasMoreHistory: (hasMore: boolean) => void;
  setLoadingMoreHistory: (loading: boolean) => void;
  getMessages: () => Message[];
  getMessage: (id: string) => Message | undefined;
  getToolUse: (messageId: string, toolId: string) => ToolUse | undefined;
}

export type ChatStore = ChatState & ChatActions;

// ─────────────────────────────────────────────────────────────────────────────
// Initial State
// ─────────────────────────────────────────────────────────────────────────────

function createInitialState(): ChatState {
  return {
    messages: new Map(),
    messageOrder: [],
    messageGroups: [],
    streamingMessageId: null,
    isStreaming: false,
    isThinking: false,
    isAgentBusy: false,
    isPreparingResponse: false,
    isPendingInterrupt: false,
    skipTypewriter: false,
    error: null,
    _streamingTick: 0,
    hasMoreHistory: false,
    isLoadingMoreHistory: false,
    rewindTargetMessageId: null,
    _isRewinding: false,
    usage: {
      currentInputTokens: 0,
      currentCacheReadTokens: 0,
      currentCacheCreationTokens: 0,
      outputTokens: 0,
      costUsd: null,
      contextWindow: null,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Message Grouping
// ─────────────────────────────────────────────────────────────────────────────

const FIVE_MINUTES = 5 * 60 * 1000;

function computeMessageGroups(messages: Map<string, Message>, order: string[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  let current: MessageGroup | null = null;

  for (const id of order) {
    const msg = messages.get(id);
    if (!msg) continue;

    const shouldStart =
      !current || current.role !== msg.role || msg.timestamp - current.timestamp > FIVE_MINUTES;

    if (shouldStart) {
      current = {
        id: `group-${id}`,
        role: msg.role,
        messageIds: [id],
        timestamp: msg.timestamp,
      };
      groups.push(current);
    } else {
      current!.messageIds.push(id);
    }
  }

  return groups;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store Factory
// ─────────────────────────────────────────────────────────────────────────────

export function createChatStore(logger?: Logger) {
  const log = logger?.child({ service: 'ChatStore' });

  /** Replay optimization: skip cloning + grouping during bulk replay.
   *  Scoped to this store instance so multiple stores don't share the flag. */
  let _isReplaying = false;

  /** Snapshot of accumulated output tokens at the start of the current interaction.
   *  Used to accumulate output across interactions: on turn_end, final output =
   *  _outputTokensAtTurnStart + event.usage.outputTokens. */
  let _outputTokensAtTurnStart = 0;

  /** Buffer for accumulating tool_input_delta partialJson chunks per tool ID.
   *  In streaming mode, tool_start sends empty input and deltas build the JSON incrementally. */
  const _toolInputBuffers = new Map<string, string>();

  /** Tracks tool IDs that were synthetically created for subagent permission requests.
   *  These follow the normal tool lifecycle (pending_permission → running → complete)
   *  but are cleaned up at turn_end since the normalizer doesn't surface subagent
   *  tool_result events from the CLI. */
  const _syntheticSubagentToolIds = new Set<string>();

  /** Message IDs seeded from snapshot cache. During replay, events targeting these
   *  messages are skipped because their content is already complete from the snapshot.
   *  Without this guard, text_delta/thinking_delta events would append duplicate
   *  content blocks to already-complete seeded messages. */
  const _seededMessageIds = new Set<string>();

  /** Maps taskId → the tool use that launched it.
   *
   *  Populated from tool_result output using two deterministic patterns:
   *  - BACKGROUND_TASK_PATTERN: Bash run_in_background → "Command running in background with ID: <taskId>"
   *  - AGENT_ID_PATTERN: Agent/Task subagent → "agentId: <taskId> (for resuming...)"
   *
   *  Used by task_notification to update the original tool card's backgroundTask
   *  status instead of creating standalone system messages in the timeline. */
  const _taskIdToToolRef = new Map<string, { toolId: string; messageId: string }>();

  function cloneMessages(state: ChatState): Map<string, Message> {
    return _isReplaying ? state.messages : new Map(state.messages);
  }

  return createStore<ChatStore>((set, get) => ({
    ...createInitialState(),

    processEvent: (event: AgentEvent, isFromHistory = false, dbEventId?: number) => {
      // conversation_cleared: full store reset (not persisted, purely a UI signal)
      // During rewind, the backend still emits this event — but we suppress the reset
      // because the rewind flow handles state pruning itself via pruneAfterRewind().
      if (event.type === 'conversation_cleared') {
        if (get()._isRewinding) {
          log?.info('Conversation cleared during rewind — suppressing reset');
          return;
        }
        log?.info('Conversation cleared — resetting store');
        _toolInputBuffers.clear();
        _syntheticSubagentToolIds.clear();
        _taskIdToToolRef.clear();
        set(createInitialState());
        return;
      }

      // Structured logging with full event details for tool lifecycle events
      if (event.type.startsWith('tool_')) {
        log?.info('Processing tool event', {
          eventType: event.type,
          isFromHistory,
          messageId: 'messageId' in event ? event.messageId : undefined,
          toolId: 'toolId' in event ? event.toolId : ('tool' in event ? (event.tool as { id: string }).id : undefined),
          toolName: 'toolName' in event ? event.toolName : ('tool' in event ? (event.tool as { name: string }).name : undefined),
          requestId: 'requestId' in event ? event.requestId : undefined,
          hasInput: 'input' in event ? Object.keys(event.input as object).length > 0 : ('tool' in event ? Object.keys((event.tool as { input: object }).input).length > 0 : false),
        });
      } else {
        log?.debug('Processing event', {
          eventType: event.type,
          isFromHistory,
          isReplaying: _isReplaying,
          messageId: 'messageId' in event ? event.messageId : undefined,
        });
      }

      // Snapshot output baseline on turn_start (before applyEvent, which is pure)
      if (event.type === 'turn_start') {
        _outputTokensAtTurnStart = get().usage.outputTokens;
      }

      // Skip replay events that target seeded messages — their content is already
      // complete from the snapshot. Without this, text_delta/thinking_delta would
      // append duplicate content blocks to already-complete messages.
      // turn_start and user_message have their own duplicate guards (check messages.has()).
      if (
        _isReplaying &&
        _seededMessageIds.size > 0 &&
        'messageId' in event &&
        _seededMessageIds.has((event as { messageId: string }).messageId) &&
        event.type !== 'turn_start' &&
        event.type !== 'user_message'
      ) {
        log?.debug('Skipping replay event for seeded message', {
          eventType: event.type,
          messageId: (event as { messageId: string }).messageId,
        });
        return;
      }

      set((state) => {
        const update = applyEvent(state, event, isFromHistory, _isReplaying, cloneMessages, _toolInputBuffers, _outputTokensAtTurnStart, _syntheticSubagentToolIds, _taskIdToToolRef, dbEventId);

        // During replay, suppress streaming/busy flag updates from historical events
        // to prevent intermediate re-renders that cause visual jank when switching
        // workstreams. Live events (isFromHistory=false) still update flags normally.
        if (_isReplaying && isFromHistory) {
          const {
            streamingMessageId: _sm,
            isStreaming: _is,
            isAgentBusy: _ab,
            isPreparingResponse: _pr,
            isThinking: _th,
            isPendingInterrupt: _pi,
            ...dataOnly
          } = update;
          return dataOnly;
        }

        return update;
      });
    },

    addUserMessage: (displayText: string, matchText?: string, imageAttachments?: Omit<ImageAttachmentBlock, 'type'>[], skillActivations?: Array<{ id: string; name: string; body?: string }>, shellExecution?: Omit<ShellExecutionBlock, 'type'>) => {
      const id = `user-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      log?.info('Adding user message to store', { messageId: id, textLength: displayText.length, imageCount: imageAttachments?.length ?? 0, skillCount: skillActivations?.length ?? 0 });

      const content: ContentBlock[] = [];

      // Skill activation block renders above the text as an expandable widget
      if (skillActivations?.length) {
        content.push({
          type: 'skill_activation' as const,
          skills: skillActivations,
        });
      }

      content.push({ type: 'text', text: displayText });

      if (imageAttachments?.length) {
        for (const img of imageAttachments) {
          content.push({
            type: 'image_attachment',
            name: img.name,
            mimeType: img.mimeType,
            size: img.size,
            previewUrl: img.previewUrl,
          } satisfies ImageAttachmentBlock);
        }
      }

      // Shell execution block renders below the user bubble as a terminal card
      if (shellExecution) {
        content.push({
          type: 'shell_execution' as const,
          ...shellExecution,
        });
      }

      const message: Message = {
        id,
        role: 'user',
        content,
        timestamp: Date.now(),
        status: 'complete',
        isStreaming: false,
        isThinking: false,
        toolUses: [],
        ...(matchText !== undefined ? { _matchText: matchText } : {}),
      };

      set((state) => {
        const messages = cloneMessages(state);
        messages.set(id, message);
        const messageOrder = [...state.messageOrder, id];

        return {
          messages,
          messageOrder,
          messageGroups: computeMessageGroups(messages, messageOrder),
          isPreparingResponse: true,
          isAgentBusy: true,
        };
      });
    },

    resolvePermission: (requestId: string, approved: boolean, approvalMethod?: string) => {
      log?.info('Resolving permission optimistically', { requestId, approved, approvalMethod });

      set((state) => {
        const messages = new Map(state.messages);
        let found = false;

        for (const [id, msg] of messages) {
          const toolIndex = msg.toolUses.findIndex(
            (tu) => tu.requestId === requestId && tu.status === 'pending_permission'
          );
          if (toolIndex === -1) continue;

          found = true;
          const toolUses = msg.toolUses.map((tu, i) => {
            if (i !== toolIndex) return tu;
            return approved
              ? { ...tu, status: 'running' as const, requestId: undefined, approvalMethod }
              : { ...tu, status: 'error' as const, requestId: undefined, result: { success: false, error: 'Permission denied' } };
          });
          messages.set(id, { ...msg, toolUses });
          break;
        }

        if (!found) {
          log?.warn('resolvePermission: no matching tool found', { requestId });
          return {};
        }

        return { messages };
      });
    },

    setPendingInterrupt: (pending: boolean) => {
      set({ isPendingInterrupt: pending });
    },

    setSkipTypewriter: (skip: boolean) => {
      set({ skipTypewriter: skip });
    },

    setHasMoreHistory: (hasMore: boolean) => {
      set({ hasMoreHistory: hasMore });
    },

    setLoadingMoreHistory: (loading: boolean) => {
      set({ isLoadingMoreHistory: loading });
    },

    seedSnapshot: (snapshotMessages: Message[]) => {
      log?.info('Seeding from snapshot', { messageCount: snapshotMessages.length });
      const messages = new Map<string, Message>();
      const messageOrder: string[] = [];
      _seededMessageIds.clear();
      for (const msg of snapshotMessages) {
        messages.set(msg.id, { ...msg, isFromHistory: true });
        messageOrder.push(msg.id);
        _seededMessageIds.add(msg.id);

        // Rebuild taskId→toolRef mapping from seeded tool results.
        // Checks both explicit backgroundTask and output patterns
        // (BACKGROUND_TASK_PATTERN for Bash, AGENT_ID_PATTERN for Agent tools).
        for (const tu of msg.toolUses) {
          if (tu.backgroundTask) {
            _taskIdToToolRef.set(tu.backgroundTask.taskId, { toolId: tu.id, messageId: msg.id });
          } else if (tu.result?.output) {
            const bgMatch = BACKGROUND_TASK_PATTERN.exec(tu.result.output);
            const agentMatch = !bgMatch ? AGENT_ID_PATTERN.exec(tu.result.output) : null;
            const taskId = bgMatch?.[1] ?? agentMatch?.[1];
            if (taskId) {
              _taskIdToToolRef.set(taskId, { toolId: tu.id, messageId: msg.id });
            }
          }
        }
      }
      set({
        messages,
        messageOrder,
        messageGroups: computeMessageGroups(messages, messageOrder),
      });
    },

    startReplay: () => {
      log?.info('Replay started');
      _isReplaying = true;
    },

    endReplay: () => {
      _isReplaying = false;
      _seededMessageIds.clear();
      set((state) => {
        // Deduplicate messageOrder (seeded snapshot IDs may overlap with replayed IDs)
        const seen = new Set<string>();
        const deduped = state.messageOrder.filter((id) => {
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        // Sort by timestamp so seeded messages (most recent) end up in correct position
        deduped.sort((a, b) => {
          const ma = state.messages.get(a);
          const mb = state.messages.get(b);
          return (ma?.timestamp ?? 0) - (mb?.timestamp ?? 0);
        });

        log?.info('Replay ended', {
          messageCount: deduped.length,
        });
        return {
          messages: new Map(state.messages),
          messageOrder: deduped,
          messageGroups: computeMessageGroups(state.messages, deduped),
        };
      });
    },

    reset: () => {
      log?.info('Store reset');
      _toolInputBuffers.clear();
      _syntheticSubagentToolIds.clear();
      _seededMessageIds.clear();
      _taskIdToToolRef.clear();
      set(createInitialState());
    },

    setRewindTarget: (messageId: string | null) => {
      set({ rewindTargetMessageId: messageId, _isRewinding: messageId !== null });
    },

    pruneAfterRewind: () => {
      const state = get();
      const targetId = state.rewindTargetMessageId;
      if (!targetId) return;

      const targetIndex = state.messageOrder.indexOf(targetId);
      if (targetIndex === -1) {
        set({ rewindTargetMessageId: null, _isRewinding: false });
        return;
      }

      // Keep messages up to and including the target
      const survivingOrder = state.messageOrder.slice(0, targetIndex + 1);
      const messages = new Map(state.messages);
      // Remove pruned messages
      for (let i = targetIndex + 1; i < state.messageOrder.length; i++) {
        messages.delete(state.messageOrder[i]!);
      }

      log?.info('Pruned messages after rewind target', {
        targetId,
        removed: state.messageOrder.length - survivingOrder.length,
        remaining: survivingOrder.length,
      });

      _toolInputBuffers.clear();
      _syntheticSubagentToolIds.clear();
      _taskIdToToolRef.clear();

      set({
        messages,
        messageOrder: survivingOrder,
        messageGroups: computeMessageGroups(messages, survivingOrder),
        rewindTargetMessageId: null,
        _isRewinding: false,
        streamingMessageId: null,
        isStreaming: false,
        isThinking: false,
        isAgentBusy: false,
        isPreparingResponse: false,
      });
    },

    getMessages: () => {
      const { messages, messageOrder } = get();
      return messageOrder.map((id) => messages.get(id)!).filter(Boolean);
    },

    getMessage: (id: string) => {
      return get().messages.get(id);
    },

    getToolUse: (messageId: string, toolId: string) => {
      const msg = get().messages.get(messageId);
      return msg?.toolUses.find((t) => t.id === toolId);
    },
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Application (pure function)
// ─────────────────────────────────────────────────────────────────────────────

// ── Task ID Extraction Patterns ──────────────────────────────────────────
//
// These patterns extract a taskId from tool_result output text, enabling
// the _taskIdToToolRef mapping that links background tasks to their parent
// tool cards. Two distinct patterns exist for two tool types:
//
// 1. BACKGROUND_TASK_PATTERN — Bash tool with `run_in_background: true`
//    Output format: "Command running in background with ID: <taskId>..."
//    The taskId is a CLI-assigned background process identifier.
//
// 2. AGENT_ID_PATTERN — Agent/Task tool (subagent execution)
//    Output format: "...\nagentId: <taskId> (for resuming...)\n<usage>..."
//    The agentId is the subagent's internal ID, identical to the task_id
//    that appears in task_started/task_progress/task_notification events
//    from the CLI. This is the ONLY deterministic link between a task_id
//    and the parent Agent tool_use_id — it arrives in the tool_result
//    output after the subagent completes.
//
// Both patterns populate _taskIdToToolRef so that subsequent
// task_notification events can update the correct tool card.
// ─────────────────────────────────────────────────────────────────────────

/** Bash run_in_background: extracts task ID from background command output */
const BACKGROUND_TASK_PATTERN = /Command running in background with ID: ([a-zA-Z0-9_-]+)/;

/** Agent/Task tool: extracts agentId (= task_id) from subagent result output */
const AGENT_ID_PATTERN = /agentId: ([a-zA-Z0-9_-]+)/;

function applyEvent(
  state: ChatState,
  event: AgentEvent,
  isFromHistory: boolean,
  _isReplaying: boolean,
  cloneMessages: (state: ChatState) => Map<string, Message>,
  _toolInputBuffers: Map<string, string>,
  _outputTokensAtTurnStart: number,
  _syntheticSubagentToolIds: Set<string>,
  _taskIdToToolRef: Map<string, { toolId: string; messageId: string }>,
  dbEventId?: number
): Partial<ChatState> {
  switch (event.type) {
    // ── Turn lifecycle ───────────────────────────────────────────────────

    case 'turn_start': {
      // Guard against duplicate turn_start for the same messageId
      if (state.messages.has(event.messageId)) {
        return {};
      }

      const messages = cloneMessages(state);

      // Finalize the previous streaming message if it never received turn_end.
      // Tool-only messages (e.g. TodoWrite with no text) may never get turn_end,
      // leaving isStreaming: true and minHeight on the wrapper forever.
      if (state.streamingMessageId) {
        const prev = messages.get(state.streamingMessageId);
        if (prev && prev.isStreaming) {
          messages.set(state.streamingMessageId, {
            ...prev,
            status: 'complete',
            isStreaming: false,
          });
        }
      }

      // Clean up transient api_retry message (retry succeeded)
      let retryMsgId: string | undefined;
      for (const [id, m] of messages) {
        if (m.role === 'system' && m.content.length === 1 && m.content[0].type === 'api_retry') {
          messages.delete(id);
          retryMsgId = id;
          break;
        }
      }

      const msg: Message = {
        id: event.messageId,
        role: 'assistant',
        content: [],
        timestamp: event.timestamp,
        status: 'streaming',
        isStreaming: true,
        isThinking: false,
        toolUses: [],
        isFromHistory,
        providerUuid: event.providerUuid,
        dbEventId,
      };
      messages.set(event.messageId, msg);

      let messageOrder: string[];
      if (_isReplaying) {
        if (retryMsgId) {
          const idx = state.messageOrder.indexOf(retryMsgId);
          if (idx !== -1) state.messageOrder.splice(idx, 1);
        }
        state.messageOrder.push(event.messageId);
        messageOrder = state.messageOrder;
      } else {
        messageOrder = retryMsgId
          ? [...state.messageOrder.filter((id) => id !== retryMsgId), event.messageId]
          : [...state.messageOrder, event.messageId];
      }

      return {
        messages,
        messageOrder,
        streamingMessageId: event.messageId,
        isStreaming: true,
        isAgentBusy: true,
        isPreparingResponse: false, // Assistant turn started — no longer preparing
        ...(_isReplaying ? {} : { messageGroups: computeMessageGroups(messages, messageOrder) }),
      };
    }

    case 'turn_end': {
      const messages = cloneMessages(state);
      const msg = messages.get(event.messageId);
      if (msg) {
        messages.set(event.messageId, {
          ...msg,
          status: 'complete',
          isStreaming: false,
        });
      }

      // Use lastTurnContext for current context when available (replay path),
      // otherwise keep whatever usage_update already set (live streaming path)
      const ctx = event.lastTurnContext;

      // Complete any remaining synthetic subagent tools across ALL messages.
      // The normalizer doesn't surface subagent tool_result events from the CLI,
      // so synthetic tools that reached "running" would otherwise stay forever.
      // Mark them as complete so they remain visible in the UI (like regular tools).
      // turn_end may fire for a different messageId than the one containing
      // the synthetic tools, so we must scan all tracked IDs.
      if (_syntheticSubagentToolIds.size > 0) {
        for (const [msgId, msgVal] of messages) {
          const syntheticInMsg = msgVal.toolUses.filter((tu) => _syntheticSubagentToolIds.has(tu.id));
          if (syntheticInMsg.length > 0) {
            const syntheticIds = new Set(syntheticInMsg.map((tu) => tu.id));
            const toolUses = msgVal.toolUses.map((tu) => {
              if (!syntheticIds.has(tu.id)) return tu;
              return { ...tu, status: 'complete' as const, isStreaming: false };
            });
            messages.set(msgId, { ...msgVal, toolUses });
            for (const id of syntheticIds) {
              _syntheticSubagentToolIds.delete(id);
            }
          }
        }
      }

      return {
        messages,
        streamingMessageId: null,
        isStreaming: false,
        isAgentBusy: false,
        usage: {
          currentInputTokens: ctx?.inputTokens ?? state.usage.currentInputTokens,
          currentCacheReadTokens: ctx?.cacheReadTokens ?? state.usage.currentCacheReadTokens,
          currentCacheCreationTokens: ctx?.cacheCreationTokens ?? state.usage.currentCacheCreationTokens,
          outputTokens: _outputTokensAtTurnStart + event.usage.outputTokens,
          costUsd: (state.usage.costUsd ?? 0) + (event.usage.totalCostUsd ?? 0),
          contextWindow: event.contextWindow ?? state.usage.contextWindow,
        },
      };
    }

    // ── Text streaming ──────────────────────────────────────────────────

    case 'text_delta': {
      // Mutate Map in-place — skips O(N) Map clone for high-frequency deltas.
      // _streamingTick signals the change to subscribers.
      const msg = state.messages.get(event.messageId);
      if (!msg) return {};

      const content = [...msg.content];
      const last = content[content.length - 1];
      if (last?.type === 'text') {
        content[content.length - 1] = { type: 'text', text: last.text + event.text };
      } else {
        content.push({ type: 'text', text: event.text });
      }

      state.messages.set(event.messageId, { ...msg, content });
      // Clear preparing when assistant content arrives
      const clearPreparing = msg.role === 'assistant' && state.isPreparingResponse;
      return { _streamingTick: state._streamingTick + 1, ...(clearPreparing ? { isPreparingResponse: false } : {}) };
    }

    case 'text_done': {
      // text_done carries fullText for non-streaming mode;
      // for streaming, deltas already built the text. Just ensure completeness.
      const messages = cloneMessages(state);
      const msg = messages.get(event.messageId);
      if (!msg) return {};

      const content = [...msg.content];
      const last = content[content.length - 1];
      if (last?.type === 'text') {
        content[content.length - 1] = { type: 'text', text: event.fullText };
      } else {
        content.push({ type: 'text', text: event.fullText });
      }

      messages.set(event.messageId, { ...msg, content });
      return { messages };
    }

    // ── Thinking ────────────────────────────────────────────────────────

    case 'thinking_start': {
      const messages = cloneMessages(state);
      const msg = messages.get(event.messageId);
      if (!msg) return {};
      messages.set(event.messageId, { ...msg, isThinking: true });
      return { messages, isThinking: true };
    }

    case 'thinking_delta': {
      // Mutate Map in-place — same optimization as text_delta.
      const msg = state.messages.get(event.messageId);
      if (!msg) return {};

      const content = [...msg.content];
      const last = content[content.length - 1];
      if (last?.type === 'thinking') {
        content[content.length - 1] = { type: 'thinking', text: last.text + event.text };
      } else {
        content.push({ type: 'thinking', text: event.text });
      }

      state.messages.set(event.messageId, { ...msg, content });
      return { _streamingTick: state._streamingTick + 1 };
    }

    case 'thinking_done': {
      const messages = cloneMessages(state);
      const msg = messages.get(event.messageId);
      if (!msg) return {};
      messages.set(event.messageId, { ...msg, isThinking: false });
      return { messages, isThinking: false };
    }

    // ── Tool lifecycle ──────────────────────────────────────────────────

    case 'tool_start': {
      const messages = cloneMessages(state);
      const msg = messages.get(event.messageId);
      if (!msg) return {};

      // Prevent duplicates
      if (msg.toolUses.some((t) => t.id === event.tool.id)) return {};

      // Clear any stale input buffer for this tool ID
      _toolInputBuffers.delete(event.tool.id);

      const toolUse: ToolUse = {
        id: event.tool.id,
        name: event.tool.name,
        input: event.tool.input,
        status: 'pending',
      };

      const content: ContentBlock[] = [
        ...msg.content,
        { type: 'tool_use', toolUseId: event.tool.id },
      ];

      messages.set(event.messageId, {
        ...msg,
        content,
        toolUses: [...msg.toolUses, toolUse],
      });
      return { messages };
    }

    case 'tool_input_delta': {
      // Accumulate partial JSON chunks and try to parse the complete input.
      // In streaming mode, tool_start sends empty input {} and the full input
      // arrives incrementally via these deltas.
      const buf = (_toolInputBuffers.get(event.toolId) ?? '') + event.partialJson;
      _toolInputBuffers.set(event.toolId, buf);

      let parsedInput: Record<string, unknown> | undefined;
      try {
        parsedInput = JSON.parse(buf);
        // Parse succeeded — clear buffer, we have the complete input
        _toolInputBuffers.delete(event.toolId);
      } catch {
        // JSON not yet complete — continue accumulating
      }

      // Mutate Map in-place — same optimization as text_delta.
      const msg = state.messages.get(event.messageId);
      if (!msg) return {};

      const toolUses = msg.toolUses.map((tu) => {
        if (tu.id !== event.toolId) return tu;
        return {
          ...tu,
          // Still streaming until JSON parse succeeds (complete input received)
          isStreaming: !parsedInput,
          // Update input when we have a successful parse
          ...(parsedInput ? { input: parsedInput } : {}),
        };
      });

      state.messages.set(event.messageId, { ...msg, toolUses });
      return { _streamingTick: state._streamingTick + 1 };
    }

    case 'tool_permission_needed': {
      // tool_permission_needed always carries the complete tool input.
      // Update the tool's input (may have been empty from streaming tool_start).
      _toolInputBuffers.delete(event.toolId); // Clear any stale buffer

      const messages = cloneMessages(state);
      const msg = messages.get(event.messageId);
      if (!msg) return {};

      const toolExists = msg.toolUses.some((tu) => tu.id === event.toolId);

      if (toolExists) {
        // Normal case: tool exists in this message's toolUses
        const toolUses = msg.toolUses.map((tu) => {
          if (tu.id !== event.toolId) return tu;
          return {
            ...tu,
            status: 'pending_permission' as const,
            isStreaming: false, // Permission means input is complete
            requestId: event.requestId,
            input: event.input, // Authoritative input from the permission event
          };
        });
        messages.set(event.messageId, { ...msg, toolUses });
      } else {
        // Subagent case: the tool belongs to a nested Task agent whose messages
        // were not fully surfaced in the store. Create a synthetic tool use so
        // the permission UI can display and resolve it.
        _syntheticSubagentToolIds.add(event.toolId);
        const syntheticTool: ToolUse = {
          id: event.toolId,
          name: event.toolName,
          input: event.input,
          status: 'pending_permission',
          requestId: event.requestId,
        };
        const content: ContentBlock[] = [
          ...msg.content,
          { type: 'tool_use', toolUseId: event.toolId },
        ];
        messages.set(event.messageId, {
          ...msg,
          content,
          toolUses: [...msg.toolUses, syntheticTool],
        });
      }

      // No longer "preparing" — we're waiting for user action
      return { messages, isPreparingResponse: false };
    }

    case 'tool_running': {
      const messages = cloneMessages(state);
      const msg = messages.get(event.messageId);
      if (!msg) return {};

      const toolUses = msg.toolUses.map((tu) => {
        if (tu.id !== event.toolId) return tu;
        return {
          ...tu,
          status: 'running' as const,
          approvalMethod: event.approvalMethod,
          requestId: undefined,
        };
      });

      messages.set(event.messageId, { ...msg, toolUses });
      return { messages };
    }

    case 'tool_result': {
      const messages = cloneMessages(state);
      const msg = messages.get(event.messageId);
      if (!msg) return {};

      // ── Build taskId → toolRef mapping ──────────────────────────────
      //
      // Extract task IDs from tool_result output to populate _taskIdToToolRef.
      // This mapping is the ONLY deterministic link between a background
      // task's ID and its parent tool card. Two sources:
      //
      // 1. Bash run_in_background → "Command running in background with ID: <id>"
      // 2. Agent/Task subagent   → "agentId: <id> (for resuming...)"
      //
      // Both patterns produce the same mapping used by task_notification
      // to update the parent tool card rather than creating standalone
      // system messages.
      const output = event.result.output ?? '';
      const bgMatch = BACKGROUND_TASK_PATTERN.exec(output);
      const agentMatch = !bgMatch ? AGENT_ID_PATTERN.exec(output) : null;
      const taskId = bgMatch?.[1] ?? agentMatch?.[1];

      if (taskId) {
        _taskIdToToolRef.set(taskId, { toolId: event.toolId, messageId: event.messageId });
      }

      const toolUses = msg.toolUses.map((tu) => {
        if (tu.id !== event.toolId) return tu;
        // Only Bash background tasks get a visible backgroundTask badge;
        // Agent tool results don't need one since the tool card already
        // transitions from "running" → "complete" via the status field.
        const backgroundTask: BackgroundTask | undefined = bgMatch
          ? { taskId: bgMatch[1]!, status: 'running' }
          : undefined;
        return {
          ...tu,
          status: (event.result.success ? 'complete' : 'error') as ToolUse['status'],
          result: event.result,
          isStreaming: false,
          ...(backgroundTask ? { backgroundTask } : {}),
        };
      });

      messages.set(event.messageId, { ...msg, toolUses });
      return { messages };
    }

    // ── Errors ──────────────────────────────────────────────────────────

    case 'error': {
      const messages = cloneMessages(state);
      const update: Partial<ChatState> = {
        error: { code: event.code, message: event.message },
        isPreparingResponse: false,
        messages,
      };

      if (event.messageId) {
        const msg = messages.get(event.messageId);
        if (msg) {
          messages.set(event.messageId, { ...msg, status: 'error', isStreaming: false });
        }
      }

      // Create a visible system message so errors appear in the chat
      const errMsgId = `error_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const errorTimestamp = event.timestamp ?? Date.now();
      messages.set(errMsgId, {
        id: errMsgId,
        role: 'system',
        content: [{
          type: 'system_event',
          eventType: 'error',
          data: {
            code: event.code,
            message: event.message,
            retryable: event.retryable,
            originMessageId: event.messageId,
            systemMessageId: errMsgId,
            timestamp: errorTimestamp,
            isFromHistory,
            rawEvent: event,
          },
        }],
        timestamp: errorTimestamp,
        status: 'complete',
        isStreaming: false,
        isThinking: false,
        toolUses: [],
        isFromHistory,
      });
      const messageOrder = _isReplaying
        ? (state.messageOrder.push(errMsgId), state.messageOrder)
        : [...state.messageOrder, errMsgId];
      update.messageOrder = messageOrder;
      if (!_isReplaying) {
        update.messageGroups = computeMessageGroups(messages, messageOrder);
      }

      return update;
    }

    case 'rate_limited': {
      const messages = cloneMessages(state);
      const rlMsgId = `rate_limited_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const rlTimestamp = event.timestamp ?? Date.now();
      messages.set(rlMsgId, {
        id: rlMsgId,
        role: 'system',
        content: [{
          type: 'system_event',
          eventType: 'rate_limited',
          data: {
            limitType: event.limitType,
            resetsAt: event.resetsAt,
            isUsingOverage: event.isUsingOverage,
            systemMessageId: rlMsgId,
            timestamp: rlTimestamp,
            isFromHistory,
            rawEvent: event,
          },
        }],
        timestamp: rlTimestamp,
        status: 'complete',
        isStreaming: false,
        isThinking: false,
        toolUses: [],
        isFromHistory,
      });
      const messageOrder = _isReplaying
        ? (state.messageOrder.push(rlMsgId), state.messageOrder)
        : [...state.messageOrder, rlMsgId];

      const overageNote = event.isUsingOverage ? ' (using overage)' : '';
      return {
        messages,
        messageOrder,
        error: {
          code: 'rate_limited',
          message: `Usage limit reached${overageNote} — requests may be slower. Resets at ${new Date(event.resetsAt * 1000).toLocaleTimeString()}.`,
        },
        ...(!_isReplaying ? { messageGroups: computeMessageGroups(messages, messageOrder) } : {}),
      };
    }

    // ── API Retry ─────────────────────────────────────────────────────
    //
    // Transient retry status for 529/overloaded errors. Updates in-place:
    // first attempt creates a system message, subsequent attempts replace
    // its content block. Cleaned up on turn_start (retry succeeded).

    case 'api_retry': {
      // During replay, retries are resolved — skip entirely
      if (_isReplaying) return {};

      const messages = cloneMessages(state);
      const contentBlock = {
        type: 'api_retry' as const,
        attempt: event.attempt,
        maxRetries: event.maxRetries,
        retryDelayMs: event.retryDelayMs,
        errorStatus: event.errorStatus,
        error: event.error,
      };

      // Look for existing api_retry message to update in-place
      for (const [id, msg] of messages) {
        if (msg.role === 'system' && msg.content.length === 1 && msg.content[0].type === 'api_retry') {
          messages.set(id, { ...msg, content: [contentBlock] });
          return { messages, _streamingTick: state._streamingTick + 1 };
        }
      }

      // First retry — create new system message
      const msgId = `api_retry_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      messages.set(msgId, {
        id: msgId,
        role: 'system',
        content: [contentBlock],
        timestamp: event.timestamp ?? Date.now(),
        status: 'complete',
        isStreaming: false,
        isThinking: false,
        toolUses: [],
        isFromHistory,
      });
      const messageOrder = [...state.messageOrder, msgId];
      return {
        messages,
        messageOrder,
        messageGroups: computeMessageGroups(messages, messageOrder),
      };
    }

    // ── Interrupt ─────────────────────────────────────────────────────
    //
    // Dedicated handler for interrupted events. Clears ALL processing
    // state atomically so the UI never gets stuck in a busy state.
    // Creates a system message for the chat timeline.

    case 'interrupted': {
      // Guard against duplicate interrupted events during live streaming.
      // Both SessionManager and the CLI can emit 'interrupted' for the same turn.
      // During replay, always process (flags are suppressed so the check would
      // incorrectly skip the event).
      if (!_isReplaying && !state.isAgentBusy && !state.isStreaming && !state.isPreparingResponse) {
        return {};
      }

      const messageId = `interrupted_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const messages = cloneMessages(state);

      // Create system message for the chat timeline
      messages.set(messageId, {
        id: messageId,
        role: 'system',
        content: [{ type: 'system_event', eventType: 'interrupted', data: event }],
        timestamp: event.timestamp,
        status: 'complete',
        isStreaming: false,
        isThinking: false,
        toolUses: [],
        isFromHistory,
      });

      const messageOrder = _isReplaying
        ? (state.messageOrder.push(messageId), state.messageOrder)
        : [...state.messageOrder, messageId];

      const update: Partial<ChatState> = {
        messages,
        messageOrder,
        // Clear ALL processing flags — the agent is no longer busy
        isAgentBusy: false,
        isStreaming: false,
        isThinking: false,
        isPreparingResponse: false,
        isPendingInterrupt: false,
        streamingMessageId: null,
      };

      // Mark the in-flight assistant message as interrupted.
      // During replay, streamingMessageId is suppressed (stripped from updates),
      // so fall back to scanning for the last streaming message.
      let streamingTarget = state.streamingMessageId;
      if (!streamingTarget) {
        for (let i = state.messageOrder.length - 1; i >= 0; i--) {
          if (messages.get(state.messageOrder[i]!)?.status === 'streaming') {
            streamingTarget = state.messageOrder[i]!;
            break;
          }
        }
      }
      if (streamingTarget) {
        const streamMsg = messages.get(streamingTarget);
        if (streamMsg) {
          // Mark any in-flight tools as errored
          const toolUses = streamMsg.toolUses.map((tu) => {
            if (tu.status === 'pending' || tu.status === 'running' || tu.status === 'pending_permission') {
              return { ...tu, status: 'error' as const, isStreaming: false, result: { success: false, error: 'Interrupted' } };
            }
            return tu;
          });

          messages.set(streamingTarget, {
            ...streamMsg,
            status: 'interrupted',
            isStreaming: false,
            isThinking: false,
            toolUses,
          });

          // Clear input buffers for interrupted tools
          for (const tu of streamMsg.toolUses) {
            _toolInputBuffers.delete(tu.id);
          }
        }
      }

      if (!_isReplaying) {
        update.messageGroups = computeMessageGroups(messages, messageOrder);
      }

      return update;
    }

    // ── App-injected events → system messages ───────────────────────────

    case 'compact_boundary': {
      const messages = cloneMessages(state);
      const cbEvent = event as { type: 'compact_boundary'; trigger: 'manual' | 'auto'; preTokens: number; status?: 'compacting' | 'complete'; timestamp?: number };
      const isCompacting = cbEvent.status === 'compacting';
      const status = cbEvent.status ?? ('complete' as const);
      const contentBlock = {
        type: 'compact_boundary' as const,
        trigger: cbEvent.trigger,
        preTokens: cbEvent.preTokens,
        status,
      };

      if (!isCompacting) {
        // Real compact_boundary from CLI — find and replace the synthetic "compacting" message
        for (const [id, msg] of messages) {
          if (msg.role === 'system' && msg.content.length === 1) {
            const block = msg.content[0] as { type: string; status?: string };
            if (block.type === 'compact_boundary' && block.status === 'compacting') {
              messages.set(id, {
                ...msg,
                content: [contentBlock],
                isFromHistory,
              });
              const update: Partial<ChatState> = { messages };
              if (!_isReplaying) {
                update.messageGroups = computeMessageGroups(messages, state.messageOrder);
              }
              return update;
            }
          }
        }
      }

      // No synthetic to replace (auto-compact or first synthetic) — create new message
      const messageId = `${event.type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      messages.set(messageId, {
        id: messageId,
        role: 'system',
        content: [contentBlock],
        timestamp: cbEvent.timestamp ?? Date.now(),
        status: 'complete',
        isStreaming: false,
        isThinking: false,
        toolUses: [],
        isFromHistory,
      });

      const messageOrder = _isReplaying
        ? (state.messageOrder.push(messageId), state.messageOrder)
        : [...state.messageOrder, messageId];

      const update: Partial<ChatState> = { messages, messageOrder };
      if (!_isReplaying) {
        update.messageGroups = computeMessageGroups(messages, messageOrder);
      }
      return update;
    }

    case 'task_notification': {
      const ref = _taskIdToToolRef.get(event.taskId);
      if (ref) {
        // Update the original tool's backgroundTask status
        const messages = cloneMessages(state);
        const msg = messages.get(ref.messageId);
        if (msg) {
          const toolUses = msg.toolUses.map((tu) => {
            if (tu.id !== ref.toolId) return tu;
            return {
              ...tu,
              backgroundTask: {
                taskId: event.taskId,
                status: event.status,
                summary: event.summary,
              },
            };
          });
          messages.set(ref.messageId, { ...msg, toolUses });
          _taskIdToToolRef.delete(event.taskId);
          return { messages };
        }
      }

      // Fallback: no matching tool found.
      // Skip completed tasks — the tool renderer already shows a checkmark.
      if (event.status === 'completed') return {};

      const messageId = `${event.type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const messages = cloneMessages(state);

      messages.set(messageId, {
        id: messageId,
        role: 'system',
        content: [{ type: 'system_event', eventType: event.type, data: event }],
        timestamp: event.timestamp ?? Date.now(),
        status: 'complete',
        isStreaming: false,
        isThinking: false,
        toolUses: [],
        isFromHistory,
      });

      const messageOrder = _isReplaying
        ? (state.messageOrder.push(messageId), state.messageOrder)
        : [...state.messageOrder, messageId];

      const update: Partial<ChatState> = { messages, messageOrder };
      if (!_isReplaying) {
        update.messageGroups = computeMessageGroups(messages, messageOrder);
      }
      return update;
    }

    case 'skill_activation': {
      const saEvent = event as { type: 'skill_activation'; skills: Array<{ id: string; name: string; trigger?: string; body?: string }>; timestamp?: number };
      const messageId = `${event.type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const messages = cloneMessages(state);

      messages.set(messageId, {
        id: messageId,
        role: 'system',
        content: [{
          type: 'skill_activation' as const,
          skills: saEvent.skills,
        }],
        timestamp: saEvent.timestamp ?? Date.now(),
        status: 'complete',
        isStreaming: false,
        isThinking: false,
        toolUses: [],
        isFromHistory,
      });

      const messageOrder = _isReplaying
        ? (state.messageOrder.push(messageId), state.messageOrder)
        : [...state.messageOrder, messageId];

      const update: Partial<ChatState> = { messages, messageOrder };

      if (!_isReplaying) {
        update.messageGroups = computeMessageGroups(messages, messageOrder);
      }

      return update;
    }

    case 'model_change':
    case 'entity_link': {
      const messageId = `${event.type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const messages = cloneMessages(state);

      messages.set(messageId, {
        id: messageId,
        role: 'system',
        content: [{ type: 'system_event', eventType: event.type, data: event }],
        timestamp: event.timestamp ?? Date.now(),
        status: 'complete',
        isStreaming: false,
        isThinking: false,
        toolUses: [],
        isFromHistory,
      });

      const messageOrder = _isReplaying
        ? (state.messageOrder.push(messageId), state.messageOrder)
        : [...state.messageOrder, messageId];

      const update: Partial<ChatState> = { messages, messageOrder };

      if (!_isReplaying) {
        update.messageGroups = computeMessageGroups(messages, messageOrder);
      }

      return update;
    }

    case 'tag_execution': {
      const teEvent = event as {
        type: 'tag_execution';
        tagName: string;
        color: string;
        status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
        instructions: string;
        workstreamId: string;
        snapshot: Array<{ tagName: string; color: string; status: string; dependsOn?: string[]; waitingOn?: string[]; delegatedWorkstreamId?: string; delegatedWorkstreamTitle?: string }>;
        timestamp?: number;
      };
      // Deterministic ID based on tag + workstream — prevents duplicates during replay
      const messageId = `tag_exec_${teEvent.workstreamId}_${teEvent.tagName}`;
      const messages = cloneMessages(state);

      // Skip if we already have a message for this tag execution (dedup on replay)
      if (messages.has(messageId)) {
        return {};
      }

      messages.set(messageId, {
        id: messageId,
        role: 'system',
        content: [{
          type: 'tag_execution' as const,
          tagName: teEvent.tagName,
          color: teEvent.color,
          status: teEvent.status,
          instructions: teEvent.instructions,
          workstreamId: teEvent.workstreamId,
          snapshot: teEvent.snapshot,
        }],
        timestamp: teEvent.timestamp ?? Date.now(),
        status: 'complete',
        isStreaming: false,
        isThinking: false,
        toolUses: [],
        isFromHistory,
      });

      const messageOrder = _isReplaying
        ? (state.messageOrder.push(messageId), state.messageOrder)
        : [...state.messageOrder, messageId];

      const update: Partial<ChatState> = { messages, messageOrder };
      if (!_isReplaying) {
        update.messageGroups = computeMessageGroups(messages, messageOrder);
      }
      return update;
    }

    case 'tag_delegation': {
      const tdEvent = event as {
        type: 'tag_delegation';
        tagName: string;
        color: string;
        delegatedWorkstreamId: string;
        delegatedWorkstreamTitle: string;
        timestamp?: number;
      };
      const messageId = `tag_deleg_${tdEvent.delegatedWorkstreamId}_${tdEvent.tagName}`;
      const messages = cloneMessages(state);

      if (messages.has(messageId)) {
        return {};
      }

      messages.set(messageId, {
        id: messageId,
        role: 'system',
        content: [{
          type: 'tag_delegation' as const,
          tagName: tdEvent.tagName,
          color: tdEvent.color,
          delegatedWorkstreamId: tdEvent.delegatedWorkstreamId,
          delegatedWorkstreamTitle: tdEvent.delegatedWorkstreamTitle,
        }],
        timestamp: tdEvent.timestamp ?? Date.now(),
        status: 'complete',
        isStreaming: false,
        isThinking: false,
        toolUses: [],
        isFromHistory,
      });

      const messageOrder = _isReplaying
        ? (state.messageOrder.push(messageId), state.messageOrder)
        : [...state.messageOrder, messageId];

      const update: Partial<ChatState> = { messages, messageOrder };
      if (!_isReplaying) {
        update.messageGroups = computeMessageGroups(messages, messageOrder);
      }
      return update;
    }

    // ── User messages ──────────────────────────────────────────────────

    case 'user_message': {
      // During live operation, the renderer already has an optimistic user
      // message from addUserMessage(). Replace it with the persisted version
      // so the store uses the backend-assigned ID. This is critical for
      // snapshot caching: without this, the snapshot would save the client-
      // generated optimistic ID, and on replay the backend ID wouldn't match,
      // causing a duplicate user message.
      if (!isFromHistory) {
        // Find the optimistic user message by matching text content (not just role)
        // to avoid replacing the wrong message if rapid sends were ever possible
        const optimisticId = [...state.messageOrder].reverse().find((id) => {
          const m = state.messages.get(id);
          if (!m || m.role !== 'user') return false;
          // Use _matchText (decoded AI text) when present — set when displayText differs from matchText (e.g. paste chips)
          const matchAgainst = m._matchText ?? (m.content[0]?.type === 'text' ? m.content[0].text : undefined);
          return matchAgainst === event.text;
        });
        if (optimisticId && optimisticId !== event.messageId) {
          const messages = new Map(state.messages);
          const optimistic = messages.get(optimisticId);
          if (optimistic) {
            // Replace: delete optimistic, insert with backend ID
            messages.delete(optimisticId);
            messages.set(event.messageId, {
              ...optimistic,
              id: event.messageId,
              timestamp: event.timestamp,
              dbEventId,
            });
            const messageOrder = state.messageOrder.map((id) =>
              id === optimisticId ? event.messageId : id
            );
            return {
              messages,
              messageOrder,
              messageGroups: computeMessageGroups(messages, messageOrder),
            };
          }
        }
        // No optimistic match — message originated outside the renderer
        // (e.g. routine executor). Fall through to create it from the event.
      }

      // Guard against duplicates (e.g. seeded snapshot messages)
      if (state.messages.has(event.messageId)) {
        return {};
      }

      // Create the user message from the persisted event (replay or live from main process)
      const messages = cloneMessages(state);
      const userContent: ContentBlock[] = [{ type: 'text', text: event.text }];
      if ('imageAttachments' in event && Array.isArray(event.imageAttachments)) {
        for (const img of event.imageAttachments) {
          userContent.push({
            type: 'image_attachment',
            name: img.name,
            mimeType: img.mimeType,
            size: img.size,
            previewUrl: img.previewUrl,
          } satisfies ImageAttachmentBlock);
        }
      }
      const msg: Message = {
        id: event.messageId,
        role: 'user',
        content: userContent,
        timestamp: event.timestamp,
        status: 'complete',
        isStreaming: false,
        isThinking: false,
        toolUses: [],
        isFromHistory: isFromHistory ?? false,
        dbEventId,
      };
      messages.set(event.messageId, msg);

      const messageOrder = _isReplaying
        ? (state.messageOrder.push(event.messageId), state.messageOrder)
        : [...state.messageOrder, event.messageId];

      return {
        messages,
        messageOrder,
        ...(_isReplaying ? {} : { messageGroups: computeMessageGroups(messages, messageOrder) }),
      };
    }

    // ── User message ack (JSONL uuid for fork-at-message) ─────────────

    case 'user_message_ack': {
      // Attach the JSONL providerUuid to the most recent user message.
      // This enables fork-at-message for user messages.
      const lastUserId = [...state.messageOrder].reverse().find((id) => {
        const m = state.messages.get(id);
        return m?.role === 'user' && !m.providerUuid;
      });
      if (lastUserId) {
        const messages = cloneMessages(state);
        const userMsg = messages.get(lastUserId);
        if (userMsg) {
          messages.set(lastUserId, { ...userMsg, providerUuid: event.providerUuid });
          return { messages };
        }
      }
      return {};
    }

    // ── Usage tracking ────────────────────────────────────────────────

    case 'usage_update': {
      return {
        usage: {
          ...state.usage,
          currentInputTokens: event.inputTokens,
          currentCacheReadTokens: event.cacheReadTokens,
          currentCacheCreationTokens: event.cacheCreationTokens,
          outputTokens: event.outputTokens,
          contextWindow: event.contextWindow ?? state.usage.contextWindow,
        },
      };
    }

    // ── Session init & provider events ──────────────────────────────────

    case 'session_init':
      // Session init is informational — no UI update needed
      return {};

    case 'provider_event': {
      // ── Safety net: suppress noisy provider_event subtypes ──────────
      //
      // The normalizer should already suppress these (returning [] instead
      // of provider_event), but we guard here too for defense-in-depth.
      // These subtypes are internal to the Agent tool's subagent lifecycle
      // and must NEVER create standalone timeline messages — they cause a
      // wall of "claude-code / task_progress" noise (see screenshot in
      // task-progress branch PR).
      //
      // Suppressed subtypes:
      // - task_started: redundant with the Agent tool_start already visible
      // - task_progress: status update for an already-visible Agent tool
      // - sub_agent_assistant: internal subagent responses (parent_tool_use_id set)
      const suppressedSubtypes = ['task_started', 'task_progress', 'sub_agent_assistant'];
      if (suppressedSubtypes.includes(event.eventType)) {
        return {};
      }

      // Surface remaining provider events in the chat timeline as system messages
      const providerTimestamp = (event as { timestamp?: number }).timestamp ?? Date.now();
      const messageId = `${event.type}_${providerTimestamp}_${Math.random().toString(36).slice(2, 6)}`;
      const messages = cloneMessages(state);

      messages.set(messageId, {
        id: messageId,
        role: 'system',
        content: [{ type: 'system_event', eventType: 'provider_event', data: event }],
        timestamp: providerTimestamp,
        status: 'complete',
        isStreaming: false,
        isThinking: false,
        toolUses: [],
        isFromHistory,
      });

      const messageOrder = _isReplaying
        ? (state.messageOrder.push(messageId), state.messageOrder)
        : [...state.messageOrder, messageId];

      const update: Partial<ChatState> = { messages, messageOrder };

      if (!_isReplaying) {
        update.messageGroups = computeMessageGroups(messages, messageOrder);
      }

      return update;
    }

    default:
      return {};
  }
}
