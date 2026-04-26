/**
 * AgentEvent — The Canonical Event Contract
 *
 * Every provider normalizes its output into this single discriminated union.
 * This replaces drift-v2's split between InboundMessage (15+ variants) and
 * ChatEvent (16 variants) with one unified stream.
 *
 * All types are derived from Zod schemas via z.infer<>.
 * No standalone TypeScript interfaces for data types.
 *
 * @module agent-core/events
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Building Blocks (composed into events)
// ─────────────────────────────────────────────────────────────────────────────

export const TokenUsageSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheReadTokens: z.number(),
  cacheCreationTokens: z.number(),
  totalCostUsd: z.number().nullable(),
});
export type TokenUsage = z.infer<typeof TokenUsageSchema>;

export const ToolCallSchema = z.object({
  id: z.string(),
  name: z.string(),
  input: z.record(z.unknown()),
});
export type ToolCall = z.infer<typeof ToolCallSchema>;

export const ToolResultImageSchema = z.object({
  url: z.string(),
});

export const ToolResultSchema = z.object({
  success: z.boolean(),
  output: z.string().optional(),
  error: z.string().optional(),
  images: z.array(ToolResultImageSchema).optional(),
});
export type ToolResult = z.infer<typeof ToolResultSchema>;

export const ApprovalMethodSchema = z.enum([
  'manual',
  'session_rule',
  'persistent_rule',
  'trusted_tool',
  'auto_policy',
]);
export type ApprovalMethod = z.infer<typeof ApprovalMethodSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Provider Events (emitted by normalizers)
// ─────────────────────────────────────────────────────────────────────────────

export const SessionInitEventSchema = z.object({
  type: z.literal('session_init'),
  sessionId: z.string(),
  provider: z.string(),
  model: z.string(),
  tools: z.array(z.string()),
  cwd: z.string(),
});

export const TurnStartEventSchema = z.object({
  type: z.literal('turn_start'),
  messageId: z.string(),
  timestamp: z.number(),
  /** JSONL uuid from the Claude Code session file (for fork-at-message) */
  providerUuid: z.string().optional(),
});

export const TurnEndEventSchema = z.object({
  type: z.literal('turn_end'),
  messageId: z.string(),
  durationMs: z.number(),
  usage: TokenUsageSchema,
  /** Last API call's input breakdown — enables accurate context display after replay */
  lastTurnContext: z
    .object({
      inputTokens: z.number(),
      cacheReadTokens: z.number(),
      cacheCreationTokens: z.number(),
    })
    .optional(),
  /** Model's maximum context window size */
  contextWindow: z.number().optional(),
});

export const TextDeltaEventSchema = z.object({
  type: z.literal('text_delta'),
  messageId: z.string(),
  text: z.string(),
});

export const TextDoneEventSchema = z.object({
  type: z.literal('text_done'),
  messageId: z.string(),
  fullText: z.string(),
});

export const ThinkingStartEventSchema = z.object({
  type: z.literal('thinking_start'),
  messageId: z.string(),
});

export const ThinkingDeltaEventSchema = z.object({
  type: z.literal('thinking_delta'),
  messageId: z.string(),
  text: z.string(),
});

export const ThinkingDoneEventSchema = z.object({
  type: z.literal('thinking_done'),
  messageId: z.string(),
});

export const ToolStartEventSchema = z.object({
  type: z.literal('tool_start'),
  messageId: z.string(),
  tool: ToolCallSchema,
});

export const ToolInputDeltaEventSchema = z.object({
  type: z.literal('tool_input_delta'),
  messageId: z.string(),
  toolId: z.string(),
  partialJson: z.string(),
});

export const ToolPermissionNeededEventSchema = z.object({
  type: z.literal('tool_permission_needed'),
  messageId: z.string(),
  toolId: z.string(),
  requestId: z.string(),
  toolName: z.string(),
  input: z.record(z.unknown()),
});

