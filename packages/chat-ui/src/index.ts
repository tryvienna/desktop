/**
 * @module @vienna/chat-ui
 * @description Chat components, state management, and tool renderers for the Vienna agent UI.
 * Built on React + Zustand + Framer Motion, styled with @tryvienna/ui design tokens.
 *
 * ## Import Patterns
 *
 * ```tsx
 * // Import components
 * import { Chat, ChatMessage, ToolOutput } from "@vienna/chat-ui"
 *
 * // Import store separately
 * import { createChatStore } from "@vienna/chat-ui/store"
 *
 * // Import styles (required in app root, imports @tryvienna/ui/styles.css)
 * import "@vienna/chat-ui/theme.css"
 * ```
 *
 * @ai-context
 * - All components use data-slot attributes for CSS targeting
 * - Uses @tryvienna/ui design tokens (OKLCH, 4px grid, Tailwind v4)
 * - Framer Motion for animations
 * - Zustand for state management
 * - cn() from @tryvienna/ui for class composition
 */

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1: Core Chat Components
// Main layout, message rendering, message list, input, streaming text,
// loading states, and token usage.
// ─────────────────────────────────────────────────────────────────────────────

export { Chat } from './components/chat';
export type { ChatProps } from './components/chat';

export { TodoIndicator } from './components/todo-indicator';
export type { TodoIndicatorProps } from './components/todo-indicator';

export { TodoPanel } from './components/todo-panel';
export type { TodoPanelProps } from './components/todo-panel';

export { ChatMessage } from './components/message';
export type { MessageProps } from './components/message';

export { MessageList } from './components/message-list';
export type { MessageListProps } from './components/message-list';

export { TypewriterText } from './components/streaming/typewriter-text';
export type { TypewriterTextProps } from './components/streaming/typewriter-text';

export { PreparingIndicator, PROCESSING_INDICATOR_HEIGHT } from './components/preparing-indicator';
export type { PreparingIndicatorProps } from './components/preparing-indicator';

export { TokenUsageBar } from './components/token-usage-bar';
export type { TokenUsageBarProps } from './components/token-usage-bar';

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2: Input Components
// Base and unified input variants, action bars for permissions / questions /
// verifications, attachment handling, entity chips, paste editing, skill previews.
// ─────────────────────────────────────────────────────────────────────────────

export {
  ChatInputBase,
  ChatInputUnified,
  PermissionActionBar,
  VerificationActionBar,
  QuestionActionBar,
  AttachmentPreview,
  AttachmentMenu,
  EntityChip,
  createEntityURI,
  parseEntityLabel,
  SkillPreviewList,
  transformInputValueToPlainText,
  buildContentBlocks,
  entityToURI,
  attachmentToText,
} from './components/input';
export type {
  ChatInputBaseProps,
  ChatInputBaseHandle,
  ChatInputUnifiedProps,
  ChatInputUnifiedHandle,
  PermissionActionBarProps,
  VerificationActionBarProps,
  ResolvedVerificationAction,
  QuestionActionBarProps,
  AskUserQuestionItem,
  AttachmentPreviewProps,
  AttachmentMenuProps,
  SkillMenuItem,
  EntityChipProps,
  SkillPreviewListProps,
  SkillPreviewItem,
  VerificationCallbacks,
  PendingQuestion,
  ImageAttachmentMeta,
  ContentBlock as InputContentBlock,
  TextContentBlock,
  ImageContentBlock,
} from './components/input';

// ─────────────────────────────────────────────────────────────────────────────
// Phase 3: Tool System
// ToolOutput wrapper, status icons, tool renderer registry, streaming content,
// approval UI (dropdown, trust badge, directory scoping), exploration panel,
// and bulk file-change review.
// ─────────────────────────────────────────────────────────────────────────────

export { ToolOutput } from './components/tools/tool-output';
export type { ToolOutputProps } from './components/tools/tool-output';

export { ToolStatusIcon } from './components/tools/tool-status-icon';

export { ToolRendererRegistry, defaultRegistry } from './components/tools/registry';
export type { ToolRendererProps, ToolRendererDefinition } from './components/tools/registry';

export { registerDefaultRenderers } from './components/tools/register-defaults';

