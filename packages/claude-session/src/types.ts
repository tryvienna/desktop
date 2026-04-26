/**
 * Types for Claude Code JSONL session records and emitted events.
 *
 * JSONL record types reflect the actual format written by Claude Code CLI
 * to ~/.claude/projects/<encoded-path>/<session-id>.jsonl.
 *
 * Event payload types are the cleaned, correlated data emitted by
 * ClaudeSessionWatcher for downstream consumers (e.g., the plugin system bridge).
 *
 * All payload types are derived from Zod schemas via z.infer<>.
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// Raw JSONL content block types
// ═══════════════════════════════════════════════════════════════════════════════

export interface ToolUseContent {
  readonly type: 'tool_use';
  readonly id: string;
  readonly name: string;
  readonly input: unknown;
}

export interface TextContent {
  readonly type: 'text';
  readonly text: string;
}

export interface ThinkingContent {
  readonly type: 'thinking';
  readonly thinking: string;
}

export interface ToolResultContent {
  readonly type: 'tool_result';
  readonly tool_use_id: string;
  readonly content: string;
  readonly is_error?: boolean;
}

export type AssistantContentBlock = ToolUseContent | TextContent | ThinkingContent;

export type UserContentBlock = ToolResultContent | TextContent;

// ═══════════════════════════════════════════════════════════════════════════════
// Raw JSONL record types
// ═══════════════════════════════════════════════════════════════════════════════

export interface Usage {
  readonly input_tokens: number;
  readonly output_tokens: number;
  readonly cache_creation_input_tokens?: number;
  readonly cache_read_input_tokens?: number;
}

export interface UserRecord {
  readonly type: 'user';
  readonly uuid: string;
  readonly parentUuid: string | null;
  readonly timestamp: string;
  readonly sessionId: string;
  readonly version: string;
  readonly cwd: string;
  readonly gitBranch: string;
  readonly entrypoint: string;
  readonly userType?: string;
  readonly promptId?: string;
  readonly isSidechain?: boolean;
  readonly message: {
    readonly role: 'user';
    readonly content: string | readonly UserContentBlock[];
  };
}

export interface AssistantRecord {
  readonly type: 'assistant';
  readonly uuid: string;
  readonly parentUuid: string | null;
  readonly timestamp: string;
  readonly sessionId: string;
  readonly version: string;
  readonly cwd: string;
  readonly gitBranch: string;
  readonly entrypoint: string;
  readonly userType?: string;
  readonly model?: string;
  readonly message: {
    readonly model: string;
    readonly id: string;
    readonly role: 'assistant';
    readonly stop_reason: null | 'end_turn' | 'tool_use' | 'stop_sequence';
    readonly usage: Usage;
    readonly content: readonly AssistantContentBlock[];
  };
}

export interface PrLinkRecord {
  readonly type: 'pr-link';
  readonly sessionId: string;
  readonly prNumber?: number;
  readonly prUrl?: string;
  readonly prRepository?: string;
  readonly timestamp?: string;
}

/**
 * A parsed JSONL record. We only process user, assistant, and pr-link.
 * Other record types (queue-operation, attachment, file-history-snapshot,
 * last-prompt) are silently ignored.
 */
export type SessionRecord = UserRecord | AssistantRecord | PrLinkRecord | { readonly type: string };

// ═══════════════════════════════════════════════════════════════════════════════
// Session metadata — from ~/.claude/sessions/<pid>.json
// ═══════════════════════════════════════════════════════════════════════════════

export interface SessionMeta {
  readonly pid: number;
  readonly sessionId: string;
  readonly cwd: string;
  readonly startedAt: number;
  readonly kind: string;
  readonly entrypoint: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Event payload Zod schemas (source of truth)
//
// These schemas serve double duty:
// 1. TypeScript types derived via z.infer<>
// 2. Used by the desktop bridge to register plugin events via defineEvent()
// ═══════════════════════════════════════════════════════════════════════════════

const UsageSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheCreationInputTokens: z.number().optional(),
  cacheReadInputTokens: z.number().optional(),
});