export const ToolRunningEventSchema = z.object({
  type: z.literal('tool_running'),
  messageId: z.string(),
  toolId: z.string(),
  approvalMethod: ApprovalMethodSchema.optional(),
});

export const ToolResultEventSchema = z.object({
  type: z.literal('tool_result'),
  messageId: z.string(),
  toolId: z.string(),
  result: ToolResultSchema,
});

export const UsageUpdateEventSchema = z.object({
  type: z.literal('usage_update'),
  /** Current API call's input tokens (context window utilization) */
  inputTokens: z.number(),
  /** Current API call's cache read tokens */
  cacheReadTokens: z.number(),
  /** Current API call's cache creation tokens */
  cacheCreationTokens: z.number(),
  /** Cumulative output tokens for this interaction */
  outputTokens: z.number(),
  /** Model's maximum context window size (when known) */
  contextWindow: z.number().optional(),
});

export const ErrorEventSchema = z.object({
  type: z.literal('error'),
  messageId: z.string().optional(),
  code: z.string(),
  message: z.string(),
  retryable: z.boolean(),
  timestamp: z.number().optional(),
});

export const RateLimitedEventSchema = z.object({
  type: z.literal('rate_limited'),
  limitType: z.string(),
  resetsAt: z.number(),
  isUsingOverage: z.boolean().optional(),
  timestamp: z.number().optional(),
});

export const ApiRetryEventSchema = z.object({
  type: z.literal('api_retry'),
  attempt: z.number(),
  maxRetries: z.number(),
  retryDelayMs: z.number(),
  errorStatus: z.number(),
  error: z.string(),
  timestamp: z.number().optional(),
});

export const ProviderEventSchema = z.object({
  type: z.literal('provider_event'),
  provider: z.string(),
  eventType: z.string(),
  data: z.unknown(),
  timestamp: z.number().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// App-Injected Events (emitted by SessionManager, not providers)
//
// These are first-class events: persisted to SQLite, replayed identically,
// and rendered as system messages in the chat UI. They flow through the
// exact same pipeline as provider events — no special code paths.
// ─────────────────────────────────────────────────────────────────────────────

export const ModelChangeEventSchema = z.object({
  type: z.literal('model_change'),
  fromModel: z.string(),
  toModel: z.string(),
  timestamp: z.number().optional(),
});

export const EntityLinkEventSchema = z.object({
  type: z.literal('entity_link'),
  action: z.enum(['linked', 'unlinked']),
  entityUri: z.string(),
  entityType: z.string(),
  entityTitle: z.string(),
  timestamp: z.number().optional(),
});

export const SkillActivationEventSchema = z.object({
  type: z.literal('skill_activation'),
  skills: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      trigger: z.string().optional(),
      body: z.string().optional(),
    })
  ),
  timestamp: z.number().optional(),
});

export const InterruptedEventSchema = z.object({
  type: z.literal('interrupted'),
  timestamp: z.number(),
});

export const CompactBoundaryEventSchema = z.object({
  type: z.literal('compact_boundary'),
  trigger: z.enum(['manual', 'auto']),
  preTokens: z.number(),
  status: z.enum(['compacting', 'complete']).optional(),
  timestamp: z.number().optional(),
});

export const TaskNotificationEventSchema = z.object({
  type: z.literal('task_notification'),
  taskId: z.string(),
  status: z.enum(['completed', 'failed', 'stopped']),
  timestamp: z.number().optional(),
  summary: z.string(),
});

export const TagExecutionEventSchema = z.object({
  type: z.literal('tag_execution'),
  tagName: z.string(),
  color: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'skipped']),
  instructions: z.string(),
  workstreamId: z.string(),
  /** Snapshot of all tags on the workstream at time of event */
  snapshot: z.array(z.object({
    tagName: z.string(),
    color: z.string(),
    status: z.string(),
    waitingOn: z.array(z.string()).optional(),
    delegatedWorkstreamId: z.string().optional(),
    delegatedWorkstreamTitle: z.string().optional(),
  })),
  timestamp: z.number().optional(),
});

