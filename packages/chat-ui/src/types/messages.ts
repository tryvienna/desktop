/**
 * Chat message types — renderer-side data structures
 *
 * These are the types used by the Zustand store and React components.
 * They are mapped from AgentEvents by the store's processEvent method.
 *
 * @module chat-ui/types/messages
 */

// ─────────────────────────────────────────────────────────────────────────────
// Content Blocks
// ─────────────────────────────────────────────────────────────────────────────

export interface TextBlock {
  type: 'text';
  text: string;
}

export interface ThinkingBlock {
  type: 'thinking';
  text: string;
}

export interface ToolUseBlock {
  type: 'tool_use';
  toolUseId: string;
}

export interface SystemEventBlock {
  type: 'system_event';
  eventType: string;
  data: unknown;
}

/** Fenced code block with optional language. */
export interface CodeBlock {
  type: 'code';
  language: string;
  code: string;
  filename?: string;
}

/** Tool result block, paired with a preceding ToolUseBlock by toolId. */
export interface ToolResultBlock {
  type: 'tool_result';
  toolId: string;
  result: ToolResult;
}

/** Inline entity reference rendered as a chip or card. */
export interface EntityBlock {
  type: 'entity';
  uri: string;
  display?: 'chip' | 'card';
}

/** NanoContext block providing ambient context. */
export interface NanoContextBlock {
  type: 'nanocontext';
  contextType: string;
  title: string;
  subtitle?: string;
  content: string;
  metadata: Record<string, unknown>;
}

/** Image attachment with preview thumbnail. */
export interface ImageAttachmentBlock {
  type: 'image_attachment';
  name: string;
  mimeType: string;
  size: number;
  previewUrl: string;
}

/** Context compaction boundary. */
export interface CompactBoundaryBlock {
  type: 'compact_boundary';
  trigger: 'manual' | 'auto';
  preTokens: number;
  sessionId?: string;
  status?: 'compacting' | 'complete';
}

/** Model switch mid-conversation. */
export interface ModelChangeBlock {
  type: 'model_change';
  fromModel: string;
  toModel: string;
}

/** Entity link/unlink event. */
export interface EntityLinkBlock {
  type: 'entity_link';
  action: 'linked' | 'unlinked';
  entityUri: string;
  entityType: string;
  entityTitle: string;
}

/** Skill activation event. */
export interface SkillActivationBlock {
  type: 'skill_activation';
  skills: Array<{ id: string; name: string; trigger?: string; body?: string }>;
}

/** Shell command execution result (bash mode). */
export interface ShellExecutionBlock {
  type: 'shell_execution';
  command: string;
  cwd: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
}

/** Interrupted response marker. */
export interface InterruptedBlock {
  type: 'interrupted';
  timestamp: number;
}

/** Background task notification. */
export interface TaskNotificationBlock {
  type: 'task_notification';
  taskId: string;
  status: 'completed' | 'failed' | 'stopped';
  summary: string;
}

/** Rate limit notification. */
export interface RateLimitBlock {
  type: 'rate_limit';
  rateLimitType: string;
  resetsAt: number;
  isUsingOverage?: boolean;
}

/** API retry status (transient, updates in-place). */
export interface ApiRetryBlock {
  type: 'api_retry';
  attempt: number;
  maxRetries: number;
  retryDelayMs: number;
  errorStatus: number;
  error: string;
}

/** API error content block. */
export interface ApiErrorBlock {
  type: 'api_error';
  statusCode?: number;
  errorType?: string;
  errorMessage: string;
  requestId?: string;
  rawText: string;
}

/** Verification action block. */
export interface VerificationActionBlock {
  type: 'verification_action';
  actionId: string;
  actionLabel: string;
  actionType: 'builtin' | 'prompt';
  prompt?: string;
}

