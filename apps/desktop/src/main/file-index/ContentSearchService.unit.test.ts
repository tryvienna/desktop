import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { EventEmitter } from 'events';
import type { ChildProcess } from 'child_process';
import { buildRgArgs, parseRgOutput } from './ContentSearchService';
import type {
  ContentSearchInput,
  ContentSearchResult,
} from './ContentSearchService';

// ---------------------------------------------------------------------------
// Mock child_process and @vscode/ripgrep
// ---------------------------------------------------------------------------

const mockSpawn = vi.fn();
vi.mock('child_process', () => ({ spawn: (...args: unknown[]) => mockSpawn(...args) }));
vi.mock('@vscode/ripgrep', () => ({ rgPath: '/mock/bin/rg' }));

// Helper: create a fake ChildProcess that we can drive from tests
function createMockProcess() {
  const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
  const stdoutListeners: Record<string, ((...args: unknown[]) => void)[]> = {};
  const stderrListeners: Record<string, ((...args: unknown[]) => void)[]> = {};

  const proc = {
    stdout: {
      on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
        stdoutListeners[event] = stdoutListeners[event] || [];
        stdoutListeners[event].push(cb);
      }),
    },
    stderr: {
      on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
        stderrListeners[event] = stderrListeners[event] || [];
        stderrListeners[event].push(cb);
      }),
    },
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(cb);
    }),
    kill: vi.fn(),
    // Helpers to drive the mock:
    emitStdout(data: string) {
      for (const cb of stdoutListeners['data'] || []) cb(Buffer.from(data));
    },
    emitStderr(data: string) {
      for (const cb of stderrListeners['data'] || []) cb(Buffer.from(data));
    },
    emitClose(code: number | null) {
      for (const cb of listeners['close'] || []) cb(code);
    },
    emitError(err: Error) {
      for (const cb of listeners['error'] || []) cb(err);
    },
  };
  return proc;
}

// ---------------------------------------------------------------------------
// Helper: ripgrep JSON match line
// ---------------------------------------------------------------------------
function rgMatchLine(opts: {
  path: string;
  lineNumber: number;
  lineText: string;
  matchText: string;
  start: number;
  end: number;
}): string {
  return JSON.stringify({
    type: 'match',
    data: {
      path: { text: opts.path },
      lines: { text: opts.lineText + '\n' },
      line_number: opts.lineNumber,
      submatches: [
        { match: { text: opts.matchText }, start: opts.start, end: opts.end },
      ],
    },
  });
}

function rgSummaryLine(): string {
  return JSON.stringify({
    type: 'summary',
    data: { elapsed_total: { secs: 0, nanos: 1000 }, stats: {} },
  });
}

// ============================================================================
// TESTS: buildRgArgs
// ============================================================================

