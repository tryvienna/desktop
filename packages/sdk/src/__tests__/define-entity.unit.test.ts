import { describe, expect, it } from 'vitest';

import { defineEntity, isEntityDefinition } from '../define-entity';
import { EntityDefinitionError } from '../errors';
import type { PluginIcon } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const testIcon: PluginIcon = { svg: '<svg>test</svg>' };

const minimalConfig = () => ({
  type: 'test_entity',
  name: 'Test Entity',
  icon: testIcon,
  uri: ['id'],
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('defineEntity', () => {
  // ── Factory basics ──────────────────────────────────────────────────────

  describe('factory output', () => {
    it('returns a frozen EntityDefinition with all config fields', () => {
      const def = defineEntity(minimalConfig());

      expect(def.type).toBe('test_entity');
      expect(def.name).toBe('Test Entity');
      expect(def.icon).toEqual(testIcon);
      expect(def.uriSegments).toEqual(['id']);
      expect(def.__brand).toBe('EntityDefinition');
      expect(Object.isFrozen(def)).toBe(true);
    });

    it('defaults source to "integration" when not specified', () => {
      const def = defineEntity(minimalConfig());
      expect(def.source).toBe('integration');
    });

    it('uses provided source when specified', () => {
      const def = defineEntity({ ...minimalConfig(), source: 'builtin' });
      expect(def.source).toBe('builtin');
    });

    it('stores display metadata', () => {
      const def = defineEntity({
        ...minimalConfig(),
        display: {
          emoji: '✅',
          colors: { bg: '#000', text: '#fff', border: '#333' },
        },
      });
      expect(def.display?.emoji).toBe('✅');
      expect(def.display?.colors?.bg).toBe('#000');
    });

    it('stores cache configuration', () => {
      const def = defineEntity({
        ...minimalConfig(),
        cache: { ttl: 30_000, maxSize: 200 },
      });
      expect(def.cache?.ttl).toBe(30_000);
      expect(def.cache?.maxSize).toBe(200);
    });

    it('stores description', () => {
      const def = defineEntity({
        ...minimalConfig(),
        description: 'A thing',
      });
      expect(def.description).toBe('A thing');
    });
  });

  // ── Validation errors ──────────────────────────────────────────────────

  describe('validation errors', () => {
    it('throws EntityDefinitionError for uppercase type name', () => {
      expect(() => defineEntity({ ...minimalConfig(), type: 'TestEntity' }))
        .toThrow(EntityDefinitionError);
    });

    it('throws EntityDefinitionError for type starting with a number', () => {
      expect(() => defineEntity({ ...minimalConfig(), type: '1entity' }))
        .toThrow(EntityDefinitionError);
    });

    it('throws EntityDefinitionError for empty type name', () => {
      expect(() => defineEntity({ ...minimalConfig(), type: '' }))
        .toThrow(EntityDefinitionError);
    });

    it('throws EntityDefinitionError for type name exceeding 64 characters', () => {
      const longType = 'a'.repeat(65);
      expect(() => defineEntity({ ...minimalConfig(), type: longType }))
        .toThrow(EntityDefinitionError);
    });

    it('throws EntityDefinitionError for empty name', () => {
      expect(() => defineEntity({ ...minimalConfig(), name: '' }))
        .toThrow(EntityDefinitionError);
    });

    it('throws EntityDefinitionError for whitespace-only name', () => {
      expect(() => defineEntity({ ...minimalConfig(), name: '   ' }))
        .toThrow(EntityDefinitionError);
    });

    it('throws EntityDefinitionError for empty uri segments', () => {
      expect(() =>
        defineEntity({ ...minimalConfig(), uri: [] })
      ).toThrow(EntityDefinitionError);
    });
  });

  // ── createURI ──────────────────────────────────────────────────────────

  describe('createURI', () => {
    it('builds a correct @vienna// URI from the entity type and id', () => {
      const def = defineEntity(minimalConfig());
      const uri = def.createURI({ id: 'abc123' });
      expect(uri).toBe('@vienna//test_entity/abc123');
    });

    it('builds a multi-segment URI when uri has multiple segments', () => {
      const def = defineEntity({
        ...minimalConfig(),
        type: 'github_pr',
        uri: ['owner', 'repo', 'number'],
      });
      const uri = def.createURI({ owner: 'acme', repo: 'app', number: '42' });
      expect(uri).toBe('@vienna//github_pr/acme/app/42');
    });
  });

  // ── parseURI ───────────────────────────────────────────────────────────

  describe('parseURI', () => {
    it('parses a URI back to the entity type and id segments', () => {
      const def = defineEntity(minimalConfig());
      const result = def.parseURI('@vienna//test_entity/abc123');
      expect(result).toEqual({ type: 'test_entity', id: { id: 'abc123' } });
    });
  });
});

// ── isEntityDefinition ─────────────────────────────────────────────────────

describe('isEntityDefinition', () => {
  it('returns true for an object produced by defineEntity', () => {
    const def = defineEntity(minimalConfig());
    expect(isEntityDefinition(def)).toBe(true);
  });

  it('returns false for a plain object that is not an EntityDefinition', () => {
    expect(isEntityDefinition({ type: 'foo', name: 'Foo' })).toBe(false);
  });

  it('returns false for null, undefined, and non-object values', () => {
    expect(isEntityDefinition(null)).toBe(false);
    expect(isEntityDefinition(undefined)).toBe(false);
    expect(isEntityDefinition(42)).toBe(false);
    expect(isEntityDefinition('a string')).toBe(false);
  });
});