// Approval
export { ApprovalDropdown } from './components/tools/approval/approval-dropdown';
export type { ApprovalDropdownProps } from './components/tools/approval/approval-dropdown';
export { TrustBadge } from './components/tools/approval/trust-badge';
export type { TrustBadgeProps } from './components/tools/approval/trust-badge';
export { DirectoryScoping } from './components/tools/approval/directory-scoping';
export type { DirectoryScopingProps } from './components/tools/approval/directory-scoping';
export type { ApprovalMethod } from './components/tools/approval/types';

// Streaming content
export {
  StreamingContent,
  IsolatedStreamingContent,
  LineNumbers,
  useStreamingContent,
} from './components/tools/streaming-content';
export type { StreamingContentProps } from './components/tools/streaming-content';

// Exploration panel
export {
  ExplorationPanel,
  ExplorationItemRow,
  groupExplorationTools,
  toExplorationItem,
  isExplorationTool,
  isSafeBashCommand,
  buildExplorationSummary,
  isExplorationOnlyMessage,
} from './components/tools/exploration';
export type {
  ExplorationItem,
  ExplorationPanelProps,
  ExplorationItemRowProps,
  ToolSegment,
} from './components/tools/exploration';

// Bulk review
export {
  FileChangeReviewPanel,
  ChangeItem,
  useKeyboardNavigation,
  DEFAULT_SHORTCUTS,
  DiffModeProvider,
  useDiffMode,
  DiffView,
  DiffModeToggle,
} from './components/tools/bulk-review';
export type {
  PendingChange,
  SelectionState,
  BulkApprovalCallbacks,
  FileChangeReviewPanelProps,
  ChangeItemState,
  KeyboardShortcuts,
  ChangeGroup,
  ChangeItemAction,
  DiffMode,
} from './components/tools/bulk-review';

// Built-in tool renderers
export {
  BashTool,
  ReadTool,
  WriteTool,
  GlobTool,
  GrepTool,
  WebSearchTool,
  TaskTool,
  TodoWriteTool,
  AskUserQuestionTool,
  PlanModeTool,
  MCPTool,
  EnterPlanModeTool,
  ExitPlanModeTool,
  TaskOutputTool,
  WebFetchTool,
  FileChangeReviewTool,
} from './components/tools/renderers';

// ─────────────────────────────────────────────────────────────────────────────
// Phase 4: Command Palette
// Entity palette (@ trigger), command palette (/ trigger), flow system,
// and all supporting palette primitives, icons, and types.
// ─────────────────────────────────────────────────────────────────────────────

export {
  // Main components
  CommandPalette,
  CommandPaletteWithFlows,
  EntityPalette,
  // Flow system
  FlowKeyboardContext,
  FlowScreenContainer,
  FlowHeader,
  FlowList,
  FlowListItem,
  FlowConfirmation,
  FlowSearchableList,
  // Primitives
  PaletteContainer,
  paletteContainerVariants,
  PaletteTabBar,
  PaletteResultsList,
  paletteResultsListVariants,
  PaletteResultItem,
  paletteResultItemVariants,
  PaletteSectionHeader,
  EmptyState,
  LoadingState,
  ErrorState,
  DisconnectedState,
  PaletteFilterBar,
  KeyboardKey,
  KeyboardShortcutDisplay,
  PaletteKeyboardHints,
  PaletteEntityChip,
  entityChipVariants,
  // Icons
  EntityIcon,
  CommandIcon,
  getEntityIconInfo,
  getCommandIconInfo,
  INTEGRATION_COLORS,
  // Constants
  WELL_KNOWN_ENTITY_TYPES,
  EntityReference,
} from './components/palette';
export type {
  // Types
  PaletteTab,
  PaletteSection,
  KeyboardShortcut,
  PaletteFilterValue,
  PaletteFilterDefinition,
  ActivePaletteFilter,
  ParsedPaletteQuery,
  EntityType,
  EntityMetadata as PaletteEntityMetadata,
  Entity as PaletteEntity,
  EntityPaletteDataProvider,
  CommandCategory,
  Command,
  CommandPaletteDataProvider,
  FlowScreenProps,
  FlowScreen,
  FlowDefinition,
  EntityPaletteProps,
  CommandPaletteProps,
  ChatInputWithPalettesProps,
  PaletteHandle,
  CommandPaletteWithFlowsProps,
  // Icon types
  EntityIconProps,
  CommandIconProps,
  // Flow types
  FlowKeyboardContextValue,
  FlowListItemData,
  FlowSearchableListSection,
  FlowSearchableListProps,
} from './components/palette';

