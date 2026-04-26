/**
 * Performance Unit Tests
 *
 * Validates that the store meets performance budgets for replay
 * and streaming. These are regression tests that catch performance
 * degradation early.
 */

import { describe, it, expect } from 'vitest';
import { createChatStore } from '../store/chat-store';
import type { AgentEvent } from '@vienna/agent-core';

function generateConversation(turnCount: number): AgentEvent[] {
  const events: AgentEvent[] = [];

  for (let i = 0; i < turnCount; i++) {
    const msgId = `msg-${i}`;
    const timestamp = i * 1000;

    events.push({ type: 'turn_start', messageId: msgId, timestamp });
    events.push({ type: 'text_delta', messageId: msgId, text: `Response ${i}: ` });
    events.push({
      type: 'text_delta',
      messageId: msgId,
      text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ',
    });
    events.push({
      type: 'text_delta',
      messageId: msgId,
      text: 'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    });
    events.push({
      type: 'text_done',
      messageId: msgId,
      fullText: `Response ${i}: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`,
    });

    // Some turns have tools
    if (i % 3 === 0) {
      events.push({
        type: 'tool_start',
        messageId: msgId,
        tool: { id: `tool-${i}`, name: 'Read', input: { file_path: `/src/file${i}.ts` } },
      });
      events.push({
        type: 'tool_running',
        messageId: msgId,
        toolId: `tool-${i}`,
        approvalMethod: 'trusted_tool',
      });
      events.push({
        type: 'tool_result',
        messageId: msgId,
        toolId: `tool-${i}`,
        result: { success: true, output: `Content of file${i}.ts` },
      });
    }

    events.push({
      type: 'turn_end',
      messageId: msgId,
      durationMs: 1000,
      usage: {
        inputTokens: 100 * (i + 1),
        outputTokens: 50 * (i + 1),
        cacheReadTokens: 10,
        cacheCreationTokens: 5,
        totalCostUsd: 0.01 * (i + 1),
      },
    });
  }

  return events;
}

describe('performance', () => {
  it('replays 100 messages in under 50ms', () => {
    const events = generateConversation(100);
    const store = createChatStore();

    const start = performance.now();
    store.getState().startReplay();
    for (const event of events) {
      store.getState().processEvent(event, true);
    }
    store.getState().endReplay();
    const elapsed = performance.now() - start;

    expect(store.getState().messages.size).toBe(100);
    expect(elapsed).toBeLessThan(50);
  });

  it('replays 500 messages in under 200ms', () => {
    const events = generateConversation(500);
    const store = createChatStore();

    const start = performance.now();
    store.getState().startReplay();
    for (const event of events) {
      store.getState().processEvent(event, true);
    }
    store.getState().endReplay();
    const elapsed = performance.now() - start;

    expect(store.getState().messages.size).toBe(500);
    expect(elapsed).toBeLessThan(200);
  });

  it('processes 1000 text_deltas efficiently', () => {
    const store = createChatStore();

    store
      .getState()
      .processEvent({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 }, false);

    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      store
        .getState()
        .processEvent({ type: 'text_delta', messageId: 'msg-1', text: `word${i} ` }, false);
    }
    const elapsed = performance.now() - start;

    // Verify correctness
    const msg = store.getState().messages.get('msg-1')!;
    const textBlock = msg.content.find((b) => b.type === 'text');
    expect(textBlock).toBeDefined();
    expect((textBlock as { text: string }).text).toContain('word999');

    // Performance budget: 1000 deltas in under 100ms
    expect(elapsed).toBeLessThan(100);
  });

  it('live processing (without replay) handles 100 turns', () => {
    const events = generateConversation(100);
    const store = createChatStore();

    const start = performance.now();
    for (const event of events) {
      store.getState().processEvent(event, false);
    }
    const elapsed = performance.now() - start;

    expect(store.getState().messages.size).toBe(100);
    // Live mode is slower (Map cloning + group computation)
    // but should still be under 500ms for 100 turns
    expect(elapsed).toBeLessThan(500);
  });
});
