import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GitClient } from './GitClient';
import type { RegistryRecord } from '@vienna/app-db';
import { RegistrySyncer } from './RegistrySyncer';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  promises: {
    mkdir: vi.fn(),
    rm: vi.fn(),
  },
}));

import * as fs from 'node:fs';

function mockRegistry(overrides: Partial<RegistryRecord> = {}): RegistryRecord {
  return {
    id: '1',
    name: 'test-reg',
    url: 'https://github.com/test/repo.git',
    enabled: true,
    priority: 10,
    source: 'local' as const,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function createMockGit(): GitClient {
  return {
    clone: vi.fn(),
    pull: vi.fn(),
    fetch: vi.fn(),
    getCommitsBehind: vi.fn().mockResolvedValue(0),
  };
}

describe('RegistrySyncer', () => {
  let git: GitClient;
  type LogFn = (msg: string, ctx?: Record<string, unknown>) => void;
  let logger: { info: ReturnType<typeof vi.fn<LogFn>>; warn: ReturnType<typeof vi.fn<LogFn>> };
  let syncer: RegistrySyncer;

  beforeEach(() => {
    vi.clearAllMocks();
    git = createMockGit();
    logger = { info: vi.fn<LogFn>(), warn: vi.fn<LogFn>() };
    syncer = new RegistrySyncer({ git, logger });
  });

  describe('syncOne', () => {
    it('clones when cache dir does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const reg = mockRegistry();
      await syncer.syncOne(reg, '/cache');

      expect(fs.promises.mkdir).toHaveBeenCalledWith('/cache', { recursive: true });
      expect(git.clone).toHaveBeenCalledWith(reg.url, '/cache/test-reg', { depth: 1 });
      expect(git.pull).not.toHaveBeenCalled();
    });

    it('pulls when cache dir exists', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      const reg = mockRegistry();
      await syncer.syncOne(reg, '/cache');

      expect(git.pull).toHaveBeenCalledWith('/cache/test-reg');
      expect(git.clone).not.toHaveBeenCalled();
    });
  });

  describe('syncAll', () => {
    it('returns synced count', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      const result = await syncer.syncAll([mockRegistry(), mockRegistry({ name: 'b' })], '/cache');
      expect(result.synced).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('captures errors without halting', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(git.pull).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(undefined);

      const result = await syncer.syncAll([mockRegistry(), mockRegistry({ name: 'b' })], '/cache');
      expect(result.synced).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.error).toBe('network');
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('removeCache', () => {
    it('removes directory with force', async () => {
      await syncer.removeCache('test-reg', '/cache');
      expect(fs.promises.rm).toHaveBeenCalledWith('/cache/test-reg', { recursive: true, force: true });
    });
  });

  describe('checkRemoteChanges', () => {
    it('returns registries that are behind', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(git.getCommitsBehind).mockResolvedValue(3);

      const result = await syncer.checkRemoteChanges([mockRegistry()], '/cache');
      expect(result).toEqual([{ name: 'test-reg', behind: 3 }]);
    });

    it('skips registries with missing cache', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const result = await syncer.checkRemoteChanges([mockRegistry()], '/cache');
      expect(result).toEqual([]);
    });

    it('continues on errors', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(git.getCommitsBehind).mockRejectedValue(new Error('fetch failed'));

      const result = await syncer.checkRemoteChanges([mockRegistry()], '/cache');
      expect(result).toEqual([]);
      expect(logger.warn).toHaveBeenCalled();
    });
  });
});