// ─────────────────────────────────────────────────────────────────────────────
// Phase 5: Content Renderers
// Text, thinking, code, system, entity text, image attachment, nano-context,
// and paste text renderers. Includes the renderer registry and default factory.
// ─────────────────────────────────────────────────────────────────────────────

export {
  // Registry core
  RendererRegistry,
  createRendererRegistry,
  RendererRegistryProvider,
  useRendererRegistry,
  useRenderer,
  // Entity widget context
  EntityWidgetProvider,
  useEntityWidgetRenderer,
  // Renderers
  TextRenderer,
  textRendererDefinition,
  ThinkingRenderer,
  thinkingRendererDefinition,
  CodeRenderer,
  codeRendererDefinition,
  ImageAttachmentRenderer,
  imageAttachmentRendererDefinition,
  EntityTextRenderer,
  entityTextRendererDefinition,
  EntityClickProvider,
  useEntityClick,
  ViennaChipIcon,
  PasteTextRenderer,
  pasteTextRendererDefinition,
  PasteEditorProvider,
  NanoContextRenderer,
  nanoContextRendererDefinition,
  // System renderers
  CompactBoundaryRenderer,
  compactBoundaryRendererDefinition,
  ModelChangeRenderer,
  modelChangeRendererDefinition,
  EntityLinkRenderer,
  entityLinkRendererDefinition,
  SkillActivationRenderer,
  skillActivationRendererDefinition,
  InterruptedRenderer,
  interruptedRendererDefinition,
  TaskNotificationRenderer,
  taskNotificationRendererDefinition,
  RateLimitRenderer,
  rateLimitRendererDefinition,
  ApiRetryRenderer,
  apiRetryRendererDefinition,
  ApiErrorRenderer,
  apiErrorRendererDefinition,
  UnknownMessageRenderer,
  unknownMessageRendererDefinition,
  VerificationActionRenderer,
  verificationActionRendererDefinition,
  // Default registry factory
  createDefaultRendererRegistry,
} from './renderers';
export type {
  RendererProps,
  RendererDefinition,
  EntityWidgetRenderer,
  EntityWidgetRendererProps,
  EntityClickHandler,
} from './renderers';

// ─────────────────────────────────────────────────────────────────────────────
// Phase 6: Plan & Detachable
// Plan drawer with code/slide views, and detachable entity cards with
// floating mini-card and layer system.
// ─────────────────────────────────────────────────────────────────────────────

export {
  PlanDrawerPanel,
  PlanCodeView,
  PlanSlideView,
  splitPlanIntoSlides,
} from './components/plan-drawer';
export type {
  PlanDrawerPanelProps,
  PlanCodeViewProps,
  PlanSlideViewProps,
  PlanSlide,
} from './components/plan-drawer';

export { DetachableEntityCard, FloatingMiniCard, FloatingCardLayer } from './components/detachable';
export type { DetachableEntityCardProps, FloatingMiniCardProps } from './components/detachable';

// ─────────────────────────────────────────────────────────────────────────────
// Phase 7: NanoContext
// Contextual selection system for attaching drawer content, entity data,
// code selections, and plugin data to chat messages.
// ─────────────────────────────────────────────────────────────────────────────