describe('buildRgArgs', () => {
  it('builds basic args with defaults (case-insensitive, fixed-strings)', () => {
    const args = buildRgArgs({
      query: 'hello',
      maxMatchesPerFile: 5,
      caseSensitive: false,
      regex: false,
      directories: ['/src'],
    });

    expect(args).toContain('--json');
    expect(args).toContain('--ignore-case');
    expect(args).toContain('--fixed-strings');
    expect(args).toContain('--max-count');
    expect(args[args.indexOf('--max-count') + 1]).toBe('5');
    // query after '--' separator
    const sepIdx = args.indexOf('--');
    expect(sepIdx).toBeGreaterThan(-1);
    expect(args[sepIdx + 1]).toBe('hello');
    // directories at the end
    expect(args[args.length - 1]).toBe('/src');
  });

  it('omits --ignore-case when caseSensitive is true', () => {
    const args = buildRgArgs({
      query: 'Hello',
      maxMatchesPerFile: 3,
      caseSensitive: true,
      regex: false,
      directories: ['/a'],
    });
    expect(args).not.toContain('--ignore-case');
  });

  it('omits --fixed-strings when regex is true', () => {
    const args = buildRgArgs({
      query: 'hel+o',
      maxMatchesPerFile: 5,
      caseSensitive: false,
      regex: true,
      directories: ['/a'],
    });
    expect(args).not.toContain('--fixed-strings');
  });

  it('includes glob filter when provided', () => {
    const args = buildRgArgs({
      query: 'test',
      maxMatchesPerFile: 5,
      caseSensitive: false,
      regex: false,
      globFilter: '*.ts',
      directories: ['/a'],
    });
    // Should have the user glob (last --glob before --)
    const globIndices = args.reduce<number[]>((acc, v, i) => {
      if (v === '--glob') acc.push(i);
      return acc;
    }, []);
    const lastGlobIdx = globIndices[globIndices.length - 1];
    expect(args[lastGlobIdx + 1]).toBe('*.ts');
  });

  it('excludes EXCLUDED_DIRS via --glob', () => {
    const args = buildRgArgs({
      query: 'x',
      maxMatchesPerFile: 1,
      caseSensitive: false,
      regex: false,
      directories: ['/a'],
    });
    // Should have at least one exclusion glob like !node_modules
    const exclusions = args.filter((a) => a.startsWith('!'));
    expect(exclusions.length).toBeGreaterThan(0);
    expect(exclusions.some((e) => e.includes('node_modules'))).toBe(true);
  });

  it('does not include --no-ignore by default', () => {
    const args = buildRgArgs({
      query: 'x',
      maxMatchesPerFile: 1,
      caseSensitive: false,
      regex: false,
      directories: ['/a'],
    });
    expect(args).not.toContain('--no-ignore');
  });

  it('includes --no-ignore when includeIgnored is true', () => {
    const args = buildRgArgs({
      query: 'x',
      maxMatchesPerFile: 1,
      caseSensitive: false,
      regex: false,
      includeIgnored: true,
      directories: ['/a'],
    });
    expect(args).toContain('--no-ignore');
  });

  it('supports multiple directories', () => {
    const args = buildRgArgs({
      query: 'x',
      maxMatchesPerFile: 1,
      caseSensitive: false,
      regex: false,
      directories: ['/a', '/b', '/c'],
    });
    const sepIdx = args.indexOf('--');
    // query + 3 directories after '--'
    expect(args.slice(sepIdx + 1)).toEqual(['x', '/a', '/b', '/c']);
  });
});

// ============================================================================
// TESTS: parseRgOutput
// ============================================================================

