/**
 * Tests for CliProviderBase, isSignalExit, classifyExit, and splitLines.
 *
 * Unit tests cover the pure helper functions exhaustively.
 * Integration tests use a real child process (cat/node) to verify the full
 * spawn → event → exit lifecycle without mocking child_process.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ChildProcess } from 'node:child_process';
import type {
  AgentEvent,
  SessionConfig,
  UserMessage,
  PermissionResponse,
} from '@vienna/agent-core';
import {
  isSignalExit,
  classifyExit,
  splitLines,
  CliProviderBase,
} from '../cli-provider-base';
import type { CliNormalizer } from '../cli-provider-base';

// ═════════════════════════════════════════════════════════════════════════════
// Unit tests — pure functions
// ═════════════════════════════════════════════════════════════════════════════

describe('isSignalExit', () => {
  it('returns true for SIGTERM signal string', () => {
    expect(isSignalExit(null, 'SIGTERM')).toBe(true);
  });

  it('returns true for SIGINT signal string', () => {
    expect(isSignalExit(null, 'SIGINT')).toBe(true);
  });

  it('returns true for exit code 143 (128 + SIGTERM)', () => {
    expect(isSignalExit(143, null)).toBe(true);
  });

  it('returns true for exit code 130 (128 + SIGINT)', () => {
    expect(isSignalExit(130, null)).toBe(true);
  });

  it('returns true when both code and signal indicate SIGTERM', () => {
    expect(isSignalExit(143, 'SIGTERM')).toBe(true);
  });

  it('returns false for exit code 1', () => {
    expect(isSignalExit(1, null)).toBe(false);
  });

  it('returns false for exit code 0', () => {
    expect(isSignalExit(0, null)).toBe(false);
  });

  it('returns false for null code and null signal', () => {
    expect(isSignalExit(null, null)).toBe(false);
  });

  it('returns false for null code and undefined signal', () => {
    expect(isSignalExit(null, undefined)).toBe(false);
  });

  it('returns false for other signals like SIGKILL', () => {
    expect(isSignalExit(null, 'SIGKILL')).toBe(false);
  });

  it('returns false for exit code 137 (SIGKILL = 128+9)', () => {
    expect(isSignalExit(137, null)).toBe(false);
  });
});

describe('classifyExit', () => {
  it('returns clean for exit code 0', () => {
    expect(classifyExit(0, null, 'running')).toBe('clean');
  });

  it('returns clean for null exit code', () => {
    expect(classifyExit(null, null, 'running')).toBe('clean');
  });

  it('returns clean for SIGTERM signal', () => {
    expect(classifyExit(null, 'SIGTERM', 'running')).toBe('clean');
  });

  it('returns clean for exit code 143 (trapped SIGTERM)', () => {
    expect(classifyExit(143, null, 'running')).toBe('clean');
  });

  it('returns clean for exit code 130 (trapped SIGINT)', () => {
    expect(classifyExit(130, null, 'running')).toBe('clean');
  });

  it('returns stopped for non-zero exit when provider is stopping', () => {
    expect(classifyExit(1, null, 'stopping')).toBe('stopped');
  });

  it('returns stopped for error exit when provider is stopping', () => {
    expect(classifyExit(2, null, 'stopping')).toBe('stopped');
  });

  it('returns crashed for non-zero exit when provider is running', () => {
    expect(classifyExit(1, null, 'running')).toBe('crashed');
  });

  it('returns crashed for error exit with no signal in running state', () => {
    expect(classifyExit(127, null, 'running')).toBe('crashed');
  });

  it('returns crashed for error exit in starting state', () => {
    expect(classifyExit(1, null, 'starting')).toBe('crashed');
  });

  // The exact bug scenario: exit 143 while running (not stopping)
  it('does NOT crash for exit 143 even when provider state is running', () => {
    expect(classifyExit(143, null, 'running')).toBe('clean');
  });

  it('does NOT crash for SIGTERM signal even when provider state is running', () => {
    expect(classifyExit(null, 'SIGTERM', 'running')).toBe('clean');
  });
});

describe('splitLines', () => {
  it('splits complete lines', () => {
    const result = splitLines('line1\nline2\n');
    expect(result.lines).toEqual(['line1', 'line2']);
    expect(result.remainder).toBe('');
  });

  it('preserves partial line as remainder', () => {
    const result = splitLines('line1\npartial');
    expect(result.lines).toEqual(['line1']);
    expect(result.remainder).toBe('partial');
  });

  it('returns empty lines array for no newlines', () => {
    const result = splitLines('partial');
    expect(result.lines).toEqual([]);
    expect(result.remainder).toBe('partial');
  });

  it('returns empty remainder for trailing newline', () => {
    const result = splitLines('line1\n');
    expect(result.lines).toEqual(['line1']);
    expect(result.remainder).toBe('');
  });

  it('filters out empty lines', () => {
    const result = splitLines('line1\n\nline2\n');
    expect(result.lines).toEqual(['line1', 'line2']);
  });

  it('handles empty string', () => {
    const result = splitLines('');
    expect(result.lines).toEqual([]);
    expect(result.remainder).toBe('');
  });

  it('accumulates across calls (simulating buffer)', () => {
    const r1 = splitLines('{"type":"hel');
    expect(r1.lines).toEqual([]);
    expect(r1.remainder).toBe('{"type":"hel');

    const r2 = splitLines(r1.remainder + 'lo"}\n{"type":"wo');
    expect(r2.lines).toEqual(['{"type":"hello"}']);
    expect(r2.remainder).toBe('{"type":"wo');

    const r3 = splitLines(r2.remainder + 'rld"}\n');
    expect(r3.lines).toEqual(['{"type":"world"}']);
    expect(r3.remainder).toBe('');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Integration tests — real child process lifecycle
// ═════════════════════════════════════════════════════════════════════════════

/** Minimal normalizer that parses JSON lines into AgentEvents. */
class StubNormalizer implements CliNormalizer {
  resetCalled = false;
  normalize(line: string): AgentEvent[] {
    try {
      const parsed = JSON.parse(line);
      return [{ type: 'provider_event', provider: 'test', data: parsed, timestamp: Date.now() } as AgentEvent];
    } catch {
      return [{ type: 'error', code: 'json_parse_error', message: `Bad JSON: ${line}`, retryable: false, timestamp: Date.now() } as AgentEvent];
    }
  }
  reset(): void {
    this.resetCalled = true;
  }
}

