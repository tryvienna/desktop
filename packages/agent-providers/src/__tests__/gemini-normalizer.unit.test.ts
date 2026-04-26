/**
 * Gemini CLI Normalizer Unit Tests
 *
 * Tests the GeminiCliNormalizer's conversion of Gemini NDJSON → AgentEvent.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GeminiCliNormalizer } from '../gemini-cli/normalizer';
import { AgentEventSchema } from '@vienna/agent-core';

let normalizer: GeminiCliNormalizer;

beforeEach(() => {
  normalizer = new GeminiCliNormalizer();
});

function normalize(data: unknown) {
  return normalizer.normalize(JSON.stringify(data));
}

function validateEvents(events: unknown[]) {
  for (const event of events) {
    expect(() => AgentEventSchema.parse(event)).not.toThrow();
  }
}

describe('GeminiCliNormalizer', () => {
  it('handles invalid JSON', () => {
    const events = normalizer.normalize('not json');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('error');
    validateEvents(events);
  });

  it('handles invalid schema', () => {
    const events = normalize({ type: 'bogus' });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('error');
    validateEvents(events);
  });

  it('normalizes init → session_init', () => {
    const events = normalize({
      type: 'init',
      session_id: 'gem-1',
      model: 'gemini-2.0-flash',
      tools: ['google_search', 'code_execution'],
    });

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('session_init');
    if (events[0].type === 'session_init') {
      expect(events[0].provider).toBe('gemini-cli');
      expect(events[0].model).toBe('gemini-2.0-flash');
    }
    validateEvents(events);
  });

  it('normalizes content_delta → turn_start + text_delta', () => {
    const events = normalize({ type: 'content_delta', text: 'Hello!' });

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('turn_start');
    expect(events[1].type).toBe('text_delta');
    if (events[1].type === 'text_delta') {
      expect(events[1].text).toBe('Hello!');
    }
    validateEvents(events);
  });

  it('subsequent deltas reuse the same turn', () => {
    normalize({ type: 'content_delta', text: 'Part 1' });
    const events = normalize({ type: 'content_delta', text: ' Part 2' });

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('text_delta');
    validateEvents(events);
  });

  it('normalizes content_done → text_done', () => {
    normalize({ type: 'content_delta', text: 'Hello' });

    const events = normalize({ type: 'content_done', text: 'Hello world complete.' });

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('text_done');
    if (events[0].type === 'text_done') {
      expect(events[0].fullText).toBe('Hello world complete.');
    }
    validateEvents(events);
  });

  it('normalizes function_call → tool_start', () => {
    normalize({ type: 'content_delta', text: 'Let me search.' });

    const events = normalize({
      type: 'function_call',
      id: 'func-1',
      name: 'google_search',
      args: { query: 'Vienna architecture' },
    });

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('tool_start');
    if (events[0].type === 'tool_start') {
      expect(events[0].tool.name).toBe('google_search');
      expect(events[0].tool.input).toEqual({ query: 'Vienna architecture' });
    }
    validateEvents(events);
  });

  it('normalizes function_response → tool_result', () => {
    normalize({ type: 'content_delta', text: 'Searching.' });
    normalize({ type: 'function_call', id: 'func-1', name: 'search', args: {} });

    const events = normalize({
      type: 'function_response',
      id: 'func-1',
      output: 'Search results...',
    });

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('tool_result');
    if (events[0].type === 'tool_result') {
      expect(events[0].result.success).toBe(true);
      expect(events[0].result.output).toBe('Search results...');
    }
    validateEvents(events);
  });

  it('normalizes function_response with error', () => {
    normalize({ type: 'content_delta', text: 'Running.' });
    normalize({ type: 'function_call', id: 'func-2', name: 'execute', args: {} });

    const events = normalize({
      type: 'function_response',
      id: 'func-2',
      error: 'Execution failed',
    });

    expect(events).toHaveLength(1);
    if (events[0].type === 'tool_result') {
      expect(events[0].result.success).toBe(false);
      expect(events[0].result.error).toBe('Execution failed');
    }
    validateEvents(events);
  });

  it('normalizes error → error', () => {
    const events = normalize({
      type: 'error',
      message: 'Quota exceeded',
      code: 'quota_error',
    });

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('error');
    validateEvents(events);
  });

  it('normalizes turn_complete → turn_end', () => {
    normalize({ type: 'content_delta', text: 'Done.' });

    const events = normalize({
      type: 'turn_complete',
      usage: { prompt_tokens: 150, completion_tokens: 75 },
    });

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('turn_end');
    if (events[0].type === 'turn_end') {
      expect(events[0].usage.inputTokens).toBe(150);
      expect(events[0].usage.outputTokens).toBe(75);
    }
    validateEvents(events);
  });

  it('full conversation flow', () => {
    const allEvents: ReturnType<typeof normalize> = [];

    allEvents.push(...normalize({ type: 'init', model: 'gemini-2.0-flash' }));
    allEvents.push(...normalize({ type: 'content_delta', text: 'Searching for info.' }));
    allEvents.push(
      ...normalize({ type: 'function_call', id: 'f-1', name: 'search', args: { q: 'test' } })
    );
    allEvents.push(...normalize({ type: 'function_response', id: 'f-1', output: 'results' }));
    allEvents.push(...normalize({ type: 'content_delta', text: ' Found it!' }));
    allEvents.push(...normalize({ type: 'content_done', text: 'Searching for info. Found it!' }));
    allEvents.push(
      ...normalize({ type: 'turn_complete', usage: { prompt_tokens: 100, completion_tokens: 50 } })
    );

    validateEvents(allEvents);

    const types = allEvents.map((e) => e.type);
    expect(types).toContain('session_init');
    expect(types).toContain('turn_start');
    expect(types).toContain('text_delta');
    expect(types).toContain('tool_start');
    expect(types).toContain('tool_result');
    expect(types).toContain('text_done');
    expect(types).toContain('turn_end');
  });

  it('reset clears state', () => {
    normalize({ type: 'content_delta', text: 'Hello' });
    normalizer.reset();

    const events = normalize({ type: 'content_delta', text: 'World' });
    expect(events[0].type).toBe('turn_start');
  });
});
