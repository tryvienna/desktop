import { describe, it, expect, vi } from 'vitest';
import { DrawerRegistry } from './DrawerRegistry';
import type { DrawerRegistration } from './types';

function makeRegistration(
  contentId: string,
  priority = 0
): DrawerRegistration {
  return {
    match: (content) => content.contentId === contentId,
    priority,
    render: () => `rendered-${contentId}`,
  };
}

describe('DrawerRegistry', () => {
  describe('register', () => {
    it('adds a registration', () => {
      const registry = new DrawerRegistry();
      registry.register(makeRegistration('test'));
      expect(registry.getRegistrationCount()).toBe(1);
    });

    it('returns an unregister function', () => {
      const registry = new DrawerRegistry();
      const unregister = registry.register(makeRegistration('test'));
      expect(registry.getRegistrationCount()).toBe(1);
      unregister();
      expect(registry.getRegistrationCount()).toBe(0);
    });

    it('sorts registrations by priority descending', () => {
      const registry = new DrawerRegistry();
      registry.register(makeRegistration('low', 10));
      registry.register(makeRegistration('high', 100));
      registry.register(makeRegistration('mid', 50));

      const all = registry.getAllRegistrations();
      expect(all[0]!.priority).toBe(100);
      expect(all[1]!.priority).toBe(50);
      expect(all[2]!.priority).toBe(10);
    });

    it('increments version on register', () => {
      const registry = new DrawerRegistry();
      const v1 = registry.getVersion();
      registry.register(makeRegistration('test'));
      expect(registry.getVersion()).toBe(v1 + 1);
    });

    it('increments version on unregister', () => {
      const registry = new DrawerRegistry();
      const unregister = registry.register(makeRegistration('test'));
      const v = registry.getVersion();
      unregister();
      expect(registry.getVersion()).toBe(v + 1);
    });
  });

  describe('registerAll', () => {
    it('registers multiple and returns combined unregister', () => {
      const registry = new DrawerRegistry();
      const unregisterAll = registry.registerAll([
        makeRegistration('a'),
        makeRegistration('b'),
        makeRegistration('c'),
      ]);
      expect(registry.getRegistrationCount()).toBe(3);
      unregisterAll();
      expect(registry.getRegistrationCount()).toBe(0);
    });
  });

  describe('getRenderer', () => {
    it('returns the first matching renderer', () => {
      const registry = new DrawerRegistry();
      registry.register(makeRegistration('test'));
      const renderer = registry.getRenderer({ contentId: 'test' });
      expect(renderer).not.toBeNull();
      expect(renderer!({ contentId: 'test' })).toBe('rendered-test');
    });

    it('returns null when no match', () => {
      const registry = new DrawerRegistry();
      registry.register(makeRegistration('test'));
      expect(registry.getRenderer({ contentId: 'other' })).toBeNull();
    });

    it('resolves by priority (higher priority wins)', () => {
      const registry = new DrawerRegistry();
      registry.register({
        match: () => true,
        priority: 10,
        render: () => 'low',
      });
      registry.register({
        match: () => true,
        priority: 100,
        render: () => 'high',
      });
      const renderer = registry.getRenderer({ contentId: 'any' });
      expect(renderer!({ contentId: 'any' })).toBe('high');
    });
  });

  describe('hasRenderer', () => {
    it('returns true when renderer exists', () => {
      const registry = new DrawerRegistry();
      registry.register(makeRegistration('test'));
      expect(registry.hasRenderer({ contentId: 'test' })).toBe(true);
    });

    it('returns false when no renderer', () => {
      const registry = new DrawerRegistry();
      expect(registry.hasRenderer({ contentId: 'test' })).toBe(false);
    });
  });

  describe('render', () => {
    it('renders content via matching registration', () => {
      const registry = new DrawerRegistry();
      registry.register(makeRegistration('test'));
      expect(registry.render({ contentId: 'test' })).toBe('rendered-test');
    });

    it('returns null when no match', () => {
      const registry = new DrawerRegistry();
      expect(registry.render({ contentId: 'missing' })).toBeNull();
    });
  });

  describe('subscribe', () => {
    it('notifies listeners on register', () => {
      const registry = new DrawerRegistry();
      const listener = vi.fn();
      registry.subscribe(listener);
      registry.register(makeRegistration('test'));
      expect(listener).toHaveBeenCalledOnce();
    });

    it('notifies listeners on unregister', () => {
      const registry = new DrawerRegistry();
      const unregister = registry.register(makeRegistration('test'));
      const listener = vi.fn();
      registry.subscribe(listener);
      unregister();
      expect(listener).toHaveBeenCalledOnce();
    });

    it('returns unsubscribe function', () => {
      const registry = new DrawerRegistry();
      const listener = vi.fn();
      const unsub = registry.subscribe(listener);
      unsub();
      registry.register(makeRegistration('test'));
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('removes all registrations', () => {
      const registry = new DrawerRegistry();
      registry.register(makeRegistration('a'));
      registry.register(makeRegistration('b'));
      registry.clear();
      expect(registry.getRegistrationCount()).toBe(0);
    });

    it('increments version', () => {
      const registry = new DrawerRegistry();
      registry.register(makeRegistration('test'));
      const v = registry.getVersion();
      registry.clear();
      expect(registry.getVersion()).toBe(v + 1);
    });

    it('notifies listeners', () => {
      const registry = new DrawerRegistry();
      const listener = vi.fn();
      registry.subscribe(listener);
      registry.clear();
      expect(listener).toHaveBeenCalledOnce();
    });
  });
});