/** Concrete test provider that spawns a real process. */
class TestProvider extends CliProviderBase {
  readonly id = 'test-cli';
  readonly displayName = 'Test CLI';
  startResetCalled = false;

  constructor(cliPath: string = 'node') {
    super(cliPath, new StubNormalizer());
  }

  get normalizer_(): CliNormalizer {
    return (this as unknown as { normalizer: CliNormalizer }).normalizer;
  }

  protected override onStartReset(): void {
    this.startResetCalled = true;
  }

  sendMessage(_message: UserMessage): void {
    this.ensureRunning();
    this.writeToStdin({ type: 'message', text: _message.text });
  }

  respondPermission(_requestId: string, _response: PermissionResponse): void {
    this.ensureRunning();
  }

  protected buildArgs(_config: SessionConfig): string[] {
    // The cliPath will be overridden per-test; args are set by the test
    return [];
  }
}

/** Helper to build a minimal SessionConfig. */
function makeConfig(overrides: Partial<SessionConfig> = {}): SessionConfig {
  return {
    cwd: process.cwd(),
    directories: [],
    ...overrides,
  };
}

/** Collect events from a provider into an array. */
function collectEvents(provider: CliProviderBase): AgentEvent[] {
  const events: AgentEvent[] = [];
  provider.onEvent((e) => events.push(e));
  return events;
}

/** Wait for the provider to leave the 'running' state. */
function waitForExit(provider: CliProviderBase, timeoutMs = 5000): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for exit')), timeoutMs);
    const check = () => {
      if (provider.state !== 'running' && provider.state !== 'starting') {
        clearTimeout(timeout);
        resolve();
      } else {
        setTimeout(check, 10);
      }
    };
    check();
  });
}

