import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RegistryRecord, CreateRegistryInput, RegistryRepository } from '@vienna/app-db';
import { RegistryManager } from './RegistryManager';
import type { RegistrySyncer } from './RegistrySyncer';
import type { RegistryReader } from './RegistryReader';

function mockRecord(overrides: Partial<RegistryRecord> = {}): RegistryRecord {
  return {
    id: '1',
    name: 'test-reg',
    url: 'https://github.com/test/repo.git',
    enabled: true,
    priority: 10,
    source: 'local' as const,
    projectDirectory: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function createMockRepo() {
  return {
    create: vi.fn((input: CreateRegistryInput) => mockRecord({ name: input.name, url: input.url })),
    getById: vi.fn().mockReturnValue(null),
    getByName: vi.fn().mockReturnValue(null),
    listAll: vi.fn().mockReturnValue([]),
    listEnabled: vi.fn().mockReturnValue([]),
    update: vi.fn().mockReturnValue(null),
    updateUrl: vi.fn().mockReturnValue(null),
    delete: vi.fn().mockReturnValue(true),
  };
}

function createMockSyncer(): RegistrySyncer {
  return {
    syncOne: vi.fn().mockResolvedValue(undefined),
    syncAll: vi.fn().mockResolvedValue({ synced: 1, errors: [] }),
    removeCache: vi.fn().mockResolvedValue(undefined),
    checkRemoteChanges: vi.fn(),
  } as unknown as RegistrySyncer;
}

function createMockReader(): RegistryReader {
  return {
    readQuickActions: vi.fn().mockResolvedValue([]),
    readQuickActionDefaults: vi.fn().mockResolvedValue([]),
    readVerificationActions: vi.fn().mockResolvedValue([]),
    readVerificationActionDefaults: vi.fn().mockResolvedValue([]),
    readMetadata: vi.fn().mockResolvedValue(null),
  } as unknown as RegistryReader;
}

describe('RegistryManager', () => {
  let repository: ReturnType<typeof createMockRepo>;
  let syncer: ReturnType<typeof createMockSyncer>;
  let reader: ReturnType<typeof createMockReader>;
  type LogFn = (msg: string, ctx?: Record<string, unknown>) => void;
  let logger: { info: ReturnType<typeof vi.fn<LogFn>>; warn: ReturnType<typeof vi.fn<LogFn>>; error: ReturnType<typeof vi.fn<LogFn>> };
  let manager: RegistryManager;

  beforeEach(() => {
    repository = createMockRepo();
    syncer = createMockSyncer();
    reader = createMockReader();
    logger = { info: vi.fn<LogFn>(), warn: vi.fn<LogFn>(), error: vi.fn<LogFn>() };
    manager = new RegistryManager({
      repository: repository as unknown as RegistryRepository,
      syncer: syncer as unknown as RegistrySyncer,
      reader: reader as unknown as RegistryReader,
      cacheDir: '/cache',
      logger,
    });
  });

  describe('add', () => {
    it('creates via repository and triggers background sync', async () => {
      const result = await manager.add({ name: 'new', url: 'https://github.com/new/repo.git' });
      expect(repository.create).toHaveBeenCalled();
      expect(result.name).toBe('new');
      // Background sync is fire-and-forget, but syncOne should be called
      await vi.waitFor(() => expect(syncer.syncOne).toHaveBeenCalled());
    });

    it('rejects duplicate URL', async () => {
      repository.listAll.mockReturnValue([mockRecord({ url: 'https://github.com/existing/repo.git' })]);
      await expect(
        manager.add({ name: 'new', url: 'https://github.com/existing/repo.git' }),
      ).rejects.toThrow('already exists');
    });

    it('propagates repository.create errors', async () => {
      repository.create.mockImplementation(() => {
        throw new Error('UNIQUE constraint failed: registries.name');
      });
      await expect(
        manager.add({ name: 'dup', url: 'https://github.com/dup/repo.git' }),
      ).rejects.toThrow('UNIQUE constraint');
    });
  });

  describe('remove', () => {
    it('blocks removal of official registry', () => {
      repository.getById.mockReturnValue(mockRecord({ name: 'official' }));
      expect(() => manager.remove('1')).toThrow('Cannot remove the official registry');
    });

    it('deletes and cleans cache', () => {
      repository.getById.mockReturnValue(mockRecord());
      const result = manager.remove('1');
      expect(result).toBe(true);
      expect(repository.delete).toHaveBeenCalledWith('1');
    });

    it('returns false for unknown id', () => {
      repository.getById.mockReturnValue(null);
      expect(manager.remove('unknown')).toBe(false);
    });
  });

  describe('list', () => {
    it('delegates to repository', () => {
      const records = [mockRecord()];
      repository.listAll.mockReturnValue(records);
      expect(manager.list()).toEqual(records);
    });

    it('seeds default on first call when DB is empty', () => {
      repository.listAll.mockReturnValue([]);
      manager.list();
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'official', url: 'https://github.com/tryvienna/registry.git', priority: 0 }),
      );
    });

    it('does not seed when DB has entries', () => {
      repository.listAll.mockReturnValue([mockRecord()]);
      repository.getByName.mockReturnValue(mockRecord({ name: 'official', url: 'https://github.com/tryvienna/registry.git' }));
      manager.list();
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('updates official registry URL when it has changed', () => {
      const staleRecord = mockRecord({ id: 'official-id', name: 'official', url: 'https://github.com/hellodrift/registry.git' });
      repository.listAll.mockReturnValue([staleRecord]);
      repository.getByName.mockReturnValue(staleRecord);
      manager.list();
      expect(repository.updateUrl).toHaveBeenCalledWith('official-id', 'https://github.com/tryvienna/registry.git');
    });

    it('seeds only once', () => {
      repository.listAll.mockReturnValue([]);
      manager.list();
      manager.list();
      expect(repository.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('delegates to repository', () => {
      const updated = mockRecord({ priority: 5 });
      repository.update.mockReturnValue(updated);
      expect(manager.update('1', { priority: 5 })).toEqual(updated);
    });

    it('returns null for unknown', () => {
      repository.update.mockReturnValue(null);
      expect(manager.update('unknown', { priority: 5 })).toBeNull();
    });
  });

  describe('sync', () => {
    it('delegates to syncer with enabled registries', async () => {
      const records = [mockRecord()];
      repository.listAll.mockReturnValue(records);
      repository.listEnabled.mockReturnValue(records);

      const result = await manager.sync();
      expect(syncer.syncAll).toHaveBeenCalledWith(records, '/cache');
      expect(result).toEqual({ synced: 1 });
    });

    it('calls ensureSeeded before syncing', async () => {
      repository.listAll.mockReturnValue([]);
      repository.listEnabled.mockReturnValue([]);
      await manager.sync();
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'official' }),
      );
    });
  });

  describe('getQuickActions', () => {
    it('returns from reader', async () => {
      const actions = [{ id: 'qa-1', label: 'Test', icon: 'zap', description: 'Test', author: { name: 'X' }, tags: [], options: [] }];
      vi.mocked(reader.readQuickActions).mockResolvedValue(actions as never);
      repository.listAll.mockReturnValue([mockRecord()]);
      repository.listEnabled.mockReturnValue([mockRecord()]);

      const result = await manager.getQuickActions();
      expect(result).toEqual(actions);
    });

    it('returns cached data on second call', async () => {
      const actions = [{ id: 'qa-1', label: 'Test', icon: 'zap', description: 'Test', author: { name: 'X' }, tags: [], options: [] }];
      vi.mocked(reader.readQuickActions).mockResolvedValue(actions as never);
      repository.listAll.mockReturnValue([mockRecord()]);
      repository.listEnabled.mockReturnValue([mockRecord()]);

      await manager.getQuickActions();
      await manager.getQuickActions();
      expect(reader.readQuickActions).toHaveBeenCalledTimes(1);
    });
  });

  describe('getQuickActionDefaults', () => {
    it('returns from reader', async () => {
      vi.mocked(reader.readQuickActionDefaults).mockResolvedValue(['qa-1']);
      repository.listAll.mockReturnValue([mockRecord()]);
      repository.listEnabled.mockReturnValue([mockRecord()]);

      const result = await manager.getQuickActionDefaults();
      expect(result).toEqual(['qa-1']);
    });

    it('returns cached data on second call', async () => {
      vi.mocked(reader.readQuickActionDefaults).mockResolvedValue(['qa-1']);
      repository.listAll.mockReturnValue([mockRecord()]);
      repository.listEnabled.mockReturnValue([mockRecord()]);

      await manager.getQuickActionDefaults();
      await manager.getQuickActionDefaults();
      expect(reader.readQuickActionDefaults).toHaveBeenCalledTimes(1);
    });
  });

  describe('getVerificationActions', () => {
    it('returns from reader', async () => {
      const actions = [{ id: 'va-1', type: 'builtin' as const, builtinId: 'workstream:archive', label: 'Archive' }];
      vi.mocked(reader.readVerificationActions).mockResolvedValue(actions as never);
      repository.listAll.mockReturnValue([mockRecord()]);
      repository.listEnabled.mockReturnValue([mockRecord()]);

      const result = await manager.getVerificationActions();
      expect(result).toEqual(actions);
    });

    it('returns cached data on second call', async () => {
      const actions = [{ id: 'va-1', type: 'builtin' as const, builtinId: 'workstream:archive', label: 'Archive' }];
      vi.mocked(reader.readVerificationActions).mockResolvedValue(actions as never);
      repository.listAll.mockReturnValue([mockRecord()]);
      repository.listEnabled.mockReturnValue([mockRecord()]);

      await manager.getVerificationActions();
      await manager.getVerificationActions();
      expect(reader.readVerificationActions).toHaveBeenCalledTimes(1);
    });
  });

  describe('getVerificationActionDefaults', () => {
    it('returns from reader', async () => {
      const defaults = [{ id: 'va-1', type: 'builtin' as const, builtinId: 'workstream:archive', label: 'Archive' }];
      vi.mocked(reader.readVerificationActionDefaults).mockResolvedValue(defaults as never);
      repository.listAll.mockReturnValue([mockRecord()]);
      repository.listEnabled.mockReturnValue([mockRecord()]);

      const result = await manager.getVerificationActionDefaults();
      expect(result).toEqual(defaults);
    });

    it('returns cached data on second call', async () => {
      const defaults = [{ id: 'va-1', type: 'builtin' as const, builtinId: 'workstream:archive', label: 'Archive' }];
      vi.mocked(reader.readVerificationActionDefaults).mockResolvedValue(defaults as never);
      repository.listAll.mockReturnValue([mockRecord()]);
      repository.listEnabled.mockReturnValue([mockRecord()]);

      await manager.getVerificationActionDefaults();
      await manager.getVerificationActionDefaults();
      expect(reader.readVerificationActionDefaults).toHaveBeenCalledTimes(1);
    });
  });
});
