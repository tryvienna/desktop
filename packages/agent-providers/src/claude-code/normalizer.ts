/**
 * Claude Code Normalizer — NDJSON → AgentEvent
 *
 * Converts raw Claude CLI NDJSON messages into canonical AgentEvents.
 * This is a focused, stateful normalizer (~300 lines) that replaces
 * drift-v2's 2085-line ChatEventAdapter.
 *
 * Responsibilities (ONLY):
 * - Parse NDJSON lines → validate via Zod → map to AgentEvent
 * - Track minimal state (currentMessageId, toolId → messageId mapping)
 *
 * NOT responsible for (handled by other modules):
 * - Permission evaluation (→ PermissionEngine)
 * - Event persistence (→ SessionManager)
 * - UI concerns (→ chat-ui store)
 * - Usage accounting (→ SessionManager)
 *
 * @module agent-providers/claude-code/normalizer
 */

import type { AgentEvent } from '@vienna/agent-core';
import { InboundMessageSchema } from './schema';
import type {
  InboundMessage,
  AssistantMessage,
  StreamEventMessage,
  ControlRequestMessage,
  RateLimitEvent,
  SuccessResult,
  ErrorResult,
} from './schema';

/** Coerce non-finite values to 0 for safe arithmetic */
function safeNumber(n: unknown): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}

export class ClaudeCodeNormalizer {
  private currentMessageId: string | null = null;
  private toolIdToMessageId = new Map<string, string>();
  private turnStartTime = 0;
  /** Tracks block type by index for thinking_done on content_block_stop */
  private blockTypes = new Map<number, string>();

  // ── Usage tracking state ────────────────────────────────────────────────
  /** Last message_start's input breakdown (current context window utilization) */
  private lastMessageStartUsage: {
    inputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
  } | null = null;
  /** Accumulated output tokens across all interactions in this session */
  private accumulatedOutputTokens = 0;
  /** Snapshot of accumulated output at the start of the current interaction */
  private outputTokensAtTurnStart = 0;

  /**
   * Parse one NDJSON line from Claude CLI stdout → 0+ AgentEvents.
   *
   * Uses safeParse (no throw) — invalid lines become error events.
   */
  normalize(line: string): AgentEvent[] {
    let raw: unknown;
    try {
      raw = JSON.parse(line);
    } catch {
      return [
        {
          type: 'error',
          code: 'json_parse_error',
          message: `Invalid JSON: ${line.substring(0, 200)}`,
          retryable: false,
          timestamp: Date.now(),
        },
      ];
    }

    const parsed = InboundMessageSchema.safeParse(raw);
    if (!parsed.success) {
      const rawSnippet = JSON.stringify(raw).substring(0, 300);
      return [
        {
          type: 'error',
          code: 'schema_validation_error',
          message: `Schema validation failed for ${rawSnippet} — ${parsed.error.message.substring(0, 500)}`,
          retryable: false,
          timestamp: Date.now(),
        },
      ];
    }

    return this.mapMessage(parsed.data);
  }

