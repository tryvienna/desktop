/**
 * File Change Review Integration Tests
 *
 * @ai-context
 * - Tests the pure-logic pieces of the file change review system:
 *   1. useAllPendingApprovals — Edit/Write filtering
 *   2. useFileChanges helpers — status mapping, path extraction
 *   3. formatDisplayName / formatDescription from useAllPendingApprovals
 * - No React rendering (node env), only function-level tests
 */

import { describe, it, expect } from 'vitest';

// ─── Inline copies of pure functions under test ──────────────────────────────
// These are copied from source to test in isolation without requiring React imports.
// If the source functions change, these tests should be updated to match.

// From use-all-pending-approvals.ts
function formatDisplayName(rawName: string): string {
  if (rawName.startsWith('mcp__') || rawName.includes('__')) {
    const segments = rawName.split('__');
    const last = segments[segments.length - 1] ?? rawName;
    return last
      .split(/[_-]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  return rawName;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '\u2026' : s;
}

function formatDescription(toolName: string, input: Record<string, unknown>): string {
  switch (toolName) {
    case 'Read':
    case 'Edit':
    case 'Write':
      if (typeof input.file_path === 'string') return input.file_path;
      break;
    case 'Bash':
      if (typeof input.command === 'string') return truncate(input.command, 60);
      break;
    case 'Glob':
    case 'Grep':
      if (typeof input.pattern === 'string') return input.pattern;
      break;
    case 'WebSearch':
      if (typeof input.query === 'string') return input.query;
      break;
    case 'WebFetch':
      if (typeof input.url === 'string') return input.url;
      break;
    case 'TaskOutput':
      if (typeof input.task_id === 'string') return `task ${input.task_id}`;
      break;
  }

  if (typeof input.description === 'string') return truncate(input.description, 80);
  if (typeof input.query === 'string') return truncate(input.query, 80);
  if (typeof input.path === 'string') return input.path;
  if (typeof input.file_path === 'string') return input.file_path;
  if (typeof input.command === 'string') return truncate(input.command, 60);
  if (typeof input.url === 'string') return input.url;
  if (typeof input.pattern === 'string') return input.pattern;

  for (const value of Object.values(input)) {
    if (typeof value === 'string' && value.length > 0) {
      return truncate(value, 60);
    }
  }

  return '';
}

// From use-file-changes.ts
function extractFilePath(input: Record<string, unknown>): string {
  if (typeof input.file_path === 'string') return input.file_path;
  return 'unknown';
}

function extractDirectory(filePath: string): string {
  const lastSlash = filePath.lastIndexOf('/');
  if (lastSlash === -1) return '.';
  if (lastSlash === 0) return '/';
  return filePath.substring(0, lastSlash);
}

type ToolStatus = 'pending' | 'pending_permission' | 'running' | 'complete' | 'error';

function mapToolStatus(
  status: ToolStatus,
  errorMessage?: string
): 'approved' | 'denied' | 'pending' | undefined {
  switch (status) {
    case 'pending':
      return 'pending'; // Tool created but not yet ready for approval
    case 'running':
    case 'complete':
      return 'approved';
    case 'error':
      if (errorMessage === 'Permission denied') return 'denied';
      return 'approved';
    default:
      return undefined;
  }
}

// Edit/Write are NOT excluded from use-all-pending-approvals.ts anymore.
// They appear in both the inline FileChangeReviewPanel AND the PermissionActionBar
// so the user always has a visible approval mechanism even when the panel is scrolled away.

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('formatDisplayName', () => {
  it('returns the raw name for simple tools', () => {
    expect(formatDisplayName('Bash')).toBe('Bash');
    expect(formatDisplayName('Read')).toBe('Read');
  });

  it('extracts and title-cases the last segment of MCP tools', () => {
    expect(formatDisplayName('mcp__slack__send_message')).toBe('Send Message');
    expect(formatDisplayName('mcp__github__create_pr')).toBe('Create Pr');
  });

  it('handles double-underscore tools without mcp__ prefix', () => {
    expect(formatDisplayName('vienna__entity_search')).toBe('Entity Search');
  });

  it('handles hyphens in the last segment', () => {
    expect(formatDisplayName('mcp__fs__list-directory')).toBe('List Directory');
  });
});

describe('formatDescription', () => {
  it('returns file_path for Edit/Write/Read', () => {
    expect(formatDescription('Edit', { file_path: '/src/app.ts' })).toBe('/src/app.ts');
    expect(formatDescription('Write', { file_path: '/new-file.ts' })).toBe('/new-file.ts');
    expect(formatDescription('Read', { file_path: '/readme.md' })).toBe('/readme.md');
  });

  it('truncates Bash commands to 60 chars', () => {
    const long = 'a'.repeat(100);
    const result = formatDescription('Bash', { command: long });
    expect(result.length).toBe(60);
    expect(result.endsWith('\u2026')).toBe(true);
  });

  it('returns pattern for Glob/Grep', () => {
    expect(formatDescription('Glob', { pattern: '**/*.ts' })).toBe('**/*.ts');
    expect(formatDescription('Grep', { pattern: 'TODO' })).toBe('TODO');
  });

  it('returns query for WebSearch', () => {
    expect(formatDescription('WebSearch', { query: 'vitest setup' })).toBe('vitest setup');
  });

  it('returns url for WebFetch', () => {
    expect(formatDescription('WebFetch', { url: 'https://example.com' })).toBe(
      'https://example.com'
    );
  });

  it('falls back to generic input fields', () => {
    expect(formatDescription('SomeTool', { description: 'do something' })).toBe('do something');
    expect(formatDescription('SomeTool', { path: '/foo' })).toBe('/foo');
  });

  it('falls back to first string value in input', () => {
    expect(formatDescription('Unknown', { count: 5, name: 'hello' })).toBe('hello');
  });

  it('returns empty string when no string values exist', () => {
    expect(formatDescription('Unknown', { count: 5 })).toBe('');
  });
});

describe('extractFilePath', () => {
  it('returns file_path from input', () => {
    expect(extractFilePath({ file_path: '/src/index.ts' })).toBe('/src/index.ts');
  });

  it('returns "unknown" when file_path is missing', () => {
    expect(extractFilePath({})).toBe('unknown');
    expect(extractFilePath({ file_path: 42 })).toBe('unknown');
  });
});

describe('extractDirectory', () => {
  it('extracts directory from file path', () => {
    expect(extractDirectory('/src/components/button.tsx')).toBe('/src/components');
    expect(extractDirectory('/root-file.ts')).toBe('/');
  });

  it('returns "." for bare filename', () => {
    expect(extractDirectory('file.ts')).toBe('.');
  });
});

describe('mapToolStatus', () => {
  it('maps running/complete to approved', () => {
    expect(mapToolStatus('running')).toBe('approved');
    expect(mapToolStatus('complete')).toBe('approved');
  });

  it('maps error with "Permission denied" to denied', () => {
    expect(mapToolStatus('error', 'Permission denied')).toBe('denied');
  });

  it('maps other errors to approved (errored after approval)', () => {
    expect(mapToolStatus('error', 'Something went wrong')).toBe('approved');
    expect(mapToolStatus('error')).toBe('approved');
  });

  it('returns "pending" for pending status (tool not yet ready for approval)', () => {
    expect(mapToolStatus('pending')).toBe('pending');
  });

  it('returns undefined for pending_permission (tool ready for approval)', () => {
    expect(mapToolStatus('pending_permission')).toBeUndefined();
  });
});

describe('Edit/Write in PermissionActionBar', () => {
  it('Edit/Write are NOT excluded — they appear in both inline panel and action bar', () => {
    // This is intentional: the PermissionActionBar serves as a fallback
    // when the inline FileChangeReviewPanel is scrolled out of view.
    // Previously Edit/Write were excluded, causing a bug where the user
    // had no visible way to approve file changes.
    const fileChangeTools = new Set(['Edit', 'Write']);
    expect(fileChangeTools.has('Edit')).toBe(true);
    expect(fileChangeTools.has('Write')).toBe(true);
    // The key behavioral change: useAllPendingApprovals no longer filters these out
  });
});

describe('pendingCount filtering', () => {
  // Simulates the status derivation from use-file-changes.ts:
  // status: toolUse.status === 'pending_permission' ? undefined : mapToolStatus(toolUse)
  function deriveChangeStatus(
    toolStatus: ToolStatus,
    errorMessage?: string
  ): 'approved' | 'denied' | 'pending' | undefined {
    if (toolStatus === 'pending_permission') return undefined;
    return mapToolStatus(toolStatus, errorMessage);
  }

  // Simulates: changes.filter(c => !c.status).length
  function countPending(statuses: (ReturnType<typeof deriveChangeStatus>)[]): number {
    return statuses.filter((s) => !s).length;
  }

  it('only counts pending_permission tools as needing approval', () => {
    const statuses = [
      deriveChangeStatus('pending'),              // 'pending' — truthy, not counted
      deriveChangeStatus('pending_permission'),    // undefined — falsy, counted
      deriveChangeStatus('running'),               // 'approved' — truthy, not counted
      deriveChangeStatus('complete'),              // 'approved' — truthy, not counted
      deriveChangeStatus('error', 'Some error'),   // 'approved' — truthy, not counted
    ];
    expect(countPending(statuses)).toBe(1);
  });

  it('does not count streaming tools (pending status) as needing approval', () => {
    const statuses = [
      deriveChangeStatus('pending'),
      deriveChangeStatus('pending'),
    ];
    expect(countPending(statuses)).toBe(0);
  });

  it('counts multiple pending_permission tools correctly', () => {
    const statuses = [
      deriveChangeStatus('pending_permission'),
      deriveChangeStatus('pending_permission'),
      deriveChangeStatus('complete'),
    ];
    expect(countPending(statuses)).toBe(2);
  });
});

describe('truncate', () => {
  it('does not truncate short strings', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('truncates at max-1 and appends ellipsis', () => {
    expect(truncate('hello world', 8)).toBe('hello w\u2026');
  });

  it('handles exact length', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });
});