describe('parseRgOutput', () => {
  it('returns empty results for empty stdout', () => {
    const result = parseRgOutput('', ['/src'], 50);
    expect(result).toEqual({ results: [], totalMatches: 0, truncated: false });
  });

  it('parses a single match', () => {
    const stdout = rgMatchLine({
      path: '/src/foo.ts',
      lineNumber: 10,
      lineText: 'const hello = "world";',
      matchText: 'hello',
      start: 6,
      end: 11,
    });

    const result = parseRgOutput(stdout, ['/src'], 50);
    expect(result.results).toHaveLength(1);
    expect(result.totalMatches).toBe(1);
    expect(result.truncated).toBe(false);

    const file = result.results[0];
    expect(file.path).toBe('/src/foo.ts');
    expect(file.relativePath).toBe('foo.ts');
    expect(file.projectRoot).toBe('/src');
    expect(file.matches).toHaveLength(1);
    expect(file.matches[0]).toEqual({
      line: 10,
      text: 'const hello = "world";',
      matchStart: 6,
      matchEnd: 11,
    });
  });

  it('groups matches by file', () => {
    const stdout = [
      rgMatchLine({ path: '/src/a.ts', lineNumber: 1, lineText: 'aaa', matchText: 'a', start: 0, end: 1 }),
      rgMatchLine({ path: '/src/a.ts', lineNumber: 5, lineText: 'aab', matchText: 'a', start: 0, end: 1 }),
      rgMatchLine({ path: '/src/b.ts', lineNumber: 2, lineText: 'bba', matchText: 'a', start: 2, end: 3 }),
    ].join('\n');

    const result = parseRgOutput(stdout, ['/src'], 50);
    expect(result.results).toHaveLength(2);
    expect(result.results[0].path).toBe('/src/a.ts');
    expect(result.results[0].matches).toHaveLength(2);
    expect(result.results[1].path).toBe('/src/b.ts');
    expect(result.results[1].matches).toHaveLength(1);
    expect(result.totalMatches).toBe(3);
  });

  it('truncates at file limit but counts all matches', () => {
    const stdout = [
      rgMatchLine({ path: '/src/a.ts', lineNumber: 1, lineText: 'x', matchText: 'x', start: 0, end: 1 }),
      rgMatchLine({ path: '/src/b.ts', lineNumber: 1, lineText: 'x', matchText: 'x', start: 0, end: 1 }),
      rgMatchLine({ path: '/src/c.ts', lineNumber: 1, lineText: 'x', matchText: 'x', start: 0, end: 1 }),
    ].join('\n');

    const result = parseRgOutput(stdout, ['/src'], 2);
    expect(result.results).toHaveLength(2);
    expect(result.truncated).toBe(true);
    // All matches counted (including beyond file limit) for accurate summary
    expect(result.totalMatches).toBe(3);
  });

  it('assigns correct projectRoot for multi-directory search', () => {
    const stdout = [
      rgMatchLine({ path: '/project-a/src/x.ts', lineNumber: 1, lineText: 'x', matchText: 'x', start: 0, end: 1 }),
      rgMatchLine({ path: '/project-b/lib/y.ts', lineNumber: 1, lineText: 'y', matchText: 'y', start: 0, end: 1 }),
    ].join('\n');

    const result = parseRgOutput(stdout, ['/project-a', '/project-b'], 50);
    expect(result.results[0].projectRoot).toBe('/project-a');
    expect(result.results[0].relativePath).toBe('src/x.ts');
    expect(result.results[1].projectRoot).toBe('/project-b');
    expect(result.results[1].relativePath).toBe('lib/y.ts');
  });

  it('ignores non-match rg message types', () => {
    const stdout = [
      rgSummaryLine(),
      rgMatchLine({ path: '/src/a.ts', lineNumber: 1, lineText: 'x', matchText: 'x', start: 0, end: 1 }),
      JSON.stringify({ type: 'begin', data: { path: { text: '/src/a.ts' } } }),
      JSON.stringify({ type: 'end', data: { path: { text: '/src/a.ts' } } }),
    ].join('\n');

    const result = parseRgOutput(stdout, ['/src'], 50);
    expect(result.results).toHaveLength(1);
    expect(result.totalMatches).toBe(1);
  });

  it('handles malformed JSON lines gracefully', () => {
    const stdout = [
      'not json at all',
      rgMatchLine({ path: '/src/a.ts', lineNumber: 1, lineText: 'x', matchText: 'x', start: 0, end: 1 }),
      '{broken json',
    ].join('\n');

    const result = parseRgOutput(stdout, ['/src'], 50);
    expect(result.results).toHaveLength(1);
    expect(result.totalMatches).toBe(1);
  });

  it('strips trailing newlines from match text', () => {
    const stdout = rgMatchLine({
      path: '/src/a.ts',
      lineNumber: 1,
      lineText: 'hello world',
      matchText: 'hello',
      start: 0,
      end: 5,
    });
    const result = parseRgOutput(stdout, ['/src'], 50);
    expect(result.results[0].matches[0].text).toBe('hello world');
    expect(result.results[0].matches[0].text).not.toMatch(/\n$/);
  });

  it('handles multiple submatches in one line', () => {
    const line = JSON.stringify({
      type: 'match',
      data: {
        path: { text: '/src/a.ts' },
        lines: { text: 'foo bar foo\n' },
        line_number: 3,
        submatches: [
          { match: { text: 'foo' }, start: 0, end: 3 },
          { match: { text: 'foo' }, start: 8, end: 11 },
        ],
      },
    });

    const result = parseRgOutput(line, ['/src'], 50);
    expect(result.results[0].matches).toHaveLength(2);
    expect(result.totalMatches).toBe(2);
    expect(result.results[0].matches[0].matchStart).toBe(0);
    expect(result.results[0].matches[1].matchStart).toBe(8);
  });
});

