/**
 * Integration tests for ClaudeSessionWatcher using fixture JSONL data.
 *
 * These tests write JSONL files to a temp directory and verify that the
 * watcher's internal processing logic emits the correct events. We test
 * the processRecord pipeline directly rather than relying on @parcel/watcher
 * (which requires real filesystem notifications and timing).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionEventBus } from '../event-bus';
import { JsonlTailer } from '../jsonl-tailer';
import { SessionTracker } from '../session-tracker';
import { ClaudeSessionWatcher } from '../session-watcher';
import type {
  SessionStartedPayload,
  TurnStartedPayload,
  TurnCompletedPayload,
  ToolUsedPayload,
  ToolResultPayload,
  PrCreatedPayload,
} from '../types';

// ── Fixture data ────────────────────────────────────────────────────────

function userTextRecord(prompt: string, sessionId = 'sess-1') {
  return JSON.stringify({
    type: 'user',
    uuid: `uuid-${Date.now()}`,
    parentUuid: null,
    timestamp: '2026-04-09T12:00:00Z',
    sessionId,
    version: '2.1.97',
    cwd: '/Users/will/dev/foo',
    gitBranch: 'main',
    entrypoint: 'cli',
    message: { role: 'user', content: prompt },
  });
}

function assistantEndTurn(sessionId = 'sess-1') {
  return JSON.stringify({
    type: 'assistant',
    uuid: `uuid-${Date.now()}`,
    parentUuid: null,
    timestamp: '2026-04-09T12:01:00Z',
    sessionId,
    version: '2.1.97',
    cwd: '/Users/will/dev/foo',
    gitBranch: 'main',
    entrypoint: 'cli',
    message: {
      model: 'claude-sonnet-4-6',
      id: 'msg-1',
      role: 'assistant',
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 50, cache_creation_input_tokens: 10 },
      content: [{ type: 'text', text: 'Hello!' }],
    },
  });
}

function assistantToolUse(toolName: string, toolId: string, input: unknown, sessionId = 'sess-1') {
  return JSON.stringify({
    type: 'assistant',
    uuid: `uuid-${Date.now()}`,
    parentUuid: null,
    timestamp: '2026-04-09T12:01:00Z',
    sessionId,
    version: '2.1.97',
    cwd: '/Users/will/dev/foo',
    gitBranch: 'main',
    entrypoint: 'cli',
    message: {
      model: 'claude-sonnet-4-6',
      id: 'msg-1',
      role: 'assistant',
      stop_reason: 'tool_use',
      usage: { input_tokens: 100, output_tokens: 50 },
      content: [
        { type: 'tool_use', id: toolId, name: toolName, input },
      ],
    },
  });
}

function userToolResult(toolUseId: string, content: string, isError = false, sessionId = 'sess-1') {
  return JSON.stringify({
    type: 'user',
    uuid: `uuid-${Date.now()}`,
    parentUuid: null,
    timestamp: '2026-04-09T12:02:00Z',
    sessionId,
    version: '2.1.97',
    cwd: '/Users/will/dev/foo',
    gitBranch: 'main',
    entrypoint: 'cli',
    message: {
      role: 'user',
      content: [
        { type: 'tool_result', tool_use_id: toolUseId, content, is_error: isError },
      ],
    },
  });
}

function prLinkRecord(prUrl: string, prNumber: number) {
  return JSON.stringify({
    type: 'pr-link',
    sessionId: 'sess-1',
    prNumber,
    prUrl,
    prRepository: 'owner/repo',
    timestamp: '2026-04-09T12:03:00Z',
  });
}

function streamingChunk(sessionId = 'sess-1') {
  return JSON.stringify({
    type: 'assistant',
    uuid: `uuid-${Date.now()}`,
    parentUuid: null,
    timestamp: '2026-04-09T12:01:00Z',
    sessionId,
    version: '2.1.97',
    cwd: '/Users/will/dev/foo',
    gitBranch: 'main',
    entrypoint: 'cli',
    message: {
      model: 'claude-sonnet-4-6',
      id: 'msg-1',
      role: 'assistant',
      stop_reason: null,
      usage: { input_tokens: 0, output_tokens: 10 },
      content: [{ type: 'text', text: 'partial...' }],
    },
  });
}

// ── Test helper: process lines through the watcher ──────────────────────

/**
 * Feed JSONL lines through a watcher's internal pipeline.
 * We access the watcher's events bus directly to capture emitted events.
 */
