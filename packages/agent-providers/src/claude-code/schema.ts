/**
 * Claude Code CLI Stream-JSON Protocol Schema
 *
 * Zod schemas for validating NDJSON messages from the Claude Code CLI.
 * These represent the actual message formats emitted by Claude Code
 * in stream-json mode.
 *
 * Protocol: Newline-delimited JSON (NDJSON)
 * CLI flags: --print --verbose --output-format=stream-json --input-format=stream-json
 *
 * @module agent-providers/claude-code/schema
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Common Types
// ─────────────────────────────────────────────────────────────────────────────

export const UsageSchema = z
  .object({
    input_tokens: z.number(),
    output_tokens: z.number(),
    cache_creation_input_tokens: z.number().optional(),
    cache_read_input_tokens: z.number().optional(),
    service_tier: z.string().nullish(),
  })
  .passthrough();
export type Usage = z.infer<typeof UsageSchema>;

export const ModelUsageSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheReadInputTokens: z.number(),
  cacheCreationInputTokens: z.number(),
  webSearchRequests: z.number(),
  costUSD: z.number(),
  contextWindow: z.number(),
});
export type ModelUsage = z.infer<typeof ModelUsageSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Content Blocks (inbound)
// ─────────────────────────────────────────────────────────────────────────────

export const TextBlockSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
});

export const ToolUseBlockSchema = z.object({
  type: z.literal('tool_use'),
  id: z.string(),
  name: z.string(),
  input: z.record(z.unknown()),
});

export const ToolReferenceBlockSchema = z.object({
  type: z.literal('tool_reference'),
  tool_name: z.string(),
});

export const ToolResultImageBlockSchema = z.object({
  type: z.literal('image'),
  source: z.object({
    type: z.literal('base64'),
    media_type: z.string(),
    data: z.string(),
  }),
});

export const ToolResultBlockSchema = z.object({
  type: z.literal('tool_result'),
  tool_use_id: z.string(),
  content: z.union([
    z.string(),
    z.array(
      z.union([
        z.object({ type: z.literal('text'), text: z.string() }),
        ToolReferenceBlockSchema,
        ToolResultImageBlockSchema,
      ]),
    ),
  ]),
  is_error: z.boolean().optional(),
});

export const ThinkingBlockSchema = z.object({
  type: z.literal('thinking'),
  thinking: z.string(),
  signature: z.string().optional(),
});

export const ContentBlockSchema = z.discriminatedUnion('type', [
  TextBlockSchema,
  ToolUseBlockSchema,
  ToolResultBlockSchema,
  ThinkingBlockSchema,
]);
export type ContentBlock = z.infer<typeof ContentBlockSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Stream Events (--include-partial-messages)
// ─────────────────────────────────────────────────────────────────────────────

const MessageStartEventSchema = z.object({
  type: z.literal('message_start'),
  message: z.object({
    model: z.string(),
    id: z.string(),
    type: z.literal('message'),
    role: z.literal('assistant'),
    content: z.array(ContentBlockSchema),
    stop_reason: z.string().nullable(),
    stop_sequence: z.string().nullable(),
    usage: UsageSchema,
  }),
});

const ContentBlockStartEventSchema = z.object({
  type: z.literal('content_block_start'),
  index: z.number(),
  content_block: z.union([
    z.object({ type: z.literal('text'), text: z.string() }),
    z.object({
      type: z.literal('tool_use'),
      id: z.string(),
      name: z.string(),
      input: z.record(z.unknown()).optional(),
    }),
    z.object({ type: z.literal('thinking'), thinking: z.string() }),
    z.object({ type: z.literal('redacted_thinking'), data: z.string() }),
  ]),
});

const ContentBlockDeltaEventSchema = z.object({
  type: z.literal('content_block_delta'),
  index: z.number(),
  delta: z.union([
    z.object({ type: z.literal('text_delta'), text: z.string() }),
    z.object({ type: z.literal('input_json_delta'), partial_json: z.string() }),
    z.object({ type: z.literal('thinking_delta'), thinking: z.string() }),
    z.object({ type: z.literal('signature_delta'), signature: z.string() }),
  ]),
});

const ContentBlockStopEventSchema = z.object({
  type: z.literal('content_block_stop'),
  index: z.number(),
});

const MessageDeltaEventSchema = z.object({
  type: z.literal('message_delta'),
  delta: z.object({
    stop_reason: z.string(),
    stop_sequence: z.string().nullable(),
  }),
  usage: UsageSchema.partial(),
});

const MessageStopEventSchema = z.object({
  type: z.literal('message_stop'),
});

export const RawStreamEventSchema = z.discriminatedUnion('type', [
  MessageStartEventSchema,
  ContentBlockStartEventSchema,
  ContentBlockDeltaEventSchema,
  ContentBlockStopEventSchema,
  MessageDeltaEventSchema,
  MessageStopEventSchema,
]);
export type RawStreamEvent = z.infer<typeof RawStreamEventSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Permission System
// ─────────────────────────────────────────────────────────────────────────────

export const ControlRequestPayloadSchema = z.object({
  subtype: z.literal('can_use_tool'),
  tool_name: z.string(),
  input: z.record(z.unknown()),
  permission_suggestions: z
    .array(
      z.object({
        type: z.string(),
        mode: z.string().optional(),
        destination: z.string().optional(),
        directories: z.array(z.string()).optional(),
        rules: z
          .array(z.object({ toolName: z.string(), ruleContent: z.string().optional() }))
          .optional(),
        behavior: z.string().optional(),
      })
    )
    .optional(),
  decision_reason: z.string().optional(),
  blocked_path: z.string().optional(),
  tool_use_id: z.string(),
  agent_id: z.string().optional(),
});
export type ControlRequestPayload = z.infer<typeof ControlRequestPayloadSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Inbound Message Types (Claude CLI → App)
// ─────────────────────────────────────────────────────────────────────────────

// System messages (discriminated by subtype)
const SystemInitSchema = z.object({
  type: z.literal('system'),
  subtype: z.literal('init'),
  uuid: z.string(),
  session_id: z.string(),
  cwd: z.string(),
  tools: z.array(z.string()),
  mcp_servers: z.array(z.unknown()).optional(),
  model: z.string(),
  permissionMode: z.string().optional(),
  apiKeySource: z.string().optional(),
});

const SystemCompactBoundarySchema = z.object({
  type: z.literal('system'),
  subtype: z.literal('compact_boundary'),
  uuid: z.string(),
  session_id: z.string(),
  compact_metadata: z.object({
    trigger: z.enum(['manual', 'auto']),
    pre_tokens: z.number(),
  }),
});

const SystemModelChangeSchema = z.object({
  type: z.literal('system'),
  subtype: z.literal('model_change'),
  uuid: z.string(),
  session_id: z.string(),
  from_model: z.string(),
  to_model: z.string(),
});

const SystemEntityLinkSchema = z.object({
  type: z.literal('system'),
  subtype: z.literal('entity_link'),
  uuid: z.string(),
  session_id: z.string(),
  action: z.enum(['linked', 'unlinked']),
  entity_uri: z.string(),
  entity_type: z.string(),
  entity_title: z.string(),
});

const SystemSkillActivationSchema = z.object({
  type: z.literal('system'),
  subtype: z.literal('skill_activation'),
  uuid: z.string(),
  session_id: z.string(),
  skills: z.array(z.object({ id: z.string(), name: z.string(), trigger: z.string().optional() })),
});

const SystemInterruptedSchema = z.object({
  type: z.literal('system'),
  subtype: z.literal('interrupted'),
  uuid: z.string(),
  session_id: z.string(),
  timestamp: z.number(),
});

const SystemTaskNotificationSchema = z.object({
  type: z.literal('system'),
  subtype: z.literal('task_notification'),
  task_id: z.string(),
  status: z.enum(['completed', 'failed', 'stopped']),
  summary: z.string(),
  session_id: z.string().optional(),
  uuid: z.string().optional(),
}).passthrough();

const SystemStatusSchema = z.object({
  type: z.literal('system'),
  subtype: z.literal('status'),
  uuid: z.string(),
  session_id: z.string(),
  status: z.string().nullable(),
});

const SystemTaskStartedSchema = z.object({
  type: z.literal('system'),
  subtype: z.literal('task_started'),
  task_id: z.string(),
  description: z.string().optional(),
  task_type: z.string().optional(),
  session_id: z.string().optional(),
  uuid: z.string().optional(),
});

const SystemTaskProgressSchema = z.object({
  type: z.literal('system'),
  subtype: z.literal('task_progress'),
  task_id: z.string(),
  tool_use_id: z.string().optional(),
  description: z.string().optional(),
  usage: z
    .object({
      total_tokens: z.number(),
      tool_uses: z.number(),
      duration_ms: z.number(),
    })
    .passthrough()
    .optional(),
  last_tool_name: z.string().optional(),
  session_id: z.string().optional(),
  uuid: z.string().optional(),
});

const SystemApiRetrySchema = z.object({
  type: z.literal('system'),
  subtype: z.literal('api_retry'),
  uuid: z.string(),
  session_id: z.string(),
  attempt: z.number(),
  max_retries: z.number(),
  retry_delay_ms: z.number(),
  error_status: z.number(),
  error: z.string(),
});

// Hook lifecycle events — emitted when Claude Code hooks (e.g. peon-ping) fire.
// Uses .passthrough() because hook payloads may gain new fields as the CLI
// evolves and we suppress these events entirely (never read the extra fields).
const SystemHookStartedSchema = z
  .object({
    type: z.literal('system'),
    subtype: z.literal('hook_started'),
    hook_id: z.string(),
    hook_name: z.string(),
    hook_event: z.string(),
    session_id: z.string().optional(),
    uuid: z.string().optional(),
  })
  .passthrough();

const SystemHookResponseSchema = z
  .object({
    type: z.literal('system'),
    subtype: z.literal('hook_response'),
    hook_id: z.string(),
    hook_name: z.string(),
    hook_event: z.string(),
    output: z.string().optional(),
    stdout: z.string().optional(),
    stderr: z.string().optional(),
    exit_code: z.number().optional(),
    outcome: z.string().optional(),
    session_id: z.string().optional(),
    uuid: z.string().optional(),
  })
  .passthrough();

// System message union (not using discriminatedUnion since all share type: 'system')
export const SystemMessageSchema = z.union([
  SystemInitSchema,
  SystemCompactBoundarySchema,
  SystemModelChangeSchema,
  SystemEntityLinkSchema,
  SystemSkillActivationSchema,
  SystemInterruptedSchema,
  SystemTaskNotificationSchema,
  SystemStatusSchema,
  SystemTaskStartedSchema,
  SystemTaskProgressSchema,
  SystemApiRetrySchema,
  SystemHookStartedSchema,
  SystemHookResponseSchema,
]);
export type SystemMessage = z.infer<typeof SystemMessageSchema>;

// Assistant message
export const AssistantMessageSchema = z.object({
  type: z.literal('assistant'),
  uuid: z.string(),
  session_id: z.string(),
  parent_tool_use_id: z.string().nullable().optional(),
  message: z.object({
    model: z.string(),
    id: z.string(),
    type: z.literal('message'),
    role: z.literal('assistant'),
    content: z.array(ContentBlockSchema),
    stop_reason: z.string().nullable(),
    stop_sequence: z.string().nullable(),
    usage: UsageSchema,
    context_management: z.unknown().nullable().optional(),
  }),
});
export type AssistantMessage = z.infer<typeof AssistantMessageSchema>;

// User message (echoed back)
export const UserMessageInboundSchema = z.object({
  type: z.literal('user'),
  uuid: z.string(),
  session_id: z.string(),
  parent_tool_use_id: z.string().nullable().optional(),
  message: z.object({
    id: z.string().optional(),
    role: z.literal('user'),
    content: z.union([z.string(), z.array(z.union([TextBlockSchema, ToolResultBlockSchema]))]),
  }),
});
export type UserMessageInbound = z.infer<typeof UserMessageInboundSchema>;

// Control request (permission prompt)
export const ControlRequestMessageSchema = z.object({
  type: z.literal('control_request'),
  request_id: z.string(),
  request: ControlRequestPayloadSchema,
});
export type ControlRequestMessage = z.infer<typeof ControlRequestMessageSchema>;

// Stream event wrapper
export const StreamEventMessageSchema = z.object({
  type: z.literal('stream_event'),
  uuid: z.string(),
  session_id: z.string(),
  parent_tool_use_id: z.string().nullable().optional(),
  event: RawStreamEventSchema,
});
export type StreamEventMessage = z.infer<typeof StreamEventMessageSchema>;

// Rate limit event
const RateLimitInfoSchema = z
  .object({
    status: z.string(),
    resetsAt: z.number().optional(),
    rateLimitType: z.string().optional(),
    isUsingOverage: z.boolean().optional(),
  })
  .passthrough();

export const RateLimitEventSchema = z.object({
  type: z.literal('rate_limit_event'),
  rate_limit_info: RateLimitInfoSchema,
  uuid: z.string().optional(),
  session_id: z.string().optional(),
});
export type RateLimitEvent = z.infer<typeof RateLimitEventSchema>;

// Result messages
export const SuccessResultSchema = z.object({
  type: z.literal('result'),
  subtype: z.literal('success'),
  uuid: z.string(),
  session_id: z.string(),
  is_error: z.boolean(),
  duration_ms: z.number(),
  duration_api_ms: z.number(),
  num_turns: z.number(),
  result: z.string(),
  total_cost_usd: z.number(),
  usage: UsageSchema.extend({ server_tool_use: z.unknown().optional() }),
  modelUsage: z.record(z.string(), ModelUsageSchema),
  permission_denials: z.array(z.unknown()).optional(),
});
export type SuccessResult = z.infer<typeof SuccessResultSchema>;

export const ErrorResultSchema = z.object({
  type: z.literal('result'),
  subtype: z.enum([
    'error_max_turns',
    'error_during_execution',
    'error_max_budget_usd',
    'error_max_structured_output_retries',
  ]),
  uuid: z.string(),
  session_id: z.string(),
  is_error: z.boolean(),
  duration_ms: z.number(),
  duration_api_ms: z.number(),
  num_turns: z.number(),
  total_cost_usd: z.number(),
  usage: UsageSchema.extend({ server_tool_use: z.unknown().optional() }),
  modelUsage: z.record(z.string(), ModelUsageSchema),
  permission_denials: z.array(z.unknown()).optional(),
  errors: z.array(z.string()),
});
export type ErrorResult = z.infer<typeof ErrorResultSchema>;

export const ResultMessageSchema = z.union([SuccessResultSchema, ErrorResultSchema]);
export type ResultMessage = z.infer<typeof ResultMessageSchema>;

// Keep-alive
export const KeepAliveSchema = z.object({
  type: z.literal('keep_alive'),
  uuid: z.string().optional(),
  session_id: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Inbound Message Union (THE inbound contract)
// ─────────────────────────────────────────────────────────────────────────────

// Claude Code echoes control_response messages back on stdout.
// We include the schema here so Zod validation passes; mapMessage ignores them.
export const ControlResponseEchoSchema = z.object({
  type: z.literal('control_response'),
  request_id: z.string(),
  response: z.unknown(),
});

export const InboundMessageSchema = z.union([
  SystemMessageSchema,
  AssistantMessageSchema,
  UserMessageInboundSchema,
  ControlRequestMessageSchema,
  StreamEventMessageSchema,
  RateLimitEventSchema,
  ResultMessageSchema,
  KeepAliveSchema,
  ControlResponseEchoSchema,
]);
export type InboundMessage = z.infer<typeof InboundMessageSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Outbound Messages (App → Claude CLI via stdin)
// ─────────────────────────────────────────────────────────────────────────────

export const OutboundUserMessageSchema = z.object({
  type: z.literal('user'),
  message: z.object({
    id: z.string(),
    role: z.literal('user'),
    content: z.union([
      z.string(),
      z.array(
        z.union([TextBlockSchema, z.object({ type: z.literal('image'), source: z.unknown() })])
      ),
    ]),
  }),
});
export type OutboundUserMessage = z.infer<typeof OutboundUserMessageSchema>;

export const OutboundControlResponseSchema = z.object({
  type: z.literal('control_response'),
  request_id: z.string(),
  response: z.object({
    subtype: z.literal('success'),
    request_id: z.string(),
    response: z.union([
      z.object({
        behavior: z.literal('allow'),
        updatedInput: z.record(z.unknown()),
        updatedPermissions: z.array(z.unknown()).optional(),
      }),
      z.object({
        behavior: z.literal('deny'),
        message: z.string(),
        interrupt: z.boolean().optional(),
      }),
    ]),
  }),
});
export type OutboundControlResponse = z.infer<typeof OutboundControlResponseSchema>;
