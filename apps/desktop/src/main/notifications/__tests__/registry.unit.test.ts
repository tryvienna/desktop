import { describe, it, expect } from 'vitest';
import { NotificationTypeRegistry, BUILTIN_NOTIFICATION_TYPES } from '../registry';

describe('NotificationTypeRegistry', () => {
  it('seeds with the built-in types', () => {
    const reg = new NotificationTypeRegistry();
    expect(reg.list()).toHaveLength(BUILTIN_NOTIFICATION_TYPES.length);
    expect(reg.has('github_cli.pr.created')).toBe(true);
    expect(reg.has('core.claude-code.turn.completed')).toBe(true);
  });

  it('returns the type for a known id', () => {
    const reg = new NotificationTypeRegistry();
    const t = reg.get('github_cli.pr.merged');
    expect(t?.source).toBe('GitHub');
    expect(t?.label).toBe('Pull request merged');
  });

  it('returns undefined for unknown ids', () => {
    expect(new NotificationTypeRegistry().get('does.not.exist')).toBeUndefined();
  });

  it('lists distinct sources in insertion order', () => {
    const sources = new NotificationTypeRegistry().sources();
    expect(sources).toEqual(['Claude Code', 'GitHub', 'Next.js']);
  });

  it('register() adds a new type', () => {
    const reg = new NotificationTypeRegistry([]);
    reg.register({ id: 'plugin.foo', source: 'Foo', label: 'Foo', defaultEnabled: true });
    expect(reg.has('plugin.foo')).toBe(true);
  });

  it('register() is append-only — duplicate ids are ignored', () => {
    const reg = new NotificationTypeRegistry();
    reg.register({
      id: 'github_cli.pr.created',
      source: 'Pretend',
      label: 'Pretend',
      defaultEnabled: false,
    });
    expect(reg.get('github_cli.pr.created')?.source).toBe('GitHub');
  });

  it('all built-in types default to enabled', () => {
    expect(BUILTIN_NOTIFICATION_TYPES.every((t) => t.defaultEnabled)).toBe(true);
  });

  it('all built-in type ids are unique', () => {
    const ids = BUILTIN_NOTIFICATION_TYPES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
