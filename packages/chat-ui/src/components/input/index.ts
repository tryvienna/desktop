/**
 * Input Module — Barrel export for chat input components
 *
 * @ai-context
 * - Re-exports ChatInput, ChatInputBase, ChatInputUnified
 * - Re-exports action bars: Permission, Question, Verification
 * - Re-exports sub-components: AttachmentPreview, AttachmentMenu, EntityChip, etc.
 * - Re-exports utilities: transformInputValueToPlainText, buildContentBlocks
 */

// ─── Base Input ─────────────────────────────────────────────────────────────

export { ChatInputBase } from './chat-input-base';
export type { ChatInputBaseHandle, ChatInputBaseProps } from './chat-input-base';

// ─── Unified Input ──────────────────────────────────────────────────────────

export { ChatInputUnified } from './chat-input-unified';
export type { ChatInputUnifiedHandle, ChatInputUnifiedProps } from './chat-input-unified';

// ─── Orchestration Wrapper ──────────────────────────────────────────────────

export { ChatInput } from './chat-input';
export type {
  ChatInputProps,
  VerificationCallbacks,
  PendingQuestion,
  ImageAttachmentMeta,
} from './chat-input';

// ─── Action Bars ────────────────────────────────────────────────────────────

export { PermissionActionBar } from './permission-action-bar';
export type { PermissionActionBarProps } from './permission-action-bar';

export { FileChangeActionBar } from './file-change-action-bar';
export type { FileChangeActionBarProps } from './file-change-action-bar';

export { VerificationActionBar } from './verification-action-bar';
export type {
  VerificationActionBarProps,
  ResolvedVerificationAction,
} from './verification-action-bar';

export { QuestionActionBar } from './question-action-bar';
export type { QuestionActionBarProps, AskUserQuestionItem } from './question-action-bar';

// ─── Sub-components ─────────────────────────────────────────────────────────

export { AttachmentPreview } from './components/attachment-preview';
export type { AttachmentPreviewProps } from './components/attachment-preview';

export { AttachmentMenu } from './components/attachment-menu';
export type { AttachmentMenuProps, SkillMenuItem } from './components/attachment-menu';

export { EntityChip, createEntityURI, parseEntityLabel } from './components/entity-chip';
export type { EntityChipProps } from './components/entity-chip';

export { SkillPreviewList } from './components/skill-preview-list';
export type { SkillPreviewListProps, SkillPreviewItem } from './components/skill-preview-list';

// ─── Global Search Browse Bar ────────────────────────────────────────────

export { GlobalSearchBrowseBar } from './global-search-browse-bar';
export type {
  GlobalSearchBrowseBarProps,
  ContentSearchResult,
  ContentSearchFileResult,
  ContentMatch,
  ContentSearchOpts,
} from './global-search-browse-bar';

// ─── Utilities ──────────────────────────────────────────────────────────────

export {
  transformInputValueToPlainText,
  entityToURI,
  attachmentToText,
} from './utils/transform-input-value';

export { buildContentBlocks } from './utils/build-content-blocks';
export type {
  ContentBlock,
  TextContentBlock,
  ImageContentBlock,
} from './utils/build-content-blocks';
