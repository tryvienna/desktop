/**
 * ProviderRegistry unit tests
 */

import { describe, it, expect, vi } from 'vitest';
import type { AgentProvider, AvailabilityResult } from '@vienna/agent-core';
import { ProviderRegistry } from '../registry';

/** Create a minimal mock provider */
function createMockProvider(
  overrides: Partial<AgentProvider> & { id: string; displayName: string }
): AgentProvider {
  return {
    state: 'idle',
    start: vi.fn(),
    stop: vi.fn(),
    checkAvailability: vi.fn().mockResolvedValue({ available: true, version: '1.0.0' }),
    sendMessage: vi.fn(),
    respondPermission: vi.fn(),
    interrupt: vi.fn(),
    onEvent: vi.fn().mockReturnValue(() => {}),
    onDebug: vi.fn().mockReturnValue(() => {}),
    isHealthy: vi.fn().mockReturnValue(false),
    ...overrides,
  };
}

describe('ProviderRegistry', () => {
  describe('register + create', () => {
    it('registers and creates a provider', () => {
      const registry = new ProviderRegistry();
      const mockProvider = createMockProvider({ id: 'test', displayName: 'Test Provider' });

      registry.register('test', 'Test Provider', () => mockProvider);

      const provider = registry.create('test');
      expect(provider).toBe(mockProvider);
    });

    it('throws for unknown provider ID', () => {
      const registry = new ProviderRegistry();

      expect(() => registry.create('nonexistent')).toThrow('Unknown provider: nonexistent');
    });

    it('includes available providers in error message', () => {
      const registry = new ProviderRegistry();
      registry.register('alpha', 'Alpha', () =>
        createMockProvider({ id: 'alpha', displayName: 'Alpha' })
      );
      registry.register('beta', 'Beta', () =>
        createMockProvider({ id: 'beta', displayName: 'Beta' })
      );

      expect(() => registry.create('gamma')).toThrow('Available: alpha, beta');
    });

    it('creates new instances on each call', () => {
      const registry = new ProviderRegistry();
      let callCount = 0;

      registry.register('test', 'Test', () => {
        callCount++;
        return createMockProvider({ id: 'test', displayName: `Test ${callCount}` });
      });

      const p1 = registry.create('test');
      const p2 = registry.create('test');
      expect(p1).not.toBe(p2);
      expect(callCount).toBe(2);
    });
  });

  describe('has', () => {
    it('returns true for registered providers', () => {
      const registry = new ProviderRegistry();
      registry.register('test', 'Test', () =>
        createMockProvider({ id: 'test', displayName: 'Test' })
      );

      expect(registry.has('test')).toBe(true);
      expect(registry.has('other')).toBe(false);
    });
  });

  describe('getRegisteredIds', () => {
    it('returns all registered IDs', () => {
      const registry = new ProviderRegistry();
      registry.register('a', 'A', () => createMockProvider({ id: 'a', displayName: 'A' }));
      registry.register('b', 'B', () => createMockProvider({ id: 'b', displayName: 'B' }));

      expect(registry.getRegisteredIds()).toEqual(['a', 'b']);
    });

    it('returns empty array when no providers registered', () => {
      const registry = new ProviderRegistry();
      expect(registry.getRegisteredIds()).toEqual([]);
    });
  });

  describe('listProviders', () => {
    it('lists all providers with availability', async () => {
      const registry = new ProviderRegistry();

      registry.register('available', 'Available', () =>
        createMockProvider({
          id: 'available',
          displayName: 'Available',
          checkAvailability: vi.fn().mockResolvedValue({
            available: true,
            version: '2.0.0',
          } satisfies AvailabilityResult),
        })
      );

      registry.register('unavailable', 'Unavailable', () =>
        createMockProvider({
          id: 'unavailable',
          displayName: 'Unavailable',
          checkAvailability: vi.fn().mockResolvedValue({
            available: false,
            error: 'CLI not found',
          } satisfies AvailabilityResult),
        })
      );

      const providers = await registry.listProviders();
      expect(providers).toHaveLength(2);

      const available = providers.find((p) => p.id === 'available')!;
      expect(available.available).toBe(true);
      expect(available.version).toBe('2.0.0');
      expect(available.displayName).toBe('Available');

      const unavailable = providers.find((p) => p.id === 'unavailable')!;
      expect(unavailable.available).toBe(false);
      expect(unavailable.error).toBe('CLI not found');
    });

    it('handles factory errors gracefully', async () => {
      const registry = new ProviderRegistry();

      registry.register('broken', 'Broken', () => {
        throw new Error('Factory exploded');
      });

      const providers = await registry.listProviders();
      expect(providers).toHaveLength(1);
      expect(providers[0].available).toBe(false);
      expect(providers[0].error).toBe('Factory exploded');
    });
  });

  describe('checkProvider', () => {
    it('returns availability for known provider', async () => {
      const registry = new ProviderRegistry();
      registry.register('test', 'Test', () =>
        createMockProvider({
          id: 'test',
          displayName: 'Test',
          checkAvailability: vi.fn().mockResolvedValue({
            available: true,
            version: '3.0.0',
          } satisfies AvailabilityResult),
        })
      );

      const result = await registry.checkProvider('test');
      expect(result.available).toBe(true);
      expect(result.version).toBe('3.0.0');
    });

    it('returns error for unknown provider', async () => {
      const registry = new ProviderRegistry();

      const result = await registry.checkProvider('nonexistent');
      expect(result.available).toBe(false);
      expect(result.error).toContain('Unknown provider');
    });
  });
});
