import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommandRegistry } from './CommandRegistry';
import type { CommandRegistryLogger, CommandRegistryEmitter, CommandHandler } from './CommandRegistry';
import type { CommandDefinition } from '../../command/schemas';

function createTestLogger(): CommandRegistryLogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

function createTestEmitter(): CommandRegistryEmitter {
  return {
    onInvalidate: vi.fn(),
  };
}

function makeCommand(overrides: Partial<CommandDefinition> = {}): CommandDefinition {
  return {
    id: 'test:cmd',
    category: 'navigation',
    title: 'Test Command',
    ...overrides,
  };
}

describe('CommandRegistry', () => {
  let registry: CommandRegistry;
  let logger: CommandRegistryLogger;
  let emitter: CommandRegistryEmitter;

  beforeEach(() => {
    logger = createTestLogger();
    emitter = createTestEmitter();
    registry = new CommandRegistry({ logger, emitter });
  });

  // ─── Register / Unregister ─────────────────────────────────────────────

  describe('register', () => {
    it('adds commands to the catalog', () => {
      registry.register([
        makeCommand({ id: 'a', title: 'A' }),
        makeCommand({ id: 'b', title: 'B' }),
      ]);
      expect(registry.getCatalog()).toHaveLength(2);
    });

    it('overwrites existing commands with same ID', () => {
      registry.register([makeCommand({ id: 'a', title: 'Original' })]);
      registry.register([makeCommand({ id: 'a', title: 'Updated' })]);
      expect(registry.getCatalog()).toHaveLength(1);
      expect(registry.getCommand('a')?.title).toBe('Updated');
    });

    it('emits graphql invalidation event', () => {
      registry.register([makeCommand()]);
      expect(emitter.onInvalidate).toHaveBeenCalledWith({ typename: 'Command' });
    });
  });

  describe('unregister', () => {
    it('removes commands by prefix', () => {
      registry.register([
        makeCommand({ id: 'agent:model' }),
        makeCommand({ id: 'agent:clear' }),
        makeCommand({ id: 'app:home' }),
      ]);
      registry.unregister('agent:');
      expect(registry.getCatalog()).toHaveLength(1);
      expect(registry.getCommand('app:home')).toBeDefined();
    });

    it('removes associated handlers', async () => {
      registry.register([makeCommand({ id: 'agent:model' })]);
      registry.registerHandler('agent:model', async () => ({ type: 'none' }));
      registry.unregister('agent:');
      // Execute should return "not found" since command was unregistered
      const result = await registry.execute('agent:model');
      expect(result).toEqual(
        expect.objectContaining({ success: false })
      );
    });

    it('does not emit if nothing was removed', () => {
      registry.register([makeCommand({ id: 'app:test' })]);
      vi.mocked(emitter.onInvalidate).mockClear();
      registry.unregister('nonexistent:');
      expect(emitter.onInvalidate).not.toHaveBeenCalled();
    });
  });

  // ─── Catalog Access ────────────────────────────────────────────────────

  describe('getCatalog', () => {
    it('returns all commands without filter', () => {
      registry.register([
        makeCommand({ id: 'a', category: 'navigation' }),
        makeCommand({ id: 'b', category: 'claude' }),
      ]);
      expect(registry.getCatalog()).toHaveLength(2);
    });

    it('filters by category', () => {
      registry.register([
        makeCommand({ id: 'a', category: 'navigation' }),
        makeCommand({ id: 'b', category: 'claude' }),
        makeCommand({ id: 'c', category: 'navigation' }),
      ]);
      expect(registry.getCatalog('navigation')).toHaveLength(2);
      expect(registry.getCatalog('claude')).toHaveLength(1);
      expect(registry.getCatalog('developer')).toHaveLength(0);
    });
  });

  describe('getCommand', () => {
    it('returns command by ID', () => {
      registry.register([makeCommand({ id: 'app:test', title: 'Test' })]);
      expect(registry.getCommand('app:test')?.title).toBe('Test');
    });

    it('returns undefined for unknown ID', () => {
      expect(registry.getCommand('nonexistent')).toBeUndefined();
    });
  });

  // ─── Execution ─────────────────────────────────────────────────────────

  describe('execute', () => {
    it('executes registered handler and returns action', async () => {
      registry.register([makeCommand({ id: 'app:home' })]);
      registry.registerHandler('app:home', async () => ({
        type: 'navigate',
        path: '/',
      }));

      const result = await registry.execute('app:home');
      expect(result).toEqual({
        success: true,
        action: { type: 'navigate', path: '/' },
      });
    });

    it('passes args to handler', async () => {
      const handler = vi.fn<CommandHandler>().mockResolvedValue({ type: 'none' });
      registry.register([makeCommand({ id: 'test:cmd' })]);
      registry.registerHandler('test:cmd', handler);

      await registry.execute('test:cmd', { key: 'value' });
      expect(handler).toHaveBeenCalledWith({ key: 'value' });
    });

    it('returns error for unknown command', async () => {
      const result = await registry.execute('nonexistent');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown command');
    });

    it('returns error for disabled command', async () => {
      registry.register([
        makeCommand({ id: 'test:disabled', disabled: true, disabledReason: 'Agent not running' }),
      ]);
      const result = await registry.execute('test:disabled');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Agent not running');
    });

    it('returns none action for commands without handler', async () => {
      registry.register([makeCommand({ id: 'test:nohandler' })]);
      const result = await registry.execute('test:nohandler');
      expect(result).toEqual({ success: true, action: { type: 'none' } });
    });

    it('catches handler errors', async () => {
      registry.register([makeCommand({ id: 'test:error' })]);
      registry.registerHandler('test:error', async () => {
        throw new Error('Handler failed');
      });

      const result = await registry.execute('test:error');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Handler failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  // ─── Handler Registration ─────────────────────────────────────────────

  describe('registerHandlers', () => {
    it('registers multiple handlers at once', async () => {
      registry.register([
        makeCommand({ id: 'a' }),
        makeCommand({ id: 'b' }),
      ]);
      registry.registerHandlers({
        a: async () => ({ type: 'navigate' as const, path: '/a' }),
        b: async () => ({ type: 'navigate' as const, path: '/b' }),
      });

      const resultA = await registry.execute('a');
      const resultB = await registry.execute('b');
      expect(resultA.action).toEqual({ type: 'navigate', path: '/a' });
      expect(resultB.action).toEqual({ type: 'navigate', path: '/b' });
    });
  });

  // ─── Events ────────────────────────────────────────────────────────────

  describe('onCatalogUpdated', () => {
    it('notifies local listeners on register', () => {
      const listener = vi.fn();
      registry.onCatalogUpdated(listener);
      registry.register([makeCommand()]);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('notifies local listeners on unregister', () => {
      registry.register([makeCommand({ id: 'x:1' })]);
      const listener = vi.fn();
      registry.onCatalogUpdated(listener);
      registry.unregister('x:');
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('supports unsubscribe', () => {
      const listener = vi.fn();
      const unsub = registry.onCatalogUpdated(listener);
      unsub();
      registry.register([makeCommand()]);
      expect(listener).not.toHaveBeenCalled();
    });

    it('works without emitter (optional DI)', () => {
      const reg = new CommandRegistry({ logger });
      expect(() => reg.register([makeCommand()])).not.toThrow();
    });
  });
});
