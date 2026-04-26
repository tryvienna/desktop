/**
 * Context Providers — barrel export
 *
 * @module chat-ui/context
 */

// Chat
export {
  ChatProvider,
  useChatStore,
  useChatMessages,
  useChatMessage,
  useChatMessageGroups,
  useChatStreaming,
  useChatUsage,
  useChatError,
  useChatActions,
  useChatAgentBusy,
  useChatThinking,
  useChatPreparing,
  useChatCurrentTurn,
} from './chat-context';
export type { ChatProviderProps } from './chat-context';

// Scroll
export { ScrollProvider, useScroll, useScrollSafe } from './scroll-context';
export type { ScrollState, ScrollContextValue, ScrollProviderProps } from './scroll-context';

// File Change Review
export { FileChangeReviewProvider, useFileChangeAnchor, useIsFileChangeAnchor, useFileChangeGroupToolIds, useActiveFileChangeGroupToolIds } from './file-change-review-context';

// Open File in Editor
export { OpenFileProvider, useOpenFile } from './open-file-context';

// Detachable Cards
export {
  DetachableCardProvider,
  useDetachableCards,
  useDetachableCardsSafe,
} from './detachable-card-context';
export type {
  DetachedCard,
  DetachableCardContextValue,
  DetachableCardProviderProps,
} from './detachable-card-context';