/** Tag execution event — shows tag being executed with status and expandable instructions. */
export interface TagExecutionBlock {
  type: 'tag_execution';
  tagName: string;
  color: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  instructions: string;
  workstreamId: string;
  snapshot: Array<{
    tagName: string;
    color: string;
    status: string;
    dependsOn?: string[];
    waitingOn?: string[];
    delegatedWorkstreamId?: string;
    delegatedWorkstreamTitle?: string;
  }>;
}

/** Tag delegation event — shows that a tag was delegated to a new workstream. */
export interface TagDelegationBlock {
  type: 'tag_delegation';
  tagName: string;
  color: string;
  delegatedWorkstreamId: string;
  delegatedWorkstreamTitle: string;
}

/** Catch-all for unrecognized content blocks. */
export interface UnknownBlock {
  type: 'unknown';
  rawPayload: unknown;
  rawPayloadTruncated?: boolean;
  parseErrors: Array<{ code: string; message: string; path: Array<string | number> }>;
  originalType?: string;
  timestamp: number;
}

export type ContentBlock =
  | TextBlock
  | ThinkingBlock
  | ToolUseBlock
  | SystemEventBlock
  | CodeBlock
  | ToolResultBlock
  | EntityBlock
  | NanoContextBlock
  | ImageAttachmentBlock
  | CompactBoundaryBlock
  | ModelChangeBlock
  | EntityLinkBlock
  | SkillActivationBlock
  | ShellExecutionBlock
  | InterruptedBlock
  | TaskNotificationBlock
  | RateLimitBlock
  | ApiRetryBlock
  | ApiErrorBlock
  | VerificationActionBlock
  | TagExecutionBlock
  | TagDelegationBlock
  | UnknownBlock;

// ─────────────────────────────────────────────────────────────────────────────
// Tool Use
// ─────────────────────────────────────────────────────────────────────────────

export type ToolStatus = 'pending' | 'pending_permission' | 'running' | 'complete' | 'error';

export interface ToolResult {
  output?: string;
  error?: string;
  success: boolean;
  durationMs?: number;
  images?: Array<{ url: string }>;
}

export interface BackgroundTask {
  taskId: string;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  summary?: string;
}

export interface ToolUse {
  id: string;
  name: string;
  input: Record<string, unknown>;
  result?: ToolResult;
  status: ToolStatus;
  requestId?: string;
  isStreaming?: boolean;
  approvalMethod?: string;
  backgroundTask?: BackgroundTask;
}

// ─────────────────────────────────────────────────────────────────────────────
// Message
// ─────────────────────────────────────────────────────────────────────────────

export type MessageStatus = 'pending' | 'streaming' | 'complete' | 'error' | 'interrupted';
export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: ContentBlock[];
  timestamp: number;
  status: MessageStatus;
  isStreaming: boolean;
  isThinking: boolean;
  toolUses: ToolUse[];
  isFromHistory?: boolean;
  error?: string;
  /** JSONL uuid from the Claude Code session file (enables fork-at-message) */
  providerUuid?: string;
  /** Internal: decoded plain text used for optimistic message deduplication. Only set on client-generated optimistic messages. */
  _matchText?: string;
  /** DB event ID from the events table — set on history replay for user messages. Used by rewind UI. */
  dbEventId?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Message Group (consecutive messages from same role)
// ─────────────────────────────────────────────────────────────────────────────

export interface MessageGroup {
  id: string;
  role: MessageRole;
  messageIds: string[];
  timestamp: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Token Usage
// ─────────────────────────────────────────────────────────────────────────────

export interface TokenUsageState {
  /** Latest API call's input tokens (= current context window utilization).
   *  Represents what the model is "seeing" right now — drops after compaction. */
  currentInputTokens: number;
  /** Latest API call's cache read tokens */
  currentCacheReadTokens: number;
  /** Latest API call's cache creation tokens */
  currentCacheCreationTokens: number;
  /** Accumulated output tokens across all interactions in this session */
  outputTokens: number;
  /** Accumulated cost in USD across all interactions */
  costUsd: number | null;
  /** Model's maximum context window size (e.g. 200000 for Claude) */
  contextWindow: number | null;
}
