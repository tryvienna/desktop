import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../main/file-index/FileIndexService', () => {
  const mockService = {
    search: vi.fn(),
    addDirectory: vi.fn(),
    setDirectories: vi.fn(),
    getStatus: vi.fn(),
  };
  return {
    getFileIndexService: () => mockService,
    __mockService: mockService,
  };
});

import { filesHandlers } from './handlers';
import { getFileIndexService } from '../../main/file-index/FileIndexService';

describe('filesHandlers', () => {
  const mockService = getFileIndexService() as ReturnType<typeof getFileIndexService> & {
    search: ReturnType<typeof vi.fn>;
    addDirectory: ReturnType<typeof vi.fn>;
    setDirectories: ReturnType<typeof vi.fn>;
    getStatus: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('files.searchFiles', () => {
    it('delegates to FileIndexService.search and returns results', async () => {
      const mockResults = [
        { path: '/a/b.ts', name: 'b.ts', relativePath: 'b.ts', projectRoot: '/a', extension: 'ts', score: 10 },
      ];
      mockService.search.mockReturnValue(mockResults);

      const result = await filesHandlers.files.searchFiles({ query: 'b', limit: 10 });

      expect(mockService.search).toHaveBeenCalledWith({ query: 'b', limit: 10 });
      expect(result.results).toEqual(mockResults);
    });
  });

  describe('files.indexDirectories', () => {
    it('calls addDirectory for each directory', async () => {
      const result = await filesHandlers.files.indexDirectories({
        directories: ['/a', '/b', '/c'],
      });

      expect(mockService.addDirectory).toHaveBeenCalledTimes(3);
      expect(mockService.addDirectory).toHaveBeenCalledWith('/a');
      expect(mockService.addDirectory).toHaveBeenCalledWith('/b');
      expect(mockService.addDirectory).toHaveBeenCalledWith('/c');
      expect(result.success).toBe(true);
    });
  });

  describe('files.setDirectories', () => {
    it('delegates to FileIndexService.setDirectories', async () => {
      const result = await filesHandlers.files.setDirectories({
        directories: ['/a', '/b'],
      });

      expect(mockService.setDirectories).toHaveBeenCalledWith(['/a', '/b']);
      expect(result.success).toBe(true);
    });
  });

  describe('files.getIndexStatus', () => {
    it('returns current index status from FileIndexService', async () => {
      const mockStatus = {
        totalFiles: 1234,
        directories: 3,
        isIndexing: true,
        indexingDirectories: ['/a'],
      };
      mockService.getStatus.mockReturnValue(mockStatus);

      const result = await filesHandlers.files.getIndexStatus({});

      expect(mockService.getStatus).toHaveBeenCalled();
      expect(result).toEqual(mockStatus);
    });

    it('returns idle status when nothing is indexing', async () => {
      const mockStatus = {
        totalFiles: 0,
        directories: 0,
        isIndexing: false,
        indexingDirectories: [],
      };
      mockService.getStatus.mockReturnValue(mockStatus);

      const result = await filesHandlers.files.getIndexStatus({});

      expect(result.isIndexing).toBe(false);
    });
  });
});
