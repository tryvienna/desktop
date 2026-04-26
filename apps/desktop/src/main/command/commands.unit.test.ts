import { describe, it, expect } from 'vitest';
import { BUILTIN_COMMANDS } from './commands';
import { CommandDefinitionSchema, CommandCategorySchema } from '../../command/schemas';

describe('BUILTIN_COMMANDS', () => {
  it('has no duplicate IDs', () => {
    const ids = BUILTIN_COMMANDS.map((c) => c.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('all commands pass schema validation', () => {
    for (const cmd of BUILTIN_COMMANDS) {
      expect(() => CommandDefinitionSchema.parse(cmd)).not.toThrow();
    }
  });

  it('all categories are valid', () => {
    for (const cmd of BUILTIN_COMMANDS) {
      expect(() => CommandCategorySchema.parse(cmd.category)).not.toThrow();
    }
  });

  it('all commands have non-empty titles', () => {
    for (const cmd of BUILTIN_COMMANDS) {
      expect(cmd.title.length).toBeGreaterThan(0);
    }
  });

  it('all commands have descriptions', () => {
    for (const cmd of BUILTIN_COMMANDS) {
      expect(cmd.description).toBeDefined();
      expect(cmd.description!.length).toBeGreaterThan(0);
    }
  });

  it('includes expected command categories', () => {
    const categories = new Set(BUILTIN_COMMANDS.map((c) => c.category));
    expect(categories).toContain('navigation');
    expect(categories).toContain('workstream');
    expect(categories).toContain('claude');
    expect(categories).toContain('settings');
    expect(categories).toContain('developer');
    expect(categories).toContain('help');
  });

  it('includes essential commands', () => {
    const ids = new Set(BUILTIN_COMMANDS.map((c) => c.id));
    expect(ids).toContain('app:command-palette');
    expect(ids).toContain('app:nav-home');
    expect(ids).toContain('app:toggle-sidebar');
    expect(ids).toContain('claude:switch-model');
    expect(ids).toContain('claude:clear-conversation');
    expect(ids).toContain('app:toggle-theme');
    expect(ids).toContain('app:keyboard-shortcuts');
  });

  it('commands with hasFlow are marked correctly', () => {
    const flowCommands = BUILTIN_COMMANDS.filter((c) => c.hasFlow);
    expect(flowCommands.length).toBeGreaterThan(0);
    // All flow commands should be in claude category for now
    for (const cmd of flowCommands) {
      expect(cmd.category).toBe('claude');
    }
  });
});
