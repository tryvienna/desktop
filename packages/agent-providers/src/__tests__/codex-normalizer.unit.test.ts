/**
 * Codex CLI Normalizer Unit Tests
 *
 * Tests the CodexCliNormalizer's conversion of Codex NDJSON → AgentEvent.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CodexCliNormalizer } from '../codex-cli/normalizer';
import { AgentEventSchema } from '@vienna/agent-core';

let normalizer: CodexCliNormalizer;

beforeEach(() => {
  normalizer = new CodexCliNormalizer();
});

function normalize(data: unknown) {
  return normalizer.normalize(JSON.stringify(data));
}

function validateEvents(events: unknown[]) {
  for (const event of events) {
    expect(() => AgentEventSchema.parse(event)).not.toThrow();
  }
}

describe('CodexCliNormalizer', () => {
  it('handles invalid JSON', () => {
    const events = normalizer.normalize('{bad json');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('error');
    validateEvents(events);
  });

  it('handles invalid schema', () => {
    const events = normalize({ type: 'unknown_type' });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('error');
    validateEvents(events);
  });

  it('normalizes system → session_init', () => {
    const events = normalize({
      type: 'system',
      session_id: 'sess-1',
      model: 'gpt-4o',
      tools: ['read_file', 'write_file'],
      cwd: '/tmp',
    });

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('session_init');
    if (events[0].type === 'session_init') {
      expect(events[0].provider).toBe('codex-cli');
      expect(events[0].model).toBe('gpt-4o');
      expect(events[0].tools).toEqual(['read_file', 'write_file']);
    }
    validateEvents(events);
  });

  it('normalizes message → turn_start + text_delta', () => {
    const events = normalize({
      type: 'message',
      role: 'assistant',
      content: 'Hello!',
    });

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('turn_start');
    expect(events[1].type).toBe('text_delta');
    if (events[1].type === 'text_delta') {
      expect(events[1].text).toBe('Hello!');
    }
    validateEvents(events);
  });

  it('normalizes message with done=true → includes text_done', () => {
    const events = normalize({
      type: 'message',
      role: 'assistant',
      content: 'Complete response.',
      done: true,
    });

    expect(events).toHaveLength(3);
    expect(events[0].type).toBe('turn_start');
    expect(events[1].type).toBe('text_delta');
    expect(events[2].type).toBe('text_done');
    validateEvents(events);
  });

  it('subsequent messages reuse the same turn', () => {
    normalize({ type: 'message', role: 'assistant', content: 'Part 1' });
    const events = normalize({ type: 'message', role: 'assistant', content: ' Part 2' });

    // Second message should only have text_delta (no new turn_start)
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('text_delta');
    validateEvents(events);
  });

  it('normalizes tool_call → tool_start', () => {
    // Start a turn first
    normalize({ type: 'message', role: 'assistant', content: 'Let me check.' });

    const events = normalize({
      type: 'tool_call',
      id: 'call-1',
      name: 'read_file',
      arguments: '{"path":"/src/index.ts"}',
    });

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('tool_start');
    if (events[0].type === 'tool_start') {
      expect(events[0].tool.name).toBe('read_file');
      expect(events[0].tool.input).toEqual({ path: '/src/index.ts' });
    }
    validateEvents(events);
  });

  it('normalizes tool_call with invalid JSON args', () => {
    normalize({ type: 'message', role: 'assistant', content: 'Check.' });

    const events = normalize({
      type: 'tool_call',
      id: 'call-2',
      name: 'bash',
      arguments: 'not json',
    });

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('tool_start');
    if (events[0].type === 'tool_start') {
      expect(events[0].tool.input).toEqual({ raw: 'not json' });
    }
    validateEvents(events);
  });

  it('normalizes tool_result → tool_result', () => {
    normalize({ type: 'message', role: 'assistant', content: 'Reading...' });
    normalize({ type: 'tool_call', id: 'call-1', name: 'read_file', arguments: '{}' });

    const events = normalize({
      type: 'tool_result',
      tool_call_id: 'call-1',
      output: 'file contents here',
    });

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('tool_result');
    if (events[0].type === 'tool_result') {
      expect(events[0].result.success).toBe(true);
      expect(events[0].result.output).toBe('file contents here');
    }
    validateEvents(events);
  });

  it('normalizes tool_result with error', () => {
    normalize({ type: 'message', role: 'assistant', content: 'Running...' });
    normalize({ type: 'tool_call', id: 'call-2', name: 'bash', arguments: '{}' });

    const events = normalize({
      type: 'tool_result',
      tool_call_id: 'call-2',
      error: 'Permission denied',
    });

    expect(events).toHaveLength(1);
    if (events[0].type === 'tool_result') {
      expect(events[0].result.success).toBe(false);
      expect(events[0].result.error).toBe('Permission denied');
    }
    validateEvents(events);
  });

  it('normalizes error → error', () => {
    const events = normalize({
      type: 'error',
      message: 'API rate limit exceeded',
      code: 'rate_limit',
    });

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('error');
    if (events[0].type === 'error') {
      expect(events[0].message).toBe('API rate limit exceeded');
    }
    validateEvents(events);
  });

  it('normalizes done → turn_end', () => {
    normalize({ type: 'message', role: 'assistant', content: 'Done.' });

    const events = normalize({
      type: 'done',
      usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 },
    });

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('turn_end');
    if (events[0].type === 'turn_end') {
      expect(events[0].usage.inputTokens).toBe(100);
      expect(events[0].usage.outputTokens).toBe(50);
    }
    validateEvents(events);
  });

  it('full conversation flow', () => {
    const allEvents: ReturnType<typeof normalize> = [];

    allEvents.push(...normalize({ type: 'system', model: 'gpt-4o' }));
    allEvents.push(
      ...normalize({ type: 'message', role: 'assistant', content: 'Let me read the file.' })
    );
    allEvents.push(
      ...normalize({
        type: 'tool_call',
        id: 'call-1',
        name: 'read_file',
        arguments: '{"path":"test.ts"}',
      })
    );
    allEvents.push(
      ...normalize({ type: 'tool_result', tool_call_id: 'call-1', output: 'contents' })
    );
    allEvents.push(
      ...normalize({ type: 'message', role: 'assistant', content: ' File looks good.' })
    );
    allEvents.push(
      ...normalize({ type: 'done', usage: { input_tokens: 200, output_tokens: 100 } })
    );

    validateEvents(allEvents);

    const types = allEvents.map((e) => e.type);
    expect(types).toContain('session_init');
    expect(types).toContain('turn_start');
    expect(types).toContain('text_delta');
    expect(types).toContain('tool_start');
    expect(types).toContain('tool_result');
    expect(types).toContain('turn_end');
  });

  it('reset clears state', () => {
    normalize({ type: 'message', role: 'assistant', content: 'Hello' });
    normalizer.reset();

    // After reset, a new message should start a new turn
    const events = normalize({ type: 'message', role: 'assistant', content: 'World' });
    expect(events[0].type).toBe('turn_start');
  });
});