export {
  // Provider & hooks
  NanoContextProvider,
  useNanoContext,
  useNanoContextOptional,
  // Registry
  NanoContextTypeRegistry,
  NanoContextTypeRegistryProvider,
  useNanoContextTypeRegistry,
  useNanoContextTypeRegistryOptional,
  // Selection capture
  useSelectionCapture,
  useDrawerSelectionCapture,
  // Components
  SelectionPopover,
  NanoContextPreview,
  NanoContextPreviewList,
  NanoContextWidget,
  SelectionCaptureWrapper,
  // Factory functions
  generateContextId,
  createDrawerSelectionContext,
  createEntityReferenceContext,
  createCodeSelectionContext,
  createPluginContext,
  // Type guards
  isDrawerSelection,
  isEntityReference,
  isCodeSelection,
  isPluginContext,
  // Content helpers
  getContextSummary,
  getContextContent,
  getContextPreview,
  setContextContent,
  // Serialization
  serializeNanoContext,
  buildMessageWithNanoContexts,
  buildMessageWithNanoContext,
  parseNanoContextFromText,
  hasNanoContext,
} from './nano-context';
export type {
  NanoContextProviderProps,
  NanoContextTypeRegistration,
  UseDrawerSelectionCaptureOptions,
  SelectionCaptureWrapperProps,
  ParseNanoContextResult,
  // Core types
  NanoContextType,
  NanoContextIcon,
  NanoContextBase,
  NanoContext,
  ContextFactoryParams,
  // Drawer types
  DrawerMetadata,
  DrawerSelectionContext,
  // Entity types
  EntityMetadata as NanoEntityMetadata,
  EntityReferenceContext,
  // Code types
  CodeFileMetadata,
  CodeSelectionContext,
  // Plugin types
  PluginNanoContext,
  // Provider types
  NanoContextState,
  NanoContextActions,
  NanoContextValue,
  // Selection capture types
  SelectionChangeEvent,
  UseSelectionCaptureOptions,
  UseSelectionCaptureReturn,
  // Component props
  SelectionPopoverProps,
  NanoContextPreviewProps,
  NanoContextPreviewListProps,
  NanoContextWidgetProps,
} from './nano-context';

// ─────────────────────────────────────────────────────────────────────────────
// Phase 8: System Widgets
// Components for system-level messages: compacting, model changes, entity links,
// skill activations, interruptions, task notifications, rate limits, API errors,
// unknown messages, and verification actions.
// ─────────────────────────────────────────────────────────────────────────────

export {
  CompactingWidget,
  ModelChangeWidget,
  EntityLinkWidget,
  SkillActivationWidget,
  ShellExecutionWidget,
  InterruptedWidget,
  InterruptHint,
  TaskNotificationWidget,
  RateLimitWidget,
  ApiRetryWidget,
  UnknownMessageWidget,
  ApiErrorWidget,
  VerificationActionWidget,
  TagExecutionWidget,
  TagDelegationWidget,
  TagStatusProvider,
  useTagStatusLookup,
  LinkedEntityEditProvider,
  useLinkedEntityEdit,
} from './components/system';
export type {
  CompactingWidgetProps,
  CompactingStatus,
  CompactingTrigger,
  ModelChangeWidgetProps,
  EntityLinkWidgetProps,
  SkillActivationWidgetProps,
  ShellExecutionWidgetProps,
  InterruptHintProps,
  TaskNotificationWidgetProps,
  RateLimitWidgetProps,
  ApiRetryWidgetProps,
  UnknownMessageWidgetProps,
  ApiErrorWidgetProps,
  VerificationActionWidgetProps,
  ActionExecStatus,
  TagExecutionWidgetProps,
  TagSnapshotItem,
  TagDelegationWidgetProps,
  LiveTagStatus,
  TagStatusLookup,
  LinkedEntityEditContextValue,
} from './components/system';

// ─────────────────────────────────────────────────────────────────────────────
// Phase 9: Context & Hooks
// Chat context provider with all selector hooks, scroll context,
// detachable card context, and standalone hooks for input, approvals, etc.
// ─────────────────────────────────────────────────────────────────────────────

// Chat context
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
  useChatInterruptState,
  useChatInterruptActions,
  useChatHistoryState,
  useChatLatestTodo,
} from './context/chat-context';
export type { ChatProviderProps, TodoItem, LatestTodoState } from './context/chat-context';

// Scroll context
export { ScrollProvider, useScroll, useScrollSafe } from './context/scroll-context';
export type {
  ScrollState,
  ScrollContextValue,
  ScrollProviderProps,
} from './context/scroll-context';

// File change review context
export { FileChangeReviewProvider, useFileChangeAnchor, useIsFileChangeAnchor, useFileChangeGroupToolIds, useActiveFileChangeGroupToolIds } from './context/file-change-review-context';

// Open file in editor context
export { OpenFileProvider, useOpenFile } from './context/open-file-context';

