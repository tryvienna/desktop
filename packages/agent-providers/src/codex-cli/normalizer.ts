/**
 * Codex CLI Normalizer — NDJSON → AgentEvent
 *
 * Converts Codex CLI (OpenAI) protocol messages into canonical AgentEvents.
 * Follows the same pattern as ClaudeCodeNormalizer but for the Codex protocol.
 *
 * @module agent-providers/codex-cli/normalizer
 */

import type { AgentEvent } from '@vienna/agent-core';
import { CodexInboundMessageSchema, type CodexInboundMessage } from './schema';

export class CodexCliNormalizer {
  private currentMessageId: string | null = null;
  private toolIdToMessageId = new Map<string, string>();
  private turnStartTime = 0;
  private messageCounter = 0;

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

    const parsed = CodexInboundMessageSchema.safeParse(raw);
    if (!parsed.success) {
      return [
        {
          type: 'error',
          code: 'schema_validation_error',
          message: `Schema validation failed: ${parsed.error.message.substring(0, 500)}`,
          retryable: false,
          timestamp: Date.now(),
        },
      ];
    }

    return this.mapMessage(parsed.data);
  }

  reset(): void {
    this.currentMessageId = null;
    this.toolIdToMessageId.clear();
    this.turnStartTime = 0;
    this.messageCounter = 0;
  }

  private nextMessageId(): string {
    return `codex-msg-${++this.messageCounter}`;
  }

  private mapMessage(msg: CodexInboundMessage): AgentEvent[] {
    switch (msg.type) {
      case 'system':
        return [
          {
            type: 'session_init',
            sessionId: msg.session_id ?? 'codex-session',
            provider: 'codex-cli',
            model: msg.model ?? 'unknown',
            tools: msg.tools ?? [],
            cwd: msg.cwd ?? process.cwd(),
          },
        ];

      case 'message': {
        const events: AgentEvent[] = [];

        // Start a new turn if we don't have one
        if (!this.currentMessageId) {
          this.currentMessageId = this.nextMessageId();
          this.turnStartTime = Date.now();
          events.push({
            type: 'turn_start',
            messageId: this.currentMessageId,
            timestamp: this.turnStartTime,
          });
        }

        events.push({
          type: 'text_delta',
          messageId: this.currentMessageId,
          text: msg.content,
        });

        if (msg.done) {
          events.push({
            type: 'text_done',
            messageId: this.currentMessageId,
            fullText: msg.content,
          });
        }

        return events;
      }

      case 'tool_call': {
        const events: AgentEvent[] = [];

        if (!this.currentMessageId) {
          this.currentMessageId = this.nextMessageId();
          this.turnStartTime = Date.now();
          events.push({
            type: 'turn_start',
            messageId: this.currentMessageId,
            timestamp: this.turnStartTime,
          });
        }

        this.toolIdToMessageId.set(msg.id, this.currentMessageId);

        let input: Record<string, unknown> = {};
        try {
          input = JSON.parse(msg.arguments);
        } catch {
          input = { raw: msg.arguments };
        }

        events.push({
          type: 'tool_start',
          messageId: this.currentMessageId,
          tool: { id: msg.id, name: msg.name, input },
        });

        return events;
      }

      case 'tool_result': {
        const messageId =
          this.toolIdToMessageId.get(msg.tool_call_id) ?? this.currentMessageId ?? 'unknown';
        const hasError = !!msg.error;

        this.toolIdToMessageId.delete(msg.tool_call_id);

        return [
          {
            type: 'tool_result',
            messageId,
            toolId: msg.tool_call_id,
            result: {
              success: !hasError,
              output: hasError ? undefined : msg.output,
              error: hasError ? msg.error : undefined,
            },
          },
        ];
      }

      case 'error':
        return [
          {
            type: 'error',
            code: msg.code ?? 'codex_error',
            message: msg.message,
            retryable: false,
            timestamp: Date.now(),
          },
        ];

      case 'done': {
        const messageId = this.currentMessageId ?? 'unknown';
        const durationMs = this.turnStartTime > 0 ? Date.now() - this.turnStartTime : 0;

        const events: AgentEvent[] = [
          {
            type: 'turn_end',
            messageId,
            durationMs,
            usage: {
              inputTokens: msg.usage?.input_tokens ?? 0,
              outputTokens: msg.usage?.output_tokens ?? 0,
              cacheReadTokens: 0,
              cacheCreationTokens: 0,
              totalCostUsd: null,
            },
          },
        ];

        // Reset for next turn
        this.currentMessageId = null;
        this.turnStartTime = 0;

        return events;
      }
    }
  }
}
