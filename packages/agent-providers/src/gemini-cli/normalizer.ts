/**
 * Gemini CLI Normalizer — NDJSON → AgentEvent
 *
 * Converts Gemini CLI protocol messages into canonical AgentEvents.
 * Follows the same pattern as ClaudeCodeNormalizer.
 *
 * @module agent-providers/gemini-cli/normalizer
 */

import type { AgentEvent } from '@vienna/agent-core';
import { GeminiInboundMessageSchema, type GeminiInboundMessage } from './schema';

export class GeminiCliNormalizer {
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

    const parsed = GeminiInboundMessageSchema.safeParse(raw);
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
    return `gemini-msg-${++this.messageCounter}`;
  }

  private mapMessage(msg: GeminiInboundMessage): AgentEvent[] {
    switch (msg.type) {
      case 'init':
        return [
          {
            type: 'session_init',
            sessionId: msg.session_id ?? 'gemini-session',
            provider: 'gemini-cli',
            model: msg.model ?? 'gemini-unknown',
            tools: msg.tools ?? [],
            cwd: process.cwd(),
          },
        ];

      case 'content_delta': {
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

        events.push({
          type: 'text_delta',
          messageId: this.currentMessageId,
          text: msg.text,
        });

        return events;
      }

      case 'content_done': {
        if (!this.currentMessageId) return [];
        return [
          {
            type: 'text_done',
            messageId: this.currentMessageId,
            fullText: msg.text,
          },
        ];
      }

      case 'function_call': {
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

        events.push({
          type: 'tool_start',
          messageId: this.currentMessageId,
          tool: { id: msg.id, name: msg.name, input: msg.args },
        });

        return events;
      }

      case 'function_response': {
        const messageId = this.toolIdToMessageId.get(msg.id) ?? this.currentMessageId ?? 'unknown';
        const hasError = !!msg.error;

        this.toolIdToMessageId.delete(msg.id);

        return [
          {
            type: 'tool_result',
            messageId,
            toolId: msg.id,
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
            code: msg.code ?? 'gemini_error',
            message: msg.message,
            retryable: false,
            timestamp: Date.now(),
          },
        ];

      case 'turn_complete': {
        const messageId = this.currentMessageId ?? 'unknown';
        const durationMs = this.turnStartTime > 0 ? Date.now() - this.turnStartTime : 0;

        const events: AgentEvent[] = [
          {
            type: 'turn_end',
            messageId,
            durationMs,
            usage: {
              inputTokens: msg.usage?.prompt_tokens ?? 0,
              outputTokens: msg.usage?.completion_tokens ?? 0,
              cacheReadTokens: 0,
              cacheCreationTokens: 0,
              totalCostUsd: null,
            },
          },
        ];

        this.currentMessageId = null;
        this.turnStartTime = 0;

        return events;
      }
    }
  }
}
