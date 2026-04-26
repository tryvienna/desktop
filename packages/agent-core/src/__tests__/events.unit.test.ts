import { describe, it, expect } from 'vitest';
import {
  AgentEventSchema,
  TokenUsageSchema,
  ToolCallSchema,
  ToolResultSchema,
  ApprovalMethodSchema,
  PROVIDER_EVENT_TYPES,
  APP_INJECTED_EVENT_TYPES,
} from '../events';
import type { AgentEvent } from '../events';

// ─────────────────────────────────────────────────────────────────────────────
// Building Blocks
// ─────────────────────────────────────────────────────────────────────────────

describe('TokenUsageSchema', () => {
  it('parses valid usage', () => {
    const usage = TokenUsageSchema.parse({
      inputTokens: 100,
      outputTokens: 50,
      cacheReadTokens: 30,
      cacheCreationTokens: 10,
      totalCostUsd: 0.005,
    });
    expect(usage.inputTokens).toBe(100);
    expect(usage.totalCostUsd).toBe(0.005);
  });

  it('accepts null for totalCostUsd', () => {
    const usage = TokenUsageSchema.parse({
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
      totalCostUsd: null,
    });
    expect(usage.totalCostUsd).toBeNull();
  });

  it('rejects missing fields', () => {
    expect(() => TokenUsageSchema.parse({ inputTokens: 100 })).toThrow();
  });
});

describe('ToolCallSchema', () => {
  it('parses valid tool call', () => {
    const call = ToolCallSchema.parse({
      id: 'tool_1',
      name: 'Bash',
      input: { command: 'ls -la' },
    });
    expect(call.name).toBe('Bash');
    expect(call.input).toEqual({ command: 'ls -la' });
  });
});