async function processLines(
  lines: string[],
  projectDir = '-Users-will-dev-foo',
  sessionFile = 'sess-1.jsonl',
): Promise<{ watcher: ClaudeSessionWatcher; events: Array<{ name: string; payload: unknown }> }> {
  const watcher = new ClaudeSessionWatcher({ watchPath: '/tmp/fake' });
  const captured: Array<{ name: string; payload: unknown }> = [];

  watcher.events.onAny((name, payload) => {
    captured.push({ name, payload });
  });

  // Write lines to a temp file and process via tailer
  const { writeFile, mkdir, rm } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const { tmpdir } = await import('node:os');
  const { randomUUID } = await import('node:crypto');

  const tmpDir = join(tmpdir(), `watcher-test-${randomUUID()}`);
  const projDir = join(tmpDir, projectDir);
  await mkdir(projDir, { recursive: true });

  const filePath = join(projDir, sessionFile);
  await writeFile(filePath, lines.join('\n') + '\n');

  // Access private methods via type assertion for testing
  const w = watcher as unknown as {
    tailer: JsonlTailer;
    processFile: (filePath: string) => Promise<void>;
  };
  await w.processFile(filePath);

  // Cleanup
  await rm(tmpDir, { recursive: true, force: true });

  return { watcher, events: captured };
}

// ── Tests ───────────────────────────────────────────────────────────────

