/**
 * MessageList — Scrollable message list with FreshCanvas layout
 *
 * @ai-context
 * - Renders grouped chat messages with auto-scroll during streaming
 * - FreshCanvas logic pins new turns to top of viewport until they fill it
 * - Dynamic spacer after messages for proper scroll positioning
 * - ResizeObserver tracks message height for spacer recalculation
 * - Uses CHAT_SPACING tokens from ../tokens for consistent spacing
 * - data-slot="message-list"
 *
 * @example
 * <MessageList messages={msgs} messageGroups={groups} isStreaming={true} />
 */

import React, { memo, useCallback, useRef, useEffect, useLayoutEffect, useMemo, useState } from 'react';

import type { Message, MessageGroup, ToolUse } from '../types/messages';
import { CHAT_SPACING } from '../tokens';
import { ChatMessage } from './message';
import { MessageErrorBoundary } from './message-error-boundary';
import { PreparingIndicator } from './preparing-indicator';
import { ExplorationPanel, isExplorationOnlyMessage } from './tools/exploration';
import { useChatHistoryState } from '../context/chat-context';

// ─── Cross-Message Exploration Grouping ─────────────────────────────────────

type AssistantSegment =
  | { kind: 'exploration'; tools: ToolUse[]; key: string }
  | { kind: 'message'; messageId: string };

/**
 * Partition an assistant group's messages into segments, merging consecutive
 * exploration-only messages into a single exploration segment.
 */
function segmentAssistantGroup(
  messageIds: string[],
  messageMap: Map<string, Message>,
  minGroupSize = 2
): AssistantSegment[] {
  const segments: AssistantSegment[] = [];
  let pendingTools: ToolUse[] = [];
  let pendingKey = '';
  let pendingMessageIds: string[] = [];

  function flushExploration() {
    if (pendingTools.length === 0) return;

    if (pendingTools.length >= minGroupSize) {
      segments.push({ kind: 'exploration', tools: pendingTools, key: pendingKey });
    } else {
      // Below threshold — render as individual messages
      for (const mid of pendingMessageIds) {
        segments.push({ kind: 'message', messageId: mid });
      }
    }
    pendingTools = [];
    pendingKey = '';
    pendingMessageIds = [];
  }

  for (const id of messageIds) {
    const msg = messageMap.get(id);
    if (!msg) continue;

    if (msg.role === 'assistant' && isExplorationOnlyMessage(msg)) {
      if (pendingTools.length === 0) {
        pendingKey = `explore-${id}`;
      }
      pendingTools.push(...msg.toolUses);
      pendingMessageIds.push(id);
    } else {
      flushExploration();
      segments.push({ kind: 'message', messageId: id });
    }
  }

  flushExploration();
  return segments;
}

// ─── Props ─────────────────────────────────────────────────────────────────

export interface MessageListProps {
  messages: Message[];
  messageGroups: MessageGroup[];
  isStreaming: boolean;
  isPreparingResponse?: boolean;
  toolRenderer?: (toolUse: ToolUse, messageId: string, isFromHistory?: boolean) => React.ReactNode;
  onApprove?: (requestId: string, scope: 'once' | 'session' | 'permanent') => void;
  onDeny?: (requestId: string, message?: string) => void;
  /** Content shown when no messages exist (fresh canvas empty state) */
  emptyState?: React.ReactNode;
  /** When true, shows a loading indicator instead of the empty state (e.g. during history replay) */
  isLoading?: boolean;
  /** Called when user scrolls near the top to load older messages */
  onLoadMore?: () => void;
  /** Called when user requests conversation rewind to a specific event */
  onRewind?: (eventId: number, role?: string) => void;
  /** Called when user clicks the fork button below a message */
  onFork?: (messageId: string, providerUuid: string) => void;
  /** When set, messages after this message ID are fading out (rewind animation). */
  rewindTargetMessageId?: string | null;
}

// ─── Component ─────────────────────────────────────────────────────────────

