import { describe, it, expect } from 'vitest';
import {
  CommandCategorySchema,
  CommandDefinitionSchema,
  CommandResultActionSchema,
  CommandCatalogSchema,
} from './schemas';

describe('CommandCategorySchema', () => {
  it('accepts valid categories', () => {
    const categories = [
      'claude', 'navigation', 'workstream', 'file', 'edit',
      'view', 'ai', 'integrations', 'settings', 'developer', 'help',
    ];
    for (const cat of categories) {
      expect(CommandCategorySchema.parse(cat)).toBe(cat);
    }
  });

  it('rejects invalid category', () => {
    expect(() => CommandCategorySchema.parse('invalid')).toThrow();
  });
});

describe('CommandDefinitionSchema', () => {
  it('parses minimal command', () => {
    const result = CommandDefinitionSchema.parse({
      id: 'app:test',
      category: 'navigation',
      title: 'Test Command',
    });
    expect(result.id).toBe('app:test');
    expect(result.category).toBe('navigation');
    expect(result.title).toBe('Test Command');
    expect(result.description).toBeUndefined();
    expect(result.keywords).toBeUndefined();
    expect(result.hasFlow).toBeUndefined();
  });

  it('parses full command with all optional fields', () => {
    const result = CommandDefinitionSchema.parse({
      id: 'claude:switch-model',
      category: 'claude',
      title: 'Switch Model',
      description: 'Change the active model',
      keywords: ['haiku', 'sonnet', 'opus'],
      disabled: false,
      disabledReason: undefined,
      hasFlow: true,
    });
    expect(result.keywords).toEqual(['haiku', 'sonnet', 'opus']);
    expect(result.hasFlow).toBe(true);
  });

  it('rejects empty id', () => {
    expect(() =>
      CommandDefinitionSchema.parse({ id: '', category: 'navigation', title: 'T' })
    ).toThrow();
  });

  it('rejects empty title', () => {
    expect(() =>
      CommandDefinitionSchema.parse({ id: 'test', category: 'navigation', title: '' })
    ).toThrow();
  });

  it('rejects invalid category in command', () => {
    expect(() =>
      CommandDefinitionSchema.parse({ id: 'test', category: 'bogus', title: 'T' })
    ).toThrow();
  });
});

describe('CommandResultActionSchema', () => {
  it('parses none action', () => {
    expect(CommandResultActionSchema.parse({ type: 'none' })).toEqual({ type: 'none' });
  });

  it('parses navigate action', () => {
    const result = CommandResultActionSchema.parse({ type: 'navigate', path: '/settings' });
    expect(result).toEqual({ type: 'navigate', path: '/settings' });
  });

  it('parses toast action with variant', () => {
    const result = CommandResultActionSchema.parse({
      type: 'toast',
      message: 'Done!',
      variant: 'success',
    });
    expect(result).toEqual({ type: 'toast', message: 'Done!', variant: 'success' });
  });

  it('parses toast action without variant', () => {
    const result = CommandResultActionSchema.parse({ type: 'toast', message: 'Info' });
    expect(result).toEqual({ type: 'toast', message: 'Info' });
  });

  it('parses insertText action', () => {
    const result = CommandResultActionSchema.parse({ type: 'insertText', text: '/help' });
    expect(result).toEqual({ type: 'insertText', text: '/help' });
  });

  it('rejects unknown action type', () => {
    expect(() => CommandResultActionSchema.parse({ type: 'unknown' })).toThrow();
  });
});

describe('CommandCatalogSchema', () => {
  it('parses empty catalog', () => {
    expect(CommandCatalogSchema.parse([])).toEqual([]);
  });

  it('parses catalog with commands', () => {
    const catalog = CommandCatalogSchema.parse([
      { id: 'a', category: 'navigation', title: 'A' },
      { id: 'b', category: 'claude', title: 'B', hasFlow: true },
    ]);
    expect(catalog).toHaveLength(2);
  });

  it('rejects catalog with invalid command', () => {
    expect(() =>
      CommandCatalogSchema.parse([{ id: '', category: 'navigation', title: 'Bad' }])
    ).toThrow();
  });
});
