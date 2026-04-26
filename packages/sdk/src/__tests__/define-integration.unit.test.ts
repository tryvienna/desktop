import { describe, expect, it } from 'vitest';

import { defineIntegration, isIntegrationDefinition } from '../define-integration';
import { EntityDefinitionError } from '../errors';
import type { PluginIcon } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const testIcon: PluginIcon = { svg: '<svg>test</svg>' };

const minimalConfig = () => ({
  id: 'test_integration',
  name: 'Test Integration',
  icon: testIcon,
  createClient: async () => null,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('defineIntegration', () => {
  // ── Factory basics ──────────────────────────────────────────────────────

  describe('factory output', () => {
    it('returns a frozen IntegrationDefinition with all config fields', () => {
      const def = defineIntegration({
        ...minimalConfig(),
        description: 'A test integration',
      });

      expect(def.id).toBe('test_integration');
      expect(def.name).toBe('Test Integration');
      expect(def.description).toBe('A test integration');
      expect(def.icon).toEqual(testIcon);
      expect(def.__brand).toBe('IntegrationDefinition');
      expect(Object.isFrozen(def)).toBe(true);
    });

    it('cannot have new properties added to the frozen definition', () => {
      const def = defineIntegration(minimalConfig());
      expect(() => {
        (def as Record<string, unknown>)['extra'] = 'nope';
      }).toThrow();
    });

    it('freezes credentials array', () => {
      const def = defineIntegration({
        ...minimalConfig(),
        credentials: ['api_key', 'token'],
      });
      expect(def.credentials).toEqual(['api_key', 'token']);
      expect(Object.isFrozen(def.credentials)).toBe(true);
    });
  });

  // ── Validation errors ──────────────────────────────────────────────────

  describe('validation errors', () => {
    it('throws EntityDefinitionError for uppercase id', () => {
      expect(() =>
        defineIntegration({ ...minimalConfig(), id: 'TestIntegration' })
      ).toThrow(EntityDefinitionError);
    });

    it('throws EntityDefinitionError for empty id', () => {
      expect(() =>
        defineIntegration({ ...minimalConfig(), id: '' })
      ).toThrow(EntityDefinitionError);
    });

    it('throws EntityDefinitionError for id starting with a number', () => {
      expect(() =>
        defineIntegration({ ...minimalConfig(), id: '1integration' })
      ).toThrow(EntityDefinitionError);
    });

    it('throws EntityDefinitionError for empty name', () => {
      expect(() =>
        defineIntegration({ ...minimalConfig(), name: '' })
      ).toThrow(EntityDefinitionError);
    });

  });
});

// ── isIntegrationDefinition ─────────────────────────────────────────────────

describe('isIntegrationDefinition', () => {
  it('returns true for an object produced by defineIntegration', () => {
    const def = defineIntegration(minimalConfig());
    expect(isIntegrationDefinition(def)).toBe(true);
  });

  it('returns false for a plain object that is not an IntegrationDefinition', () => {
    expect(isIntegrationDefinition({ id: 'foo', name: 'Foo' })).toBe(false);
  });

  it('returns false for null, undefined, and non-object values', () => {
    expect(isIntegrationDefinition(null)).toBe(false);
    expect(isIntegrationDefinition(undefined)).toBe(false);
    expect(isIntegrationDefinition(42)).toBe(false);
    expect(isIntegrationDefinition('a string')).toBe(false);
  });
});