describe('ClaudeSessionWatcher', () => {
  describe('session.started', () => {
    it('emits on first real user message', async () => {
      const { events } = await processLines([userTextRecord('Hello')]);

      expect(events).toHaveLength(2); // session.started + turn.started
      expect(events[0]!.name).toBe('session.started');
      const payload = events[0]!.payload as SessionStartedPayload;
      expect(payload.sessionId).toBe('sess-1');
      expect(payload.version).toBe('2.1.97');
      expect(payload.entrypoint).toBe('cli');
    });

    it('does not emit twice for same session', async () => {
      const { events } = await processLines([
        userTextRecord('First'),
        userTextRecord('Second'),
      ]);

      const started = events.filter((e) => e.name === 'session.started');
      expect(started).toHaveLength(1);
    });
  });

  describe('turn.started', () => {
    it('emits for each user text prompt', async () => {
      const { events } = await processLines([
        userTextRecord('First'),
        userTextRecord('Second'),
      ]);

      const turns = events.filter((e) => e.name === 'turn.started');
      expect(turns).toHaveLength(2);
      expect((turns[0]!.payload as TurnStartedPayload).prompt).toBe('First');
      expect((turns[1]!.payload as TurnStartedPayload).prompt).toBe('Second');
    });

    it('truncates long prompts to 500 chars', async () => {
      const longPrompt = 'x'.repeat(600);
      const { events } = await processLines([userTextRecord(longPrompt)]);

      const turn = events.find((e) => e.name === 'turn.started');
      const payload = turn!.payload as TurnStartedPayload;
      expect(payload.prompt.length).toBe(503); // 500 + '...'
      expect(payload.prompt.endsWith('...')).toBe(true);
    });
  });

  describe('turn.completed', () => {
    it('emits on assistant end_turn', async () => {
      const { events } = await processLines([
        userTextRecord('Hi'),
        assistantEndTurn(),
      ]);

      const completed = events.find((e) => e.name === 'turn.completed');
      expect(completed).toBeDefined();
      const payload = completed!.payload as TurnCompletedPayload;
      expect(payload.model).toBe('claude-sonnet-4-6');
      expect(payload.usage.inputTokens).toBe(100);
      expect(payload.usage.outputTokens).toBe(50);
      expect(payload.usage.cacheCreationInputTokens).toBe(10);
      expect(payload.contentTypes).toEqual(['text']);
    });

    it('skips streaming chunks (stop_reason: null)', async () => {
      const { events } = await processLines([
        userTextRecord('Hi'),
        streamingChunk(),
        assistantEndTurn(),
      ]);

      const completed = events.filter((e) => e.name === 'turn.completed');
      expect(completed).toHaveLength(1);
    });
  });

  describe('tool.used + tool.result correlation', () => {
    it('emits tool.used on assistant tool_use', async () => {
      const { events } = await processLines([
        userTextRecord('Hi'),
        assistantToolUse('Bash', 'tool-1', { command: 'ls' }),
      ]);

      const used = events.find((e) => e.name === 'tool.used');
      expect(used).toBeDefined();
      const payload = used!.payload as ToolUsedPayload;
      expect(payload.tools).toHaveLength(1);
      expect(payload.tools[0]!.name).toBe('Bash');
      expect(payload.tools[0]!.id).toBe('tool-1');
    });

    it('correlates tool.result with preceding tool.used', async () => {
      const { events } = await processLines([
        userTextRecord('Hi'),
        assistantToolUse('Bash', 'tool-1', { command: 'ls' }),
        userToolResult('tool-1', 'file1.ts\nfile2.ts'),
      ]);

      const result = events.find((e) => e.name === 'tool.result');
      expect(result).toBeDefined();
      const payload = result!.payload as ToolResultPayload;
      expect(payload.toolName).toBe('Bash');
      expect(payload.toolUseId).toBe('tool-1');
      expect(payload.isError).toBe(false);
      expect(payload.output).toBe('file1.ts\nfile2.ts');
    });

    it('handles error tool results', async () => {
      const { events } = await processLines([
        userTextRecord('Hi'),
        assistantToolUse('Bash', 'tool-1', { command: 'bad' }),
        userToolResult('tool-1', 'command not found', true),
      ]);

      const result = events.find((e) => e.name === 'tool.result');
      const payload = result!.payload as ToolResultPayload;
      expect(payload.isError).toBe(true);
    });

    it('drops tool results without matching tool_use', async () => {
      const { events } = await processLines([
        userTextRecord('Hi'),
        userToolResult('orphan-tool', 'some output'),
      ]);

      const results = events.filter((e) => e.name === 'tool.result');
      expect(results).toHaveLength(0);
    });
  });

  describe('pr.created', () => {
    it('emits on pr-link record', async () => {
      const { events } = await processLines([
        userTextRecord('Hi'),
        prLinkRecord('https://github.com/owner/repo/pull/42', 42),
      ]);

      const pr = events.find((e) => e.name === 'pr.created');
      expect(pr).toBeDefined();
      const payload = pr!.payload as PrCreatedPayload;
      expect(payload.prUrl).toBe('https://github.com/owner/repo/pull/42');
      expect(payload.prNumber).toBe(42);
      expect(payload.prRepository).toBe('owner/repo');
    });
  });


  describe('ignored record types', () => {
    it('silently ignores queue-operation records', async () => {
      const { events } = await processLines([
        JSON.stringify({ type: 'queue-operation', data: 'x' }),
        userTextRecord('Hi'),
      ]);

      // Only session.started + turn.started, no errors
      expect(events).toHaveLength(2);
    });

    it('silently ignores attachment records', async () => {
      const { events } = await processLines([
        JSON.stringify({ type: 'attachment', name: 'file.png' }),
        userTextRecord('Hi'),
      ]);

      expect(events).toHaveLength(2);
    });

    it('silently ignores last-prompt records', async () => {
      const { events } = await processLines([
        userTextRecord('Hi'),
        JSON.stringify({ type: 'last-prompt', lastPrompt: 'Hi', sessionId: 'sess-1' }),
      ]);

      expect(events).toHaveLength(2);
    });
  });

  describe('lifecycle', () => {
    it('isRunning is false before start', () => {
      const watcher = new ClaudeSessionWatcher({ watchPath: '/tmp/fake' });
      expect(watcher.isRunning).toBe(false);
    });

    it('trackedSessionCount starts at 0', () => {
      const watcher = new ClaudeSessionWatcher({ watchPath: '/tmp/fake' });
      expect(watcher.trackedSessionCount).toBe(0);
    });
  });
});
