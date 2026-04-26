/**
 * @vienna/agent-core — Provider-agnostic agent types and schemas.
 *
 * All types are derived from Zod schemas via z.infer<>.
 * No standalone TypeScript interfaces for data types.
 *
 * @module agent-core
 */

// ── Events (the canonical contract) ──────────────────────────────────────────
export {
  // Building blocks
  TokenUsageSchema,
  ToolCallSchema,
  ToolResultSchema,
  ApprovalMethodSchema,
  // Provider events
  SessionInitEventSchema,
  TurnStartEventSchema,
  TurnEndEventSchema,
  TextDeltaEventSchema,
  TextDoneEventSchema,
  ThinkingStartEventSchema,
  ThinkingDeltaEventSchema,
  ThinkingDoneEventSchema,
  ToolStartEventSchema,
  ToolInputDeltaEventSchema,
  ToolPermissionNeededEventSchema,
  ToolRunningEventSchema,
  ToolResultEventSchema,
  ErrorEventSchema,
  RateLimitedEventSchema,
  ApiRetryEventSchema,
  ProviderEventSchema,
  // App-injected events
  ModelChangeEventSchema,
  EntityLinkEventSchema,
  SkillActivationEventSchema,
  InterruptedEventSchema,
  CompactBoundaryEventSchema,
  TaskNotificationEventSchema,
  ImageAttachmentMetaSchema,
  CheckpointEventSchema,
  RewindContextEventSchema,
  // The discriminated union
  AgentEventSchema,
  // Helpers
  PROVIDER_EVENT_TYPES,
  APP_INJECTED_EVENT_TYPES,
} from './events';

export type {
  TokenUsage,
  ToolCall,
  ToolResult,
  ApprovalMethod,
  AgentEvent,
  AgentEventType,
  AgentEventOf,
  ImageAttachmentMeta,
} from './events';

// ── Messages ─────────────────────────────────────────────────────────────────
export {
  TextContentBlockSchema,
  ImageContentBlockSchema,
  ContentBlockSchema,
  UserMessageSchema,
  MCPServerConfigSchema,
} from './messages';

export type {
  TextContentBlock,
  ImageContentBlock,
  ContentBlock,
  UserMessage,
  MCPServerConfig,
} from './messages';

// ── Provider ─────────────────────────────────────────────────────────────────
export {
  ProviderStateSchema,
  SessionConfigSchema,
  PermissionResponseSchema,
  ProviderInfoSchema,
  AvailabilityResultSchema,
} from './provider';

export type {
  ProviderState,
  SessionConfig,
  PermissionResponse,
  ProviderInfo,
  AvailabilityResult,
  AgentProvider,
} from './provider';

// ── Permissions ──────────────────────────────────────────────────────────────
export {
  PermissionBehaviorSchema,
  PermissionScopeSchema,
  PermissionRuleSchema,
  PermissionCheckRequestSchema,
  PermissionCheckResultSchema,
} from './permissions';

export type {
  PermissionBehavior,
  PermissionScope,
  PermissionRule,
  PermissionCheckRequest,
  PermissionCheckResult,
} from './permissions';

// ── Session ──────────────────────────────────────────────────────────────────
export {
  SessionStatusSchema,
  SessionRecordSchema,
  EventRecordSchema,
  SessionDirectorySchema,
} from './session';

export type { SessionStatus, SessionRecord, EventRecord, SessionDirectory } from './session';