export const TagDelegationEventSchema = z.object({
  type: z.literal('tag_delegation'),
  tagName: z.string(),
  color: z.string(),
  delegatedWorkstreamId: z.string(),
  delegatedWorkstreamTitle: z.string(),
  timestamp: z.number().optional(),
});

export const ConversationClearedEventSchema = z.object({
  type: z.literal('conversation_cleared'),
});

export const CheckpointEventSchema = z.object({
  type: z.literal('checkpoint'),
  /** CLI's checkpoint UUID — used for `--rewind-files` */
  checkpointId: z.string(),
  /** The assistant message this checkpoint is associated with */
  messageId: z.string(),
  /** The CLI session ID at time of creation (NOT the current session — checkpoint
   *  UUIDs are only valid with the session that created them) */
  providerSessionId: z.string(),
  timestamp: z.number(),
});

export const RewindContextEventSchema = z.object({
  type: z.literal('rewind_context'),
  /** Pre-rewind conversation transcript, injected as appendSystemPrompt on next session */
  transcript: z.string(),
  timestamp: z.number(),
});

export const ImageAttachmentMetaSchema = z.object({
  name: z.string(),
  mimeType: z.string(),
  size: z.number(),
  previewUrl: z.string(),
});
export type ImageAttachmentMeta = z.infer<typeof ImageAttachmentMetaSchema>;

export const UserMessageEventSchema = z.object({
  type: z.literal('user_message'),
  messageId: z.string(),
  text: z.string(),
  timestamp: z.number(),
  imageAttachments: z.array(ImageAttachmentMetaSchema).optional(),
});

export const UserMessageAckEventSchema = z.object({
  type: z.literal('user_message_ack'),
  /** JSONL uuid from the Claude Code session file (for fork-at-message) */
  providerUuid: z.string(),
  timestamp: z.number(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Discriminated Union (THE contract)
// ─────────────────────────────────────────────────────────────────────────────

export const AgentEventSchema = z.discriminatedUnion('type', [
  // Provider events (emitted by normalizer)
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
  UsageUpdateEventSchema,
  ErrorEventSchema,
  RateLimitedEventSchema,
  ApiRetryEventSchema,
  ProviderEventSchema,
  CheckpointEventSchema,
  // App-injected events (emitted by SessionManager)
  ModelChangeEventSchema,
  EntityLinkEventSchema,
  SkillActivationEventSchema,
  InterruptedEventSchema,
  CompactBoundaryEventSchema,
  TaskNotificationEventSchema,
  TagExecutionEventSchema,
  TagDelegationEventSchema,
  ConversationClearedEventSchema,
  UserMessageEventSchema,
  UserMessageAckEventSchema,
  RewindContextEventSchema,
]);
export type AgentEvent = z.infer<typeof AgentEventSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Event Type Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** All possible event type discriminators */
export type AgentEventType = AgentEvent['type'];

/** Extract a specific event variant by its type discriminator */
export type AgentEventOf<T extends AgentEventType> = Extract<AgentEvent, { type: T }>;

/** Event types that originate from AI providers */
export const PROVIDER_EVENT_TYPES = [
  'session_init',
  'turn_start',
  'turn_end',
  'text_delta',
  'text_done',
  'thinking_start',
  'thinking_delta',
  'thinking_done',
  'tool_start',
  'tool_input_delta',
  'tool_permission_needed',
  'tool_running',
  'tool_result',
  'usage_update',
  'error',
  'rate_limited',
  'api_retry',
  'provider_event',
  'checkpoint',
] as const satisfies readonly AgentEventType[];

/** Event types injected by the app (SessionManager) */
export const APP_INJECTED_EVENT_TYPES = [
  'model_change',
  'entity_link',
  'skill_activation',
  'interrupted',
  'compact_boundary',
  'task_notification',
  'tag_execution',
  'tag_delegation',
  'conversation_cleared',
  'user_message',
  'user_message_ack',
  'rewind_context',
] as const satisfies readonly AgentEventType[];
