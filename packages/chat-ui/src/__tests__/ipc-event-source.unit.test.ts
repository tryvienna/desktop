/**
 * IpcEventSource Unit Tests
 *
 * Tests the event coalescing adapter that bridges IPC events to the store.
 * In Node.js (test environment), requestAnimationFrame is unavailable,
 * so the adapter falls back to immediate flush — which we test here.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { connectEventSource, type EventSubscription } from '../adapters/ipc-event-source';
import { createChatStore } from '../store/chat-store';
import type { AgentEvent } from '@vienna/agent-core';

function createMockSubscription() {
  let callback:
    | ((payload: { sessionId: string; event: AgentEvent; isFromHistory?: boolean }) => void)
    | null = null;

  const subscription: EventSubscription = {
    onEvent: (cb) => {
      callback = cb;
      return () => {
        callback = null;
      };
    },
  };

  function emit(sessionId: string, event: AgentEvent, isFromHistory?: boolean) {
    callback?.({ sessionId, event, isFromHistory });
  }

  return { subscription, emit };
}

describe('connectEventSource', () => {
  let store: ReturnType<typeof createChatStore>;
  let sub: ReturnType<typeof createMockSubscription>;

  beforeEach(() => {
    store = createChatStore();
    sub = createMockSubscription();
  });

  it('connects and processes events for matching session', () => {
    connectEventSource(sub.subscription, store, 'sess-1');

    sub.emit('sess-1', { type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });

    expect(store.getState().messages.size).toBe(1);
  });

  it('ignores events for different session', () => {
    connectEventSource(sub.subscription, store, 'sess-1');

    sub.emit('sess-2', { type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });

    expect(store.getState().messages.size).toBe(0);
  });

  it('unsubscribe stops processing events', () => {
    const unsubscribe = connectEventSource(sub.subscription, store, 'sess-1');

    sub.emit('sess-1', { type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    expect(store.getState().messages.size).toBe(1);

    unsubscribe();

    sub.emit('sess-1', { type: 'turn_start', messageId: 'msg-2', timestamp: 2000 });
    expect(store.getState().messages.size).toBe(1); // Still 1
  });

  it('processes non-text events immediately', () => {
    connectEventSource(sub.subscription, store, 'sess-1');

    sub.emit('sess-1', { type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    sub.emit('sess-1', {
      type: 'tool_start',
      messageId: 'msg-1',
      tool: { id: 'tool-1', name: 'Read', input: {} },
    });

    const msg = store.getState().messages.get('msg-1')!;
    expect(msg.toolUses).toHaveLength(1);
  });

  it('text_deltas are processed (falls back to immediate in node)', () => {
    connectEventSource(sub.subscription, store, 'sess-1');

    sub.emit('sess-1', { type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    sub.emit('sess-1', { type: 'text_delta', messageId: 'msg-1', text: 'Hello ' });
    sub.emit('sess-1', { type: 'text_delta', messageId: 'msg-1', text: 'world!' });

    // In Node.js, no requestAnimationFrame → immediate flush for each delta
    const msg = store.getState().messages.get('msg-1')!;
    expect(msg.content.length).toBeGreaterThan(0);
    const textBlocks = msg.content.filter((b) => b.type === 'text');
    // The accumulated text should be present
    const allText = textBlocks.map((b) => (b as { text: string }).text).join('');
    expect(allText).toContain('Hello ');
    expect(allText).toContain('world!');
  });

  it('passes isFromHistory flag through', () => {
    connectEventSource(sub.subscription, store, 'sess-1');

    sub.emit('sess-1', { type: 'turn_start', messageId: 'msg-1', timestamp: 1000 }, true);

    const msg = store.getState().messages.get('msg-1')!;
    expect(msg.isFromHistory).toBe(true);
  });

  it('processes a full conversation through the adapter', () => {
    connectEventSource(sub.subscription, store, 'sess-1');

    sub.emit('sess-1', { type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    sub.emit('sess-1', { type: 'text_delta', messageId: 'msg-1', text: 'Hello!' });
    sub.emit('sess-1', { type: 'text_done', messageId: 'msg-1', fullText: 'Hello!' });
    sub.emit('sess-1', {
      type: 'tool_start',
      messageId: 'msg-1',
      tool: { id: 'tool-1', name: 'Read', input: { file_path: '/test.ts' } },
    });
    sub.emit('sess-1', {
      type: 'tool_result',
      messageId: 'msg-1',
      toolId: 'tool-1',
      result: { success: true, output: 'content' },
    });
    sub.emit('sess-1', {
      type: 'turn_end',
      messageId: 'msg-1',
      durationMs: 2000,
      usage: {
        inputTokens: 50,
        outputTokens: 20,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
        totalCostUsd: 0.01,
      },
    });

    expect(store.getState().messages.size).toBe(1);
    const msg = store.getState().messages.get('msg-1')!;
    expect(msg.status).toBe('complete');
    expect(msg.toolUses).toHaveLength(1);
    expect(msg.toolUses[0].status).toBe('complete');
    expect(store.getState().isStreaming).toBe(false);
  });
});