// Detachable card context
export {
  DetachableCardProvider,
  useDetachableCards,
  useDetachableCardsSafe,
} from './context/detachable-card-context';
export type {
  DetachedCard,
  DetachableCardContextValue,
  DetachableCardProviderProps,
} from './context/detachable-card-context';

// Hooks
export {
  // Accessibility
  useReducedMotion,
  // Input management
  useContentEditable,
  useCursorPosition,
  useMentionAutocomplete,
  useCommandTrigger,
  useAttachments,
  // History & persistence
  useMessageHistory,
  useDraftPersistence,
  // UX
  useRotatingPlaceholder,
  // Approval & permission state
  useAllPendingApprovals,
  usePendingToolApprovals,
  useFileChanges,
  usePendingQuestion,
  // Interrupt
  useDoubleEscapeInterrupt,
  HINT_DISPLAY_MS,
} from './hooks';
export type {
  UseContentEditableOptions,
  UseContentEditableReturn,
  UseCursorPositionOptions,
  UseCursorPositionReturn,
  UseMentionAutocompleteOptions,
  UseMentionAutocompleteReturn,
  UseCommandTriggerOptions,
  UseCommandTriggerReturn,
  UseAttachmentsOptions,
  UseAttachmentsReturn,
  UseMessageHistoryOptions,
  UseMessageHistoryReturn,
  UseDraftPersistenceOptions,
  UseDraftPersistenceReturn,
  UseRotatingPlaceholderOptions,
  UseRotatingPlaceholderReturn,
  PendingApproval,
  UseAllPendingApprovalsReturn,
  PendingChange as PendingToolChange,
  UsePendingToolApprovalsReturn,
  UseFileChangesReturn,
  PendingQuestion as PendingQuestionState,
  UsePendingQuestionReturn,
  UseDoubleEscapeInterruptOptions,
  UseDoubleEscapeInterruptReturn,
} from './hooks';

// ─────────────────────────────────────────────────────────────────────────────
// Phase 10: Store
// Zustand chat store factory and associated types.
// ─────────────────────────────────────────────────────────────────────────────

export { createChatStore } from './store/chat-store';
export type { ChatState, ChatActions, ChatStore } from './store/chat-store';

// ─────────────────────────────────────────────────────────────────────────────
// Phase 11: Primitives & Utilities
// Low-level UI primitives, diff computation, event source adapter, formatting,
// entity URI / style / metadata utilities, fuzzy search, filter parsing,
// paste markup, and content-editable DOM helpers.
// ─────────────────────────────────────────────────────────────────────────────

// Primitives
export { StatusIndicator } from './primitives';
export type { StatusIndicatorProps, StatusType } from './primitives';
export { KeyboardHint } from './primitives';
export type { KeyboardHintProps } from './primitives';
export { Portal } from './primitives';
export type { PortalProps } from './primitives';

// Adapters
export { connectEventSource } from './adapters/ipc-event-source';
export type { EventSubscription } from './adapters/ipc-event-source';

// Diff
export { computeLineDiff } from './utils/diff';
export type { DiffLine } from './utils/diff';