describe('CliProviderBase (integration)', () => {
  let provider: TestProvider;

  afterEach(async () => {
    // Ensure cleanup
    try {
      await provider?.stop();
    } catch { /* ignore */ }
  });

  describe('lifecycle', () => {
    it('starts in idle state', () => {
      provider = new TestProvider();
      expect(provider.state).toBe('idle');
    });

    it('transitions to running on start', async () => {
      // Spawn a process that stays alive reading stdin
      provider = new TestProvider('cat');
      await provider.start(makeConfig());
      expect(provider.state).toBe('running');
      expect(provider.isHealthy()).toBe(true);
    });

    it('resets normalizer and calls onStartReset on start', async () => {
      provider = new TestProvider('cat');
      await provider.start(makeConfig());
      expect(provider.startResetCalled).toBe(true);
      expect((provider.normalizer_ as StubNormalizer).resetCalled).toBe(true);
    });

    it('throws if started in wrong state', async () => {
      provider = new TestProvider('cat');
      await provider.start(makeConfig());
      await expect(provider.start(makeConfig())).rejects.toThrow('Cannot start provider in state');
    });

    it('can restart after being stopped', async () => {
      provider = new TestProvider('cat');
      await provider.start(makeConfig());
      await provider.stop();
      expect(provider.state).toBe('stopped');

      // Should be able to start again
      await provider.start(makeConfig());
      expect(provider.state).toBe('running');
    });

    it('stop is idempotent', async () => {
      provider = new TestProvider('cat');
      await provider.start(makeConfig());
      await provider.stop();
      // Second stop should not throw
      await provider.stop();
      expect(provider.state).toBe('stopped');
    });

    it('stop without start is a no-op', async () => {
      provider = new TestProvider();
      await provider.stop();
      expect(provider.state).toBe('idle');
    });
  });

  describe('graceful shutdown', () => {
    it('transitions to stopped after stop()', async () => {
      provider = new TestProvider('cat');
      await provider.start(makeConfig());
      await provider.stop();
      expect(provider.state).toBe('stopped');
      expect(provider.isHealthy()).toBe(false);
    });

    it('does not emit process_crash on graceful stop', async () => {
      provider = new TestProvider('cat');
      const events = collectEvents(provider);
      await provider.start(makeConfig());
      await provider.stop();
      const crashes = events.filter((e) => e.type === 'error' && 'code' in e && e.code === 'process_crash');
      expect(crashes).toHaveLength(0);
    });
  });

  describe('exit classification with real process', () => {
    it('handles clean exit (code 0) as stopped', async () => {
      // Process that exits immediately with code 0
      provider = new TestProvider('node');
      (provider as unknown as { buildArgs: () => string[] }).buildArgs = () => ['-e', 'process.exit(0)'];
      const events = collectEvents(provider);
      await provider.start(makeConfig());
      await waitForExit(provider);
      expect(provider.state).toBe('stopped');
      const crashes = events.filter((e) => e.type === 'error' && 'code' in e && e.code === 'process_crash');
      expect(crashes).toHaveLength(0);
    });

    it('emits process_crash for unexpected non-zero exit', async () => {
      // Process that exits with code 42
      provider = new TestProvider('node');
      (provider as unknown as { buildArgs: () => string[] }).buildArgs = () => ['-e', 'process.exit(42)'];
      const events = collectEvents(provider);
      await provider.start(makeConfig());
      await waitForExit(provider);
      expect(provider.state).toBe('crashed');
      const crashes = events.filter((e) => e.type === 'error' && 'code' in e && e.code === 'process_crash');
      expect(crashes).toHaveLength(1);
      expect(crashes[0]).toMatchObject({
        type: 'error',
        code: 'process_crash',
        retryable: false,
      });
      expect((crashes[0] as { message: string }).message).toContain('42');
    });

    it('does NOT emit process_crash for SIGTERM (exit 143)', async () => {
      // Process that traps SIGTERM and exits with 143 (like the Claude CLI does)
      provider = new TestProvider('node');
      (provider as unknown as { buildArgs: () => string[] }).buildArgs = () => [
        '-e',
        "process.on('SIGTERM', () => process.exit(143)); setInterval(() => {}, 1000);",
      ];
      const events = collectEvents(provider);
      await provider.start(makeConfig());

      // Send SIGTERM directly to the child (simulating OS-level signal)
      const proc = (provider as unknown as { proc: ChildProcess }).proc;
      proc.kill('SIGTERM');

      await waitForExit(provider);
      expect(provider.state).toBe('stopped');
      const crashes = events.filter((e) => e.type === 'error' && 'code' in e && e.code === 'process_crash');
      expect(crashes).toHaveLength(0);
    });

    it('does NOT emit process_crash for SIGINT (exit 130)', async () => {
      provider = new TestProvider('node');
      (provider as unknown as { buildArgs: () => string[] }).buildArgs = () => [
        '-e',
        "process.on('SIGINT', () => process.exit(130)); setInterval(() => {}, 1000);",
      ];
      const events = collectEvents(provider);
      await provider.start(makeConfig());

      const proc = (provider as unknown as { proc: ChildProcess }).proc;
      proc.kill('SIGINT');

      await waitForExit(provider);
      expect(provider.state).toBe('stopped');
      const crashes = events.filter((e) => e.type === 'error' && 'code' in e && e.code === 'process_crash');
      expect(crashes).toHaveLength(0);
    });

    it('does NOT emit process_crash for raw SIGTERM (signal, no code)', async () => {
      // Process that does NOT trap SIGTERM — Node delivers signal directly
      provider = new TestProvider('node');
      (provider as unknown as { buildArgs: () => string[] }).buildArgs = () => [
        '-e',
        'setInterval(() => {}, 1000);',
      ];
      const events = collectEvents(provider);
      await provider.start(makeConfig());

      const proc = (provider as unknown as { proc: ChildProcess }).proc;
      proc.kill('SIGTERM');

      await waitForExit(provider);
      expect(provider.state).toBe('stopped');
      const crashes = events.filter((e) => e.type === 'error' && 'code' in e && e.code === 'process_crash');
      expect(crashes).toHaveLength(0);
    });
  });

  describe('NDJSON event pipeline', () => {
    it('emits events from NDJSON stdout lines', async () => {
      // Process that writes two JSON lines to stdout then exits
      provider = new TestProvider('node');
      (provider as unknown as { buildArgs: () => string[] }).buildArgs = () => [
        '-e',
        `
        process.stdout.write(JSON.stringify({msg:"hello"}) + "\\n");
        process.stdout.write(JSON.stringify({msg:"world"}) + "\\n");
        setTimeout(() => process.exit(0), 50);
        `,
      ];
      const events = collectEvents(provider);
      await provider.start(makeConfig());
      await waitForExit(provider);

      const providerEvents = events.filter((e) => e.type === 'provider_event');
      expect(providerEvents).toHaveLength(2);
    });

    it('handles chunked NDJSON (split across data events)', async () => {
      // Write a line in two separate chunks with a delay between them
      provider = new TestProvider('node');
      (provider as unknown as { buildArgs: () => string[] }).buildArgs = () => [
        '-e',
        `
        process.stdout.write('{"msg":"ch');
        setTimeout(() => {
          process.stdout.write('unked"}\\n');
          setTimeout(() => process.exit(0), 50);
        }, 50);
        `,
      ];
      const events = collectEvents(provider);
      await provider.start(makeConfig());
      await waitForExit(provider);

      const providerEvents = events.filter((e) => e.type === 'provider_event');
      expect(providerEvents).toHaveLength(1);
    });
  });

  describe('stderr buffering', () => {
    it('includes stderr in crash diagnostics', async () => {
      provider = new TestProvider('node');
      (provider as unknown as { buildArgs: () => string[] }).buildArgs = () => [
        '-e',
        'process.stderr.write("something went wrong\\n"); process.exit(1);',
      ];
      const events = collectEvents(provider);
      await provider.start(makeConfig());
      await waitForExit(provider);

      const crash = events.find((e) => e.type === 'error' && 'code' in e && e.code === 'process_crash');
      expect(crash).toBeDefined();
      expect((crash as { message: string }).message).toContain('something went wrong');
    });

    it('emits debug events from stderr', async () => {
      provider = new TestProvider('node');
      (provider as unknown as { buildArgs: () => string[] }).buildArgs = () => [
        '-e',
        'process.stderr.write("debug info"); process.exit(0);',
      ];
      const debugOutput: string[] = [];
      provider.onDebug((data) => debugOutput.push(data));
      await provider.start(makeConfig());
      await waitForExit(provider);

      expect(debugOutput.join('')).toContain('debug info');
    });
  });

  describe('event subscriptions', () => {
    it('unsubscribe stops delivering events', async () => {
      provider = new TestProvider('node');
      (provider as unknown as { buildArgs: () => string[] }).buildArgs = () => [
        '-e',
        `
        process.stdout.write(JSON.stringify({n:1}) + "\\n");
        setTimeout(() => {
          process.stdout.write(JSON.stringify({n:2}) + "\\n");
          setTimeout(() => process.exit(0), 50);
        }, 100);
        `,
      ];
      const events: AgentEvent[] = [];
      const unsub = provider.onEvent((e) => events.push(e));

      await provider.start(makeConfig());
      // Wait for first event
      await new Promise((r) => setTimeout(r, 80));
      unsub();
      // Wait for second event (should not be delivered)
      await waitForExit(provider);

      // Should have received only the first provider_event
      const providerEvents = events.filter((e) => e.type === 'provider_event');
      expect(providerEvents).toHaveLength(1);
    });

    it('listener errors do not break the pipeline', async () => {
      provider = new TestProvider('node');
      (provider as unknown as { buildArgs: () => string[] }).buildArgs = () => [
        '-e',
        `
        process.stdout.write(JSON.stringify({n:1}) + "\\n");
        process.stdout.write(JSON.stringify({n:2}) + "\\n");
        setTimeout(() => process.exit(0), 50);
        `,
      ];
      // First listener throws
      provider.onEvent(() => { throw new Error('boom'); });
      // Second listener should still receive events
      const events: AgentEvent[] = [];
      provider.onEvent((e) => events.push(e));

      await provider.start(makeConfig());
      await waitForExit(provider);

      const providerEvents = events.filter((e) => e.type === 'provider_event');
      expect(providerEvents).toHaveLength(2);
    });
  });

  describe('interrupt', () => {
    it('sends SIGINT to the process', async () => {
      provider = new TestProvider('node');
      (provider as unknown as { buildArgs: () => string[] }).buildArgs = () => [
        '-e',
        "process.on('SIGINT', () => process.exit(130)); setInterval(() => {}, 1000);",
      ];
      await provider.start(makeConfig());

      provider.interrupt();

      await waitForExit(provider);
      // Should stop cleanly (130 = SIGINT, classified as signal exit)
      expect(provider.state).toBe('stopped');
    });
  });

  describe('process error', () => {
    it('emits process_error for spawn failure', async () => {
      provider = new TestProvider('/nonexistent/binary/path');
      const events = collectEvents(provider);
      await provider.start(makeConfig());
      await waitForExit(provider);

      const processErrors = events.filter(
        (e) => e.type === 'error' && 'code' in e && e.code === 'process_error',
      );
      expect(processErrors.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('writeToStdin', () => {
    it('sends JSON to the child process stdin', async () => {
      // Process that echoes stdin lines to stdout
      provider = new TestProvider('node');
      (provider as unknown as { buildArgs: () => string[] }).buildArgs = () => [
        '-e',
        `
        const readline = require('readline');
        const rl = readline.createInterface({ input: process.stdin });
        rl.on('line', (line) => {
          process.stdout.write(line + "\\n");
        });
        rl.on('close', () => process.exit(0));
        `,
      ];
      const events = collectEvents(provider);
      await provider.start(makeConfig());

      // Send a message via the provider
      provider.sendMessage({ text: 'hello' } as UserMessage);

      // Give time for round-trip
      await new Promise((r) => setTimeout(r, 200));
      await provider.stop();

      const providerEvents = events.filter((e) => e.type === 'provider_event');
      expect(providerEvents.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('timeout', () => {
    it('emits timeout error and stops after configured timeout', async () => {
      provider = new TestProvider('node');
      (provider as unknown as { buildArgs: () => string[] }).buildArgs = () => [
        '-e',
        'setInterval(() => {}, 1000);',
      ];
      const events = collectEvents(provider);
      await provider.start(makeConfig({ timeout: 200 }));

      await waitForExit(provider);

      const timeoutErrors = events.filter(
        (e) => e.type === 'error' && 'code' in e && e.code === 'timeout',
      );
      expect(timeoutErrors).toHaveLength(1);
      expect(provider.state).toBe('stopped');
    });
  });
});