// ============================================================================
// TESTS: ContentSearchService (integration with mocked spawn)
// ============================================================================

describe('ContentSearchService', () => {
  let ContentSearchService: typeof import('./ContentSearchService').ContentSearchService;

  beforeEach(async () => {
    mockSpawn.mockReset();
    // Re-import to get fresh module (singleton reset)
    const mod = await import('./ContentSearchService');
    ContentSearchService = mod.ContentSearchService;
  });

  function setupMockSpawn(stdout: string, exitCode: number = 0) {
    const proc = createMockProcess();
    mockSpawn.mockReturnValue(proc);
    // Schedule output and close asynchronously
    queueMicrotask(() => {
      proc.emitStdout(stdout);
      proc.emitClose(exitCode);
    });
    return proc;
  }

  it('spawns ripgrep with the mocked rgPath', async () => {
    const stdout = rgMatchLine({
      path: '/src/foo.ts',
      lineNumber: 1,
      lineText: 'hello',
      matchText: 'hello',
      start: 0,
      end: 5,
    });
    setupMockSpawn(stdout);

    const service = new ContentSearchService();
    const result = await service.search({
      query: 'hello',
      directories: ['/src'],
    });

    expect(mockSpawn).toHaveBeenCalledTimes(1);
    expect(mockSpawn.mock.calls[0][0]).toBe('/mock/bin/rg');
    expect(result.results).toHaveLength(1);
    expect(result.totalMatches).toBe(1);
  });

  it('returns empty results for empty query', async () => {
    const service = new ContentSearchService();
    const result = await service.search({
      query: '   ',
      directories: ['/src'],
    });

    expect(result).toEqual({ results: [], totalMatches: 0, truncated: false });
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it('returns empty results for empty directories', async () => {
    const service = new ContentSearchService();
    const result = await service.search({
      query: 'hello',
      directories: [],
    });

    expect(result).toEqual({ results: [], totalMatches: 0, truncated: false });
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it('returns empty results when rg exits with code 1 (no matches)', async () => {
    setupMockSpawn('', 1);

    const service = new ContentSearchService();
    const result = await service.search({
      query: 'nonexistent',
      directories: ['/src'],
    });

    expect(result).toEqual({ results: [], totalMatches: 0, truncated: false });
  });

  it('rejects when rg exits with code >= 2', async () => {
    const proc = createMockProcess();
    mockSpawn.mockReturnValue(proc);
    queueMicrotask(() => {
      proc.emitStderr('rg: some error');
      proc.emitClose(2);
    });

    const service = new ContentSearchService();
    await expect(
      service.search({ query: 'x', directories: ['/src'] }),
    ).rejects.toThrow('ripgrep failed (code 2): rg: some error');
  });

  it('rejects on spawn error (ENOENT)', async () => {
    const proc = createMockProcess();
    mockSpawn.mockReturnValue(proc);
    queueMicrotask(() => {
      proc.emitError(new Error('spawn /mock/bin/rg ENOENT'));
    });

    const service = new ContentSearchService();
    await expect(
      service.search({ query: 'x', directories: ['/src'] }),
    ).rejects.toThrow('Failed to spawn ripgrep: spawn /mock/bin/rg ENOENT');
  });

  it('cancels previous search when a new one starts', async () => {
    // First search: never resolves naturally (slow)
    const proc1 = createMockProcess();
    const proc2 = createMockProcess();

    let callCount = 0;
    mockSpawn.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? proc1 : proc2;
    });

    const service = new ContentSearchService();

    // Start first search (will be cancelled)
    const promise1 = service.search({ query: 'slow', directories: ['/src'] });

    // Start second search immediately (cancels first)
    const stdout2 = rgMatchLine({
      path: '/src/b.ts',
      lineNumber: 1,
      lineText: 'fast',
      matchText: 'fast',
      start: 0,
      end: 4,
    });

    // Give the second search its spawn mock
    queueMicrotask(() => {
      proc2.emitStdout(stdout2);
      proc2.emitClose(0);
    });

    const promise2 = service.search({ query: 'fast', directories: ['/src'] });

    // First search should have been killed
    expect(proc1.kill).toHaveBeenCalledWith('SIGTERM');

    const result2 = await promise2;
    expect(result2.results).toHaveLength(1);
    expect(result2.results[0].matches[0].text).toBe('fast');

    // First search resolves with empty (aborted)
    // Emit close for proc1 after abort
    proc1.emitClose(0);
    const result1 = await promise1;
    expect(result1.results).toEqual([]);
  });

  it('passes caseSensitive and regex options through to args', async () => {
    setupMockSpawn('', 1);

    const service = new ContentSearchService();
    await service.search({
      query: 'Test.*',
      directories: ['/src'],
      caseSensitive: true,
      regex: true,
    });

    const args = mockSpawn.mock.calls[0][1] as string[];
    expect(args).not.toContain('--ignore-case');
    expect(args).not.toContain('--fixed-strings');
  });

  it('passes glob filter through to args', async () => {
    setupMockSpawn('', 1);

    const service = new ContentSearchService();
    await service.search({
      query: 'test',
      directories: ['/src'],
      glob: '*.tsx',
    });

    const args = mockSpawn.mock.calls[0][1] as string[];
    const globIdx = args.lastIndexOf('--glob');
    expect(args[globIdx + 1]).toBe('*.tsx');
  });

  it('passes includeIgnored option through to args', async () => {
    setupMockSpawn('', 1);

    const service = new ContentSearchService();
    await service.search({
      query: 'secret',
      directories: ['/src'],
      includeIgnored: true,
    });

    const args = mockSpawn.mock.calls[0][1] as string[];
    expect(args).toContain('--no-ignore');
  });

  it('passes limit to parseRgOutput (limits returned files)', async () => {
    const stdout = [
      rgMatchLine({ path: '/src/a.ts', lineNumber: 1, lineText: 'x', matchText: 'x', start: 0, end: 1 }),
      rgMatchLine({ path: '/src/b.ts', lineNumber: 1, lineText: 'x', matchText: 'x', start: 0, end: 1 }),
      rgMatchLine({ path: '/src/c.ts', lineNumber: 1, lineText: 'x', matchText: 'x', start: 0, end: 1 }),
    ].join('\n');
    setupMockSpawn(stdout);

    const service = new ContentSearchService();
    const result = await service.search({
      query: 'x',
      directories: ['/src'],
      limit: 2,
    });

    expect(result.results).toHaveLength(2);
    expect(result.truncated).toBe(true);
    // totalMatches counts all matches, including those beyond the file limit
    expect(result.totalMatches).toBe(3);
  });

  it('resolves empty on pre-aborted signal', async () => {
    // Start a search, abort immediately via a second search, verify first returns empty
    const proc1 = createMockProcess();
    const proc2 = createMockProcess();

    let callCount = 0;
    mockSpawn.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? proc1 : proc2;
    });

    const service = new ContentSearchService();
    const p1 = service.search({ query: 'a', directories: ['/src'] });
    const p2 = service.search({ query: 'b', directories: ['/src'] });

    // Complete both processes
    proc1.emitClose(0);
    proc2.emitClose(1);

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.results).toEqual([]);
    expect(r2.results).toEqual([]);
  });
});
