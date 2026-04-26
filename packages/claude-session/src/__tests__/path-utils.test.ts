import { describe, it, expect } from 'vitest';
import {
  decodeProjectPath,
  encodeProjectPath,
  extractSessionId,
  getClaudeProjectsDir,
  getClaudeSessionsDir,
} from '../path-utils';
import { homedir } from 'node:os';
import { join } from 'node:path';

describe('getClaudeProjectsDir', () => {
  it('returns ~/.claude/projects', () => {
    expect(getClaudeProjectsDir()).toBe(join(homedir(), '.claude', 'projects'));
  });
});

describe('getClaudeSessionsDir', () => {
  it('returns ~/.claude/sessions', () => {
    expect(getClaudeSessionsDir()).toBe(join(homedir(), '.claude', 'sessions'));
  });
});

describe('encodeProjectPath', () => {
  it('replaces all / with -', () => {
    expect(encodeProjectPath('/Users/will/Documents/dev/foo')).toBe(
      '-Users-will-Documents-dev-foo',
    );
  });

  it('handles root path', () => {
    expect(encodeProjectPath('/')).toBe('-');
  });
});

describe('decodeProjectPath', () => {
  it('decodes an encoded path back to absolute', () => {
    expect(decodeProjectPath('-Users-will-Documents-dev-foo')).toBe(
      '/Users/will/Documents/dev/foo',
    );
  });

  it('returns input unchanged if it does not start with -', () => {
    expect(decodeProjectPath('relative-path')).toBe('relative-path');
  });

  it('round-trips with encodeProjectPath for simple paths', () => {
    const original = '/Users/will/Documents/dev/vienna';
    expect(decodeProjectPath(encodeProjectPath(original))).toBe(original);
  });

  it('is lossy for paths with hyphens (known limitation)', () => {
    // /Users/will/my-project encodes to -Users-will-my-project
    // which decodes to /Users/will/my/project (wrong, but expected)
    const encoded = encodeProjectPath('/Users/will/my-project');
    const decoded = decodeProjectPath(encoded);
    expect(decoded).toBe('/Users/will/my/project');
    // This is why decodeProjectPathVerified exists
  });
});

describe('extractSessionId', () => {
  it('strips .jsonl extension', () => {
    expect(extractSessionId('abc-def-123.jsonl')).toBe('abc-def-123');
  });

  it('returns input unchanged if no .jsonl extension', () => {
    expect(extractSessionId('abc-def-123')).toBe('abc-def-123');
  });

  it('handles UUIDs', () => {
    expect(extractSessionId('02cda930-d5bb-4ccf-b3ba-421ba0f8f854.jsonl')).toBe(
      '02cda930-d5bb-4ccf-b3ba-421ba0f8f854',
    );
  });
});
