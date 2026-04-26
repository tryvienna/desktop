import { describe, expect, it, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import { EventRegistry, CORE_PLUGIN_ID } from '../event-registry';
import { defineEvent } from '../define-event';
import type { EventHandlerContext } from '../define-event';
import { MockPluginLogger } from '../testing';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeEvent(name: string, schema = z.object({ value: z.string() })) {
  return defineEvent({ name, description: `Test event: ${name}`, schema });
}

function makeLogger() {
  return new MockPluginLogger({ service: 'test' });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('EventRegistry', () => {
  let registry: EventRegistry;
  let logger: MockPluginLogger;

  beforeEach(() => {
    registry = new EventRegistry();
    logger = makeLogger();
  });

  // ── Registration ─────────────────────────────────────────────────────────

  describe('registerEvents', () => {
    it('registers an event with a qualified name', () => {
      const event = makeEvent('pr.opened');
      registry.registerEvents('github', [event]);

      expect(registry.hasEvent('github.pr.opened')).toBe(true);
      expect(registry.getEventOwner('github.pr.opened')).toBe('github');
      expect(registry.getEventDefinition('github.pr.opened')).toBe(event);
    });

    it('registers multiple events for the same plugin', () => {
      registry.registerEvents('github', [makeEvent('pr.opened'), makeEvent('pr.merged')]);

      expect(registry.hasEvent('github.pr.opened')).toBe(true);
      expect(registry.hasEvent('github.pr.merged')).toBe(true);
      expect(registry.getEventsForPlugin('github')).toEqual(
        expect.arrayContaining(['github.pr.opened', 'github.pr.merged']),
      );
    });

    it('throws on duplicate event name', () => {
      registry.registerEvents('github', [makeEvent('pr.opened')]);

      expect(() => registry.registerEvents('github', [makeEvent('pr.opened')])).toThrow(
        /already registered/,
      );
    });

    it('different plugins can use the same local name (different prefix)', () => {
      expect(() => {
        registry.registerEvents('plugin_a', [makeEvent('item.created')]);
        registry.registerEvents('plugin_b', [makeEvent('item.created')]);
      }).not.toThrow();
    });
  });

  describe('registerCoreEvent', () => {
    it('registers under the core plugin ID', () => {
      registry.registerCoreEvent(makeEvent('reference.detected'));

      expect(registry.hasEvent('core.reference.detected')).toBe(true);
      expect(registry.getEventOwner('core.reference.detected')).toBe(CORE_PLUGIN_ID);
    });
  });

  describe('registerListeners', () => {
    it('registers a listener for an event', () => {
      registry.registerCoreEvent(makeEvent('test.event'));
      const handler = vi.fn();
      registry.registerListeners('listener_plugin', [{ event: 'core.test.event', handler }]);

      expect(registry.getListenerCount('core.test.event')).toBe(1);
    });

    it('allows listeners for not-yet-registered events (dormant binding)', () => {
      const handler = vi.fn();
      registry.registerListeners('listener_plugin', [{ event: 'future.event', handler }]);

      expect(registry.getListenerCount('future.event')).toBe(1);
    });

    it('registers multiple listeners for the same event', () => {
      registry.registerCoreEvent(makeEvent('test.event'));
      registry.registerListeners('plugin_a', [{ event: 'core.test.event', handler: vi.fn() }]);
      registry.registerListeners('plugin_b', [{ event: 'core.test.event', handler: vi.fn() }]);

      expect(registry.getListenerCount('core.test.event')).toBe(2);
    });
  });

  // ── Emission ─────────────────────────────────────────────────────────────

  describe('emit', () => {
    it('dispatches to listeners with validated payload', () => {
      registry.registerCoreEvent(makeEvent('test.event'));
      const handler = vi.fn();
      registry.registerListeners('listener', [{ event: 'core.test.event', handler }]);

      registry.emit(CORE_PLUGIN_ID, 'core.test.event', { value: 'hello' }, logger);

      expect(handler).toHaveBeenCalledWith({ value: 'hello' }, expect.objectContaining({
        emit: expect.any(Function),
        logger: expect.any(Object),
      }));
    });

    it('returns listener count', () => {
      registry.registerCoreEvent(makeEvent('test.event'));
      registry.registerListeners('a', [{ event: 'core.test.event', handler: vi.fn() }]);
      registry.registerListeners('b', [{ event: 'core.test.event', handler: vi.fn() }]);

      const count = registry.emit(CORE_PLUGIN_ID, 'core.test.event', { value: 'x' }, logger);
      expect(count).toBe(2);
    });

    it('returns 0 when no listeners exist', () => {
      registry.registerCoreEvent(makeEvent('test.event'));
      const count = registry.emit(CORE_PLUGIN_ID, 'core.test.event', { value: 'x' }, logger);

      expect(count).toBe(0);
      expect(logger.entries.some((e) => e.msg.includes('no listeners'))).toBe(true);
    });

    it('throws for unknown event name', () => {
      expect(() =>
        registry.emit(CORE_PLUGIN_ID, 'core.nonexistent', { value: 'x' }, logger),
      ).toThrow(/unknown event/i);
    });

    it('throws when caller is not the event owner', () => {
      registry.registerCoreEvent(makeEvent('test.event'));

      expect(() =>
        registry.emit('not_the_owner', 'core.test.event', { value: 'x' }, logger),
      ).toThrow(/cannot emit/i);
    });

    it('throws on invalid payload (schema validation)', () => {
      registry.registerCoreEvent(makeEvent('test.event'));

      expect(() =>
        registry.emit(CORE_PLUGIN_ID, 'core.test.event', { value: 123 }, logger),
      ).toThrow(/invalid payload/i);
    });

    it('throws on missing required field', () => {
      registry.registerCoreEvent(makeEvent('test.event'));

      expect(() =>
        registry.emit(CORE_PLUGIN_ID, 'core.test.event', {}, logger),
      ).toThrow(/invalid payload/i);
    });

    it('dispatches to multiple listeners', () => {
      registry.registerCoreEvent(makeEvent('test.event'));
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      registry.registerListeners('a', [{ event: 'core.test.event', handler: handler1 }]);
      registry.registerListeners('b', [{ event: 'core.test.event', handler: handler2 }]);

      registry.emit(CORE_PLUGIN_ID, 'core.test.event', { value: 'v' }, logger);

      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
    });

    it('isolates handler errors — one failing handler does not prevent others', () => {
      registry.registerCoreEvent(makeEvent('test.event'));
      const failHandler = vi.fn(() => { throw new Error('boom'); });
      const okHandler = vi.fn();
      registry.registerListeners('fail_plugin', [{ event: 'core.test.event', handler: failHandler }]);
      registry.registerListeners('ok_plugin', [{ event: 'core.test.event', handler: okHandler }]);

      // Should not throw
      registry.emit(CORE_PLUGIN_ID, 'core.test.event', { value: 'v' }, logger);

      expect(failHandler).toHaveBeenCalledOnce();
      expect(okHandler).toHaveBeenCalledOnce();
      expect(logger.entries.some((e) => e.level === 'error' && e.msg.includes('fail_plugin'))).toBe(true);
    });

    it('rejects extra fields with strict schema', () => {
      const schema = z.object({ value: z.string() }).strict();
      registry.registerCoreEvent(defineEvent({ name: 'strict.event', description: 'strict', schema }));

      expect(() =>
        registry.emit(CORE_PLUGIN_ID, 'core.strict.event', { value: 'ok', extra: true }, logger),
      ).toThrow(/invalid payload/i);
    });
  });

  // ── EventHandlerContext ──────────────────────────────────────────────────

  describe('EventHandlerContext', () => {
    it('provides a noop context when no factory is set', () => {
      registry.registerCoreEvent(makeEvent('test.event'));
      const handler = vi.fn();
      registry.registerListeners('listener', [{ event: 'core.test.event', handler }]);

      registry.emit(CORE_PLUGIN_ID, 'core.test.event', { value: 'x' }, logger);

      const ctx = handler.mock.calls[0]![1] as EventHandlerContext;
      expect(ctx).toBeDefined();
      expect(ctx.logger).toBeDefined();
      // emit should throw since no factory is configured
      expect(() => ctx.emit('some.event', {})).toThrow(/unavailable/i);
    });

    it('uses the context factory when set', () => {
      const mockEmit = vi.fn();
      const mockLogger = new MockPluginLogger({ plugin: 'test' });
      registry.setContextFactory(() => ({
        emit: mockEmit,
        logger: mockLogger,
      }));

      registry.registerCoreEvent(makeEvent('test.event'));
      const handler = vi.fn();
      registry.registerListeners('my_plugin', [{ event: 'core.test.event', handler }]);

      registry.emit(CORE_PLUGIN_ID, 'core.test.event', { value: 'x' }, logger);

      const ctx = handler.mock.calls[0]![1] as EventHandlerContext;
      expect(ctx.emit).toBe(mockEmit);
      expect(ctx.logger).toBe(mockLogger);
    });

    it('passes the correct listener plugin ID to the context factory', () => {
      const factory = vi.fn(() => ({
        emit: vi.fn(),
        logger: new MockPluginLogger({ plugin: 'stub' }),
      }));
      registry.setContextFactory(factory);

      registry.registerCoreEvent(makeEvent('test.event'));
      registry.registerListeners('plugin_alpha', [{ event: 'core.test.event', handler: vi.fn() }]);
      registry.registerListeners('plugin_beta', [{ event: 'core.test.event', handler: vi.fn() }]);

      registry.emit(CORE_PLUGIN_ID, 'core.test.event', { value: 'x' }, logger);

      expect(factory).toHaveBeenCalledWith('plugin_alpha');
      expect(factory).toHaveBeenCalledWith('plugin_beta');
    });

    it('allows handler to emit events via context (chained re-emit)', () => {
      // plugin_a owns 'plugin_a.commit.detected' and listens to 'core.tool.used'
      const coreEvent = makeEvent('tool.used');
      const pluginEvent = makeEvent('commit.detected');

      registry.registerCoreEvent(coreEvent);
      registry.registerEvents('plugin_a', [pluginEvent]);

      // Context factory wires emit back through the registry
      registry.setContextFactory((pluginId) => ({
        emit: (eventName: string, payload: unknown) => {
          const qualified = `${pluginId}.${eventName}`;
          registry.emit(pluginId, qualified, payload, logger);
        },
        logger: new MockPluginLogger({ plugin: pluginId }),
      }));

      // Downstream listener
      const downstreamHandler = vi.fn();
      registry.registerListeners('downstream', [
        { event: 'plugin_a.commit.detected', handler: downstreamHandler },
      ]);

      // plugin_a listens to core event and re-emits its own
      registry.registerListeners('plugin_a', [{
        event: 'core.tool.used',
        handler: (_payload, ctx) => {
          ctx.emit('commit.detected', { value: 'my-commit' });
        },
      }]);

      // Fire the core event
      registry.emit(CORE_PLUGIN_ID, 'core.tool.used', { value: 'bash' }, logger);

      // Downstream listener should have received the re-emitted event
      expect(downstreamHandler).toHaveBeenCalledWith(
        { value: 'my-commit' },
        expect.objectContaining({ emit: expect.any(Function) }),
      );
    });
  });

  // ── Unregistration ───────────────────────────────────────────────────────

  describe('unregister', () => {
    it('removes owned events', () => {
      registry.registerEvents('github', [makeEvent('pr.opened')]);
      registry.unregister('github');

      expect(registry.hasEvent('github.pr.opened')).toBe(false);
      expect(registry.getEventsForPlugin('github')).toEqual([]);
    });

    it('removes listener registrations for the plugin', () => {
      registry.registerCoreEvent(makeEvent('test.event'));
      registry.registerListeners('listener', [{ event: 'core.test.event', handler: vi.fn() }]);
      expect(registry.getListenerCount('core.test.event')).toBe(1);

      registry.unregister('listener');
      expect(registry.getListenerCount('core.test.event')).toBe(0);
    });

    it('does not remove other plugins\' listeners', () => {
      registry.registerCoreEvent(makeEvent('test.event'));
      registry.registerListeners('plugin_a', [{ event: 'core.test.event', handler: vi.fn() }]);
      registry.registerListeners('plugin_b', [{ event: 'core.test.event', handler: vi.fn() }]);

      registry.unregister('plugin_a');
      expect(registry.getListenerCount('core.test.event')).toBe(1);
    });

    it('is idempotent for unknown plugins', () => {
      expect(() => registry.unregister('nonexistent')).not.toThrow();
    });

    it('listeners from other plugins become dormant when event owner unregisters', () => {
      registry.registerEvents('github', [makeEvent('pr.opened')]);
      const handler = vi.fn();
      registry.registerListeners('consumer', [{ event: 'github.pr.opened', handler }]);

      registry.unregister('github');
      // Event is gone
      expect(registry.hasEvent('github.pr.opened')).toBe(false);
      // But listener is still registered (dormant)
      expect(registry.getListenerCount('github.pr.opened')).toBe(1);

      // Re-register the event
      registry.registerEvents('github', [makeEvent('pr.opened')]);
      // Listener activates again
      registry.emit('github', 'github.pr.opened', { value: 'reactivated' }, logger);
      expect(handler).toHaveBeenCalledWith(
        { value: 'reactivated' },
        expect.objectContaining({ emit: expect.any(Function) }),
      );
    });
  });

  // ── Queries ──────────────────────────────────────────────────────────────

  describe('queries', () => {
    it('getAllEventNames returns all registered event names', () => {
      registry.registerCoreEvent(makeEvent('a'));
      registry.registerEvents('github', [makeEvent('b')]);

      const names = registry.getAllEventNames();
      expect(names).toContain('core.a');
      expect(names).toContain('github.b');
    });

    it('getEventDefinition returns undefined for unknown events', () => {
      expect(registry.getEventDefinition('nope')).toBeUndefined();
    });

    it('getEventOwner returns undefined for unknown events', () => {
      expect(registry.getEventOwner('nope')).toBeUndefined();
    });

    it('getListenerCount returns 0 for events with no listeners', () => {
      expect(registry.getListenerCount('nothing')).toBe(0);
    });
  });
});
