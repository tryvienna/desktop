import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KeybindingsManager } from './KeybindingsManager';
import type { FsLike, KeybindingsEmitter } from './KeybindingsManager';
import { DEFAULT_KEYBINDINGS } from '../../keybindings/defaults';
import type { KeybindingsMap } from '../../keybindings/schemas';
import type { MainLogger } from '@vienna/logger/main';

// ─── Mocks ──────────────────────────────────────────────────────────────────

function createMockFs(): FsLike & { _files: Map<string, string> } {
  const files = new Map<string, string>();
  return {
    _files: files,
    readFile: vi.fn(async (path: string) => {
      const content = files.get(path);
      if (content === undefined) {
        throw Object.assign(new Error(`ENOENT: ${path}`), { code: 'ENOENT' });
      }
      return content;
    }),
    writeFile: vi.fn(async (path: string, content: string) => {
      files.set(path, content);
    }),
    rename: vi.fn(async (oldPath: string, newPath: string) => {
      const content = files.get(oldPath);
      if (content !== undefined) {
        files.set(newPath, content);
        files.delete(oldPath);
      }
    }),
    unlink: vi.fn(async (path: string) => {
      files.delete(path);
    }),
    mkdir: vi.fn(async () => {}),
  };
}

function createMockLogger(): MainLogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    getSessionId: () => 'test',
    getLogFile: () => '/dev/null',
    close: vi.fn(async () => {}),
  } as unknown as MainLogger;
}

function createMockEmitter(): KeybindingsEmitter & { calls: Array<{ keybindings: KeybindingsMap }> } {
  const calls: Array<{ keybindings: KeybindingsMap }> = [];
  return {
    calls,
    onChanged: vi.fn((payload) => {
      calls.push(payload);
    }),
  };
}

const TEST_PATH = '/test/keybindings.json';