// Utilities
export {
  // Format
  formatDuration,
  truncateText,
  cleanCliOutput,
  // Entity URI
  parseEntityMarkup,
  parseEntityURI,
  buildEntityURI,
  buildEntityMarkup,
  containsEntityMarkup,
  encodeLabel,
  getEntityDisplayLabel,
  // Entity styles
  getEntityColors,
  getEntityIcon,
  ENTITY_TYPE_COLORS,
  ENTITY_TYPE_ICONS,
  ENTITY_CHIP_STYLES,
  ENTITY_CHIP_ICON_STYLES,
  ENTITY_CHIP_LABEL_STYLES,
  // Entity metadata cache
  setEntityTypeMetadata,
  getEntityTypeMetadata,
  setEntityTypeMetadataBatch,
  clearEntityTypeMetadataCache,
  // Fuzzy search
  createCommandSearch,
  // Filter keyword parser
  parseKeywordFilters,
  filtersToKeywords,
  mergeFilters,
  // Paste markup
  buildPasteMarkup,
  parsePasteMarkup,
  containsPasteMarkup,
  stripPasteMarkup,
  decodePasteMarkupToPlainText,
  encodePasteContent,
  decodePasteContent,
  setSessionPasteContent,
  getSessionPasteContent,
  PASTE_CHAR_THRESHOLD,
  PASTE_LINE_THRESHOLD,
  PASTE_PREVIEW_LENGTH,
  // ContentEditable DOM helpers
  getCaretCharacterOffsetWithin,
  findNodeAtOffset,
  getCharacterOffsetFromStart,
  extractTextWithEntities,
  // Token usage
  formatTokens,
  formatCost,
  computeUsageDisplay,
  DEFAULT_CONTEXT_WINDOW,
} from './utils';
export type {
  // Entity URI types
  ParsedEntityURI,
  ParsedSegment,
  TextSegment,
  EntitySegment,
  EntityDisplayMode,
  // Entity style types
  EntityColors,
  // Entity metadata types
  CachedEntityMetadata,
  // Fuzzy search types
  SearchableCommand,
  // Filter keyword parser types
  FilterDefinition,
  FilterValueDefinition,
  ActiveFilter,
  ParsedFilterQuery,
  // Paste markup types
  PasteBlob,
  ParsedPasteMarkup,
  PasteTextSegment,
  // Token usage types
  UsageDisplayValues,
} from './utils';

// ─────────────────────────────────────────────────────────────────────────────
// Phase 12: Types
// Core message types, event envelopes, scroll state, and input types
// used across the chat-ui system.
// ─────────────────────────────────────────────────────────────────────────────

export type {
  // Message types
  Message,
  MessageGroup,
  MessageRole,
  MessageStatus,
  ToolUse,
  ToolStatus,
  ToolResult,
  BackgroundTask,
  ContentBlock,
  TextBlock,
  ThinkingBlock,
  ToolUseBlock,
  SystemEventBlock,
  CodeBlock,
  ToolResultBlock,
  EntityBlock,
  NanoContextBlock,
  ImageAttachmentBlock,
  CompactBoundaryBlock,
  ModelChangeBlock,
  EntityLinkBlock,
  SkillActivationBlock,
  ShellExecutionBlock,
  InterruptedBlock,
  TaskNotificationBlock,
  RateLimitBlock,
  ApiRetryBlock,
  ApiErrorBlock,
  VerificationActionBlock,
  TagExecutionBlock,
  TagDelegationBlock,
  UnknownBlock,
  TokenUsageState,
} from './types/messages';

export type { ChatEventEnvelope } from './types/events';

export type { ChatScrollState, ScrollStateStorage, VisibleMessageInfo } from './types/scroll-state';

export type {
  Entity as InputEntity,
  Trigger,
  Attachment,
  InlinePermission,
  InputValue,
  CursorPosition,
  InputConfig,
  InputState,
} from './types/input';

// ─────────────────────────────────────────────────────────────────────────────
// Phase 13: Action Form System
// Declarative quick forms that replace the chat input. Supports text, select,
// multi-select, and confirm step types with async resolvers, step customization,
// keyboard navigation, and review screen.
// ─────────────────────────────────────────────────────────────────────────────

export {
  defineActionForm,
  ActionFormDefinitionError,
  ActionFormBar,
  useActionFormState,
} from './action-form';
export type {
  ActionFormConfig,
  ActionFormDefinition,
  ActionFormStep,
  ActionFormOption,
  TextStep,
  SelectStep,
  MultiSelectStep,
  ConfirmStep,
  ActionFormBarProps,
  ActionFormState,
  ActionFormActions,
} from './action-form';

// ─────────────────────────────────────────────────────────────────────────────
// Tokens
// Design tokens for spacing, animation springs, and transitions.
// ─────────────────────────────────────────────────────────────────────────────

export { CHAT_SPACING, SPRINGS, TRANSITIONS } from './tokens';
export type { ChatSpacingKey } from './tokens';

// ─────────────────────────────────────────────────────────────────────────────
// Theme
// Runtime light/dark mode switching with system detection.
// ─────────────────────────────────────────────────────────────────────────────

export { ThemeProvider, useTheme } from './theme';
export type { ThemeProviderProps, ThemeMode, ResolvedTheme } from './theme';
