import { describe, expect, it } from 'vitest';

import { definePlugin, isPluginDefinition } from '../define-plugin';
import { defineIntegration } from '../define-integration';
import { defineEntity } from '../define-entity';
import { EntityDefinitionError } from '../errors';
import { BaseEntitySchema } from '../schemas';
import type { PluginIcon } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const testIcon: PluginIcon = { svg: '<svg>test</svg>' };

const minimalConfig = () => ({
  id: 'test_plugin',
  name: 'Test Plugin',
  icon: testIcon,
});

const makeIntegration = (id = 'test_integration') =>
  defineIntegration({
    id,
    name: id,
    icon: testIcon,
    createClient: async () => null,
  });

const makeEntity = (type = 'test_entity') =>
  defineEntity({
    type,
    name: type,
    icon: testIcon,
    schema: BaseEntitySchema,
    uri: ['id'],
  });

const MockComponent = () => null;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('definePlugin', () => {
  // ── Factory basics ──────────────────────────────────────────────────────

  describe('factory output', () => {
    it('returns a frozen PluginDefinition with all config fields', () => {
      const integration = makeIntegration();
      const entity = makeEntity();
      const def = definePlugin({
        ...minimalConfig(),
        description: 'A test plugin',
        integrations: [integration],
        entities: [entity],
      });

      expect(def.id).toBe('test_plugin');
      expect(def.name).toBe('Test Plugin');
      expect(def.description).toBe('A test plugin');
      expect(def.icon).toEqual(testIcon);
      expect(def.__brand).toBe('PluginDefinition');
      expect(def.integrations).toHaveLength(1);
      expect(def.entities).toHaveLength(1);
      expect(Object.isFrozen(def)).toBe(true);
    });

    it('defaults integrations and entities to empty frozen arrays', () => {
      const def = definePlugin(minimalConfig());
      expect(def.integrations).toEqual([]);
      expect(def.entities).toEqual([]);
      expect(Object.isFrozen(def.integrations)).toBe(true);
      expect(Object.isFrozen(def.entities)).toBe(true);
    });

    it('defaults canvases to empty frozen object', () => {
      const def = definePlugin(minimalConfig());
      expect(def.canvases).toEqual({});
      expect(Object.isFrozen(def.canvases)).toBe(true);
    });

    it('cannot have new properties added to the frozen definition', () => {
      const def = definePlugin(minimalConfig());
      expect(() => {
        (def as Record<string, unknown>)['extra'] = 'nope';
      }).toThrow();
    });
  });

  // ── Validation errors ──────────────────────────────────────────────────

  describe('validation errors', () => {
    it('throws for uppercase id', () => {
      expect(() =>
        definePlugin({ ...minimalConfig(), id: 'TestPlugin' })
      ).toThrow(EntityDefinitionError);
    });

    it('throws for empty id', () => {
      expect(() =>
        definePlugin({ ...minimalConfig(), id: '' })
      ).toThrow(EntityDefinitionError);
    });

    it('throws for empty name', () => {
      expect(() =>
        definePlugin({ ...minimalConfig(), name: '' })
      ).toThrow(EntityDefinitionError);
    });

    it('throws for whitespace-only name', () => {
      expect(() =>
        definePlugin({ ...minimalConfig(), name: '   ' })
      ).toThrow(EntityDefinitionError);
    });

    it('throws for non-IntegrationDefinition in integrations', () => {
      expect(() =>
        definePlugin({
          ...minimalConfig(),
          integrations: [{ id: 'fake' } as never],
        })
      ).toThrow(EntityDefinitionError);
    });

    it('throws for duplicate integration ids', () => {
      const integration = makeIntegration('github');
      expect(() =>
        definePlugin({
          ...minimalConfig(),
          integrations: [integration, integration],
        })
      ).toThrow(/Duplicate integration id 'github'/);
    });

    it('throws for non-EntityDefinition in entities', () => {
      expect(() =>
        definePlugin({
          ...minimalConfig(),
          entities: [{ type: 'fake' } as never],
        })
      ).toThrow(EntityDefinitionError);
    });

    it('throws for duplicate entity types', () => {
      const entity = makeEntity('task');
      expect(() =>
        definePlugin({
          ...minimalConfig(),
          entities: [entity, entity],
        })
      ).toThrow(/Duplicate entity type 'task'/);
    });
  });

  // ── Canvas validation ──────────────────────────────────────────────────

  describe('canvas validation', () => {
    it('accepts valid nav-sidebar canvas', () => {
      const def = definePlugin({
        ...minimalConfig(),
        canvases: {
          'nav-sidebar': {
            component: MockComponent,
            label: 'Test Nav',
          },
        },
      });
      expect(def.canvases['nav-sidebar']).toBeDefined();
    });

    it('throws for nav-sidebar without component', () => {
      expect(() =>
        definePlugin({
          ...minimalConfig(),
          canvases: {
            'nav-sidebar': {
              component: 'not a function' as never,
              label: 'Test',
            },
          },
        })
      ).toThrow(/nav-sidebar.component must be a React component/);
    });

    it('throws for nav-sidebar without label', () => {
      expect(() =>
        definePlugin({
          ...minimalConfig(),
          canvases: {
            'nav-sidebar': {
              component: MockComponent,
              label: '',
            },
          },
        })
      ).toThrow(/nav-sidebar.label is required/);
    });

    it('throws for drawer without nav-sidebar or menu-bar', () => {
      expect(() =>
        definePlugin({
          ...minimalConfig(),
          canvases: {
            drawer: {
              component: MockComponent,
              label: 'Test Drawer',
            },
          },
        })
      ).toThrow(/drawer requires nav-sidebar or menu-bar/);
    });

    it('accepts drawer with nav-sidebar', () => {
      const def = definePlugin({
        ...minimalConfig(),
        canvases: {
          'nav-sidebar': {
            component: MockComponent,
            label: 'Nav',
          },
          drawer: {
            component: MockComponent,
            label: 'Drawer',
          },
        },
      });
      expect(def.canvases.drawer).toBeDefined();
    });

    it('accepts drawer with menu-bar', () => {
      const def = definePlugin({
        ...minimalConfig(),
        canvases: {
          'menu-bar': {
            icon: MockComponent,
            component: MockComponent,
            label: 'Menu',
          },
          drawer: {
            component: MockComponent,
            label: 'Drawer',
          },
        },
      });
      expect(def.canvases.drawer).toBeDefined();
    });

    it('throws for menu-bar without icon component', () => {
      expect(() =>
        definePlugin({
          ...minimalConfig(),
          canvases: {
            'menu-bar': {
              icon: 'not a function' as never,
              component: MockComponent,
              label: 'Menu',
            },
          },
        })
      ).toThrow(/menu-bar.icon must be a React component/);
    });

    it('throws for menu-bar without component', () => {
      expect(() =>
        definePlugin({
          ...minimalConfig(),
          canvases: {
            'menu-bar': {
              icon: MockComponent,
              component: 'not a function' as never,
              label: 'Menu',
            },
          },
        })
      ).toThrow(/menu-bar.component must be a React component/);
    });

    it('throws for menu-bar without label', () => {
      expect(() =>
        definePlugin({
          ...minimalConfig(),
          canvases: {
            'menu-bar': {
              icon: MockComponent,
              component: MockComponent,
              label: '',
            },
          },
        })
      ).toThrow(/menu-bar.label is required/);
    });
  });
});

// ── isPluginDefinition ──────────────────────────────────────────────────────

describe('isPluginDefinition', () => {
  it('returns true for an object produced by definePlugin', () => {
    const def = definePlugin(minimalConfig());
    expect(isPluginDefinition(def)).toBe(true);
  });

  it('returns false for a plain object', () => {
    expect(isPluginDefinition({ id: 'foo', name: 'Foo' })).toBe(false);
  });

  it('returns false for null, undefined, and non-object values', () => {
    expect(isPluginDefinition(null)).toBe(false);
    expect(isPluginDefinition(undefined)).toBe(false);
    expect(isPluginDefinition(42)).toBe(false);
  });
});
