import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { RegistryReader } from './RegistryReader';
import type { RegistrySource } from './RegistryReader';

function mockSource(overrides: Partial<RegistrySource> = {}): RegistrySource {
  return {
    name: 'test-reg',
    priority: 10,
    path: '', // set per test via tmpDir
    type: 'git',
    ...overrides,
  };
}

const validQuickAction = {
  id: 'qa-1',
  label: 'Test Action',
  icon: 'zap',
  description: 'A test action',
  author: { name: 'Test Author' },
  tags: ['test'],
  options: [{ id: 'opt-1', label: 'Option 1', prompt: 'Do something' }],
};

describe('RegistryReader', () => {
  let tmpDir: string;
  type LogFn = (msg: string, ctx?: Record<string, unknown>) => void;
  let logger: { warn: ReturnType<typeof vi.fn<LogFn>> };
  let reader: RegistryReader;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reg-reader-'));
    logger = { warn: vi.fn<LogFn>() };
    reader = new RegistryReader({ logger });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  /** Write a file under a named source directory inside tmpDir. */
  function writeSourceFile(sourceName: string, filePath: string, content: unknown): void {
    const fullPath = path.join(tmpDir, sourceName, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, JSON.stringify(content));
  }

  /** Create a source pointing to a named subdirectory of tmpDir. */
  function source(name: string, priority = 10, type: 'git' | 'local' = 'git'): RegistrySource {
    return { name, priority, path: path.join(tmpDir, name), type };
  }

  describe('readQuickActions', () => {
    it('reads valid quick actions', async () => {
      writeSourceFile('test-reg', 'quick-actions/_index.json', [validQuickAction]);
      const result = await reader.readQuickActions([source('test-reg')]);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('qa-1');
      expect(result[0]!.registry).toBe('test-reg');
    });

    it('merges by priority (lower wins)', async () => {
      writeSourceFile('high', 'quick-actions/_index.json', [{ ...validQuickAction, label: 'High' }]);
      writeSourceFile('low', 'quick-actions/_index.json', [{ ...validQuickAction, label: 'Low' }]);

      const result = await reader.readQuickActions([source('low', 10), source('high', 0)]);
      expect(result).toHaveLength(1);
      expect(result[0]!.label).toBe('High');
    });

    it('skips malformed entries with warning', async () => {
      writeSourceFile('test-reg', 'quick-actions/_index.json', [{ id: 'bad' }]);
      const result = await reader.readQuickActions([source('test-reg')]);
      expect(result).toHaveLength(0);
      expect(logger.warn).toHaveBeenCalledWith(
        'Skipping malformed quick action entry',
        expect.objectContaining({ source: 'test-reg' }),
      );
    });

    it('deduplicates by ID', async () => {
      writeSourceFile('a', 'quick-actions/_index.json', [validQuickAction]);
      writeSourceFile('b', 'quick-actions/_index.json', [validQuickAction]);

      const result = await reader.readQuickActions([source('a', 0), source('b', 1)]);
      expect(result).toHaveLength(1);
    });

    it('returns empty for missing file', async () => {
      const result = await reader.readQuickActions([source('test-reg')]);
      expect(result).toEqual([]);
    });

    it('reads from local sources alongside git sources', async () => {
      writeSourceFile('git-reg', 'quick-actions/_index.json', [{ ...validQuickAction, id: 'git-qa' }]);
      writeSourceFile('local-reg', 'quick-actions/_index.json', [{ ...validQuickAction, id: 'local-qa' }]);

      const result = await reader.readQuickActions([
        source('git-reg', 10, 'git'),
        source('local-reg', 5, 'local'),
      ]);
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id).sort()).toEqual(['git-qa', 'local-qa']);
    });
  });

  describe('readQuickActionDefaults', () => {
    it('reads defaults from highest priority', async () => {
      writeSourceFile('test-reg', 'quick-actions/_defaults.json', { version: 1, defaults: ['qa-1'] });
      const result = await reader.readQuickActionDefaults([source('test-reg')]);
      expect(result).toEqual(['qa-1']);
    });

    it('falls through on missing file', async () => {
      writeSourceFile('b', 'quick-actions/_defaults.json', { version: 1, defaults: ['qa-1'] });

      const result = await reader.readQuickActionDefaults([source('a', 0), source('b', 1)]);
      expect(result).toEqual(['qa-1']);
    });

    it('returns empty when none found', async () => {
      const result = await reader.readQuickActionDefaults([source('test-reg')]);
      expect(result).toEqual([]);
    });
  });

  describe('readVerificationActions', () => {
    const validVerificationAction = {
      id: 'va-1',
      type: 'builtin' as const,
      builtinId: 'workstream:archive' as const,
      label: 'Archive',
    };

    const validPromptAction = {
      id: 'va-2',
      type: 'prompt' as const,
      label: 'Run Tests',
      prompt: 'Run all tests and report results',
    };

    it('reads valid verification actions', async () => {
      writeSourceFile('test-reg', 'verification-actions/_index.json', [validVerificationAction, validPromptAction]);
      const result = await reader.readVerificationActions([source('test-reg')]);
      expect(result).toHaveLength(2);
      expect(result[0]!.id).toBe('va-1');
      expect(result[1]!.type).toBe('prompt');
    });

    it('merges by priority (lower wins)', async () => {
      writeSourceFile('high', 'verification-actions/_index.json', [{ ...validVerificationAction, label: 'High' }]);
      writeSourceFile('low', 'verification-actions/_index.json', [{ ...validVerificationAction, label: 'Low' }]);

      const result = await reader.readVerificationActions([source('low', 10), source('high', 0)]);
      expect(result).toHaveLength(1);
      expect(result[0]!.label).toBe('High');
    });

    it('skips malformed entries with warning', async () => {
      writeSourceFile('test-reg', 'verification-actions/_index.json', [{ id: 'bad' }]);
      const result = await reader.readVerificationActions([source('test-reg')]);
      expect(result).toHaveLength(0);
      expect(logger.warn).toHaveBeenCalledWith(
        'Skipping malformed verification action entry',
        expect.objectContaining({ source: 'test-reg' }),
      );
    });

    it('returns empty for missing file', async () => {
      const result = await reader.readVerificationActions([source('test-reg')]);
      expect(result).toEqual([]);
    });
  });

  describe('readVerificationActionDefaults', () => {
    it('reads defaults from highest priority', async () => {
      const defaults = {
        version: 1,
        defaults: [
          { id: 'va-1', type: 'builtin' as const, builtinId: 'workstream:archive' as const, label: 'Archive' },
        ],
      };
      writeSourceFile('test-reg', 'verification-actions/_defaults.json', defaults);
      const result = await reader.readVerificationActionDefaults([source('test-reg')]);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('va-1');
    });

    it('returns empty when none found', async () => {
      const result = await reader.readVerificationActionDefaults([source('test-reg')]);
      expect(result).toEqual([]);
    });
  });

  describe('readMetadata', () => {
    it('reads valid registry.json', async () => {
      writeSourceFile('test-reg', 'registry.json', {
        name: 'test',
        displayName: 'Test Registry',
        version: 1,
      });
      const result = await reader.readMetadata(path.join(tmpDir, 'test-reg'));
      expect(result).toEqual({
        name: 'test',
        displayName: 'Test Registry',
        version: 1,
      });
    });

    it('returns null for missing file', async () => {
      expect(await reader.readMetadata(path.join(tmpDir, 'nonexistent'))).toBeNull();
    });

    it('returns null for invalid structure', async () => {
      writeSourceFile('test-reg', 'registry.json', { bad: true });
      expect(await reader.readMetadata(path.join(tmpDir, 'test-reg'))).toBeNull();
    });
  });
});
