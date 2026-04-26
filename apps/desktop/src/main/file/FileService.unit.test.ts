import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { FileService } from './FileService';

// Create a real temp directory for integration-style tests
let tmpDir: string;
let service: FileService;

const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(() => mockLogger),
  level: 'debug' as const,
  fatal: vi.fn(),
};

const mockCallbacks = {
  onChanged: vi.fn(),
};

beforeEach(async () => {
  tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'fileservice-test-'));
  service = new FileService({
    logger: mockLogger as never,
    callbacks: mockCallbacks,
  });
  service.setAllowedRoots([tmpDir]);
});

afterEach(async () => {
  service.unwatchAll();
  await fsPromises.rm(tmpDir, { recursive: true, force: true });
});

describe('FileService.assertWithinAllowedRoot', () => {
  it('rejects paths outside allowed roots', async () => {
    await expect(service.createDirectory('/tmp/outside-root/test')).rejects.toThrow('Path is outside allowed project directories');
  });

  it('allows paths when no roots are configured', async () => {
    const unrestricted = new FileService({
      logger: mockLogger as never,
      callbacks: mockCallbacks,
    });
    const dirPath = path.join(tmpDir, 'unrestricted');
    const result = await unrestricted.createDirectory(dirPath);
    expect(result.success).toBe(true);
  });
});

describe('FileService.createDirectory', () => {
  it('creates a directory', async () => {
    const dirPath = path.join(tmpDir, 'new-dir');
    const result = await service.createDirectory(dirPath);
    expect(result.success).toBe(true);

    const stat = await fsPromises.stat(dirPath);
    expect(stat.isDirectory()).toBe(true);
  });

  it('creates nested directories recursively', async () => {
    const dirPath = path.join(tmpDir, 'a', 'b', 'c');
    const result = await service.createDirectory(dirPath);
    expect(result.success).toBe(true);

    const stat = await fsPromises.stat(dirPath);
    expect(stat.isDirectory()).toBe(true);
  });

  it('succeeds when directory already exists', async () => {
    const dirPath = path.join(tmpDir, 'existing');
    await fsPromises.mkdir(dirPath);

    const result = await service.createDirectory(dirPath);
    expect(result.success).toBe(true);
  });

  it('rejects relative paths', async () => {
    await expect(service.createDirectory('relative/path')).rejects.toThrow('Path must be absolute');
  });
});

describe('FileService.createFile', () => {
  it('creates an empty file', async () => {
    const filePath = path.join(tmpDir, 'new-file.txt');
    const result = await service.createFile(filePath);
    expect(result.success).toBe(true);

    const content = await fsPromises.readFile(filePath, 'utf8');
    expect(content).toBe('');
  });

  it('rejects if file already exists', async () => {
    const filePath = path.join(tmpDir, 'existing.txt');
    await fsPromises.writeFile(filePath, 'content');

    await expect(service.createFile(filePath)).rejects.toThrow('File already exists');
  });

  it('rejects relative paths', async () => {
    await expect(service.createFile('relative/file.txt')).rejects.toThrow('Path must be absolute');
  });
});

describe('FileService.rename', () => {
  it('renames a file', async () => {
    const oldPath = path.join(tmpDir, 'old.txt');
    const newPath = path.join(tmpDir, 'new.txt');
    await fsPromises.writeFile(oldPath, 'content');

    const result = await service.rename(oldPath, newPath);
    expect(result.success).toBe(true);

    const content = await fsPromises.readFile(newPath, 'utf8');
    expect(content).toBe('content');

    await expect(fsPromises.access(oldPath)).rejects.toThrow();
  });

  it('renames a directory', async () => {
    const oldPath = path.join(tmpDir, 'old-dir');
    const newPath = path.join(tmpDir, 'new-dir');
    await fsPromises.mkdir(oldPath);
    await fsPromises.writeFile(path.join(oldPath, 'file.txt'), 'hello');

    const result = await service.rename(oldPath, newPath);
    expect(result.success).toBe(true);

    const content = await fsPromises.readFile(path.join(newPath, 'file.txt'), 'utf8');
    expect(content).toBe('hello');
  });

  it('rejects relative paths', async () => {
    await expect(service.rename('relative/old', 'relative/new')).rejects.toThrow('Paths must be absolute');
  });

  it('rejects rename to a different directory', async () => {
    const oldPath = path.join(tmpDir, 'old.txt');
    const newPath = path.join(tmpDir, 'subdir', 'moved.txt');

    await expect(service.rename(oldPath, newPath)).rejects.toThrow('Rename must stay within the same directory');
  });

  it('rejects names with null bytes', async () => {
    const oldPath = path.join(tmpDir, 'old.txt');
    const newPath = path.join(tmpDir, 'bad\0name.txt');

    await expect(service.rename(oldPath, newPath)).rejects.toThrow('Name contains invalid characters');
  });
});

describe('FileService.deleteItem', () => {
  it('deletes a file', async () => {
    const filePath = path.join(tmpDir, 'to-delete.txt');
    await fsPromises.writeFile(filePath, 'content');

    const result = await service.deleteItem(filePath);
    expect(result.success).toBe(true);

    await expect(fsPromises.access(filePath)).rejects.toThrow();
  });

  it('deletes a directory recursively', async () => {
    const dirPath = path.join(tmpDir, 'to-delete');
    await fsPromises.mkdir(dirPath);
    await fsPromises.writeFile(path.join(dirPath, 'file.txt'), 'hello');
    await fsPromises.mkdir(path.join(dirPath, 'sub'));
    await fsPromises.writeFile(path.join(dirPath, 'sub', 'nested.txt'), 'world');

    const result = await service.deleteItem(dirPath);
    expect(result.success).toBe(true);

    await expect(fsPromises.access(dirPath)).rejects.toThrow();
  });

  it('rejects relative paths', async () => {
    await expect(service.deleteItem('relative/path')).rejects.toThrow('Path must be absolute');
  });

  it('throws for nonexistent paths', async () => {
    const fakePath = path.join(tmpDir, 'nonexistent');
    await expect(service.deleteItem(fakePath)).rejects.toThrow();
  });
});

describe('FileService.listDirectory', () => {
  it('lists files and directories sorted correctly', async () => {
    await fsPromises.mkdir(path.join(tmpDir, 'zeta-dir'));
    await fsPromises.mkdir(path.join(tmpDir, 'alpha-dir'));
    await fsPromises.writeFile(path.join(tmpDir, 'beta.txt'), 'content');
    await fsPromises.writeFile(path.join(tmpDir, 'alpha.txt'), 'content');

    const result = await service.listDirectory(tmpDir);

    // Directories first, then files, each sorted alphabetically
    expect(result.entries.map((e) => e.name)).toEqual([
      'alpha-dir',
      'zeta-dir',
      'alpha.txt',
      'beta.txt',
    ]);
    expect(result.entries[0]!.type).toBe('directory');
    expect(result.entries[2]!.type).toBe('file');
    expect(result.entries[2]!.extension).toBe('.txt');
  });

  it('marks hidden files correctly', async () => {
    await fsPromises.writeFile(path.join(tmpDir, '.hidden'), 'content');
    await fsPromises.writeFile(path.join(tmpDir, 'visible'), 'content');

    const result = await service.listDirectory(tmpDir);
    const hidden = result.entries.find((e) => e.name === '.hidden');
    const visible = result.entries.find((e) => e.name === 'visible');

    expect(hidden?.isHidden).toBe(true);
    expect(visible?.isHidden).toBe(false);
  });
});
