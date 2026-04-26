/**
 * ClaudeCodeNormalizer unit tests
 *
 * Tests the NDJSON → AgentEvent conversion for every Claude CLI message type.
 * Validates all output through AgentEventSchema (Zod-first testing).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AgentEventSchema } from '@vienna/agent-core';
import type { AgentEvent } from '@vienna/agent-core';
import { ClaudeCodeNormalizer } from '../claude-code/normalizer';
import * as fixtures from './__fixtures__/claude-messages';

function toLine(obj: unknown): string {
  return JSON.stringify(obj);
}

/** Validate every event through Zod — if this passes, runtime will too */
function validateAll(events: AgentEvent[]): void {
  for (const event of events) {
    expect(() => AgentEventSchema.parse(event)).not.toThrow();
  }
}

describe('ClaudeCodeNormalizer', () => {
  let normalizer: ClaudeCodeNormalizer;

  beforeEach(() => {
    normalizer = new ClaudeCodeNormalizer();
  });

  // ─── JSON parsing ──────────────────────────────────────────────────────

  describe('JSON parsing', () => {
    it('returns error event for invalid JSON', () => {
      const events = normalizer.normalize('{invalid json');
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('error');
      validateAll(events);
    });

    it('returns error event for schema validation failure', () => {
      const events = normalizer.normalize(JSON.stringify({ type: 'unknown_type_xyz', data: 123 }));
      expect(events).toHaveLength(1);
      // Unknown types that pass Zod union → provider_event or error
      // Since 'unknown_type_xyz' won't match any union member → schema error
      expect(events[0].type).toBe('error');
      validateAll(events);
    });

    it('handles empty string', () => {
      const events = normalizer.normalize('');
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('error');
    });

    it('silently drops control_response echoes', () => {
      const events = normalizer.normalize(JSON.stringify({
        type: 'control_response',
        request_id: 'req_123',
        response: {
          subtype: 'success',
          request_id: 'req_123',
          response: { behavior: 'allow', updatedInput: { command: 'ls' } },
        },
      }));
      expect(events).toEqual([]);
    });
  });

  // ─── System messages ───────────────────────────────────────────────────

  describe('system messages', () => {
    it('normalizes system init → session_init', () => {
      const events = normalizer.normalize(toLine(fixtures.systemInit));
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('session_init');

      const event = events[0] as AgentEvent & { type: 'session_init' };
      expect(event.sessionId).toBe('session-abc-123');
      expect(event.provider).toBe('claude-code');
      expect(event.model).toBe('claude-sonnet-4-20250514');
      expect(event.tools).toEqual(['Read', 'Write', 'Bash', 'Glob', 'Grep']);
      expect(event.cwd).toBe('/home/user/project');
      validateAll(events);
    });

    it('normalizes compact_boundary', () => {
      const events = normalizer.normalize(toLine(fixtures.systemCompactBoundary));
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('compact_boundary');

      const event = events[0] as AgentEvent & { type: 'compact_boundary' };
      expect(event.trigger).toBe('auto');
      expect(event.preTokens).toBe(50000);
      validateAll(events);
    });

    it('normalizes model_change', () => {
      const events = normalizer.normalize(toLine(fixtures.systemModelChange));
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('model_change');

      const event = events[0] as AgentEvent & { type: 'model_change' };
      expect(event.fromModel).toBe('claude-sonnet-4-20250514');
      expect(event.toModel).toBe('claude-opus-4-20250514');
      validateAll(events);
    });

    it('normalizes entity_link', () => {
      const events = normalizer.normalize(toLine(fixtures.systemEntityLink));
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('entity_link');

      const event = events[0] as AgentEvent & { type: 'entity_link' };
      expect(event.action).toBe('linked');
      expect(event.entityUri).toBe('@vienna//github_pr/owner/repo/42');
      expect(event.entityType).toBe('github_pr');
      expect(event.entityTitle).toBe('Fix login bug');
      validateAll(events);
    });

    it('normalizes skill_activation', () => {
      const events = normalizer.normalize(toLine(fixtures.systemSkillActivation));
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('skill_activation');

      const event = events[0] as AgentEvent & { type: 'skill_activation' };
      expect(event.skills).toHaveLength(2);
      expect(event.skills[0].id).toBe('commit');
      validateAll(events);
    });

    it('normalizes interrupted', () => {
      const events = normalizer.normalize(toLine(fixtures.systemInterrupted));
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('interrupted');

      const event = events[0] as AgentEvent & { type: 'interrupted' };
      expect(event.timestamp).toBe(1700000000000);
      validateAll(events);
    });

    it('normalizes task_notification', () => {
      const events = normalizer.normalize(toLine(fixtures.systemTaskNotification));
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('task_notification');

      const event = events[0] as AgentEvent & { type: 'task_notification' };
      expect(event.taskId).toBe('task-001');
      expect(event.status).toBe('completed');
      expect(event.summary).toBe('Background task finished successfully');
      validateAll(events);
    });

    it('normalizes task_notification with stopped status and extra fields', () => {
      const events = normalizer.normalize(toLine(fixtures.systemTaskNotificationStopped));
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('task_notification');

      const event = events[0] as AgentEvent & { type: 'task_notification' };
      expect(event.taskId).toBe('task-002');
      expect(event.status).toBe('stopped');
      expect(event.summary).toBe('Find Tailwind/CSS config setup');
      validateAll(events);
    });

    it('normalizes status → provider_event', () => {
      const events = normalizer.normalize(toLine(fixtures.systemStatus));
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('provider_event');
      validateAll(events);
    });

    // ── Suppressed subagent task lifecycle events ───────────────────────
    //
    // task_started and task_progress are internal to the Agent tool's
    // subagent execution. They must produce zero events to prevent the
    // chat timeline from being spammed with "claude-code / task_progress"
    // messages. The Agent tool card's "running" spinner is sufficient
    // to indicate activity.

    it('suppresses task_started (no timeline message)', () => {
      const events = normalizer.normalize(toLine(fixtures.systemTaskStarted));
      expect(events).toHaveLength(0);
    });

    it('suppresses task_progress (no timeline message)', () => {
      const events = normalizer.normalize(toLine(fixtures.systemTaskProgress));
      expect(events).toHaveLength(0);
    });

    // ── Suppressed hook lifecycle events ─────────────────────────────────
    //
    // hook_started and hook_response are internal to Claude Code hooks
    // (e.g. peon-ping). They must produce zero events to prevent timeline
    // noise. Previously these caused schema validation errors because the
    // SystemMessageSchema union didn't include these subtypes.

    it('suppresses hook_started (no timeline message)', () => {
      const events = normalizer.normalize(toLine(fixtures.systemHookStarted));
      expect(events).toHaveLength(0);
    });

    it('suppresses hook_response (no timeline message)', () => {
      const events = normalizer.normalize(toLine(fixtures.systemHookResponse));
      expect(events).toHaveLength(0);
    });

    it('suppresses hook_started with extra unknown fields (.passthrough())', () => {
      const events = normalizer.normalize(toLine(fixtures.systemHookStartedWithExtraFields));
      expect(events).toHaveLength(0);
    });

    it('suppresses hook_response with extra unknown fields (.passthrough())', () => {
      const events = normalizer.normalize(toLine(fixtures.systemHookResponseWithExtraFields));
      expect(events).toHaveLength(0);
    });
  });

  // ─── Assistant messages (non-streaming) ────────────────────────────────

  describe('assistant messages', () => {
    it('normalizes text-only response', () => {
      const events = normalizer.normalize(toLine(fixtures.assistantTextOnly));
      validateAll(events);

      const types = events.map((e) => e.type);
      expect(types).toContain('turn_start');
      expect(types).toContain('text_delta');
      expect(types).toContain('text_done');

      const textDelta = events.find((e) => e.type === 'text_delta') as AgentEvent & {
        type: 'text_delta';
      };
      expect(textDelta.text).toBe('Hello! How can I help you today?');
      expect(textDelta.messageId).toBe('msg_01ABC');
    });

    it('normalizes response with tool use', () => {
      const events = normalizer.normalize(toLine(fixtures.assistantWithToolUse));
      validateAll(events);

      const types = events.map((e) => e.type);
      expect(types).toContain('turn_start');
      expect(types).toContain('text_delta');
      expect(types).toContain('text_done');
      expect(types).toContain('tool_start');

      const toolStart = events.find((e) => e.type === 'tool_start') as AgentEvent & {
        type: 'tool_start';
      };
      expect(toolStart.tool.name).toBe('Read');
      expect(toolStart.tool.id).toBe('tool_01');
      expect(toolStart.tool.input).toEqual({ file_path: '/src/index.ts' });
    });

    it('normalizes response with thinking', () => {
      const events = normalizer.normalize(toLine(fixtures.assistantWithThinking));
      validateAll(events);

      const types = events.map((e) => e.type);
      expect(types).toContain('thinking_start');
      expect(types).toContain('thinking_delta');
      expect(types).toContain('thinking_done');
      expect(types).toContain('text_delta');

      const thinkingDelta = events.find((e) => e.type === 'thinking_delta') as AgentEvent & {
        type: 'thinking_delta';
      };
      expect(thinkingDelta.text).toBe('I need to analyze this carefully...');
    });

    it('suppresses sub-agent messages (parent_tool_use_id set)', () => {
      // Sub-agent assistant messages are internal to the Agent tool's
      // execution. They must be suppressed to prevent timeline spam.
      // Previously these leaked through as provider_event with eventType
      // 'sub_agent_assistant', creating a wall of noise in the chat UI.
      const events = normalizer.normalize(toLine(fixtures.assistantSubAgent));
      expect(events).toHaveLength(0);
    });

    it('tracks messageId across messages', () => {
      // Process assistant message first
      normalizer.normalize(toLine(fixtures.assistantWithToolUse));
      // Process tool result — should resolve messageId from tool_01
      const events = normalizer.normalize(toLine(fixtures.userToolResult));
      validateAll(events);

      const toolResult = events.find((e) => e.type === 'tool_result') as AgentEvent & {
        type: 'tool_result';
      };
      expect(toolResult).toBeDefined();
      expect(toolResult.messageId).toBe('msg_02DEF');
      expect(toolResult.toolId).toBe('tool_01');
    });
  });

  // ─── User messages (tool results) ─────────────────────────────────────

  describe('user messages', () => {
    it('normalizes successful tool result', () => {
      // Set up tool mapping
      normalizer.normalize(toLine(fixtures.assistantWithToolUse));

      const events = normalizer.normalize(toLine(fixtures.userToolResult));
      validateAll(events);

      const toolResult = events.find((e) => e.type === 'tool_result') as AgentEvent & {
        type: 'tool_result';
      };
      expect(toolResult.result.success).toBe(true);
      expect(toolResult.result.output).toBe('File contents: export default {}');
      expect(toolResult.result.error).toBeUndefined();
    });

    it('normalizes error tool result', () => {
      normalizer.normalize(toLine(fixtures.assistantWithToolUse));

      const events = normalizer.normalize(toLine(fixtures.userToolResultError));
      validateAll(events);

      const toolResult = events.find((e) => e.type === 'tool_result') as AgentEvent & {
        type: 'tool_result';
      };
      expect(toolResult.result.success).toBe(false);
      expect(toolResult.result.error).toBe('File not found: /src/missing.ts');
      expect(toolResult.result.output).toBeUndefined();
    });

    it('normalizes array content tool result', () => {
      normalizer.normalize(toLine(fixtures.assistantWithToolUse));

      const events = normalizer.normalize(toLine(fixtures.userToolResultArray));
      validateAll(events);

      const toolResult = events.find((e) => e.type === 'tool_result') as AgentEvent & {
        type: 'tool_result';
      };
      expect(toolResult.result.success).toBe(true);
      expect(toolResult.result.output).toBe('line 1\nline 2');
    });

    it('normalizes tool result with tool_reference content blocks', () => {
      normalizer.normalize(toLine(fixtures.assistantWithToolUse));

      const events = normalizer.normalize(toLine(fixtures.userToolResultWithToolReference));
      validateAll(events);

      const toolResult = events.find((e) => e.type === 'tool_result') as AgentEvent & {
        type: 'tool_result';
      };
      expect(toolResult.result.success).toBe(true);
      expect(toolResult.result.output).toBe('');
    });

    it('normalizes tool result with image content blocks', () => {
      normalizer.normalize(toLine(fixtures.assistantWithToolUse));

      const events = normalizer.normalize(toLine(fixtures.userToolResultWithImage));
      validateAll(events);

      const toolResult = events.find((e) => e.type === 'tool_result') as AgentEvent & {
        type: 'tool_result';
      };
      expect(toolResult.result.success).toBe(true);
      expect(toolResult.result.output).toBe('Screenshot captured');
      expect(toolResult.result.images).toHaveLength(1);
      expect(toolResult.result.images![0].url).toBe(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
      );
    });
  });

  // ─── Stream events ────────────────────────────────────────────────────

  describe('stream events', () => {
    it('normalizes message_start → turn_start + usage_update', () => {
      const events = normalizer.normalize(toLine(fixtures.streamMessageStart));
      validateAll(events);

      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('turn_start');

      const turnStart = events[0] as AgentEvent & { type: 'turn_start' };
      expect(turnStart.messageId).toBe('msg_stream_01');

      // message_start also emits a usage_update with input token breakdown
      expect(events[1].type).toBe('usage_update');
    });

    it('normalizes text content_block_delta → text_delta', () => {
      // Set up message context
      normalizer.normalize(toLine(fixtures.streamMessageStart));

      const events = normalizer.normalize(toLine(fixtures.streamTextDelta));
      validateAll(events);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('text_delta');

      const delta = events[0] as AgentEvent & { type: 'text_delta' };
      expect(delta.text).toBe('Hello ');
      expect(delta.messageId).toBe('msg_stream_01');
    });

    it('normalizes tool content_block_start → tool_start', () => {
      normalizer.normalize(toLine(fixtures.streamMessageStart));

      const events = normalizer.normalize(toLine(fixtures.streamContentBlockStartTool));
      validateAll(events);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('tool_start');

      const toolStart = events[0] as AgentEvent & { type: 'tool_start' };
      expect(toolStart.tool.name).toBe('Bash');
      expect(toolStart.tool.id).toBe('tool_stream_01');
    });

    it('normalizes input_json_delta → tool_input_delta', () => {
      normalizer.normalize(toLine(fixtures.streamMessageStart));
      normalizer.normalize(toLine(fixtures.streamContentBlockStartTool));

      const events = normalizer.normalize(toLine(fixtures.streamInputJsonDelta));
      validateAll(events);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('tool_input_delta');

      const delta = events[0] as AgentEvent & { type: 'tool_input_delta' };
      expect(delta.partialJson).toBe('{"command": "ls');
      expect(delta.toolId).toBe('tool_stream_01');
    });

    it('normalizes message_delta → usage_update with output tokens', () => {
      normalizer.normalize(toLine(fixtures.streamMessageStart));
      const events = normalizer.normalize(toLine(fixtures.streamMessageDelta));
      validateAll(events);

      // message_delta now emits a usage_update with accumulated output tokens
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('usage_update');
    });

    it('normalizes message_stop (silent)', () => {
      normalizer.normalize(toLine(fixtures.streamMessageStart));
      const events = normalizer.normalize(toLine(fixtures.streamMessageStop));
      expect(events).toHaveLength(0);
    });

    it('ignores sub-agent stream events', () => {
      const subAgentStream = {
        ...fixtures.streamTextDelta,
        parent_tool_use_id: 'tool_parent_01',
      };
      const events = normalizer.normalize(toLine(subAgentStream));
      expect(events).toHaveLength(0);
    });

    it('handles full streaming sequence', () => {
      const allEvents: AgentEvent[] = [];

      // message_start → content_block_start (text) → text_delta × 2 → content_block_stop → message_delta → message_stop
      allEvents.push(...normalizer.normalize(toLine(fixtures.streamMessageStart)));
      allEvents.push(...normalizer.normalize(toLine(fixtures.streamContentBlockStartText)));
      allEvents.push(...normalizer.normalize(toLine(fixtures.streamTextDelta)));
      allEvents.push(...normalizer.normalize(toLine(fixtures.streamTextDelta2)));
      allEvents.push(...normalizer.normalize(toLine(fixtures.streamContentBlockStop)));
      allEvents.push(...normalizer.normalize(toLine(fixtures.streamMessageDelta)));
      allEvents.push(...normalizer.normalize(toLine(fixtures.streamMessageStop)));

      validateAll(allEvents);

      const types = allEvents.map((e) => e.type);
      expect(types[0]).toBe('turn_start');
      expect(types.filter((t) => t === 'text_delta')).toHaveLength(2);
    });
  });

  // ─── Control requests ─────────────────────────────────────────────────

  describe('control requests', () => {
    it('normalizes control_request → tool_permission_needed', () => {
      const events = normalizer.normalize(toLine(fixtures.controlRequest));
      validateAll(events);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('tool_permission_needed');

      const event = events[0] as AgentEvent & { type: 'tool_permission_needed' };
      expect(event.toolName).toBe('Bash');
      expect(event.requestId).toBe('req-001');
      expect(event.toolId).toBe('tool_perm_01');
      expect(event.input).toEqual({ command: 'rm -rf /tmp/test' });
    });
  });

  // ─── Rate limit ───────────────────────────────────────────────────────

  describe('rate limit', () => {
    it('normalizes rate_limit_event → rate_limited', () => {
      const events = normalizer.normalize(toLine(fixtures.rateLimit));
      validateAll(events);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('rate_limited');

      const event = events[0] as AgentEvent & { type: 'rate_limited' };
      expect(event.limitType).toBe('tokens_per_minute');
      expect(event.resetsAt).toBe(1700000060000);
    });
  });

  // ─── Results ──────────────────────────────────────────────────────────

  describe('result messages', () => {
    it('normalizes success result → turn_end', () => {
      // Set up a message context first
      normalizer.normalize(toLine(fixtures.assistantTextOnly));

      const events = normalizer.normalize(toLine(fixtures.successResult));
      validateAll(events);

      const turnEnd = events.find((e) => e.type === 'turn_end') as AgentEvent & {
        type: 'turn_end';
      };
      expect(turnEnd).toBeDefined();
      expect(turnEnd.usage.inputTokens).toBe(1000);
      expect(turnEnd.usage.outputTokens).toBe(500);
      expect(turnEnd.usage.cacheReadTokens).toBe(200);
      expect(turnEnd.usage.cacheCreationTokens).toBe(100);
      expect(turnEnd.usage.totalCostUsd).toBe(0.05);
    });

    it('normalizes success result with is_error → turn_end + error', () => {
      normalizer.normalize(toLine(fixtures.assistantTextOnly));

      const events = normalizer.normalize(toLine(fixtures.successResultWithError));
      validateAll(events);

      const types = events.map((e) => e.type);
      expect(types).toContain('turn_end');
      expect(types).toContain('error');

      const error = events.find((e) => e.type === 'error') as AgentEvent & { type: 'error' };
      expect(error.code).toBe('result_error');
      expect(error.message).toBe('Something went wrong during execution');
    });

    it('normalizes error result → turn_end + error', () => {
      normalizer.normalize(toLine(fixtures.assistantTextOnly));

      const events = normalizer.normalize(toLine(fixtures.errorResult));
      validateAll(events);

      const types = events.map((e) => e.type);
      expect(types).toContain('turn_end');
      expect(types).toContain('error');

      const error = events.find((e) => e.type === 'error') as AgentEvent & { type: 'error' };
      expect(error.code).toBe('error_max_turns');
      expect(error.message).toBe('Maximum turns exceeded; Agent stopped');
      expect(error.retryable).toBe(false);
    });

    it('resets state after result', () => {
      normalizer.normalize(toLine(fixtures.assistantTextOnly));
      normalizer.normalize(toLine(fixtures.successResult));

      // After result, a new assistant message should generate a fresh turn_start
      const events = normalizer.normalize(toLine(fixtures.assistantTextOnly));
      validateAll(events);

      const turnStart = events.find((e) => e.type === 'turn_start') as AgentEvent & {
        type: 'turn_start';
      };
      expect(turnStart).toBeDefined();
    });
  });

  // ─── Keep-alive ───────────────────────────────────────────────────────

  describe('keep-alive', () => {
    it('produces no events for keep_alive', () => {
      const events = normalizer.normalize(toLine(fixtures.keepAlive));
      expect(events).toHaveLength(0);
    });
  });

  // ─── Reset ────────────────────────────────────────────────────────────

  describe('reset', () => {
    it('clears all state', () => {
      // Build up state
      normalizer.normalize(toLine(fixtures.assistantWithToolUse));

      // Reset
      normalizer.reset();

      // Tool result should use fallback messageId since mapping was cleared
      const events = normalizer.normalize(toLine(fixtures.userToolResult));
      validateAll(events);

      const toolResult = events.find((e) => e.type === 'tool_result') as AgentEvent & {
        type: 'tool_result';
      };
      expect(toolResult.messageId).toBe('unknown');
    });
  });

  // ─── Full conversation flow ───────────────────────────────────────────

  describe('full conversation flow', () => {
    it('handles a complete non-streaming conversation', () => {
      const allEvents: AgentEvent[] = [];

      // 1. System init
      allEvents.push(...normalizer.normalize(toLine(fixtures.systemInit)));
      // 2. Assistant response with tool use
      allEvents.push(...normalizer.normalize(toLine(fixtures.assistantWithToolUse)));
      // 3. Tool result
      allEvents.push(...normalizer.normalize(toLine(fixtures.userToolResult)));
      // 4. Success result
      allEvents.push(...normalizer.normalize(toLine(fixtures.successResult)));

      // Validate all events pass Zod
      validateAll(allEvents);

      // Check sequence
      const types = allEvents.map((e) => e.type);
      expect(types[0]).toBe('session_init');
      expect(types).toContain('turn_start');
      expect(types).toContain('text_delta');
      expect(types).toContain('tool_start');
      expect(types).toContain('tool_result');
      expect(types[types.length - 1]).toBe('turn_end');
    });

    it('handles a complete streaming conversation', () => {
      const allEvents: AgentEvent[] = [];

      // 1. System init
      allEvents.push(...normalizer.normalize(toLine(fixtures.systemInit)));
      // 2. Stream: message_start
      allEvents.push(...normalizer.normalize(toLine(fixtures.streamMessageStart)));
      // 3. Stream: text deltas
      allEvents.push(...normalizer.normalize(toLine(fixtures.streamContentBlockStartText)));
      allEvents.push(...normalizer.normalize(toLine(fixtures.streamTextDelta)));
      allEvents.push(...normalizer.normalize(toLine(fixtures.streamTextDelta2)));
      allEvents.push(...normalizer.normalize(toLine(fixtures.streamContentBlockStop)));
      // 4. Stream: tool use
      allEvents.push(...normalizer.normalize(toLine(fixtures.streamContentBlockStartTool)));
      allEvents.push(...normalizer.normalize(toLine(fixtures.streamInputJsonDelta)));
      // 5. Stream end
      allEvents.push(...normalizer.normalize(toLine(fixtures.streamMessageDelta)));
      allEvents.push(...normalizer.normalize(toLine(fixtures.streamMessageStop)));

      // Validate all events pass Zod
      validateAll(allEvents);

      const types = allEvents.map((e) => e.type);
      expect(types[0]).toBe('session_init');
      expect(types[1]).toBe('turn_start');
      expect(types.filter((t) => t === 'text_delta')).toHaveLength(2);
      expect(types).toContain('tool_start');
      expect(types).toContain('tool_input_delta');
    });
  });
});