function createManager(fs: FsLike, emitter?: KeybindingsEmitter) {
  return new KeybindingsManager({
    fs,
    keybindingsPath: TEST_PATH,
    logger: createMockLogger(),
    emitter: emitter ?? createMockEmitter(),
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('KeybindingsManager', () => {
  let fs: ReturnType<typeof createMockFs>;
  let emitter: ReturnType<typeof createMockEmitter>;

  beforeEach(() => {
    fs = createMockFs();
    emitter = createMockEmitter();
  });

  describe('initialize', () => {
    it('creates an empty overrides file when file does not exist', async () => {
      const manager = createManager(fs, emitter);
      await manager.initialize();

      expect(fs._files.has(TEST_PATH)).toBe(true);
      expect(JSON.parse(fs._files.get(TEST_PATH)!)).toEqual({});
      manager.cleanup();
    });

    it('loads existing overrides from file', async () => {
      const overrides: KeybindingsMap = {
        'app:toggle-sidebar': { modifiers: ['alt'], key: 'b' },
      };
      fs._files.set(TEST_PATH, JSON.stringify(overrides));

      const manager = createManager(fs, emitter);
      await manager.initialize();

      const bindings = manager.getKeybindings();
      expect(bindings['app:toggle-sidebar']).toEqual({ modifiers: ['alt'], key: 'b' });
      manager.cleanup();
    });

    it('handles invalid JSON by resetting to empty', async () => {
      fs._files.set(TEST_PATH, 'not valid json');

      const manager = createManager(fs, emitter);
      await manager.initialize();

      expect(JSON.parse(fs._files.get(TEST_PATH)!)).toEqual({});
      manager.cleanup();
    });

    it('handles invalid schema by resetting to empty', async () => {
      fs._files.set(TEST_PATH, JSON.stringify({ bad: { modifiers: 'invalid', key: 5 } }));

      const manager = createManager(fs, emitter);
      await manager.initialize();

      expect(JSON.parse(fs._files.get(TEST_PATH)!)).toEqual({});
      manager.cleanup();
    });

    it('cleans stale overrides that match a different command default', async () => {
      // app:toggle-sidebar default is cmd+b. If someone stored cmd+b for a custom command,
      // that was the old default. Since it now conflicts, it should be discarded.
      const stored: KeybindingsMap = {
        'custom:command': { modifiers: ['cmd'], key: 'b' },
      };
      fs._files.set(TEST_PATH, JSON.stringify(stored));

      const manager = createManager(fs, emitter);
      await manager.initialize();

      // The custom:command should be discarded because cmd+b is app:toggle-sidebar's default
      const overrides = JSON.parse(fs._files.get(TEST_PATH)!) as KeybindingsMap;
      expect(overrides['custom:command']).toBeUndefined();
      manager.cleanup();
    });

    it('cleans no-op overrides that match their own default', async () => {
      // Storing the exact same shortcut as the default should be cleaned up
      const stored: KeybindingsMap = {
        'app:toggle-sidebar': DEFAULT_KEYBINDINGS['app:toggle-sidebar']!,
      };
      fs._files.set(TEST_PATH, JSON.stringify(stored));

      const manager = createManager(fs, emitter);
      await manager.initialize();

      const overrides = JSON.parse(fs._files.get(TEST_PATH)!) as KeybindingsMap;
      expect(overrides['app:toggle-sidebar']).toBeUndefined();
      manager.cleanup();
    });

    it('is idempotent', async () => {
      const manager = createManager(fs, emitter);
      await manager.initialize();
      await manager.initialize(); // should not throw

      expect(fs.mkdir).toHaveBeenCalledTimes(1);
      manager.cleanup();
    });
  });

  describe('getKeybindings', () => {
    it('merges defaults with user overrides', async () => {
      const overrides: KeybindingsMap = {
        'app:toggle-sidebar': { modifiers: ['alt'], key: 'x' },
      };
      fs._files.set(TEST_PATH, JSON.stringify(overrides));

      const manager = createManager(fs, emitter);
      await manager.initialize();

      const bindings = manager.getKeybindings();
      // Override wins
      expect(bindings['app:toggle-sidebar']).toEqual({ modifiers: ['alt'], key: 'x' });
      // Default still present
      expect(bindings['app:new-workstream']).toEqual(DEFAULT_KEYBINDINGS['app:new-workstream']);
      manager.cleanup();
    });
  });

  describe('getDefaultKeybindings', () => {
    it('returns a copy of defaults', async () => {
      const manager = createManager(fs, emitter);
      await manager.initialize();

      const defaults = manager.getDefaultKeybindings();
      expect(defaults).toEqual(DEFAULT_KEYBINDINGS);
      // Should be a copy, not the same reference
      expect(defaults).not.toBe(DEFAULT_KEYBINDINGS);
      manager.cleanup();
    });
  });

  describe('updateKeybinding', () => {
    it('persists the override and emits', async () => {
      const manager = createManager(fs, emitter);
      await manager.initialize();
      emitter.calls.length = 0;

      await manager.updateKeybinding('app:toggle-sidebar', { modifiers: ['alt'], key: 'x' });

      // Persisted to file
      const stored = JSON.parse(fs._files.get(TEST_PATH)!) as KeybindingsMap;
      expect(stored['app:toggle-sidebar']).toEqual({ modifiers: ['alt'], key: 'x' });

      // Emitted
      expect(emitter.calls).toHaveLength(1);
      expect(emitter.calls[0]!.keybindings['app:toggle-sidebar']).toEqual({ modifiers: ['alt'], key: 'x' });
      manager.cleanup();
    });

    it('throws if not initialized', async () => {
      const manager = createManager(fs, emitter);
      await expect(
        manager.updateKeybinding('app:sidebar', { modifiers: ['cmd'], key: 'b' })
      ).rejects.toThrow('not initialized');
    });
  });

  describe('resetKeybinding', () => {
    it('removes override and falls back to default', async () => {
      fs._files.set(
        TEST_PATH,
        JSON.stringify({ 'app:toggle-sidebar': { modifiers: ['alt'], key: 'x' } })
      );

      const manager = createManager(fs, emitter);
      await manager.initialize();
      emitter.calls.length = 0;

      await manager.resetKeybinding('app:toggle-sidebar');

      const bindings = manager.getKeybindings();
      expect(bindings['app:toggle-sidebar']).toEqual(DEFAULT_KEYBINDINGS['app:toggle-sidebar']);
      expect(emitter.calls).toHaveLength(1);
      manager.cleanup();
    });
  });

  describe('resetAllKeybindings', () => {
    it('clears all overrides', async () => {
      fs._files.set(
        TEST_PATH,
        JSON.stringify({
          'app:toggle-sidebar': { modifiers: ['alt'], key: 'x' },
          'app:new-workstream': { modifiers: ['alt'], key: 'y' },
        })
      );

      const manager = createManager(fs, emitter);
      await manager.initialize();
      emitter.calls.length = 0;

      await manager.resetAllKeybindings();

      const stored = JSON.parse(fs._files.get(TEST_PATH)!) as KeybindingsMap;
      expect(stored).toEqual({});
      expect(manager.getKeybindings()).toEqual(DEFAULT_KEYBINDINGS);
      expect(emitter.calls).toHaveLength(1);
      manager.cleanup();
    });
  });

  describe('atomic writes', () => {
    it('writes to tmp file then renames', async () => {
      const manager = createManager(fs, emitter);
      await manager.initialize();

      expect(fs.writeFile).toHaveBeenCalledWith(
        `${TEST_PATH}.tmp`,
        expect.any(String),
        'utf-8'
      );
      expect(fs.rename).toHaveBeenCalledWith(`${TEST_PATH}.tmp`, TEST_PATH);
      manager.cleanup();
    });
  });

  describe('cleanup', () => {
    it('allows re-initialization after cleanup', async () => {
      const manager = createManager(fs, emitter);
      await manager.initialize();
      manager.cleanup();
      await manager.initialize();

      expect(manager.getKeybindings()).toEqual(DEFAULT_KEYBINDINGS);
      manager.cleanup();
    });
  });
});