export const MessageList = memo(function MessageList({
  messages,
  messageGroups,
  isPreparingResponse = false,
  isLoading = false,
  toolRenderer,
  onApprove,
  onDeny,
  emptyState,
  onLoadMore,
  onRewind,
  onFork,
  rewindTargetMessageId,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const prevGroupCountRef = useRef(messageGroups.length);
  const messageMap = useRef(new Map<string, Message>());

  // ─── History loading state (from store, no prop drilling) ───────────
  const { isLoadingMoreHistory } = useChatHistoryState();
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  // ─── Scroll position preservation for prepended messages ────────────
  const scrollHeightBeforePrepend = useRef<number | null>(null);
  const prevFirstMessageId = useRef<string | null>(
    messageGroups[0]?.messageIds[0] ?? null,
  );

  // ─── Inline scroll management (from drift-v2 ScrollContext) ───────────
  //
  // isAutoScrollEnabled: ref (not state) to avoid re-renders on every scroll
  // Disabled by wheel-up, re-enabled when user scrolls to bottom

  const isAutoScrollEnabledRef = useRef(true);

  const scrollToBottom = useCallback((behavior: 'smooth' | 'instant' = 'instant') => {
    const container = containerRef.current;
    if (!container) return;

    if (behavior === 'smooth') {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    } else {
      // Direct assignment — synchronous, can't fall behind during streaming
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  // Guarded version: only scrolls if the user hasn't scrolled away
  const scrollToBottomIfEnabled = useCallback(() => {
    if (isAutoScrollEnabledRef.current) {
      scrollToBottom('instant');
    }
  }, [scrollToBottom]);

  const isAtBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return true;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    return distanceFromBottom <= 1;
  }, []);

  // Stable refs for use in scroll-end timeout closure
  const isAtBottomRef = useRef(isAtBottom);
  isAtBottomRef.current = isAtBottom;

  const scrollEndTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.deltaY < 0) {
      isAutoScrollEnabledRef.current = false;
    }
  }, []);

  const handleScroll = useCallback(() => {
    // Debounced scroll-end detection
    if (scrollEndTimeoutRef.current) {
      clearTimeout(scrollEndTimeoutRef.current);
    }
    scrollEndTimeoutRef.current = setTimeout(() => {
      scrollEndTimeoutRef.current = null;
      if (isAtBottomRef.current()) {
        isAutoScrollEnabledRef.current = true;
      }
    }, 150);

    // Scroll-near-top detection for lazy loading older messages
    const container = containerRef.current;
    if (container && container.scrollTop < 200) {
      onLoadMoreRef.current?.();
    }
  }, []);

  // ─── Messages height tracking (drives spacer recalculation) ────────────
  //
  // messagesHeight is the key dependency for useLayoutEffect.
  // Updated by ResizeObserver when messages container size changes.

  const [messagesHeight, setMessagesHeight] = useState(0);

  const updateMessagesHeight = useCallback(() => {
    const messagesEl = messagesRef.current;
    if (messagesEl) {
      setMessagesHeight(messagesEl.scrollHeight);
    }
  }, []);

  // Update on mount and when messages change
  useEffect(() => {
    updateMessagesHeight();
  }, [messageGroups, updateMessagesHeight]);

  // ─── Fresh canvas state ───────────────────────────────────────────────

  const [freshCanvasTurnStart, setFreshCanvasTurnStart] = useState<number | null>(null);
  const freshCanvasTurnStartRef = useRef<number | null>(null);
  freshCanvasTurnStartRef.current = freshCanvasTurnStart;

  // ─── ResizeObserver: track messages height + auto-scroll ──────────────

  useEffect(() => {
    const messagesEl = messagesRef.current;
    if (!messagesEl) return;

    const observer = new ResizeObserver(() => {
      updateMessagesHeight();

      // Auto-scroll during streaming when enabled
      // Don't auto-scroll during fresh canvas mode — the spacer handles
      // positioning, and smooth scroll fights with spacer recalculation
      // Don't auto-scroll when showing empty state (no messages)
      if (
        isAutoScrollEnabledRef.current &&
        freshCanvasTurnStartRef.current === null &&
        prevGroupCountRef.current > 0
      ) {
        scrollToBottom('instant');
      }
    });
    observer.observe(messagesEl);
    return () => observer.disconnect();
  }, [updateMessagesHeight, scrollToBottom]);

  // ─── FreshCanvas activation: new user message group ───────────────────
  //
  // Identical to drift-v2 lines 335-365

  useEffect(() => {
    const prevCount = prevGroupCountRef.current;
    const newCount = messageGroups.length;

    if (newCount > prevCount && newCount > 0) {
      const lastGroup = messageGroups[newCount - 1]!;

      // Start fresh canvas mode when a user message arrives
      if (lastGroup.role === 'user') {
        setFreshCanvasTurnStart(newCount - 1);
        isAutoScrollEnabledRef.current = true;

        // Wait for render, then scroll to bottom
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const container = containerRef.current;
            if (container) {
              container.scrollTop = container.scrollHeight;
            }
          });
        });
      }
    }

    prevGroupCountRef.current = newCount;
  }, [messageGroups]);

  // ─── FreshCanvas exit: when turn fills viewport ───────────────────────
  //
  // Identical to drift-v2 lines 367-390

  useEffect(() => {
    if (freshCanvasTurnStart === null) return;

    const container = containerRef.current;
    const messagesEl = messagesRef.current;
    if (!container || !messagesEl) return;

    // Measure turn height using offsetTop for accuracy.
    // This accounts for actual CSS margins instead of hardcoded gaps.
    const els = messagesEl.children;
    if (els.length === 0 || freshCanvasTurnStart >= els.length) return;

    const firstEl = els[freshCanvasTurnStart] as HTMLElement;
    const lastEl = els[els.length - 1] as HTMLElement;
    const currentTurnHeight = lastEl.offsetTop + lastEl.offsetHeight - firstEl.offsetTop;

    if (currentTurnHeight >= container.clientHeight) {
      // Turn fills the viewport, exit fresh canvas mode
      setFreshCanvasTurnStart(null);
    }
  }, [freshCanvasTurnStart, messagesHeight]); // Re-check when messages change

  // ─── Spacer height (useLayoutEffect) ──────────────────────────────────
  //
  // Identical to drift-v2 lines 409-436 (minus headerHeight)

  const [spacerHeight, setSpacerHeight] = useState(0);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const messagesEl = messagesRef.current;
    if (!container || !messagesEl) return;

    const isFC = freshCanvasTurnStart !== null;

    if (isFC) {
      // Measure current turn height using offsetTop for accuracy.
      // This accounts for actual CSS margins (which vary based on isLast)
      // instead of hardcoded gaps that don't match when the ProcessingIndicator
      // is present (it has no margin, unlike MessageWrapper).
      const els = messagesEl.children;
      if (els.length > 0 && freshCanvasTurnStart < els.length) {
        const firstEl = els[freshCanvasTurnStart] as HTMLElement;
        const lastEl = els[els.length - 1] as HTMLElement;
        const turnHeight = lastEl.offsetTop + lastEl.offsetHeight - firstEl.offsetTop;
        setSpacerHeight(Math.max(0, container.clientHeight - turnHeight));
      }
    } else {
      // Normal mode: spacer fills remaining space below messages
      setSpacerHeight(Math.max(0, container.clientHeight - messagesEl.scrollHeight));
    }
  }, [freshCanvasTurnStart, messagesHeight, isPreparingResponse]);

  // ─── Scroll position preservation for prepended history ──────────────
  //
  // When older messages are loaded above, save scrollHeight before the DOM
  // update and restore scrollTop after so the user sees the same content.

  // Detect when the first message changes (older messages prepended)
  const currentFirstMessageId = messageGroups[0]?.messageIds[0] ?? null;

  if (
    currentFirstMessageId !== null &&
    prevFirstMessageId.current !== null &&
    currentFirstMessageId !== prevFirstMessageId.current
  ) {
    // First message changed — capture scrollHeight before paint
    const container = containerRef.current;
    if (container) {
      scrollHeightBeforePrepend.current = container.scrollHeight;
    }
  }
  prevFirstMessageId.current = currentFirstMessageId;

  useLayoutEffect(() => {
    if (scrollHeightBeforePrepend.current === null) return;

    const container = containerRef.current;
    if (!container) {
      scrollHeightBeforePrepend.current = null;
      return;
    }

    const delta = container.scrollHeight - scrollHeightBeforePrepend.current;
    if (delta > 0) {
      container.scrollTop += delta;
    }
    scrollHeightBeforePrepend.current = null;
  }, [currentFirstMessageId]);

  // ─── Build lookup map ─────────────────────────────────────────────────

  for (const msg of messages) {
    messageMap.current.set(msg.id, msg);
  }

  // ─── Rewind fade-out: compute which groups come after the target ──────
  const rewindFadingGroupIndices = useMemo(() => {
    if (!rewindTargetMessageId) return new Set<number>();
    // Find which group contains the target message
    let targetGroupIndex = -1;
    for (let gi = 0; gi < messageGroups.length; gi++) {
      if (messageGroups[gi]!.messageIds.includes(rewindTargetMessageId)) {
        targetGroupIndex = gi;
        break;
      }
    }
    if (targetGroupIndex === -1) return new Set<number>();
    // All groups after the target group should fade
    const fading = new Set<number>();
    for (let gi = targetGroupIndex + 1; gi < messageGroups.length; gi++) {
      fading.add(gi);
    }
    return fading;
  }, [rewindTargetMessageId, messageGroups]);

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      data-slot="message-list"
      data-message-list
      onScroll={handleScroll}
      onWheel={handleWheel}
      className="relative h-full overflow-auto"
      style={{
        scrollbarWidth: 'none' as React.CSSProperties['scrollbarWidth'],
        msOverflowStyle: 'none' as React.CSSProperties['msOverflowStyle'],
      }}
      role="log"
      aria-label="Chat messages"
    >
      <div
        ref={contentRef}
        data-message-content
        className="relative mx-auto box-border w-full max-w-[720px]"
        style={{ padding: `0 ${CHAT_SPACING.MESSAGE_PADDING_X}px` }}
      >
        {/* Messages wrapper for height tracking — overflow hidden to contain margins */}
        <div ref={messagesRef} data-messages className="overflow-hidden">
          {/* Loading more indicator (scroll-back pagination) */}
          {isLoadingMoreHistory && (
            <div className="flex items-center justify-center py-4">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
            </div>
          )}

          {messageGroups.length > 0
            ? messageGroups.map((group, gi) => (
                <div
                  key={group.id}
                  data-message-group
                  data-role={group.role}
                  className={`relative transition-all duration-500 ${rewindFadingGroupIndices.has(gi) ? 'opacity-0 translate-y-2 pointer-events-none' : ''}`}
                  style={{
                    marginBottom:
                      gi === messageGroups.length - 1 && !isPreparingResponse
                        ? 0
                        : CHAT_SPACING.MESSAGE_GAP_DIFF_AUTHOR,
                  }}
                >
                  {group.role === 'assistant'
                    ? segmentAssistantGroup(group.messageIds, messageMap.current).map(
                        (segment, si) => {
                          if (segment.kind === 'exploration') {
                            return (
                              <div
                                key={segment.key}
                                style={{
                                  marginTop:
                                    si > 0 ? CHAT_SPACING.MESSAGE_GAP_SAME_AUTHOR : 0,
                                }}
                              >
                                <ExplorationPanel tools={segment.tools} />
                              </div>
                            );
                          }
                          const msg = messageMap.current.get(segment.messageId);
                          if (!msg) return null;
                          return (
                            <div
                              key={segment.messageId}
                              style={{
                                marginTop:
                                  si > 0 ? CHAT_SPACING.MESSAGE_GAP_SAME_AUTHOR : 0,
                              }}
                            >
                              <MessageErrorBoundary messageId={segment.messageId}>
                                <ChatMessage
                                  message={msg}
                                  toolRenderer={toolRenderer}
                                  onApprove={onApprove}
                                  onDeny={onDeny}
                                  onRewind={onRewind}
                                  onFork={onFork}
                                  onContentGrow={scrollToBottomIfEnabled}
                                />
                              </MessageErrorBoundary>
                            </div>
                          );
                        }
                      )
                    : group.messageIds.map((id, mi) => {
                        const msg = messageMap.current.get(id);
                        if (!msg) return null;
                        return (
                          <div
                            key={id}
                            style={{
                              marginTop:
                                mi > 0 ? CHAT_SPACING.MESSAGE_GAP_SAME_AUTHOR : 0,
                            }}
                          >
                            <MessageErrorBoundary messageId={id}>
                              <ChatMessage
                                message={msg}
                                toolRenderer={toolRenderer}
                                onApprove={onApprove}
                                onDeny={onDeny}
                                onRewind={onRewind}
                                onFork={onFork}
                                onContentGrow={scrollToBottomIfEnabled}
                              />
                            </MessageErrorBoundary>
                          </div>
                        );
                      })}
                </div>
              ))
            : messages.map((msg, i) => (
                <div
                  key={msg.id}
                  data-message-group
                  data-role={msg.role}
                  className="relative"
                  style={{
                    marginBottom:
                      i < messages.length - 1 ? CHAT_SPACING.MESSAGE_GAP_DIFF_AUTHOR : 0,
                  }}
                >
                  <MessageErrorBoundary messageId={msg.id}>
                    <ChatMessage
                      message={msg}
                      toolRenderer={toolRenderer}
                      onApprove={onApprove}
                      onDeny={onDeny}
                      onRewind={onRewind}
                      onFork={onFork}
                      onContentGrow={scrollToBottomIfEnabled}
                    />
                  </MessageErrorBoundary>
                </div>
              ))}

          {/* Processing indicator: shown while waiting for response.
              Wrapped with marginTop matching MESSAGE_GAP_DIFF so that its total
              layout footprint equals the MessageWrapper that will replace it
              after message_start. Without this, the gap goes from 0→32px during
              the indicator→response transition, causing a visible spacer glitch. */}
          {isPreparingResponse && (
            <div
              data-processing-wrapper
              style={{ marginTop: CHAT_SPACING.MESSAGE_GAP_DIFF_AUTHOR }}
            >
              <PreparingIndicator />
            </div>
          )}
        </div>

        {/* Loading state: shown during history replay to prevent empty state flash */}
        {isLoading && messageGroups.length === 0 && messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
          </div>
        )}

        {/* Empty state: shown when no messages, not loading, and not preparing a response */}
        {!isLoading && messageGroups.length === 0 && messages.length === 0 && !isPreparingResponse && emptyState}

        {/* Dynamic Spacer: AFTER messages (critical for FreshCanvas).
            When scrolled to bottom, the spacer fills below the current turn,
            making the turn appear at the top of the viewport. */}
        <div data-spacer style={{ height: spacerHeight }} />
      </div>
    </div>
  );
});