export const SessionStartedSchema = z.object({
  sessionId: z.string(),
  projectPath: z.string(),
  cwd: z.string(),
  version: z.string(),
  gitBranch: z.string(),
  entrypoint: z.string(),
  timestamp: z.string(),
});
export type SessionStartedPayload = z.infer<typeof SessionStartedSchema>;

export const TurnStartedSchema = z.object({
  sessionId: z.string(),
  projectPath: z.string(),
  promptId: z.string(),
  cwd: z.string(),
  gitBranch: z.string(),
  /** Prompt text, truncated to 500 characters. */
  prompt: z.string(),
  timestamp: z.string(),
});
export type TurnStartedPayload = z.infer<typeof TurnStartedSchema>;

export const TurnCompletedSchema = z.object({
  sessionId: z.string(),
  projectPath: z.string(),
  model: z.string(),
  usage: UsageSchema,
  contentTypes: z.array(z.string()),
  timestamp: z.string(),
});
export type TurnCompletedPayload = z.infer<typeof TurnCompletedSchema>;

export const ToolUsedSchema = z.object({
  sessionId: z.string(),
  projectPath: z.string(),
  cwd: z.string(),
  branch: z.string().nullable(),
  model: z.string(),
  tools: z.array(z.object({
    name: z.string(),
    id: z.string(),
    input: z.unknown(),
  })),
  usage: z.object({
    inputTokens: z.number(),
    outputTokens: z.number(),
  }),
  timestamp: z.string(),
});
export type ToolUsedPayload = z.infer<typeof ToolUsedSchema>;

export const ToolResultSchema = z.object({
  sessionId: z.string(),
  projectPath: z.string(),
  cwd: z.string(),
  branch: z.string().nullable(),
  toolUseId: z.string(),
  toolName: z.string(),
  isError: z.boolean(),
  output: z.string(),
  timestamp: z.string(),
});
export type ToolResultPayload = z.infer<typeof ToolResultSchema>;

export const PlanAcceptedSchema = z.object({
  sessionId: z.string(),
  projectPath: z.string(),
  plan: z.string(),
  planFilePath: z.string(),
  planName: z.string(),
  timestamp: z.string(),
});
export type PlanAcceptedPayload = z.infer<typeof PlanAcceptedSchema>;

export const PrCreatedSchema = z.object({
  sessionId: z.string(),
  projectPath: z.string(),
  cwd: z.string(),
  branch: z.string().nullable(),
  prNumber: z.number().nullable(),
  prUrl: z.string(),
  prRepository: z.string().nullable(),
  timestamp: z.string(),
});
export type PrCreatedPayload = z.infer<typeof PrCreatedSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// Event map — maps event names to payload types
// ═══════════════════════════════════════════════════════════════════════════════

export interface SessionEventMap {
  'session.started': SessionStartedPayload;
  'turn.started': TurnStartedPayload;
  'turn.completed': TurnCompletedPayload;
  'tool.used': ToolUsedPayload;
  'tool.result': ToolResultPayload;
  'plan.accepted': PlanAcceptedPayload;
  'pr.created': PrCreatedPayload;
}

export type SessionEventName = keyof SessionEventMap;

export type Unsubscribe = () => void;

// ═══════════════════════════════════════════════════════════════════════════════
// Schema map — for registering events with defineEvent()
// ═══════════════════════════════════════════════════════════════════════════════

/** All payload schemas keyed by event name. Used by the bridge to register plugin events. */
export const SESSION_EVENT_SCHEMAS = {
  'session.started': SessionStartedSchema,
  'turn.started': TurnStartedSchema,
  'turn.completed': TurnCompletedSchema,
  'tool.used': ToolUsedSchema,
  'tool.result': ToolResultSchema,
  'plan.accepted': PlanAcceptedSchema,
  'pr.created': PrCreatedSchema,
} as const satisfies Record<SessionEventName, z.ZodType>;
