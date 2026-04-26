import { describe, it, expect } from 'vitest';
import type { AgentEvent } from '@vienna/agent-core';
import { deriveWorkstreamStatus, markWorkstreamViewed, markWorkstreamReviewed } from './status-machine';

// Helper to create minimal events for testing
function event(overrides: AgentEvent): AgentEvent {
  return overrides;
}

describe('deriveWorkstreamStatus', () => {
  it('transitions to processing on turn_start', () => {
    const result = deriveWorkstreamStatus(
      'idle',
      event({ type: 'turn_start', messageId: 'msg1', timestamp: Date.now() }),
      true,
    );
    expect(result).toBe('processing');
  });

  it('returns null if already processing on turn_start', () => {
    const result = deriveWorkstreamStatus(
      'processing',
      event({ type: 'turn_start', messageId: 'msg1', timestamp: Date.now() }),
      true,
    );
    expect(result).toBeNull();
  });

  it('transitions to waiting_permission on tool_permission_needed', () => {
    const result = deriveWorkstreamStatus(
      'processing',
      event({
        type: 'tool_permission_needed',
        messageId: 'msg1',
        toolId: 'tool1',
        requestId: 'req1',
        toolName: 'Write',
        input: {},
      }),
      true,
    );
    expect(result).toBe('waiting_permission');
  });

  it('transitions back to processing on tool_running after permission', () => {
    const result = deriveWorkstreamStatus(
      'waiting_permission',
      event({ type: 'tool_running', messageId: 'msg1', toolId: 'tool1' }),
      true,
    );
    expect(result).toBe('processing');
  });

  it('returns null for tool_running when not waiting_permission', () => {
    const result = deriveWorkstreamStatus(
      'processing',
      event({ type: 'tool_running', messageId: 'msg1', toolId: 'tool1' }),
      true,
    );
    expect(result).toBeNull();
  });

  it('transitions to active on turn_end when in focus', () => {
    const result = deriveWorkstreamStatus(
      'processing',
      event({
        type: 'turn_end',
        messageId: 'msg1',
        durationMs: 1000,
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          cacheReadTokens: 0,
          cacheCreationTokens: 0,
          totalCostUsd: 0.01,
        },
      }),
      true,
    );
    expect(result).toBe('active');
  });

  it('transitions to completed_unviewed on turn_end when not in focus', () => {
    const result = deriveWorkstreamStatus(
      'processing',
      event({
        type: 'turn_end',
        messageId: 'msg1',
        durationMs: 1000,
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          cacheReadTokens: 0,
          cacheCreationTokens: 0,
          totalCostUsd: 0.01,
        },
      }),
      false,
    );
    expect(result).toBe('completed_unviewed');
  });

  it('transitions to active on error when in focus', () => {
    const result = deriveWorkstreamStatus(
      'processing',
      event({ type: 'error', code: 'fatal', message: 'Something broke', retryable: false }),
      true,
    );
    expect(result).toBe('active');
  });

  it('transitions to completed_unviewed on error when not in focus', () => {
    const result = deriveWorkstreamStatus(
      'processing',
      event({ type: 'error', code: 'fatal', message: 'Something broke', retryable: false }),
      false,
    );
    expect(result).toBe('completed_unviewed');
  });

  it('returns null for needs_review workstreams regardless of event', () => {
    const events: AgentEvent[] = [
      { type: 'turn_start', messageId: 'msg1', timestamp: Date.now() },
      { type: 'tool_permission_needed', messageId: 'msg1', toolId: 'tool1', requestId: 'req1', toolName: 'Write', input: {} },
      { type: 'tool_running', messageId: 'msg1', toolId: 'tool1' },
      { type: 'turn_end', messageId: 'msg1', durationMs: 1000, usage: { inputTokens: 100, outputTokens: 50, cacheReadTokens: 0, cacheCreationTokens: 0, totalCostUsd: 0.01 } },
      { type: 'error', code: 'fatal', message: 'err', retryable: false },
      { type: 'interrupted', timestamp: Date.now() },
    ];

    for (const evt of events) {
      expect(deriveWorkstreamStatus('needs_review', evt, true)).toBeNull();
      expect(deriveWorkstreamStatus('needs_review', evt, false)).toBeNull();
    }
  });

  it('returns null for text_delta (streaming event)', () => {
    const result = deriveWorkstreamStatus(
      'processing',
      event({ type: 'text_delta', messageId: 'msg1', text: 'hello' }),
      true,
    );
    expect(result).toBeNull();
  });

  it('returns null for thinking events', () => {
    expect(
      deriveWorkstreamStatus(
        'processing',
        event({ type: 'thinking_start', messageId: 'msg1' }),
        true,
      ),
    ).toBeNull();

    expect(
      deriveWorkstreamStatus(
        'processing',
        event({ type: 'thinking_delta', messageId: 'msg1', text: 'thinking...' }),
        true,
      ),
    ).toBeNull();

    expect(
      deriveWorkstreamStatus(
        'processing',
        event({ type: 'thinking_done', messageId: 'msg1' }),
        true,
      ),
    ).toBeNull();
  });

  it('returns null for tool_result', () => {
    const result = deriveWorkstreamStatus(
      'processing',
      event({
        type: 'tool_result',
        messageId: 'msg1',
        toolId: 'tool1',
        result: { success: true },
      }),
      true,
    );
    expect(result).toBeNull();
  });

  it('returns null for model_change', () => {
    const result = deriveWorkstreamStatus(
      'active',
      event({ type: 'model_change', fromModel: 'sonnet', toModel: 'opus' }),
      true,
    );
    expect(result).toBeNull();
  });

  it('returns null for entity_link', () => {
    const result = deriveWorkstreamStatus(
      'active',
      event({
        type: 'entity_link',
        action: 'linked',
        entityUri: '@vienna//issue/1',
        entityType: 'issue',
        entityTitle: 'Bug fix',
      }),
      true,
    );
    expect(result).toBeNull();
  });

  // ── Interrupt transitions ──────────────────────────────────────────

  it('transitions to active on interrupted when in focus', () => {
    const result = deriveWorkstreamStatus(
      'processing',
      event({ type: 'interrupted', timestamp: Date.now() }),
      true,
    );
    expect(result).toBe('active');
  });

  it('transitions to completed_unviewed on interrupted when not in focus', () => {
    const result = deriveWorkstreamStatus(
      'processing',
      event({ type: 'interrupted', timestamp: Date.now() }),
      false,
    );
    expect(result).toBe('completed_unviewed');
  });

  it('transitions from waiting_permission to active on interrupted when in focus', () => {
    const result = deriveWorkstreamStatus(
      'waiting_permission',
      event({ type: 'interrupted', timestamp: Date.now() }),
      true,
    );
    expect(result).toBe('active');
  });

  it('transitions from idle to active on interrupted when in focus', () => {
    const result = deriveWorkstreamStatus(
      'idle',
      event({ type: 'interrupted', timestamp: Date.now() }),
      true,
    );
    expect(result).toBe('active');
  });

});

describe('markWorkstreamViewed', () => {
  it('transitions completed_unviewed to active', () => {
    expect(markWorkstreamViewed('completed_unviewed')).toBe('active');
  });

  it('returns null for other statuses', () => {
    expect(markWorkstreamViewed('idle')).toBeNull();
    expect(markWorkstreamViewed('active')).toBeNull();
    expect(markWorkstreamViewed('processing')).toBeNull();
    expect(markWorkstreamViewed('waiting_permission')).toBeNull();
    expect(markWorkstreamViewed('needs_review')).toBeNull();
  });
});

describe('markWorkstreamReviewed', () => {
  it('transitions needs_review to active', () => {
    expect(markWorkstreamReviewed('needs_review')).toBe('active');
  });

  it('returns null for other statuses', () => {
    expect(markWorkstreamReviewed('idle')).toBeNull();
    expect(markWorkstreamReviewed('active')).toBeNull();
    expect(markWorkstreamReviewed('processing')).toBeNull();
    expect(markWorkstreamReviewed('waiting_permission')).toBeNull();
    expect(markWorkstreamReviewed('completed_unviewed')).toBeNull();
  });
});
