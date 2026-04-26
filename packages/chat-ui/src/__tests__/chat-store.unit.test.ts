/**
 * ChatStore Unit Tests
 *
 * Tests the Zustand store's event processing logic. Each test feeds
 * AgentEvents through processEvent and asserts the resulting state.
 *
 * Key scenarios:
 * - Turn lifecycle (start → text_delta → text_done → turn_end)
 * - Tool lifecycle (tool_start → permission → running → result)
 * - Thinking blocks
 * - System events (model_change, entity_link, interrupted)
 * - Replay optimization (startReplay/endReplay bracket)
 * - Message grouping
 * - Error handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createChatStore, type ChatStore } from '../store/chat-store';
import type { AgentEvent } from '@vienna/agent-core';

type Store = ReturnType<typeof createChatStore>;

let store: Store;

function state(): ChatStore {
  return store.getState();
}

function process(event: AgentEvent, isFromHistory = false) {
  state().processEvent(event, isFromHistory);
}

beforeEach(() => {
  store = createChatStore();
});

// ─── Turn Lifecycle ───────────────────────────────────────────────────────

describe('turn lifecycle', () => {
  it('turn_start creates a new assistant message', () => {
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });

    expect(state().messages.size).toBe(1);
    const msg = state().messages.get('msg-1');
    expect(msg).toBeDefined();
    expect(msg!.role).toBe('assistant');
    expect(msg!.status).toBe('streaming');
    expect(msg!.isStreaming).toBe(true);
    expect(msg!.content).toEqual([]);
    expect(msg!.toolUses).toEqual([]);
  });

  it('turn_start sets streaming state', () => {
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });

    expect(state().isStreaming).toBe(true);
    expect(state().isAgentBusy).toBe(true);
    expect(state().streamingMessageId).toBe('msg-1');
  });

  it('turn_end completes the message and clears streaming', () => {
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    process({
      type: 'turn_end',
      messageId: 'msg-1',
      durationMs: 2000,
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 10,
        cacheCreationTokens: 5,
        totalCostUsd: 0.01,
      },
    });

    const msg = state().messages.get('msg-1');
    expect(msg!.status).toBe('complete');
    expect(msg!.isStreaming).toBe(false);
    expect(state().isStreaming).toBe(false);
    expect(state().isAgentBusy).toBe(false);
    expect(state().streamingMessageId).toBeNull();
  });

  it('turn_end updates usage stats', () => {
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    process({
      type: 'turn_end',
      messageId: 'msg-1',
      durationMs: 2000,
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 10,
        cacheCreationTokens: 5,
        totalCostUsd: 0.01,
      },
    });

    expect(state().usage.outputTokens).toBe(50);
    expect(state().usage.costUsd).toBe(0.01);
  });

  it('messageOrder tracks message order', () => {
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    process({
      type: 'turn_end',
      messageId: 'msg-1',
      durationMs: 1000,
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
        totalCostUsd: null,
      },
    });
    process({ type: 'turn_start', messageId: 'msg-2', timestamp: 2000 });

    expect(state().messageOrder).toEqual(['msg-1', 'msg-2']);
  });
});

// ─── Text Streaming ──────────────────────────────────────────────────────

describe('text streaming', () => {
  beforeEach(() => {
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
  });

  it('text_delta appends text to the message', () => {
    process({ type: 'text_delta', messageId: 'msg-1', text: 'Hello ' });
    process({ type: 'text_delta', messageId: 'msg-1', text: 'world!' });

    const msg = state().messages.get('msg-1')!;
    expect(msg.content).toHaveLength(1);
    expect(msg.content[0]).toEqual({ type: 'text', text: 'Hello world!' });
  });

  it('text_delta creates a new text block if last block is not text', () => {
    // Start with a thinking block then switch to text
    process({ type: 'thinking_start', messageId: 'msg-1' });
    process({ type: 'thinking_delta', messageId: 'msg-1', text: 'Hmm...' });
    process({ type: 'thinking_done', messageId: 'msg-1' });
    process({ type: 'text_delta', messageId: 'msg-1', text: 'Here is my answer.' });

    const msg = state().messages.get('msg-1')!;
    expect(msg.content).toHaveLength(2);
    expect(msg.content[0].type).toBe('thinking');
    expect(msg.content[1]).toEqual({ type: 'text', text: 'Here is my answer.' });
  });

  it('text_done replaces the text with the full content', () => {
    process({ type: 'text_delta', messageId: 'msg-1', text: 'Hel' });
    process({ type: 'text_delta', messageId: 'msg-1', text: 'lo!' });
    process({ type: 'text_done', messageId: 'msg-1', fullText: 'Hello!' });

    const msg = state().messages.get('msg-1')!;
    expect(msg.content).toHaveLength(1);
    expect(msg.content[0]).toEqual({ type: 'text', text: 'Hello!' });
  });

  it('text_delta for unknown messageId is a no-op', () => {
    const before = state().messages.size;
    process({ type: 'text_delta', messageId: 'nonexistent', text: 'test' });
    expect(state().messages.size).toBe(before);
  });
});

// ─── Thinking ─────────────────────────────────────────────────────────────

describe('thinking', () => {
  beforeEach(() => {
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
  });

  it('thinking_start sets isThinking', () => {
    process({ type: 'thinking_start', messageId: 'msg-1' });

    expect(state().isThinking).toBe(true);
    expect(state().messages.get('msg-1')!.isThinking).toBe(true);
  });

  it('thinking_delta appends thinking text', () => {
    process({ type: 'thinking_start', messageId: 'msg-1' });
    process({ type: 'thinking_delta', messageId: 'msg-1', text: 'Let me ' });
    process({ type: 'thinking_delta', messageId: 'msg-1', text: 'think...' });

    const msg = state().messages.get('msg-1')!;
    expect(msg.content).toHaveLength(1);
    expect(msg.content[0]).toEqual({ type: 'thinking', text: 'Let me think...' });
  });

  it('thinking_done clears isThinking', () => {
    process({ type: 'thinking_start', messageId: 'msg-1' });
    process({ type: 'thinking_delta', messageId: 'msg-1', text: 'thinking...' });
    process({ type: 'thinking_done', messageId: 'msg-1' });

    expect(state().isThinking).toBe(false);
    expect(state().messages.get('msg-1')!.isThinking).toBe(false);
  });
});

// ─── Tool Lifecycle ──────────────────────────────────────────────────────

describe('tool lifecycle', () => {
  beforeEach(() => {
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
  });

  it('tool_start creates a ToolUse and content block', () => {
    process({
      type: 'tool_start',
      messageId: 'msg-1',
      tool: { id: 'tool-1', name: 'Read', input: { file_path: '/src/index.ts' } },
    });

    const msg = state().messages.get('msg-1')!;
    expect(msg.toolUses).toHaveLength(1);
    expect(msg.toolUses[0]).toMatchObject({
      id: 'tool-1',
      name: 'Read',
      status: 'pending',
      input: { file_path: '/src/index.ts' },
    });
    expect(msg.content).toContainEqual({ type: 'tool_use', toolUseId: 'tool-1' });
  });

  it('tool_start prevents duplicates', () => {
    const tool = { id: 'tool-1', name: 'Read', input: {} };
    process({ type: 'tool_start', messageId: 'msg-1', tool });
    process({ type: 'tool_start', messageId: 'msg-1', tool });

    expect(state().messages.get('msg-1')!.toolUses).toHaveLength(1);
  });

  it('tool_permission_needed sets status and requestId', () => {
    process({
      type: 'tool_start',
      messageId: 'msg-1',
      tool: { id: 'tool-1', name: 'Bash', input: { command: 'rm -rf' } },
    });
    process({
      type: 'tool_permission_needed',
      messageId: 'msg-1',
      toolId: 'tool-1',
      requestId: 'req-001',
      toolName: 'Bash',
      input: { command: 'rm -rf' },
    });

    const tu = state().messages.get('msg-1')!.toolUses[0];
    expect(tu.status).toBe('pending_permission');
    expect(tu.requestId).toBe('req-001');
  });

  it('tool_running sets status and approvalMethod', () => {
    process({
      type: 'tool_start',
      messageId: 'msg-1',
      tool: { id: 'tool-1', name: 'Read', input: {} },
    });
    process({
      type: 'tool_running',
      messageId: 'msg-1',
      toolId: 'tool-1',
      approvalMethod: 'trusted_tool',
    });

    const tu = state().messages.get('msg-1')!.toolUses[0];
    expect(tu.status).toBe('running');
    expect(tu.approvalMethod).toBe('trusted_tool');
    expect(tu.requestId).toBeUndefined();
  });

  it('tool_result sets status and result (success)', () => {
    process({
      type: 'tool_start',
      messageId: 'msg-1',
      tool: { id: 'tool-1', name: 'Read', input: {} },
    });
    process({
      type: 'tool_result',
      messageId: 'msg-1',
      toolId: 'tool-1',
      result: { success: true, output: 'file contents' },
    });

    const tu = state().messages.get('msg-1')!.toolUses[0];
    expect(tu.status).toBe('complete');
    expect(tu.result).toEqual({ success: true, output: 'file contents' });
    expect(tu.isStreaming).toBe(false);
  });

  it('tool_result sets error status on failure', () => {
    process({
      type: 'tool_start',
      messageId: 'msg-1',
      tool: { id: 'tool-1', name: 'Bash', input: {} },
    });
    process({
      type: 'tool_result',
      messageId: 'msg-1',
      toolId: 'tool-1',
      result: { success: false, error: 'Permission denied' },
    });

    const tu = state().messages.get('msg-1')!.toolUses[0];
    expect(tu.status).toBe('error');
    expect(tu.result!.error).toBe('Permission denied');
  });

  it('tool_input_delta marks tool as streaming', () => {
    process({
      type: 'tool_start',
      messageId: 'msg-1',
      tool: { id: 'tool-1', name: 'Bash', input: {} },
    });
    process({
      type: 'tool_input_delta',
      messageId: 'msg-1',
      toolId: 'tool-1',
      partialJson: '{"comma',
    });

    const tu = state().messages.get('msg-1')!.toolUses[0];
    expect(tu.isStreaming).toBe(true);
  });

  it('subagent tool_permission_needed creates synthetic tool use', () => {
    // Only an Agent tool exists in the message
    process({
      type: 'tool_start',
      messageId: 'msg-1',
      tool: { id: 'agent-tool', name: 'Agent', input: {} },
    });
    expect(state().messages.get('msg-1')!.toolUses).toHaveLength(1);

    // Permission event arrives for a subagent's WebSearch tool (not in this message)
    process({
      type: 'tool_permission_needed',
      messageId: 'msg-1',
      toolId: 'sub-tool-1',
      requestId: 'req-sub-1',
      toolName: 'WebSearch',
      input: { query: 'test query' },
    });

    const msg = state().messages.get('msg-1')!;
    expect(msg.toolUses).toHaveLength(2);
    expect(msg.toolUses[1]).toMatchObject({
      id: 'sub-tool-1',
      name: 'WebSearch',
      status: 'pending_permission',
      requestId: 'req-sub-1',
      input: { query: 'test query' },
    });
    expect(msg.content).toContainEqual({ type: 'tool_use', toolUseId: 'sub-tool-1' });
  });

  it('resolvePermission transitions synthetic subagent tools to running (like regular tools)', () => {
    process({
      type: 'tool_start',
      messageId: 'msg-1',
      tool: { id: 'agent-tool', name: 'Agent', input: {} },
    });
    process({
      type: 'tool_permission_needed',
      messageId: 'msg-1',
      toolId: 'sub-tool-1',
      requestId: 'req-sub-1',
      toolName: 'WebSearch',
      input: { query: 'test' },
    });
    expect(state().messages.get('msg-1')!.toolUses).toHaveLength(2);

    // Approve the synthetic tool permission
    state().resolvePermission('req-sub-1', true, 'manual');

    // Synthetic tool should transition to running (same as regular tools)
    const msg = state().messages.get('msg-1')!;
    expect(msg.toolUses).toHaveLength(2);
    expect(msg.toolUses[1].status).toBe('running');
    expect(msg.toolUses[1].approvalMethod).toBe('manual');
  });

  it('synthetic subagent tools transition through normal lifecycle', () => {
    process({
      type: 'tool_start',
      messageId: 'msg-1',
      tool: { id: 'agent-tool', name: 'Agent', input: {} },
    });
    process({
      type: 'tool_permission_needed',
      messageId: 'msg-1',
      toolId: 'sub-tool-1',
      requestId: 'req-sub-1',
      toolName: 'WebSearch',
      input: { query: 'test' },
    });

    // tool_running transitions synthetic tool to running
    process({
      type: 'tool_running',
      messageId: 'msg-1',
      toolId: 'sub-tool-1',
      approvalMethod: 'manual',
    });
    expect(state().messages.get('msg-1')!.toolUses[1].status).toBe('running');

    // tool_result transitions synthetic tool to complete/error
    process({
      type: 'tool_result',
      messageId: 'msg-1',
      toolId: 'sub-tool-1',
      result: { success: false, error: 'Permission denied by user' },
    });
    expect(state().messages.get('msg-1')!.toolUses[1].status).toBe('error');
  });

  it('turn_end completes remaining synthetic subagent tools (same message)', () => {
    process({
      type: 'tool_start',
      messageId: 'msg-1',
      tool: { id: 'agent-tool', name: 'Agent', input: {} },
    });
    process({
      type: 'tool_permission_needed',
      messageId: 'msg-1',
      toolId: 'sub-tool-1',
      requestId: 'req-sub-1',
      toolName: 'WebSearch',
      input: { query: 'test' },
    });
    // Approve — synthetic tool transitions to running
    process({
      type: 'tool_running',
      messageId: 'msg-1',
      toolId: 'sub-tool-1',
      approvalMethod: 'manual',
    });
    expect(state().messages.get('msg-1')!.toolUses).toHaveLength(2);

    // turn_end completes the synthetic tool (no tool_result comes from CLI for subagents)
    process({
      type: 'turn_end',
      messageId: 'msg-1',
      durationMs: 1000,
      usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, totalCostUsd: null },
    });

    const msg = state().messages.get('msg-1')!;
    // Synthetic tool stays visible but transitions to complete
    expect(msg.toolUses).toHaveLength(2);
    expect(msg.toolUses[1].name).toBe('WebSearch');
    expect(msg.toolUses[1].status).toBe('complete');
  });

  it('turn_end completes synthetic subagent tools from a DIFFERENT message', () => {
    // Synthetic tools are on msg-1, but turn_end fires for msg-1 first
    // then msg-2 later (the agent continues after subagent completes)
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    process({
      type: 'tool_start',
      messageId: 'msg-1',
      tool: { id: 'agent-tool', name: 'Agent', input: {} },
    });
    process({
      type: 'tool_permission_needed',
      messageId: 'msg-1',
      toolId: 'sub-tool-1',
      requestId: 'req-sub-1',
      toolName: 'WebSearch',
      input: { query: 'test' },
    });
    process({
      type: 'tool_running',
      messageId: 'msg-1',
      toolId: 'sub-tool-1',
      approvalMethod: 'manual',
    });
    // Agent tool completes
    process({
      type: 'tool_result',
      messageId: 'msg-1',
      toolId: 'agent-tool',
      result: { success: true, output: 'done' },
    });
    process({
      type: 'turn_end',
      messageId: 'msg-1',
      durationMs: 1000,
      usage: { inputTokens: 50, outputTokens: 25, cacheReadTokens: 0, cacheCreationTokens: 0, totalCostUsd: null },
    });

    // Synthetic tool should be completed (visible in UI)
    const msg1 = state().messages.get('msg-1')!;
    expect(msg1.toolUses).toHaveLength(2);
    expect(msg1.toolUses[0].name).toBe('Agent');
    expect(msg1.toolUses[0].status).toBe('complete');
    expect(msg1.toolUses[1].name).toBe('WebSearch');
    expect(msg1.toolUses[1].status).toBe('complete');

    // Now simulate: a new turn starts on msg-2 (the agent continues processing)
    process({ type: 'turn_start', messageId: 'msg-2', timestamp: 2000 });
    process({
      type: 'tool_start',
      messageId: 'msg-2',
      tool: { id: 'another-agent', name: 'Agent', input: {} },
    });
    // New subagent permission on msg-2
    process({
      type: 'tool_permission_needed',
      messageId: 'msg-2',
      toolId: 'sub-tool-2',
      requestId: 'req-sub-2',
      toolName: 'WebFetch',
      input: { url: 'https://example.com' },
    });
    process({
      type: 'tool_running',
      messageId: 'msg-2',
      toolId: 'sub-tool-2',
      approvalMethod: 'manual',
    });
    // turn_end fires for msg-2 — should complete sub-tool-2 on msg-2
    process({
      type: 'turn_end',
      messageId: 'msg-2',
      durationMs: 2000,
      usage: { inputTokens: 100, outputTokens: 50, cacheReadTokens: 0, cacheCreationTokens: 0, totalCostUsd: null },
    });

    const msg2 = state().messages.get('msg-2')!;
    expect(msg2.toolUses).toHaveLength(2);
    expect(msg2.toolUses[0].name).toBe('Agent');
    expect(msg2.toolUses[1].name).toBe('WebFetch');
    expect(msg2.toolUses[1].status).toBe('complete');
  });

  it('replay of subagent permission lifecycle does not leave stale permissions', () => {
    // Simulate replay of the real-world pattern:
    // msg-1 has synthetic tools, but turn_end fires for msg-2 (different messageId)
    state().startReplay();

    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 }, true);
    process({
      type: 'tool_start',
      messageId: 'msg-1',
      tool: { id: 'agent-tool', name: 'Agent', input: { prompt: 'search' } },
    }, true);
    process({
      type: 'tool_permission_needed',
      messageId: 'msg-1',
      toolId: 'sub-tool-1',
      requestId: 'req-sub-1',
      toolName: 'WebSearch',
      input: { query: 'test' },
    }, true);
    // At this point, synthetic tool exists with pending_permission
    expect(state().messages.get('msg-1')!.toolUses).toHaveLength(2);
    expect(state().messages.get('msg-1')!.toolUses[1].status).toBe('pending_permission');

    process({
      type: 'tool_running',
      messageId: 'msg-1',
      toolId: 'sub-tool-1',
      approvalMethod: 'manual',
    }, true);
    // Synthetic tool transitions to running (not pending_permission)
    expect(state().messages.get('msg-1')!.toolUses[1].status).toBe('running');

    // Agent tool completes on msg-1
    process({
      type: 'tool_result',
      messageId: 'msg-1',
      toolId: 'agent-tool',
      result: { success: true, output: 'done' },
    }, true);
    process({
      type: 'turn_end',
      messageId: 'msg-1',
      durationMs: 5000,
      usage: { inputTokens: 100, outputTokens: 50, cacheReadTokens: 0, cacheCreationTokens: 0, totalCostUsd: null },
    }, true);

    // A continuation turn on msg-2 (common pattern: agent continues after subagent)
    process({ type: 'turn_start', messageId: 'msg-2', timestamp: 6000 }, true);
    process({ type: 'text_delta', messageId: 'msg-2', text: 'Based on the search results...' }, true);
    process({
      type: 'turn_end',
      messageId: 'msg-2',
      durationMs: 2000,
      usage: { inputTokens: 200, outputTokens: 100, cacheReadTokens: 0, cacheCreationTokens: 0, totalCostUsd: null },
    }, true);

    state().endReplay();

    // After replay, synthetic tool is completed and no pending permissions remain
    const msg = state().messages.get('msg-1')!;
    expect(msg.toolUses).toHaveLength(2);
    expect(msg.toolUses[0].name).toBe('Agent');
    expect(msg.toolUses[0].status).toBe('complete');
    expect(msg.toolUses[1].name).toBe('WebSearch');
    expect(msg.toolUses[1].status).toBe('complete');
    expect(msg.toolUses.some((tu) => tu.status === 'pending_permission')).toBe(false);
  });

  it('full tool lifecycle: start → permission → running → result', () => {
    process({
      type: 'tool_start',
      messageId: 'msg-1',
      tool: { id: 'tool-1', name: 'Bash', input: { command: 'npm test' } },
    });
    expect(state().messages.get('msg-1')!.toolUses[0].status).toBe('pending');

    process({
      type: 'tool_permission_needed',
      messageId: 'msg-1',
      toolId: 'tool-1',
      requestId: 'req-1',
      toolName: 'Bash',
      input: { command: 'npm test' },
    });
    expect(state().messages.get('msg-1')!.toolUses[0].status).toBe('pending_permission');

    process({
      type: 'tool_running',
      messageId: 'msg-1',
      toolId: 'tool-1',
      approvalMethod: 'session_rule',
    });
    expect(state().messages.get('msg-1')!.toolUses[0].status).toBe('running');

    process({
      type: 'tool_result',
      messageId: 'msg-1',
      toolId: 'tool-1',
      result: { success: true, output: 'All tests passed' },
    });
    expect(state().messages.get('msg-1')!.toolUses[0].status).toBe('complete');
  });
});

// ─── Error Events ────────────────────────────────────────────────────────

describe('error events', () => {
  it('error sets error state', () => {
    process({
      type: 'error',
      code: 'api_error',
      message: 'API connection failed',
      retryable: true,
    });

    expect(state().error).toEqual({
      code: 'api_error',
      message: 'API connection failed',
    });
  });

  it('error with messageId marks message as error', () => {
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    process({
      type: 'error',
      messageId: 'msg-1',
      code: 'provider_error',
      message: 'Process crashed',
      retryable: false,
    });

    const msg = state().messages.get('msg-1')!;
    expect(msg.status).toBe('error');
    expect(msg.isStreaming).toBe(false);
  });

  it('rate_limited creates error with reset time', () => {
    const resetsAt = Math.floor(Date.now() / 1000) + 60;
    process({ type: 'rate_limited', limitType: 'tokens', resetsAt });

    expect(state().error).toBeDefined();
    expect(state().error!.code).toBe('rate_limited');
    expect(state().error!.message).toContain('Usage limit reached');
    expect(state().error!.message).not.toContain('(using overage)');
    // Verify resetsAt is treated as seconds — the formatted time should be reasonable
    expect(state().error!.message).toMatch(/Resets at \d{1,2}:\d{2}/);
  });

  it('rate_limited with overage includes overage note', () => {
    const resetsAt = Math.floor(Date.now() / 1000) + 60;
    process({ type: 'rate_limited', limitType: 'five_hour', resetsAt, isUsingOverage: true });

    expect(state().error).toBeDefined();
    expect(state().error!.code).toBe('rate_limited');
    expect(state().error!.message).toContain('(using overage)');
  });
});

// ─── System Events ──────────────────────────────────────────────────────

describe('system events', () => {
  it('model_change creates system message', () => {
    process({
      type: 'model_change',
      fromModel: 'sonnet',
      toModel: 'opus',
    });

    expect(state().messages.size).toBe(1);
    const msg = state().getMessages()[0];
    expect(msg.role).toBe('system');
    expect(msg.content[0]).toMatchObject({
      type: 'system_event',
      eventType: 'model_change',
    });
  });

  it('entity_link creates system message', () => {
    process({
      type: 'entity_link',
      action: 'linked',
      entityUri: '@vienna//github_pr/org/repo/42',
      entityType: 'github_pr',
      entityTitle: 'PR #42',
    });

    const msg = state().getMessages()[0];
    expect(msg.role).toBe('system');
    expect(msg.content[0]).toMatchObject({
      type: 'system_event',
      eventType: 'entity_link',
    });
  });

  it('interrupted stops streaming and creates system message', () => {
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    process({ type: 'text_delta', messageId: 'msg-1', text: 'Hello...' });

    expect(state().isStreaming).toBe(true);

    process({ type: 'interrupted', timestamp: Date.now() });

    expect(state().isStreaming).toBe(false);
    expect(state().streamingMessageId).toBeNull();
    expect(state().messages.get('msg-1')!.status).toBe('interrupted');

    // System message created
    expect(state().messages.size).toBe(2);
    const sysMsg = state().getMessages()[1];
    expect(sysMsg.role).toBe('system');
    expect(sysMsg.content[0]).toMatchObject({
      type: 'system_event',
      eventType: 'interrupted',
    });
  });

  it('interrupted clears all processing flags', () => {
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    process({ type: 'text_delta', messageId: 'msg-1', text: 'Hello' });

    // Pre-conditions
    expect(state().isAgentBusy).toBe(true);
    expect(state().isStreaming).toBe(true);

    process({ type: 'interrupted', timestamp: Date.now() });

    expect(state().isAgentBusy).toBe(false);
    expect(state().isStreaming).toBe(false);
    expect(state().isThinking).toBe(false);
    expect(state().isPreparingResponse).toBe(false);
    expect(state().isPendingInterrupt).toBe(false);
    expect(state().streamingMessageId).toBeNull();
  });

  it('interrupted with no streaming message still clears flags and creates system message', () => {
    // Simulate isAgentBusy without a streaming message (e.g., between turns)
    store.setState({ isAgentBusy: true, isPreparingResponse: true });

    process({ type: 'interrupted', timestamp: Date.now() });

    expect(state().isAgentBusy).toBe(false);
    expect(state().isPreparingResponse).toBe(false);

    // System message still created
    expect(state().messages.size).toBe(1);
    const sysMsg = state().getMessages()[0]!;
    expect(sysMsg.role).toBe('system');
    expect(sysMsg.content[0]).toMatchObject({
      type: 'system_event',
      eventType: 'interrupted',
    });
  });

  it('interrupted during thinking clears isThinking on both store and message', () => {
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    process({ type: 'thinking_start', messageId: 'msg-1' });
    process({ type: 'thinking_delta', messageId: 'msg-1', text: 'thinking...' });

    expect(state().isThinking).toBe(true);
    expect(state().messages.get('msg-1')!.isThinking).toBe(true);

    process({ type: 'interrupted', timestamp: Date.now() });

    expect(state().isThinking).toBe(false);
    expect(state().messages.get('msg-1')!.isThinking).toBe(false);
    expect(state().messages.get('msg-1')!.status).toBe('interrupted');
  });

  it('interrupted during tool execution marks running tools as error', () => {
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    process({
      type: 'tool_start',
      messageId: 'msg-1',
      tool: { id: 'tool-1', name: 'Bash', input: { command: 'ls' } },
    });
    process({ type: 'tool_running', messageId: 'msg-1', toolId: 'tool-1' });

    const toolBefore = state().messages.get('msg-1')!.toolUses[0]!;
    expect(toolBefore.status).toBe('running');

    process({ type: 'interrupted', timestamp: Date.now() });

    const msg = state().messages.get('msg-1')!;
    expect(msg.status).toBe('interrupted');
    expect(msg.toolUses[0]!.status).toBe('error');
    expect(msg.toolUses[0]!.result).toEqual({ success: false, error: 'Interrupted' });
  });

  it('interrupted during pending tool marks it as error', () => {
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    process({
      type: 'tool_start',
      messageId: 'msg-1',
      tool: { id: 'tool-1', name: 'Bash', input: {} },
    });

    expect(state().messages.get('msg-1')!.toolUses[0]!.status).toBe('pending');

    process({ type: 'interrupted', timestamp: Date.now() });

    expect(state().messages.get('msg-1')!.toolUses[0]!.status).toBe('error');
    expect(state().messages.get('msg-1')!.toolUses[0]!.result).toEqual({ success: false, error: 'Interrupted' });
  });

  it('interrupted during permission wait marks pending_permission tool as error', () => {
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    process({
      type: 'tool_start',
      messageId: 'msg-1',
      tool: { id: 'tool-1', name: 'Write', input: {} },
    });
    process({
      type: 'tool_permission_needed',
      messageId: 'msg-1',
      toolId: 'tool-1',
      requestId: 'req-1',
      toolName: 'Write',
      input: { file_path: '/test.ts' },
    });

    expect(state().messages.get('msg-1')!.toolUses[0]!.status).toBe('pending_permission');

    process({ type: 'interrupted', timestamp: Date.now() });

    expect(state().messages.get('msg-1')!.toolUses[0]!.status).toBe('error');
    expect(state().messages.get('msg-1')!.toolUses[0]!.result).toEqual({ success: false, error: 'Interrupted' });
    expect(state().isAgentBusy).toBe(false);
  });

  it('interrupted preserves already-completed tools', () => {
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    process({
      type: 'tool_start',
      messageId: 'msg-1',
      tool: { id: 'tool-1', name: 'Read', input: { file_path: '/a.ts' } },
    });
    process({ type: 'tool_running', messageId: 'msg-1', toolId: 'tool-1' });
    process({
      type: 'tool_result',
      messageId: 'msg-1',
      toolId: 'tool-1',
      result: { success: true, output: 'file content' },
    });
    // Start a second tool but interrupt before it completes
    process({
      type: 'tool_start',
      messageId: 'msg-1',
      tool: { id: 'tool-2', name: 'Bash', input: { command: 'sleep 100' } },
    });
    process({ type: 'tool_running', messageId: 'msg-1', toolId: 'tool-2' });

    process({ type: 'interrupted', timestamp: Date.now() });

    const msg = state().messages.get('msg-1')!;
    // First tool should remain complete
    expect(msg.toolUses[0]!.status).toBe('complete');
    expect(msg.toolUses[0]!.result).toEqual({ success: true, output: 'file content' });
    // Second tool should be error (interrupted)
    expect(msg.toolUses[1]!.status).toBe('error');
    expect(msg.toolUses[1]!.result).toEqual({ success: false, error: 'Interrupted' });
  });

  it('interrupted preserves content already streamed', () => {
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    process({ type: 'text_delta', messageId: 'msg-1', text: 'Hello ' });
    process({ type: 'text_delta', messageId: 'msg-1', text: 'world' });

    process({ type: 'interrupted', timestamp: Date.now() });

    const msg = state().messages.get('msg-1')!;
    expect(msg.content[0]).toEqual({ type: 'text', text: 'Hello world' });
    expect(msg.status).toBe('interrupted');
  });

  it('double interrupt is safe (second is a no-op)', () => {
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    process({ type: 'text_delta', messageId: 'msg-1', text: 'Hello' });

    process({ type: 'interrupted', timestamp: Date.now() });
    const stateAfterFirst = {
      isAgentBusy: state().isAgentBusy,
      isStreaming: state().isStreaming,
      messagesSize: state().messages.size,
    };

    process({ type: 'interrupted', timestamp: Date.now() });
    // Second interrupt is skipped entirely (agent is no longer busy)
    expect(state().isAgentBusy).toBe(stateAfterFirst.isAgentBusy);
    expect(state().isStreaming).toBe(stateAfterFirst.isStreaming);
    expect(state().messages.size).toBe(stateAfterFirst.messagesSize);
  });

  it('replayed interrupted event produces correct state', () => {
    const events: AgentEvent[] = [
      { type: 'turn_start', messageId: 'msg-1', timestamp: 1000 },
      { type: 'text_delta', messageId: 'msg-1', text: 'Before interrupt' },
      { type: 'interrupted', timestamp: 2000 },
    ];

    state().startReplay();
    for (const event of events) {
      state().processEvent(event, true);
    }
    state().endReplay();

    expect(state().messages.get('msg-1')!.status).toBe('interrupted');
    expect(state().messages.get('msg-1')!.content[0]).toEqual({ type: 'text', text: 'Before interrupt' });
    expect(state().isAgentBusy).toBe(false);
    expect(state().isStreaming).toBe(false);
    // System message exists
    const msgs = state().getMessages();
    expect(msgs.length).toBe(2);
    expect(msgs[1]!.role).toBe('system');
    expect(msgs[1]!.isFromHistory).toBe(true);
  });

  it('compact_boundary creates system message with proper content type', () => {
    process({
      type: 'compact_boundary',
      trigger: 'manual',
      preTokens: 50000,
    });

    const msg = state().getMessages()[0];
    expect(msg.content[0]).toMatchObject({
      type: 'compact_boundary',
      trigger: 'manual',
      preTokens: 50000,
      status: 'complete',
    });
  });

  it('compact_boundary replaces synthetic compacting message with real one', () => {
    // First: synthetic "compacting" event
    process({
      type: 'compact_boundary',
      trigger: 'manual',
      preTokens: 0,
      status: 'compacting',
    });

    const msgs1 = state().getMessages();
    expect(msgs1).toHaveLength(1);
    expect(msgs1[0].content[0]).toMatchObject({
      type: 'compact_boundary',
      status: 'compacting',
    });

    const syntheticId = msgs1[0].id;

    // Second: real compact_boundary from CLI (no status = complete)
    process({
      type: 'compact_boundary',
      trigger: 'manual',
      preTokens: 42000,
    });

    const msgs2 = state().getMessages();
    // Should still be 1 message (replaced, not appended)
    expect(msgs2).toHaveLength(1);
    expect(msgs2[0].id).toBe(syntheticId);
    expect(msgs2[0].content[0]).toMatchObject({
      type: 'compact_boundary',
      trigger: 'manual',
      preTokens: 42000,
      status: 'complete',
    });
  });

  it('skill_activation creates system message', () => {
    process({
      type: 'skill_activation',
      skills: [{ id: 'commit', name: 'commit' }],
    });

    const msg = state().getMessages()[0];
    expect(msg.content[0]).toMatchObject({
      type: 'system_event',
      eventType: 'skill_activation',
    });
  });

  it('task_notification skips completed status when no matching tool (tool renderer shows checkmark)', () => {
    process({
      type: 'task_notification',
      taskId: 'task-1',
      status: 'completed',
      summary: 'Research complete',
    });

    expect(state().getMessages()).toHaveLength(0);
  });

  it('task_notification creates system message for failed status when no matching tool', () => {
    process({
      type: 'task_notification',
      taskId: 'task-1',
      status: 'failed',
      summary: 'Research failed',
    });

    const msg = state().getMessages()[0];
    expect(msg.content[0]).toMatchObject({
      type: 'system_event',
      eventType: 'task_notification',
    });
  });

  it('task_notification updates background tool instead of creating system message', () => {
    // Start a turn with a tool
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1 });
    process({
      type: 'tool_start',
      messageId: 'msg-1',
      tool: { id: 'tool-1', name: 'Bash', input: { command: 'pnpm dev', run_in_background: true } },
    });

    // Tool result indicates background task
    process({
      type: 'tool_result',
      messageId: 'msg-1',
      toolId: 'tool-1',
      result: {
        success: true,
        output: 'Command running in background with ID: bg-task-123. Output is being written to: /tmp/tasks/bg-task-123.output',
      },
    });

    // Verify backgroundTask is set to running
    const toolBefore = state().getToolUse('msg-1', 'tool-1');
    expect(toolBefore?.backgroundTask).toEqual({ taskId: 'bg-task-123', status: 'running' });

    // Task notification arrives
    process({
      type: 'task_notification',
      taskId: 'bg-task-123',
      status: 'failed',
      summary: 'Background command "pnpm dev" failed with exit code 1',
    });

    // Should update the tool, not create a system message
    const messages = state().getMessages();
    expect(messages).toHaveLength(1); // Only the assistant message, no system message

    const toolAfter = state().getToolUse('msg-1', 'tool-1');
    expect(toolAfter?.backgroundTask).toEqual({
      taskId: 'bg-task-123',
      status: 'failed',
      summary: 'Background command "pnpm dev" failed with exit code 1',
    });
  });

  it('task_notification updates Agent tool via agentId extracted from tool_result', () => {
    // Agent tool result output contains "agentId: <id>" which is the same
    // as the task_id in task_notification events. This deterministic link
    // replaces the need for temporal correlation between task_started and
    // the preceding tool_start.
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1 });
    process({
      type: 'tool_start',
      messageId: 'msg-1',
      tool: { id: 'agent-tool-1', name: 'Agent', input: { description: 'Research task', subagent_type: 'general-purpose' } },
    });

    // Agent tool completes — output contains agentId matching the task_id
    process({
      type: 'tool_result',
      messageId: 'msg-1',
      toolId: 'agent-tool-1',
      result: {
        success: true,
        output: 'Research complete.\nagentId: a389c514f40faa116 (for resuming to continue this agent\'s work if needed)\n<usage>total_tokens: 11861\ntool_uses: 0\nduration_ms: 796</usage>',
      },
    });

    // Agent tools don't get a visible backgroundTask badge (unlike Bash background tasks)
    const toolBefore = state().getToolUse('msg-1', 'agent-tool-1');
    expect(toolBefore?.backgroundTask).toBeUndefined();

    // task_notification arrives using the same task_id as agentId
    process({
      type: 'task_notification',
      taskId: 'a389c514f40faa116',
      status: 'completed',
      summary: 'Research completed successfully',
    });

    // Should update the Agent tool card, not create a system message
    const messages = state().getMessages();
    expect(messages).toHaveLength(1); // Only the assistant message

    // The tool should now have a backgroundTask with the notification status
    const toolAfter = state().getToolUse('msg-1', 'agent-tool-1');
    expect(toolAfter?.backgroundTask).toEqual({
      taskId: 'a389c514f40faa116',
      status: 'completed',
      summary: 'Research completed successfully',
    });
  });
});

// ─── Informational Events ────────────────────────────────────────────────

describe('informational events', () => {
  it('session_init is a no-op', () => {
    process({
      type: 'session_init',
      sessionId: 'sess-1',
      provider: 'claude-code',
      model: 'opus',
      tools: ['Read', 'Write'],
      cwd: '/tmp',
    });

    expect(state().messages.size).toBe(0);
  });

  it('provider_event creates a system message for non-suppressed subtypes', () => {
    process({
      type: 'provider_event',
      provider: 'claude-code',
      eventType: 'status',
      data: { status: 'some_status' },
      timestamp: 1000,
    });

    expect(state().messages.size).toBe(1);
    const msg = [...state().messages.values()][0]!;
    expect(msg.role).toBe('system');
    expect(msg.content[0]).toEqual(
      expect.objectContaining({ type: 'system_event', eventType: 'provider_event' }),
    );
    expect(msg.timestamp).toBe(1000);
  });

  it('provider_event suppresses noisy subagent subtypes (task_started, task_progress, sub_agent_assistant)', () => {
    // These subtypes are internal to the Agent tool's subagent lifecycle.
    // They must NOT create standalone timeline messages — they previously
    // caused a wall of "claude-code / task_progress" spam in the chat.
    const noisySubtypes = ['task_started', 'task_progress', 'sub_agent_assistant'];

    for (const subtype of noisySubtypes) {
      process({
        type: 'provider_event',
        provider: 'claude-code',
        eventType: subtype,
        data: { task_id: 'test-123', description: 'test' },
        timestamp: 1000,
      });
    }

    // None of the noisy subtypes should create messages
    expect(state().messages.size).toBe(0);
  });
});

// ─── Replay ──────────────────────────────────────────────────────────────

describe('replay', () => {
  it('startReplay + endReplay produces correct state', () => {
    const events: AgentEvent[] = [
      { type: 'turn_start', messageId: 'msg-1', timestamp: 1000 },
      { type: 'text_delta', messageId: 'msg-1', text: 'Hello!' },
      { type: 'text_done', messageId: 'msg-1', fullText: 'Hello!' },
      {
        type: 'turn_end',
        messageId: 'msg-1',
        durationMs: 1000,
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          cacheReadTokens: 0,
          cacheCreationTokens: 0,
          totalCostUsd: null,
        },
      },
      { type: 'turn_start', messageId: 'msg-2', timestamp: 2000 },
      { type: 'text_delta', messageId: 'msg-2', text: 'Goodbye!' },
      { type: 'text_done', messageId: 'msg-2', fullText: 'Goodbye!' },
      {
        type: 'turn_end',
        messageId: 'msg-2',
        durationMs: 800,
        usage: {
          inputTokens: 20,
          outputTokens: 10,
          cacheReadTokens: 0,
          cacheCreationTokens: 0,
          totalCostUsd: null,
        },
      },
    ];

    state().startReplay();
    for (const event of events) {
      state().processEvent(event, true);
    }
    state().endReplay();

    expect(state().messages.size).toBe(2);
    expect(state().messageOrder).toEqual(['msg-1', 'msg-2']);
    expect(state().messages.get('msg-1')!.content[0]).toEqual({ type: 'text', text: 'Hello!' });
    expect(state().messages.get('msg-2')!.content[0]).toEqual({ type: 'text', text: 'Goodbye!' });
    expect(state().isStreaming).toBe(false);
  });

  it('replay produces same final state as live', () => {
    const events: AgentEvent[] = [
      { type: 'turn_start', messageId: 'msg-1', timestamp: 1000 },
      { type: 'text_delta', messageId: 'msg-1', text: 'Hello ' },
      { type: 'text_delta', messageId: 'msg-1', text: 'world!' },
      { type: 'text_done', messageId: 'msg-1', fullText: 'Hello world!' },
      {
        type: 'tool_start',
        messageId: 'msg-1',
        tool: { id: 'tool-1', name: 'Read', input: { file_path: '/test.ts' } },
      },
      { type: 'tool_running', messageId: 'msg-1', toolId: 'tool-1' },
      {
        type: 'tool_result',
        messageId: 'msg-1',
        toolId: 'tool-1',
        result: { success: true, output: 'content' },
      },
      {
        type: 'turn_end',
        messageId: 'msg-1',
        durationMs: 2000,
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          cacheReadTokens: 0,
          cacheCreationTokens: 0,
          totalCostUsd: 0.01,
        },
      },
    ];

    // Live processing
    const liveStore = createChatStore();
    for (const event of events) {
      liveStore.getState().processEvent(event, false);
    }

    // Replay processing
    const replayStore = createChatStore();
    replayStore.getState().startReplay();
    for (const event of events) {
      replayStore.getState().processEvent(event, true);
    }
    replayStore.getState().endReplay();

    // Compare
    const liveMessages = liveStore.getState().getMessages();
    const replayMessages = replayStore.getState().getMessages();

    expect(replayMessages.length).toBe(liveMessages.length);
    for (let i = 0; i < liveMessages.length; i++) {
      expect(replayMessages[i].content).toEqual(liveMessages[i].content);
      expect(replayMessages[i].toolUses.length).toBe(liveMessages[i].toolUses.length);
      expect(replayMessages[i].status).toBe(liveMessages[i].status);
    }
  });

  it('replay marks messages as isFromHistory', () => {
    state().startReplay();
    state().processEvent({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 }, true);
    state().endReplay();

    expect(state().messages.get('msg-1')!.isFromHistory).toBe(true);
  });

  it('replay computes message groups on endReplay', () => {
    const events: AgentEvent[] = [
      { type: 'turn_start', messageId: 'msg-1', timestamp: 1000 },
      {
        type: 'turn_end',
        messageId: 'msg-1',
        durationMs: 1000,
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          cacheReadTokens: 0,
          cacheCreationTokens: 0,
          totalCostUsd: null,
        },
      },
      { type: 'turn_start', messageId: 'msg-2', timestamp: 2000 },
      {
        type: 'turn_end',
        messageId: 'msg-2',
        durationMs: 1000,
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          cacheReadTokens: 0,
          cacheCreationTokens: 0,
          totalCostUsd: null,
        },
      },
    ];

    state().startReplay();
    for (const e of events) state().processEvent(e, true);
    state().endReplay();

    expect(state().messageGroups.length).toBeGreaterThan(0);
    // Both messages are assistant role within 5 min → should group together
    expect(state().messageGroups[0].messageIds).toEqual(['msg-1', 'msg-2']);
  });
});

// ─── Message Grouping ────────────────────────────────────────────────────

describe('message grouping', () => {
  it('groups consecutive same-role messages', () => {
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    process({
      type: 'turn_end',
      messageId: 'msg-1',
      durationMs: 500,
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
        totalCostUsd: null,
      },
    });
    process({ type: 'turn_start', messageId: 'msg-2', timestamp: 2000 });
    process({
      type: 'turn_end',
      messageId: 'msg-2',
      durationMs: 500,
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
        totalCostUsd: null,
      },
    });

    const groups = state().messageGroups;
    expect(groups).toHaveLength(1);
    expect(groups[0].messageIds).toEqual(['msg-1', 'msg-2']);
  });

  it('separates messages more than 5 minutes apart', () => {
    const fiveMinPlus = 5 * 60 * 1000 + 1;

    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    process({
      type: 'turn_end',
      messageId: 'msg-1',
      durationMs: 500,
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
        totalCostUsd: null,
      },
    });
    process({ type: 'turn_start', messageId: 'msg-2', timestamp: 1000 + fiveMinPlus });
    process({
      type: 'turn_end',
      messageId: 'msg-2',
      durationMs: 500,
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
        totalCostUsd: null,
      },
    });

    const groups = state().messageGroups;
    expect(groups).toHaveLength(2);
  });

  it('separates different roles into different groups', () => {
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    process({
      type: 'turn_end',
      messageId: 'msg-1',
      durationMs: 500,
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
        totalCostUsd: null,
      },
    });
    process({ type: 'model_change', fromModel: 'a', toModel: 'b' });

    const groups = state().messageGroups;
    expect(groups.length).toBeGreaterThanOrEqual(2);
    expect(groups[0].role).toBe('assistant');
    expect(groups[1].role).toBe('system');
  });
});

// ─── Accessor Methods ────────────────────────────────────────────────────

describe('accessor methods', () => {
  it('getMessages returns messages in order', () => {
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    process({ type: 'turn_start', messageId: 'msg-2', timestamp: 2000 });

    const messages = state().getMessages();
    expect(messages).toHaveLength(2);
    expect(messages[0].id).toBe('msg-1');
    expect(messages[1].id).toBe('msg-2');
  });

  it('getMessage returns specific message', () => {
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    expect(state().getMessage('msg-1')).toBeDefined();
    expect(state().getMessage('nonexistent')).toBeUndefined();
  });

  it('getToolUse returns specific tool use', () => {
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    process({
      type: 'tool_start',
      messageId: 'msg-1',
      tool: { id: 'tool-1', name: 'Read', input: {} },
    });

    expect(state().getToolUse('msg-1', 'tool-1')).toBeDefined();
    expect(state().getToolUse('msg-1', 'nonexistent')).toBeUndefined();
    expect(state().getToolUse('nonexistent', 'tool-1')).toBeUndefined();
  });
});

// ─── Reset ───────────────────────────────────────────────────────────────

describe('reset', () => {
  it('reset clears all state', () => {
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    process({ type: 'text_delta', messageId: 'msg-1', text: 'Hello' });

    state().reset();

    expect(state().messages.size).toBe(0);
    expect(state().messageOrder).toEqual([]);
    expect(state().isStreaming).toBe(false);
    expect(state().isAgentBusy).toBe(false);
    expect(state().error).toBeNull();
  });
});

// ─── isPreparingResponse ─────────────────────────────────────────────────

describe('isPreparingResponse', () => {
  it('starts as false', () => {
    expect(state().isPreparingResponse).toBe(false);
  });

  it('is cleared by turn_start', () => {
    // Manually set preparing state (normally set by addUserMessage)
    store.setState({ isPreparingResponse: true });
    expect(state().isPreparingResponse).toBe(true);

    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    expect(state().isPreparingResponse).toBe(false);
  });

  it('is cleared by text_delta on assistant message', () => {
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    store.setState({ isPreparingResponse: true });

    process({ type: 'text_delta', messageId: 'msg-1', text: 'Hello' });
    expect(state().isPreparingResponse).toBe(false);
  });

  it('is cleared by tool_permission_needed', () => {
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    process({
      type: 'tool_start',
      messageId: 'msg-1',
      tool: { id: 'tool-1', name: 'Bash', input: {} },
    });
    store.setState({ isPreparingResponse: true });

    process({
      type: 'tool_permission_needed',
      messageId: 'msg-1',
      toolId: 'tool-1',
      requestId: 'req-1',
      toolName: 'Bash',
      input: {},
    });
    expect(state().isPreparingResponse).toBe(false);
  });

  it('is cleared by error event', () => {
    store.setState({ isPreparingResponse: true });

    process({ type: 'error', code: 'test', message: 'Test error', retryable: false });
    expect(state().isPreparingResponse).toBe(false);
  });

  it('is cleared by interrupted event', () => {
    store.setState({ isPreparingResponse: true });

    process({ type: 'interrupted', timestamp: Date.now() });
    expect(state().isPreparingResponse).toBe(false);
  });

  it('is preserved during reset', () => {
    store.setState({ isPreparingResponse: true });
    state().reset();
    expect(state().isPreparingResponse).toBe(false);
  });
});

// ─── Full Conversation Flow ──────────────────────────────────────────────

describe('full conversation flow', () => {
  it('processes a complete multi-turn conversation', () => {
    // Turn 1: Assistant reads a file and responds
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    process({ type: 'text_delta', messageId: 'msg-1', text: 'Let me read that file.' });
    process({
      type: 'tool_start',
      messageId: 'msg-1',
      tool: { id: 'tool-1', name: 'Read', input: { file_path: '/src/index.ts' } },
    });
    process({
      type: 'tool_running',
      messageId: 'msg-1',
      toolId: 'tool-1',
      approvalMethod: 'trusted_tool',
    });
    process({
      type: 'tool_result',
      messageId: 'msg-1',
      toolId: 'tool-1',
      result: { success: true, output: 'export function main() {}' },
    });
    process({ type: 'text_delta', messageId: 'msg-1', text: '\nI see the issue. Let me fix it.' });
    process({
      type: 'text_done',
      messageId: 'msg-1',
      fullText: 'Let me read that file.\nI see the issue. Let me fix it.',
    });
    process({
      type: 'turn_end',
      messageId: 'msg-1',
      durationMs: 5000,
      usage: {
        inputTokens: 200,
        outputTokens: 100,
        cacheReadTokens: 50,
        cacheCreationTokens: 20,
        totalCostUsd: 0.03,
      },
    });

    // Turn 2: New turn
    process({ type: 'turn_start', messageId: 'msg-2', timestamp: 10000 });
    process({
      type: 'tool_start',
      messageId: 'msg-2',
      tool: { id: 'tool-2', name: 'Bash', input: { command: 'npm test' } },
    });
    process({
      type: 'tool_permission_needed',
      messageId: 'msg-2',
      toolId: 'tool-2',
      requestId: 'req-1',
      toolName: 'Bash',
      input: { command: 'npm test' },
    });

    // Verify state at this point
    expect(state().messages.size).toBe(2);
    expect(state().messageOrder).toEqual(['msg-1', 'msg-2']);
    expect(state().messages.get('msg-1')!.status).toBe('complete');
    expect(state().messages.get('msg-1')!.toolUses).toHaveLength(1);
    expect(state().messages.get('msg-1')!.toolUses[0].status).toBe('complete');
    expect(state().messages.get('msg-2')!.toolUses[0].status).toBe('pending_permission');
    expect(state().isStreaming).toBe(true);
    expect(state().isAgentBusy).toBe(true);
  });
});

// ─── resolvePermission ──────────────────────────────────────────────────────

describe('resolvePermission', () => {
  function setupPendingPermission() {
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    process({
      type: 'tool_start',
      messageId: 'msg-1',
      tool: { id: 'tool-1', name: 'Bash', input: { command: 'ls' } },
    });
    process({
      type: 'tool_permission_needed',
      messageId: 'msg-1',
      toolId: 'tool-1',
      requestId: 'req-1',
      toolName: 'Bash',
      input: { command: 'ls' },
    });
  }

  it('transitions tool to running when approved', () => {
    setupPendingPermission();

    const tool = state().messages.get('msg-1')!.toolUses[0];
    expect(tool.status).toBe('pending_permission');
    expect(tool.requestId).toBe('req-1');

    state().resolvePermission('req-1', true);

    const updated = state().messages.get('msg-1')!.toolUses[0];
    expect(updated.status).toBe('running');
    expect(updated.requestId).toBeUndefined();
  });

  it('transitions tool to error when denied', () => {
    setupPendingPermission();
    state().resolvePermission('req-1', false);

    const updated = state().messages.get('msg-1')!.toolUses[0];
    expect(updated.status).toBe('error');
    expect(updated.result?.success).toBe(false);
    expect(updated.result?.error).toBe('Permission denied');
  });

  it('sets approvalMethod when provided', () => {
    setupPendingPermission();
    state().resolvePermission('req-1', true, 'session_rule');

    const updated = state().messages.get('msg-1')!.toolUses[0];
    expect(updated.status).toBe('running');
    expect(updated.approvalMethod).toBe('session_rule');
  });

  it('sets persistent_rule approvalMethod for permanent scope', () => {
    setupPendingPermission();
    state().resolvePermission('req-1', true, 'persistent_rule');

    const updated = state().messages.get('msg-1')!.toolUses[0];
    expect(updated.approvalMethod).toBe('persistent_rule');
  });

  it('no-ops for unknown requestId', () => {
    setupPendingPermission();
    state().resolvePermission('unknown-req', true);

    // Original tool should still be pending
    const tool = state().messages.get('msg-1')!.toolUses[0];
    expect(tool.status).toBe('pending_permission');
  });
});