describe('ToolResultSchema', () => {
  it('parses success result', () => {
    const result = ToolResultSchema.parse({ success: true, output: 'hello' });
    expect(result.success).toBe(true);
    expect(result.output).toBe('hello');
  });

  it('parses error result', () => {
    const result = ToolResultSchema.parse({ success: false, error: 'failed' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('failed');
  });

  it('output and error are optional', () => {
    const result = ToolResultSchema.parse({ success: true });
    expect(result.output).toBeUndefined();
    expect(result.error).toBeUndefined();
  });
});

describe('ApprovalMethodSchema', () => {
  it('accepts all valid methods', () => {
    const methods = ['manual', 'session_rule', 'persistent_rule', 'trusted_tool', 'auto_policy'];
    for (const method of methods) {
      expect(ApprovalMethodSchema.parse(method)).toBe(method);
    }
  });

  it('rejects invalid method', () => {
    expect(() => ApprovalMethodSchema.parse('unknown')).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AgentEvent Discriminated Union
// ─────────────────────────────────────────────────────────────────────────────

describe('AgentEventSchema', () => {
  const validUsage = {
    inputTokens: 100,
    outputTokens: 50,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    totalCostUsd: null,
  };

  // --- Provider events ---

  it('parses session_init', () => {
    const event: AgentEvent = AgentEventSchema.parse({
      type: 'session_init',
      sessionId: 'sess-1',
      provider: 'claude-code',
      model: 'claude-sonnet-4-20250514',
      tools: ['Bash', 'Read', 'Write'],
      cwd: '/tmp',
    });
    expect(event.type).toBe('session_init');
    if (event.type === 'session_init') {
      expect(event.tools).toHaveLength(3);
    }
  });

  it('parses turn_start', () => {
    const event = AgentEventSchema.parse({
      type: 'turn_start',
      messageId: 'msg-1',
      timestamp: Date.now(),
    });
    expect(event.type).toBe('turn_start');
  });

  it('parses turn_end', () => {
    const event = AgentEventSchema.parse({
      type: 'turn_end',
      messageId: 'msg-1',
      durationMs: 1234,
      usage: validUsage,
    });
    expect(event.type).toBe('turn_end');
  });

  it('parses text_delta', () => {
    const event = AgentEventSchema.parse({
      type: 'text_delta',
      messageId: 'msg-1',
      text: 'Hello ',
    });
    expect(event.type).toBe('text_delta');
  });

  it('parses text_done', () => {
    const event = AgentEventSchema.parse({
      type: 'text_done',
      messageId: 'msg-1',
      fullText: 'Hello world',
    });
    expect(event.type).toBe('text_done');
  });

  it('parses thinking_start', () => {
    const event = AgentEventSchema.parse({ type: 'thinking_start', messageId: 'msg-1' });
    expect(event.type).toBe('thinking_start');
  });

  it('parses thinking_delta', () => {
    const event = AgentEventSchema.parse({
      type: 'thinking_delta',
      messageId: 'msg-1',
      text: 'Let me think...',
    });
    expect(event.type).toBe('thinking_delta');
  });

  it('parses thinking_done', () => {
    const event = AgentEventSchema.parse({ type: 'thinking_done', messageId: 'msg-1' });
    expect(event.type).toBe('thinking_done');
  });

  it('parses tool_start', () => {
    const event = AgentEventSchema.parse({
      type: 'tool_start',
      messageId: 'msg-1',
      tool: { id: 'tool_1', name: 'Bash', input: { command: 'ls' } },
    });
    expect(event.type).toBe('tool_start');
  });

  it('parses tool_input_delta', () => {
    const event = AgentEventSchema.parse({
      type: 'tool_input_delta',
      messageId: 'msg-1',
      toolId: 'tool_1',
      partialJson: '{"comma',
    });
    expect(event.type).toBe('tool_input_delta');
  });

  it('parses tool_permission_needed', () => {
    const event = AgentEventSchema.parse({
      type: 'tool_permission_needed',
      messageId: 'msg-1',
      toolId: 'tool_1',
      requestId: 'req-1',
      toolName: 'Bash',
      input: { command: 'rm -rf /' },
    });
    expect(event.type).toBe('tool_permission_needed');
  });

  it('parses tool_running with optional approvalMethod', () => {
    const withMethod = AgentEventSchema.parse({
      type: 'tool_running',
      messageId: 'msg-1',
      toolId: 'tool_1',
      approvalMethod: 'session_rule',
    });
    expect(withMethod.type).toBe('tool_running');

    const withoutMethod = AgentEventSchema.parse({
      type: 'tool_running',
      messageId: 'msg-1',
      toolId: 'tool_1',
    });
    expect(withoutMethod.type).toBe('tool_running');
  });

  it('parses tool_result', () => {
    const event = AgentEventSchema.parse({
      type: 'tool_result',
      messageId: 'msg-1',
      toolId: 'tool_1',
      result: { success: true, output: 'file1.ts\nfile2.ts' },
    });
    expect(event.type).toBe('tool_result');
  });

  it('parses error', () => {
    const event = AgentEventSchema.parse({
      type: 'error',
      code: 'TIMEOUT',
      message: 'Request timed out',
      retryable: true,
    });
    expect(event.type).toBe('error');
    if (event.type === 'error') {
      expect(event.messageId).toBeUndefined();
      expect(event.retryable).toBe(true);
    }
  });

  it('parses rate_limited', () => {
    const event = AgentEventSchema.parse({
      type: 'rate_limited',
      limitType: 'five_hour',
      resetsAt: 1700000000,
    });
    expect(event.type).toBe('rate_limited');
  });

  it('parses provider_event', () => {
    const event = AgentEventSchema.parse({
      type: 'provider_event',
      provider: 'claude-code',
      eventType: 'keep_alive',
      data: { timestamp: Date.now() },
    });
    expect(event.type).toBe('provider_event');
  });

  // --- App-injected events ---

  it('parses model_change', () => {
    const event = AgentEventSchema.parse({
      type: 'model_change',
      fromModel: 'claude-sonnet-4-20250514',
      toModel: 'claude-opus-4-20250514',
    });
    expect(event.type).toBe('model_change');
  });

  it('parses entity_link (linked)', () => {
    const event = AgentEventSchema.parse({
      type: 'entity_link',
      action: 'linked',
      entityUri: '@vienna//github_pr/owner/repo/42',
      entityType: 'github_pr',
      entityTitle: 'Fix auth bug',
    });
    expect(event.type).toBe('entity_link');
  });

  it('parses entity_link (unlinked)', () => {
    const event = AgentEventSchema.parse({
      type: 'entity_link',
      action: 'unlinked',
      entityUri: '@vienna//github_pr/owner/repo/42',
      entityType: 'github_pr',
      entityTitle: 'Fix auth bug',
    });
    expect(event.type).toBe('entity_link');
  });

  it('parses skill_activation', () => {
    const event = AgentEventSchema.parse({
      type: 'skill_activation',
      skills: [
        { id: 'commit', name: 'Git Commit', trigger: '/commit' },
        { id: 'review', name: 'PR Review' },
      ],
    });
    expect(event.type).toBe('skill_activation');
    if (event.type === 'skill_activation') {
      expect(event.skills).toHaveLength(2);
      expect(event.skills[1].trigger).toBeUndefined();
    }
  });

  it('parses interrupted', () => {
    const now = Date.now();
    const event = AgentEventSchema.parse({
      type: 'interrupted',
      timestamp: now,
    });
    expect(event.type).toBe('interrupted');
    if (event.type === 'interrupted') {
      expect(event.timestamp).toBe(now);
    }
  });

  it('parses compact_boundary', () => {
    const event = AgentEventSchema.parse({
      type: 'compact_boundary',
      trigger: 'auto',
      preTokens: 150000,
      status: 'complete',
    });
    expect(event.type).toBe('compact_boundary');
  });

  it('parses compact_boundary without optional status', () => {
    const event = AgentEventSchema.parse({
      type: 'compact_boundary',
      trigger: 'manual',
      preTokens: 80000,
    });
    expect(event.type).toBe('compact_boundary');
  });

  it('parses task_notification', () => {
    const event = AgentEventSchema.parse({
      type: 'task_notification',
      taskId: 'agent-abc',
      status: 'completed',
      summary: 'Background search finished',
    });
    expect(event.type).toBe('task_notification');
  });

  // --- Rejection ---

  it('rejects unknown event type', () => {
    const result = AgentEventSchema.safeParse({ type: 'unknown_event', data: {} });
    expect(result.success).toBe(false);
  });

  it('rejects event with missing required fields', () => {
    const result = AgentEventSchema.safeParse({ type: 'text_delta' });
    expect(result.success).toBe(false);
  });

  // --- Round-trip: serialize → deserialize ---

  it('round-trips through JSON for all event types', () => {
    const events: AgentEvent[] = [
      {
        type: 'session_init',
        sessionId: 's1',
        provider: 'claude-code',
        model: 'm1',
        tools: ['Bash'],
        cwd: '/tmp',
      },
      { type: 'turn_start', messageId: 'm1', timestamp: 1000 },
      { type: 'turn_end', messageId: 'm1', durationMs: 500, usage: validUsage },
      { type: 'text_delta', messageId: 'm1', text: 'hi' },
      { type: 'text_done', messageId: 'm1', fullText: 'hi there' },
      { type: 'thinking_start', messageId: 'm1' },
      { type: 'thinking_delta', messageId: 'm1', text: 'hmm' },
      { type: 'thinking_done', messageId: 'm1' },
      {
        type: 'tool_start',
        messageId: 'm1',
        tool: { id: 't1', name: 'Bash', input: {} },
      },
      { type: 'tool_input_delta', messageId: 'm1', toolId: 't1', partialJson: '{"x"' },
      {
        type: 'tool_permission_needed',
        messageId: 'm1',
        toolId: 't1',
        requestId: 'r1',
        toolName: 'Bash',
        input: {},
      },
      { type: 'tool_running', messageId: 'm1', toolId: 't1' },
      {
        type: 'tool_result',
        messageId: 'm1',
        toolId: 't1',
        result: { success: true },
      },
      { type: 'error', code: 'E', message: 'err', retryable: false },
      { type: 'rate_limited', limitType: 'hour', resetsAt: 9999 },
      { type: 'provider_event', provider: 'p', eventType: 'e', data: null },
      { type: 'model_change', fromModel: 'a', toModel: 'b' },
      {
        type: 'entity_link',
        action: 'linked',
        entityUri: 'u',
        entityType: 't',
        entityTitle: 'T',
      },
      { type: 'skill_activation', skills: [] },
      { type: 'interrupted', timestamp: 1000 },
      { type: 'compact_boundary', trigger: 'manual', preTokens: 1000 },
      {
        type: 'task_notification',
        taskId: 'tk',
        status: 'completed',
        summary: 's',
      },
    ];

    for (const event of events) {
      const json = JSON.stringify(event);
      const parsed = AgentEventSchema.parse(JSON.parse(json));
      expect(parsed.type).toBe(event.type);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Event Type Constants
// ─────────────────────────────────────────────────────────────────────────────

describe('Event type constants', () => {
  it('PROVIDER_EVENT_TYPES covers all provider event types', () => {
    expect(PROVIDER_EVENT_TYPES).toContain('session_init');
    expect(PROVIDER_EVENT_TYPES).toContain('text_delta');
    expect(PROVIDER_EVENT_TYPES).toContain('tool_result');
    expect(PROVIDER_EVENT_TYPES).not.toContain('model_change');
  });

  it('APP_INJECTED_EVENT_TYPES covers all app-injected event types', () => {
    expect(APP_INJECTED_EVENT_TYPES).toContain('model_change');
    expect(APP_INJECTED_EVENT_TYPES).toContain('entity_link');
    expect(APP_INJECTED_EVENT_TYPES).toContain('interrupted');
    expect(APP_INJECTED_EVENT_TYPES).not.toContain('text_delta');
  });

  it('provider + app types cover all event types in the union', () => {
    const allTypes = [...PROVIDER_EVENT_TYPES, ...APP_INJECTED_EVENT_TYPES];
    expect(allTypes).toHaveLength(27);
    // No duplicates
    expect(new Set(allTypes).size).toBe(allTypes.length);
  });
});
