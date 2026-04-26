/**
 * Token Usage Store Tests
 *
 * Tests the ChatStore's processing of usage_update and turn_end events,
 * including real-time streaming updates, cross-interaction accumulation,
 * context window tracking, and replay consistency.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createChatStore, type ChatStore } from '../store/chat-store';
import type { AgentEvent } from '@vienna/agent-core';

type Store = ReturnType<typeof createChatStore>;

let store: Store;

function state(): ChatStore {
  return store.getState();
}

function process(event: AgentEvent) {
  state().processEvent(event);
}

beforeEach(() => {
  store = createChatStore();
});

// ─── usage_update events ─────────────────────────────────────────────────

describe('usage_update events', () => {
  it('updates current context from message_start data', () => {
    process({
      type: 'usage_update',
      inputTokens: 10_000,
      cacheReadTokens: 40_000,
      cacheCreationTokens: 5_000,
      outputTokens: 0,
    });

    expect(state().usage.currentInputTokens).toBe(10_000);
    expect(state().usage.currentCacheReadTokens).toBe(40_000);
    expect(state().usage.currentCacheCreationTokens).toBe(5_000);
  });

  it('updates output tokens from message_delta data', () => {
    process({
      type: 'usage_update',
      inputTokens: 50_000,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
      outputTokens: 1_200,
    });

    expect(state().usage.outputTokens).toBe(1_200);
  });

  it('preserves contextWindow across updates', () => {
    // First set contextWindow via turn_end
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    process({
      type: 'turn_end',
      messageId: 'msg-1',
      durationMs: 1000,
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
        totalCostUsd: null,
      },
      contextWindow: 200_000,
    });

    expect(state().usage.contextWindow).toBe(200_000);

    // usage_update without contextWindow should preserve it
    process({
      type: 'usage_update',
      inputTokens: 60_000,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
      outputTokens: 100,
    });

    expect(state().usage.contextWindow).toBe(200_000);
  });

  it('updates contextWindow when provided', () => {
    process({
      type: 'usage_update',
      inputTokens: 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
      outputTokens: 0,
      contextWindow: 128_000,
    });

    expect(state().usage.contextWindow).toBe(128_000);
  });
});

// ─── turn_end accumulation ───────────────────────────────────────────────

describe('turn_end accumulation', () => {
  it('accumulates outputTokens across multiple interactions', () => {
    // Interaction 1: 50 output tokens
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    process({
      type: 'turn_end',
      messageId: 'msg-1',
      durationMs: 1000,
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
        totalCostUsd: 0.01,
      },
    });

    expect(state().usage.outputTokens).toBe(50);

    // Interaction 2: 75 output tokens
    process({ type: 'turn_start', messageId: 'msg-2', timestamp: 2000 });
    process({
      type: 'turn_end',
      messageId: 'msg-2',
      durationMs: 1000,
      usage: {
        inputTokens: 200,
        outputTokens: 75,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
        totalCostUsd: 0.02,
      },
    });

    // Should be accumulated: 50 + 75 = 125
    expect(state().usage.outputTokens).toBe(125);
  });

  it('accumulates costUsd across multiple interactions', () => {
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    process({
      type: 'turn_end',
      messageId: 'msg-1',
      durationMs: 1000,
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
        totalCostUsd: 0.01,
      },
    });

    process({ type: 'turn_start', messageId: 'msg-2', timestamp: 2000 });
    process({
      type: 'turn_end',
      messageId: 'msg-2',
      durationMs: 1000,
      usage: {
        inputTokens: 200,
        outputTokens: 75,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
        totalCostUsd: 0.02,
      },
    });

    // 0.01 + 0.02 = 0.03
    expect(state().usage.costUsd).toBeCloseTo(0.03);
  });

  it('sets contextWindow from turn_end event', () => {
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    process({
      type: 'turn_end',
      messageId: 'msg-1',
      durationMs: 1000,
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
        totalCostUsd: null,
      },
      contextWindow: 200_000,
    });

    expect(state().usage.contextWindow).toBe(200_000);
  });

  it('uses lastTurnContext for current context when available', () => {
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    process({
      type: 'turn_end',
      messageId: 'msg-1',
      durationMs: 1000,
      usage: {
        inputTokens: 500, // Total (sum of all API calls)
        outputTokens: 50,
        cacheReadTokens: 100,
        cacheCreationTokens: 50,
        totalCostUsd: null,
      },
      lastTurnContext: {
        inputTokens: 200, // Last API call only
        cacheReadTokens: 80,
        cacheCreationTokens: 20,
      },
    });

    // Should use lastTurnContext, not total usage
    expect(state().usage.currentInputTokens).toBe(200);
    expect(state().usage.currentCacheReadTokens).toBe(80);
    expect(state().usage.currentCacheCreationTokens).toBe(20);
  });

  it('falls back to existing context when lastTurnContext absent', () => {
    // Set current context via usage_update
    process({
      type: 'usage_update',
      inputTokens: 30_000,
      cacheReadTokens: 10_000,
      cacheCreationTokens: 5_000,
      outputTokens: 0,
    });

    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    process({
      type: 'turn_end',
      messageId: 'msg-1',
      durationMs: 1000,
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
        totalCostUsd: null,
      },
      // No lastTurnContext — should keep existing values
    });

    expect(state().usage.currentInputTokens).toBe(30_000);
    expect(state().usage.currentCacheReadTokens).toBe(10_000);
    expect(state().usage.currentCacheCreationTokens).toBe(5_000);
  });

  it('handles null costUsd gracefully (first interaction)', () => {
    process({ type: 'turn_start', messageId: 'msg-1', timestamp: 1000 });
    process({
      type: 'turn_end',
      messageId: 'msg-1',
      durationMs: 1000,
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
        totalCostUsd: null,
      },
    });

    // null + null = 0 (from the (state.usage.costUsd ?? 0) + (event.usage.totalCostUsd ?? 0) logic)
    expect(state().usage.costUsd).toBe(0);
  });
});

// ─── Multi-interaction session ───────────────────────────────────────────

describe('multi-interaction session', () => {
  it('tracks correct accumulated output after 3 interactions', () => {
    const interactions = [
      { id: 'msg-1', ts: 1000, output: 100 },
      { id: 'msg-2', ts: 2000, output: 200 },
      { id: 'msg-3', ts: 3000, output: 300 },
    ];

    for (const { id, ts, output } of interactions) {
      process({ type: 'turn_start', messageId: id, timestamp: ts });
      process({
        type: 'turn_end',
        messageId: id,
        durationMs: 500,
        usage: {
          inputTokens: 1000,
          outputTokens: output,
          cacheReadTokens: 0,
          cacheCreationTokens: 0,
          totalCostUsd: 0.01,
        },
      });
    }

    expect(state().usage.outputTokens).toBe(600); // 100 + 200 + 300
    expect(state().usage.costUsd).toBeCloseTo(0.03); // 3 * 0.01
  });

  it('resets current context on new interaction via usage_update', () => {
    // Interaction 1: large context
    process({
      type: 'usage_update',
      inputTokens: 100_000,
      cacheReadTokens: 50_000,
      cacheCreationTokens: 0,
      outputTokens: 0,
    });

    expect(state().usage.currentInputTokens).toBe(100_000);

    // Interaction 2: smaller context (after compaction)
    process({
      type: 'usage_update',
      inputTokens: 20_000,
      cacheReadTokens: 10_000,
      cacheCreationTokens: 0,
      outputTokens: 0,
    });

    expect(state().usage.currentInputTokens).toBe(20_000);
    expect(state().usage.currentCacheReadTokens).toBe(10_000);
  });
});

// ─── Replay ──────────────────────────────────────────────────────────────

describe('replay', () => {
  it('replay of turn_end events produces correct accumulated output', () => {
    const events: AgentEvent[] = [
      { type: 'turn_start', messageId: 'msg-1', timestamp: 1000 },
      { type: 'text_delta', messageId: 'msg-1', text: 'Hello' },
      { type: 'text_done', messageId: 'msg-1', fullText: 'Hello' },
      {
        type: 'turn_end',
        messageId: 'msg-1',
        durationMs: 1000,
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          cacheReadTokens: 10,
          cacheCreationTokens: 5,
          totalCostUsd: 0.01,
        },
        contextWindow: 200_000,
      },
      { type: 'turn_start', messageId: 'msg-2', timestamp: 2000 },
      { type: 'text_delta', messageId: 'msg-2', text: 'World' },
      { type: 'text_done', messageId: 'msg-2', fullText: 'World' },
      {
        type: 'turn_end',
        messageId: 'msg-2',
        durationMs: 800,
        usage: {
          inputTokens: 200,
          outputTokens: 75,
          cacheReadTokens: 20,
          cacheCreationTokens: 10,
          totalCostUsd: 0.02,
        },
        lastTurnContext: {
          inputTokens: 150,
          cacheReadTokens: 20,
          cacheCreationTokens: 10,
        },
      },
    ];

    state().startReplay();
    for (const event of events) {
      state().processEvent(event, true);
    }
    state().endReplay();

    // Accumulated output: 50 + 75 = 125
    expect(state().usage.outputTokens).toBe(125);
    // Accumulated cost: 0.01 + 0.02 = 0.03
    expect(state().usage.costUsd).toBeCloseTo(0.03);
    // Context window from first turn_end
    expect(state().usage.contextWindow).toBe(200_000);
  });

  it('replay with lastTurnContext sets correct current context', () => {
    const events: AgentEvent[] = [
      { type: 'turn_start', messageId: 'msg-1', timestamp: 1000 },
      {
        type: 'turn_end',
        messageId: 'msg-1',
        durationMs: 1000,
        usage: {
          inputTokens: 500,
          outputTokens: 50,
          cacheReadTokens: 0,
          cacheCreationTokens: 0,
          totalCostUsd: null,
        },
        lastTurnContext: {
          inputTokens: 80_000,
          cacheReadTokens: 60_000,
          cacheCreationTokens: 10_000,
        },
        contextWindow: 200_000,
      },
    ];

    state().startReplay();
    for (const event of events) {
      state().processEvent(event, true);
    }
    state().endReplay();

    expect(state().usage.currentInputTokens).toBe(80_000);
    expect(state().usage.currentCacheReadTokens).toBe(60_000);
    expect(state().usage.currentCacheCreationTokens).toBe(10_000);
  });

  it('replay without lastTurnContext leaves context at zero', () => {
    const events: AgentEvent[] = [
      { type: 'turn_start', messageId: 'msg-1', timestamp: 1000 },
      {
        type: 'turn_end',
        messageId: 'msg-1',
        durationMs: 1000,
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          cacheReadTokens: 0,
          cacheCreationTokens: 0,
          totalCostUsd: null,
        },
        // No lastTurnContext
      },
    ];

    state().startReplay();
    for (const event of events) {
      state().processEvent(event, true);
    }
    state().endReplay();

    // Without lastTurnContext or usage_update, context stays at initial 0
    expect(state().usage.currentInputTokens).toBe(0);
  });
});

// ─── Edge cases ──────────────────────────────────────────────────────────

describe('edge cases', () => {
  it('initial usage state is all zeros/nulls', () => {
    expect(state().usage).toEqual({
      currentInputTokens: 0,
      currentCacheReadTokens: 0,
      currentCacheCreationTokens: 0,
      outputTokens: 0,
      costUsd: null,
      contextWindow: null,
    });
  });

  it('reset clears usage state', () => {
    process({
      type: 'usage_update',
      inputTokens: 50_000,
      cacheReadTokens: 10_000,
      cacheCreationTokens: 5_000,
      outputTokens: 1_200,
      contextWindow: 200_000,
    });

    state().reset();

    expect(state().usage).toEqual({
      currentInputTokens: 0,
      currentCacheReadTokens: 0,
      currentCacheCreationTokens: 0,
      outputTokens: 0,
      costUsd: null,
      contextWindow: null,
    });
  });
});