  /** Reset state between sessions */
  reset(): void {
    this.currentMessageId = null;
    this.toolIdToMessageId.clear();
    this.turnStartTime = 0;
    this.blockTypes.clear();
    this.lastMessageStartUsage = null;
    this.accumulatedOutputTokens = 0;
    this.outputTokensAtTurnStart = 0;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Message dispatching
  // ─────────────────────────────────────────────────────────────────────────

  private mapMessage(msg: InboundMessage): AgentEvent[] {
    if (!('type' in msg)) return [];

    switch (msg.type) {
      case 'system':
        return this.handleSystem(msg);
      case 'assistant':
        return this.handleAssistant(msg);
      case 'user':
        return this.handleUser(msg);
      case 'stream_event':
        return this.handleStreamEvent(msg);
      case 'control_request':
        return this.handleControlRequest(msg);
      case 'rate_limit_event':
        return this.handleRateLimit(msg);
      case 'result':
        return this.handleResult(msg);
      case 'keep_alive':
        return []; // Silent — no event needed
      case 'control_response':
        return []; // Echo of our outbound permission response — ignore
      default:
        return [
          {
            type: 'provider_event',
            provider: 'claude-code',
            eventType: 'unknown',
            data: msg,
          },
        ];
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // System messages
  // ─────────────────────────────────────────────────────────────────────────

  private handleSystem(msg: InboundMessage & { type: 'system' }): AgentEvent[] {
    if (!('subtype' in msg)) return [];

    switch (msg.subtype) {
      case 'init':
        return [
          {
            type: 'session_init',
            sessionId: msg.session_id,
            provider: 'claude-code',
            model: msg.model,
            tools: msg.tools,
            cwd: msg.cwd,
          },
        ];

      case 'compact_boundary':
        return [
          {
            type: 'compact_boundary',
            trigger: msg.compact_metadata.trigger,
            preTokens: msg.compact_metadata.pre_tokens,
            timestamp: Date.now(),
          },
        ];

      case 'model_change':
        return [
          {
            type: 'model_change',
            fromModel: msg.from_model,
            toModel: msg.to_model,
            timestamp: Date.now(),
          },
        ];

      case 'entity_link':
        return [
          {
            type: 'entity_link',
            action: msg.action,
            entityUri: msg.entity_uri,
            entityType: msg.entity_type,
            entityTitle: msg.entity_title,
            timestamp: Date.now(),
          },
        ];

      case 'skill_activation':
        return [{ type: 'skill_activation', skills: msg.skills, timestamp: Date.now() }];

      case 'interrupted':
        return [{ type: 'interrupted', timestamp: msg.timestamp }];

      case 'task_notification':
        return [
          {
            type: 'task_notification',
            taskId: msg.task_id,
            status: msg.status,
            summary: msg.summary,
            timestamp: Date.now(),
          },
        ];

      case 'status':
        // When Claude Code signals compaction is starting, emit a synthetic
        // compact_boundary with status 'compacting' so the UI shows a spinner.
        // The real compact_boundary event arriving later will replace it.
        if (msg.status === 'compacting') {
          return [
            {
              type: 'compact_boundary',
              trigger: 'auto' as const,
              preTokens: 0,
              status: 'compacting' as const,
              timestamp: Date.now(),
            },
          ];
        }
        return [
          { type: 'provider_event', provider: 'claude-code', eventType: msg.subtype, data: msg },
        ];

      case 'api_retry':
        return [
          {
            type: 'api_retry',
            attempt: msg.attempt,
            maxRetries: msg.max_retries,
            retryDelayMs: msg.retry_delay_ms,
            errorStatus: msg.error_status,
            error: msg.error,
            timestamp: Date.now(),
          },
        ];

      // ── Subagent task lifecycle events ─────────────────────────────────
      //
      // These events relate to Agent/Task tool subagent execution. They are
      // deliberately SUPPRESSED (return []) to prevent timeline spam.
      //
      // BACKGROUND:
      // When Claude Code launches a subagent via the Agent tool, the CLI emits:
      //   1. task_started  — { task_id, description, task_type }
      //   2. task_progress — { task_id, tool_use_id?, description?, usage?, last_tool_name? }
      //   3. task_notification — { task_id, status: 'completed'|'failed', summary }
      //
      // The task_id is the subagent's internal ID (same as `agentId` that appears
      // in the Agent tool's result output text). The ONLY deterministic link between
      // a task_id and the parent tool_use_id that spawned it comes from parsing the
      // tool_result output (see AGENT_ID_PATTERN in chat-store.ts).
      //
      // PROTOCOL GAP: Neither task_started nor task_progress include a
      // `tool_use_id` field that deterministically links back to the parent
      // Agent tool_use. task_progress has an OPTIONAL `tool_use_id` in the
      // schema but Claude Code does not populate it as of 2026-03.
      //
      // CURRENT BEHAVIOR:
      // - task_started/task_progress → suppressed (no timeline messages)
      // - task_notification → already a first-class AgentEvent, handled by
      //   chat-store to update the parent tool card's backgroundTask status
      //
      // FUTURE: If the CLI protocol adds a reliable `tool_use_id` to
      // task_started, we could promote it to a first-class AgentEvent and
      // use it to show live progress on the Agent tool card. Until then,
      // the Agent tool's existing "running" spinner is sufficient.
      // ───────────────────────────────────────────────────────────────────
      case 'task_started':
      case 'task_progress':
      case 'hook_started':
      case 'hook_response':
        return [];

      default:
        return [
          {
            type: 'provider_event',
            provider: 'claude-code',
            eventType: 'system_unknown',
            data: msg,
          },
        ];
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Assistant messages (non-streaming, complete response)
  // ─────────────────────────────────────────────────────────────────────────

  private handleAssistant(msg: AssistantMessage): AgentEvent[] {
    // Sub-agent messages (parent_tool_use_id set) — suppress entirely.
    //
    // These are internal assistant responses from subagents spawned by the
    // Agent tool. They carry a `parent_tool_use_id` linking them to the
    // parent Agent tool_use, but we don't render subagent internals in the
    // timeline. Previously these leaked through as provider_event with
    // eventType 'sub_agent_assistant', creating a wall of noise in the chat.
    //
    // The parent Agent tool card already shows a "running" spinner while the
    // subagent works, and the final result arrives via tool_result. Streaming
    // subagent events (stream_event, user with parent_tool_use_id) are also
    // suppressed at their respective handlers below.
    if (msg.parent_tool_use_id) {
      return [];
    }

    const events: AgentEvent[] = [];
    const messageId = msg.message.id;
    this.currentMessageId = messageId;
    this.turnStartTime = Date.now();

    events.push({ type: 'turn_start', messageId, timestamp: this.turnStartTime, providerUuid: msg.uuid });

    // Process content blocks
    for (const block of msg.message.content) {
      switch (block.type) {
        case 'text':
          events.push({ type: 'text_delta', messageId, text: block.text });
          events.push({ type: 'text_done', messageId, fullText: block.text });
          break;

        case 'tool_use':
          this.toolIdToMessageId.set(block.id, messageId);
          events.push({
            type: 'tool_start',
            messageId,
            tool: { id: block.id, name: block.name, input: block.input },
          });
          break;

        case 'thinking':
          events.push({ type: 'thinking_start', messageId });
          events.push({ type: 'thinking_delta', messageId, text: block.thinking });
          events.push({ type: 'thinking_done', messageId });
          break;
      }
    }

    return events;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // User messages (echoed back — contain tool results)
  // ─────────────────────────────────────────────────────────────────────────

  private handleUser(msg: InboundMessage & { type: 'user' }): AgentEvent[] {
    if (msg.parent_tool_use_id) return []; // Sub-agent tool results — skip

    const events: AgentEvent[] = [];

    // Emit user_message_ack with the JSONL uuid so the frontend can enable fork-at-message
    events.push({ type: 'user_message_ack', providerUuid: msg.uuid, timestamp: Date.now() });

    const content = msg.message.content;

    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === 'tool_result') {
          const toolId = block.tool_use_id;
          const resolvedMessageId = this.toolIdToMessageId.get(toolId) ?? this.currentMessageId;
          const isError = block.is_error ?? false;
          let output: string;
          let images: Array<{ url: string }> | undefined;

          if (typeof block.content === 'string') {
            output = block.content;
          } else {
            output = block.content
              .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
              .map((c) => c.text)
              .join('\n');

            const imageBlocks = block.content.filter(
              (c): c is { type: 'image'; source: { type: 'base64'; media_type: string; data: string } } =>
                c.type === 'image',
            );
            if (imageBlocks.length > 0) {
              images = imageBlocks.map((img) => ({
                url: `data:${img.source.media_type};base64,${img.source.data}`,
              }));
            }
          }

          events.push({
            type: 'tool_result',
            messageId: resolvedMessageId ?? 'unknown',
            toolId,
            result: {
              success: !isError,
              output: isError ? undefined : output,
              error: isError ? output : undefined,
              ...(images ? { images } : {}),
            },
          });

          this.toolIdToMessageId.delete(toolId);
        }
      }
    }

    // Emit checkpoint event — the echoed user message carries a UUID that serves
    // as the CLI's file checkpoint identifier for --rewind-files.
    // providerSessionId is captured from THIS message, not the current session,
    // because the checkpoint UUID is only valid with the CLI session that created it.
    if (this.currentMessageId) {
      events.push({
        type: 'checkpoint',
        checkpointId: msg.uuid,
        messageId: this.currentMessageId,
        providerSessionId: msg.session_id,
        timestamp: Date.now(),
      });
    }

    return events;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Stream events (real-time streaming via --include-partial-messages)
  // ─────────────────────────────────────────────────────────────────────────

  private handleStreamEvent(msg: StreamEventMessage): AgentEvent[] {
    if (msg.parent_tool_use_id) return []; // Sub-agent streaming — skip

    const event = msg.event;
    const events: AgentEvent[] = [];

    switch (event.type) {
      case 'message_start': {
        const messageId = event.message.id;
        this.currentMessageId = messageId;
        this.turnStartTime = Date.now();
        this.blockTypes.clear();

        // Snapshot output baseline before this interaction's output begins
        this.outputTokensAtTurnStart = this.accumulatedOutputTokens;

        events.push({ type: 'turn_start', messageId, timestamp: this.turnStartTime, providerUuid: msg.uuid });

        // Extract current context utilization from this API call's input usage
        const usage = event.message.usage;
        const inputTokens = safeNumber(usage.input_tokens);
        const cacheReadTokens = safeNumber(usage.cache_read_input_tokens);
        const cacheCreationTokens = safeNumber(usage.cache_creation_input_tokens);

        this.lastMessageStartUsage = { inputTokens, cacheReadTokens, cacheCreationTokens };

        events.push({
          type: 'usage_update',
          inputTokens,
          cacheReadTokens,
          cacheCreationTokens,
          outputTokens: this.accumulatedOutputTokens,
        });
        break;
      }

      case 'content_block_start': {
        const messageId = this.currentMessageId ?? 'unknown';
        const block = event.content_block;
        this.blockTypes.set(event.index, block.type);

        if (block.type === 'tool_use') {
          this.toolIdToMessageId.set(block.id, messageId);
          events.push({
            type: 'tool_start',
            messageId,
            tool: { id: block.id, name: block.name, input: block.input ?? {} },
          });
        } else if (block.type === 'thinking') {
          events.push({ type: 'thinking_start', messageId });
        }
        // text block starts are implicit — deltas carry the text
        // redacted_thinking blocks are skipped (opaque)
        break;
      }

      case 'content_block_delta': {
        const messageId = this.currentMessageId ?? 'unknown';
        const delta = event.delta;

        if (delta.type === 'text_delta') {
          events.push({ type: 'text_delta', messageId, text: delta.text });
        } else if (delta.type === 'input_json_delta') {
          // Find the tool ID for this index — we need to track which tool this delta belongs to
          // For now, emit as tool_input_delta with last known tool
          const lastToolId = this.getLastToolId();
          if (lastToolId) {
            events.push({
              type: 'tool_input_delta',
              messageId,
              toolId: lastToolId,
              partialJson: delta.partial_json,
            });
          }
        } else if (delta.type === 'thinking_delta') {
          events.push({ type: 'thinking_delta', messageId, text: delta.thinking });
        }
        break;
      }

      case 'content_block_stop': {
        const messageId = this.currentMessageId ?? 'unknown';
        const blockType = this.blockTypes.get(event.index);
        this.blockTypes.delete(event.index);
        if (blockType === 'thinking') {
          events.push({ type: 'thinking_done', messageId });
        }
        break;
      }

      case 'message_delta': {
        // Extract cumulative output tokens from message_delta for real-time display.
        // message_delta.usage.output_tokens is cumulative PER-TURN (resets each API call),
        // so we add it to the baseline from previous interactions.
        const deltaOutput = safeNumber(event.usage?.output_tokens);
        if (deltaOutput > 0) {
          this.accumulatedOutputTokens = this.outputTokensAtTurnStart + deltaOutput;
          const ctx = this.lastMessageStartUsage;
          events.push({
            type: 'usage_update',
            inputTokens: ctx?.inputTokens ?? 0,
            cacheReadTokens: ctx?.cacheReadTokens ?? 0,
            cacheCreationTokens: ctx?.cacheCreationTokens ?? 0,
            outputTokens: this.accumulatedOutputTokens,
          });
        }
        break;
      }

      case 'message_stop': {
        // Turn complete — emit text_done if we have accumulated text
        // The text_done with fullText will be emitted by the store (it accumulates deltas)
        break;
      }
    }

    return events;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Control requests (permission prompts)
  // ─────────────────────────────────────────────────────────────────────────

  private handleControlRequest(msg: ControlRequestMessage): AgentEvent[] {
    const req = msg.request;
    const messageId =
      this.toolIdToMessageId.get(req.tool_use_id) ?? this.currentMessageId ?? 'unknown';

    return [
      {
        type: 'tool_permission_needed',
        messageId,
        toolId: req.tool_use_id,
        requestId: msg.request_id,
        toolName: req.tool_name,
        input: req.input,
      },
    ];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Rate limit events
  // ─────────────────────────────────────────────────────────────────────────

  private handleRateLimit(msg: RateLimitEvent): AgentEvent[] {
    const info = msg.rate_limit_info;
    // Informational rate limit events (status: "allowed") — no action needed
    if (info.status === 'allowed') return [];
    return [
      {
        type: 'rate_limited',
        limitType: info.rateLimitType ?? info.status,
        resetsAt: info.resetsAt ?? 0,
        isUsingOverage: info.isUsingOverage,
        timestamp: Date.now(),
      },
    ];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Result messages (turn completion)
  // ─────────────────────────────────────────────────────────────────────────

  private handleResult(msg: InboundMessage & { type: 'result' }): AgentEvent[] {
    const events: AgentEvent[] = [];
    const messageId = this.currentMessageId ?? 'unknown';
    const durationMs = this.turnStartTime > 0 ? Date.now() - this.turnStartTime : 0;

    // Extract contextWindow from modelUsage — take the max across all model entries
    // (handles multi-model sessions where different models may report different windows)
    const modelUsageRecord = 'modelUsage' in msg ? (msg as SuccessResult).modelUsage : undefined;
    const modelUsageValues = modelUsageRecord ? Object.values(modelUsageRecord) : [];
    const contextWindow = modelUsageValues.length > 0
      ? Math.max(...modelUsageValues.map((m) => m.contextWindow))
      : undefined;

    // Finalize accumulated output from the result's authoritative total
    if ('subtype' in msg && msg.subtype === 'success') {
      const result = msg as SuccessResult;
      const totalCostUsd = modelUsageValues.reduce((sum, m) => sum + m.costUSD, 0);

      // Set authoritative accumulated output from result
      this.accumulatedOutputTokens = this.outputTokensAtTurnStart + result.usage.output_tokens;

      events.push({
        type: 'turn_end',
        messageId,
        durationMs,
        usage: {
          inputTokens: result.usage.input_tokens,
          outputTokens: result.usage.output_tokens,
          cacheReadTokens: result.usage.cache_read_input_tokens ?? 0,
          cacheCreationTokens: result.usage.cache_creation_input_tokens ?? 0,
          totalCostUsd: totalCostUsd || result.total_cost_usd,
        },
        lastTurnContext: this.lastMessageStartUsage ?? undefined,
        contextWindow,
      });

      if (result.is_error) {
        events.push({
          type: 'error',
          messageId,
          code: 'result_error',
          message: result.result,
          retryable: false,
          timestamp: Date.now(),
        });
      }
    } else {
      const result = msg as ErrorResult;

      // Set authoritative accumulated output from result
      this.accumulatedOutputTokens = this.outputTokensAtTurnStart + result.usage.output_tokens;

      events.push({
        type: 'turn_end',
        messageId,
        durationMs,
        usage: {
          inputTokens: result.usage.input_tokens,
          outputTokens: result.usage.output_tokens,
          cacheReadTokens: result.usage.cache_read_input_tokens ?? 0,
          cacheCreationTokens: result.usage.cache_creation_input_tokens ?? 0,
          totalCostUsd: result.total_cost_usd,
        },
        lastTurnContext: this.lastMessageStartUsage ?? undefined,
        contextWindow,
      });

      events.push({
        type: 'error',
        messageId,
        code: result.subtype,
        message: result.errors?.join('; ') ?? 'Unknown error',
        retryable: result.subtype === 'error_during_execution',
        timestamp: Date.now(),
      });
    }

    // Reset for next turn (but preserve accumulated output across interactions)
    this.currentMessageId = null;
    this.turnStartTime = 0;
    this.lastMessageStartUsage = null;

    return events;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  /** Get the most recently registered tool ID (for input_json_delta correlation) */
  private getLastToolId(): string | null {
    const entries = [...this.toolIdToMessageId.keys()];
    return entries.length > 0 ? entries[entries.length - 1] : null;
  }
}
