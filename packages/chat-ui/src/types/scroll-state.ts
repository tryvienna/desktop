/**
 * Scroll State Types
 *
 * Types for persisting and restoring chat scroll positions.
 *
 * @module chat-ui/types/scroll-state
 */

/** Persisted scroll state for a chat session. */
export interface ChatScrollState {
  firstVisibleMessageId: string | null;
  offsetWithinMessage: number;
  isAutoScrollEnabled: boolean;
  savedAt: number;
}

/** Storage adapter for persisting scroll state. */
export interface ScrollStateStorage {
  get(chatId: string): ChatScrollState | null;
  set(chatId: string, state: ChatScrollState): void;
}

/** Information about visible messages in the viewport. */
export interface VisibleMessageInfo {
  messageId: string;
  groupId: string;
  visibilityRatio: number;
  offsetFromViewportTop: number;
}
