/**
 * Hooks — barrel export
 *
 * All custom hooks for the chat-ui package.
 *
 * @module chat-ui/hooks
 */

// Accessibility
export { useReducedMotion } from './use-reduced-motion';

// Input management
export { useContentEditable } from './use-content-editable';
export type { UseContentEditableOptions, UseContentEditableReturn } from './use-content-editable';

export { useCursorPosition } from './use-cursor-position';
export type { UseCursorPositionOptions, UseCursorPositionReturn } from './use-cursor-position';

export { useMentionAutocomplete } from './use-mention-autocomplete';
export type {
  UseMentionAutocompleteOptions,
  UseMentionAutocompleteReturn,
} from './use-mention-autocomplete';

export { useCommandTrigger } from './use-command-trigger';
export type { UseCommandTriggerOptions, UseCommandTriggerReturn } from './use-command-trigger';

export { useAttachments } from './use-attachments';
export type { UseAttachmentsOptions, UseAttachmentsReturn } from './use-attachments';

// History & persistence
export { useMessageHistory } from './use-message-history';
export type { UseMessageHistoryOptions, UseMessageHistoryReturn } from './use-message-history';

export { useDraftPersistence } from './use-draft-persistence';
export type {
  UseDraftPersistenceOptions,
  UseDraftPersistenceReturn,
} from './use-draft-persistence';

// UX
export { useRotatingPlaceholder } from './use-rotating-placeholder';
export type {
  UseRotatingPlaceholderOptions,
  UseRotatingPlaceholderReturn,
} from './use-rotating-placeholder';

// Approval & permission state
export { useAllPendingApprovals } from './use-all-pending-approvals';
export type { PendingApproval, UseAllPendingApprovalsReturn } from './use-all-pending-approvals';

export { usePendingToolApprovals } from './use-pending-tool-approvals';
export type { PendingChange, UsePendingToolApprovalsReturn } from './use-pending-tool-approvals';

export { useFileChanges } from './use-file-changes';
export type { UseFileChangesReturn } from './use-file-changes';

export { usePendingQuestion } from './use-pending-question';
export type { PendingQuestion, UsePendingQuestionReturn } from './use-pending-question';

// Interrupt
export {
  useDoubleEscapeInterrupt,
  HINT_DISPLAY_MS,
} from './use-double-escape-interrupt';
export type {
  UseDoubleEscapeInterruptOptions,
  UseDoubleEscapeInterruptReturn,
} from './use-double-escape-interrupt';
