/**
 * NanoContext Registry Unit Tests
 *
 * Tests the NanoContextTypeRegistry class.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NanoContextTypeRegistry } from '../nano-context';
import type { NanoContextTypeRegistration } from '../nano-context';

function makeRegistration(overrides: Partial<NanoContextTypeRegistration> = {}): NanoContextTypeRegistration {
  return {
    typeId: 'custom_type',
    pluginId: 'test-plugin',
    label: 'Custom Type',
    icon: 'plugin',
    ...overrides,
  };
}

let registry: NanoContextTypeRegistry;

beforeEach(() => {
  registry = new NanoContextTypeRegistry();
});

describe('NanoContextTypeRegistry', () => {
  it('register and get by typeId', () => {
    const reg = makeRegistration();
    registry.register(reg);
    expect(registry.get('custom_type')).toBe(reg);
  });

  it('get returns undefined for unknown typeId', () => {
    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('unregister removes the registration', () => {
    registry.register(makeRegistration());
    registry.unregister('custom_type');
    expect(registry.get('custom_type')).toBeUndefined();
  });

  it('getByPlugin returns registrations for a specific plugin', () => {
    registry.register(makeRegistration({ typeId: 'a', pluginId: 'p1' }));
    registry.register(makeRegistration({ typeId: 'b', pluginId: 'p1' }));
    registry.register(makeRegistration({ typeId: 'c', pluginId: 'p2' }));

    const p1 = registry.getByPlugin('p1');
    expect(p1).toHaveLength(2);
    expect(p1.map((r) => r.typeId).sort()).toEqual(['a', 'b']);

    const p2 = registry.getByPlugin('p2');
    expect(p2).toHaveLength(1);
    expect(p2[0]!.typeId).toBe('c');
  });

  it('getByPlugin returns empty for unknown plugin', () => {
    expect(registry.getByPlugin('unknown')).toEqual([]);
  });

  it('getAll returns all registrations', () => {
    registry.register(makeRegistration({ typeId: 'a' }));
    registry.register(makeRegistration({ typeId: 'b' }));
    expect(registry.getAll()).toHaveLength(2);
  });

  it('getAll returns empty for fresh registry', () => {
    expect(registry.getAll()).toEqual([]);
  });

  it('registering same typeId overwrites previous', () => {
    registry.register(makeRegistration({ typeId: 'x', label: 'First' }));
    registry.register(makeRegistration({ typeId: 'x', label: 'Second' }));
    expect(registry.get('x')?.label).toBe('Second');
    expect(registry.getAll()).toHaveLength(1);
  });
});
