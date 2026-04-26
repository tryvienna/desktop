import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFileHandlers } from './handlers';

const mockFileService = {
  readFile: vi.fn(),
  writeFile: vi.fn(),
  watchFile: vi.fn(),
  unwatchFile: vi.fn(),
  listDirectory: vi.fn(),
  createDirectory: vi.fn(),
  createFile: vi.fn(),
  rename: vi.fn(),
  deleteItem: vi.fn(),
  unwatchAll: vi.fn(),
};

const handlers = createFileHandlers(mockFileService as never);

describe('createFileHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('file.read', () => {
    it('delegates to fileService.readFile', async () => {
      mockFileService.readFile.mockResolvedValue({ content: 'hello', language: 'typescript' });
      const result = await handlers.file.read({ path: '/test/file.ts' });

      expect(mockFileService.readFile).toHaveBeenCalledWith('/test/file.ts');
      expect(result).toEqual({ content: 'hello', language: 'typescript' });
    });
  });

  describe('file.write', () => {
    it('delegates to fileService.writeFile', async () => {
      mockFileService.writeFile.mockResolvedValue({ success: true });
      const result = await handlers.file.write({ path: '/test/file.ts', content: 'code' });

      expect(mockFileService.writeFile).toHaveBeenCalledWith('/test/file.ts', 'code');
      expect(result).toEqual({ success: true });
    });
  });

  describe('file.createDirectory', () => {
    it('delegates to fileService.createDirectory', async () => {
      mockFileService.createDirectory.mockResolvedValue({ success: true });
      const result = await handlers.file.createDirectory({ path: '/test/new-dir' });

      expect(mockFileService.createDirectory).toHaveBeenCalledWith('/test/new-dir');
      expect(result).toEqual({ success: true });
    });
  });

  describe('file.createFile', () => {
    it('delegates to fileService.createFile', async () => {
      mockFileService.createFile.mockResolvedValue({ success: true });
      const result = await handlers.file.createFile({ path: '/test/new-file.txt' });

      expect(mockFileService.createFile).toHaveBeenCalledWith('/test/new-file.txt');
      expect(result).toEqual({ success: true });
    });
  });

  describe('file.rename', () => {
    it('delegates to fileService.rename', async () => {
      mockFileService.rename.mockResolvedValue({ success: true });
      const result = await handlers.file.rename({ oldPath: '/test/old.txt', newPath: '/test/new.txt' });

      expect(mockFileService.rename).toHaveBeenCalledWith('/test/old.txt', '/test/new.txt');
      expect(result).toEqual({ success: true });
    });
  });

  describe('file.deleteItem', () => {
    it('delegates to fileService.deleteItem', async () => {
      mockFileService.deleteItem.mockResolvedValue({ success: true });
      const result = await handlers.file.deleteItem({ path: '/test/to-delete.txt' });

      expect(mockFileService.deleteItem).toHaveBeenCalledWith('/test/to-delete.txt');
      expect(result).toEqual({ success: true });
    });
  });

  describe('file.watch', () => {
    it('delegates to fileService.watchFile', async () => {
      mockFileService.watchFile.mockReturnValue({ watching: true });
      const result = await handlers.file.watch({ path: '/test/file.ts' });

      expect(mockFileService.watchFile).toHaveBeenCalledWith('/test/file.ts');
      expect(result).toEqual({ watching: true });
    });
  });

  describe('file.unwatch', () => {
    it('delegates to fileService.unwatchFile', async () => {
      mockFileService.unwatchFile.mockReturnValue({ success: true });
      const result = await handlers.file.unwatch({ path: '/test/file.ts' });

      expect(mockFileService.unwatchFile).toHaveBeenCalledWith('/test/file.ts');
      expect(result).toEqual({ success: true });
    });
  });

  describe('file.listDirectory', () => {
    it('delegates to fileService.listDirectory', async () => {
      const mockEntries = { entries: [{ name: 'test.ts', path: '/test/test.ts', type: 'file' }] };
      mockFileService.listDirectory.mockResolvedValue(mockEntries);
      const result = await handlers.file.listDirectory({ path: '/test' });

      expect(mockFileService.listDirectory).toHaveBeenCalledWith('/test');
      expect(result).toEqual(mockEntries);
    });
  });
});
