import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { FileIndexService } from './FileIndexService';
import type { IndexStatus } from './FileIndexService';

// Mock fs.promises.readdir to avoid real I/O
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    promises: {
      ...actual.promises,
      readdir: vi.fn(),
    },
  };
});

// Mock child_process.spawn for git check-ignore
vi.mock('child_process', () => ({
  spawn: vi.fn(() => {
    const proc = {
      stdout: { on: vi.fn() },
      stdin: { write: vi.fn(), end: vi.fn() },
      on: vi.fn((event: string, cb: (code: number) => void) => {
        if (event === 'close') {
          // Fire close immediately with empty output (no git-ignored files)
          setTimeout(() => cb(0), 0);
        }
      }),
    };
    return proc;
  }),
}));

function createDirent(name: string, isDir: boolean): fs.Dirent<string> {
  return {
    name,
    isDirectory: () => isDir,
    isFile: () => !isDir,
    isSymbolicLink: () => false,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    parentPath: '',
    path: '',
  } as fs.Dirent<string>;
}

describe('FileIndexService', () => {
  let service: FileIndexService;
  const mockReaddir = vi.mocked(fs.promises.readdir) as unknown as ReturnType<
    typeof vi.fn<(path: string, opts: { withFileTypes: true }) => Promise<fs.Dirent<string>[]>>
  >;

  beforeEach(() => {
    service = new FileIndexService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    service.shutdown();
  });

  describe('addDirectory', () => {
    it('scans directory contents asynchronously using fs.promises.readdir', async () => {
      mockReaddir.mockResolvedValueOnce([
        createDirent('foo.ts', false),
        createDirent('bar.js', false),
        createDirent('node_modules', true),
      ] as unknown as fs.Dirent<string>[]);

      service.addDirectory('/test/project');

      // Wait for async scan to complete
      await vi.waitFor(() => {
        expect(service.isDirectoryIndexed('/test/project')).toBe(true);
      });

      expect(mockReaddir).toHaveBeenCalledWith('/test/project', { withFileTypes: true });

      const results = service.search({ query: 'foo' });
      expect(results).toHaveLength(1);
      expect(results[0]!.name).toBe('foo.ts');
    });

    it('excludes node_modules and other excluded directories', async () => {
      mockReaddir.mockResolvedValueOnce([
        createDirent('src', true),
        createDirent('node_modules', true),
        createDirent('.git', true),
        createDirent('dist', true),
      ] as unknown as fs.Dirent<string>[]);

      // Only src/ should be traversed
      mockReaddir.mockResolvedValueOnce([
        createDirent('index.ts', false),
      ] as unknown as fs.Dirent<string>[]);

      service.addDirectory('/test/project');

      await vi.waitFor(() => {
        expect(service.isDirectoryIndexed('/test/project')).toBe(true);
      });

      // Should have called readdir for root + src only (not node_modules, .git, dist)
      expect(mockReaddir).toHaveBeenCalledTimes(2);
    });

    it('excludes files with excluded extensions', async () => {
      mockReaddir.mockResolvedValueOnce([
        createDirent('app.ts', false),
        createDirent('package-lock.lock', false),
        createDirent('debug.log', false),
        createDirent('bundle.map', false),
      ] as unknown as fs.Dirent<string>[]);

      service.addDirectory('/test/project');

      await vi.waitFor(() => {
        expect(service.isDirectoryIndexed('/test/project')).toBe(true);
      });

      const results = service.search({ query: 'a', limit: 100 });
      expect(results).toHaveLength(1);
      expect(results[0]!.name).toBe('app.ts');
    });

    it('does not re-scan already indexed directories', async () => {
      mockReaddir.mockResolvedValue([] as unknown as fs.Dirent<string>[]);

      service.addDirectory('/test/project');
      await vi.waitFor(() => {
        expect(service.isDirectoryIndexed('/test/project')).toBe(true);
      });

      const callCount = mockReaddir.mock.calls.length;
      service.addDirectory('/test/project');

      // Should not have made additional calls
      expect(mockReaddir.mock.calls.length).toBe(callCount);
    });
  });

  describe('removeDirectory', () => {
    it('removes indexed files and aborts in-progress scans', async () => {
      mockReaddir.mockResolvedValueOnce([
        createDirent('file.ts', false),
      ] as unknown as fs.Dirent<string>[]);

      service.addDirectory('/test/project');
      await vi.waitFor(() => {
        expect(service.isDirectoryIndexed('/test/project')).toBe(true);
      });

      service.removeDirectory('/test/project');

      const results = service.search({ query: 'file' });
      expect(results).toHaveLength(0);
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      mockReaddir.mockResolvedValueOnce([
        createDirent('Button.tsx', false),
        createDirent('Input.tsx', false),
        createDirent('Modal.tsx', false),
      ] as unknown as fs.Dirent<string>[]);

      service.addDirectory('/test/ui');
      await vi.waitFor(() => {
        expect(service.isDirectoryIndexed('/test/ui')).toBe(true);
      });
    });

    it('returns fuzzy-matched results sorted by score', () => {
      const results = service.search({ query: 'btn' });
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0]!.name).toBe('Button.tsx');
    });

    it('respects limit parameter', () => {
      const results = service.search({ query: '.tsx', limit: 2 });
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('filters by extension', () => {
      const results = service.search({ query: 'b', extensions: ['tsx'] });
      for (const result of results) {
        expect(result.extension).toBe('tsx');
      }
    });

    it('returns empty array for empty query', () => {
      expect(service.search({ query: '' })).toEqual([]);
      expect(service.search({ query: '   ' })).toEqual([]);
    });
  });

  describe('getStatus', () => {
    it('returns correct status when idle', () => {
      const status = service.getStatus();
      expect(status.totalFiles).toBe(0);
      expect(status.directories).toBe(0);
      expect(status.isIndexing).toBe(false);
      expect(status.indexingDirectories).toEqual([]);
    });

    it('reports isIndexing=true during a scan', () => {
      // Make readdir hang so the scan stays in progress
      mockReaddir.mockImplementation(() => new Promise(() => {}));

      service.addDirectory('/test/project');

      const status = service.getStatus();
      expect(status.isIndexing).toBe(true);
      expect(status.indexingDirectories).toContain('/test/project');
    });

    it('reports isIndexing=false after scan completes', async () => {
      mockReaddir.mockResolvedValueOnce([
        createDirent('file.ts', false),
      ] as unknown as fs.Dirent<string>[]);

      service.addDirectory('/test/project');
      await vi.waitFor(() => {
        expect(service.isDirectoryIndexed('/test/project')).toBe(true);
      });

      const status = service.getStatus();
      expect(status.isIndexing).toBe(false);
      expect(status.totalFiles).toBe(1);
      expect(status.directories).toBe(1);
    });
  });

  describe('onStatusChange', () => {
    it('emits status when indexing starts', () => {
      const listener = vi.fn();
      service.onStatusChange(listener);

      mockReaddir.mockImplementation(() => new Promise(() => {}));
      service.addDirectory('/test/project');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ isIndexing: true }),
      );
    });

    it('emits status when indexing completes', async () => {
      const listener = vi.fn();
      service.onStatusChange(listener);

      mockReaddir.mockResolvedValueOnce([] as unknown as fs.Dirent<string>[]);
      service.addDirectory('/test/project');

      await vi.waitFor(() => {
        expect(service.isDirectoryIndexed('/test/project')).toBe(true);
      });

      const lastCall = listener.mock.calls[listener.mock.calls.length - 1]![0] as IndexStatus;
      expect(lastCall.isIndexing).toBe(false);
    });

    it('returns an unsubscribe function', () => {
      const listener = vi.fn();
      const unsub = service.onStatusChange(listener);

      mockReaddir.mockImplementation(() => new Promise(() => {}));
      service.addDirectory('/test/a');
      expect(listener).toHaveBeenCalled();

      listener.mockClear();
      unsub();

      service.addDirectory('/test/b');
      expect(listener).not.toHaveBeenCalled();
    });

    it('emits status when directory is removed', async () => {
      mockReaddir.mockResolvedValueOnce([] as unknown as fs.Dirent<string>[]);
      service.addDirectory('/test/project');
      await vi.waitFor(() => {
        expect(service.isDirectoryIndexed('/test/project')).toBe(true);
      });

      const listener = vi.fn();
      service.onStatusChange(listener);

      service.removeDirectory('/test/project');
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ directories: 0, isIndexing: false }),
      );
    });
  });

  describe('shutdown', () => {
    it('clears all state and aborts in-progress scans', async () => {
      mockReaddir.mockResolvedValueOnce([
        createDirent('file.ts', false),
      ] as unknown as fs.Dirent<string>[]);

      service.addDirectory('/test/project');
      await vi.waitFor(() => {
        expect(service.isDirectoryIndexed('/test/project')).toBe(true);
      });

      service.shutdown();

      const status = service.getStatus();
      expect(status.totalFiles).toBe(0);
      expect(status.directories).toBe(0);
      expect(status.isIndexing).toBe(false);
    });
  });
});
