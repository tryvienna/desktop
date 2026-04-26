import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SettingsRepository } from './settings';
import {
  AppearanceSettingsSchema,
  AiSettingsSchema,
  AdvancedSettingsSchema,
  AllSettingsSchema,
} from './schemas';

describe('SettingsRepository', () => {
  let tmpDir: string;
  let settingsPath: string;
  let settings: SettingsRepository;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'vienna-settings-'));
    settingsPath = join(tmpDir, 'settings.json');
    settings = new SettingsRepository(settingsPath);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Defaults
  // ─────────────────────────────────────────────────────────────────────────

  it('returns appearance defaults when no file exists', () => {
    const result = settings.get('appearance');
    expect(result).toEqual({
      theme: 'system',
      fontSize: 14,
      compactMode: false,
      zoomLevel: 0,
    });
  });

  it('returns ai defaults when no file exists', () => {
    const result = settings.get('ai');
    expect(result).toEqual({
      defaultModel: 'sonnet',
      cliPath: null,
      cliSetupComplete: false,
    });
  });

  it('returns advanced defaults when no file exists', () => {
    const result = settings.get('advanced');
    expect(result).toEqual({
      developerMode: null,
      focusMonitorEnabled: false,
      focusMonitorIntervalMs: 2000,
    });
  });

  it('getAll returns all categories with defaults', () => {
    const result = settings.getAll();
    expect(result).toEqual({
      appearance: AppearanceSettingsSchema.parse({}),
      ai: AiSettingsSchema.parse({}),
      advanced: AdvancedSettingsSchema.parse({}),
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Updates
  // ─────────────────────────────────────────────────────────────────────────

  it('updates appearance settings', () => {
    const result = settings.update('appearance', { theme: 'dark', fontSize: 16 });
    expect(result.theme).toBe('dark');
    expect(result.fontSize).toBe(16);
    expect(result.compactMode).toBe(false); // preserved default
  });

  it('updates ai settings', () => {
    const result = settings.update('ai', { defaultModel: 'opus' });
    expect(result.defaultModel).toBe('opus');
    expect(result.cliPath).toBeNull();
    expect(result.cliSetupComplete).toBe(false);
  });

  it('updates advanced settings', () => {
    const result = settings.update('advanced', { developerMode: true, autoCompactPercent: 75 });
    expect(result.developerMode).toBe(true);
    expect(result.autoCompactPercent).toBe(75);
  });

  it('persists updates across reads', () => {
    settings.update('appearance', { theme: 'dark' });
    const result = settings.get('appearance');
    expect(result.theme).toBe('dark');
  });

  it('preserves other fields on partial update', () => {
    settings.update('appearance', { theme: 'dark', fontSize: 18 });
    settings.update('appearance', { compactMode: true });
    const result = settings.get('appearance');
    expect(result.theme).toBe('dark');
    expect(result.fontSize).toBe(18);
    expect(result.compactMode).toBe(true);
  });

  it('successive updates accumulate correctly', () => {
    settings.update('ai', { defaultModel: 'opus' });
    settings.update('ai', { cliSetupComplete: true });
    settings.update('ai', { cliPath: '/usr/bin/claude' });

    const result = settings.get('ai');
    expect(result.defaultModel).toBe('opus');
    expect(result.cliSetupComplete).toBe(true);
    expect(result.cliPath).toBe('/usr/bin/claude');
  });

  it('updates one category without affecting others', () => {
    settings.update('appearance', { theme: 'dark' });
    settings.update('ai', { defaultModel: 'opus' });

    expect(settings.get('appearance').theme).toBe('dark');
    expect(settings.get('ai').defaultModel).toBe('opus');
    expect(settings.get('advanced').developerMode).toBe(false); // untouched
  });

  it('can set nullable fields to null explicitly', () => {
    settings.update('ai', { cliPath: '/some/path' });
    expect(settings.get('ai').cliPath).toBe('/some/path');

    settings.update('ai', { cliPath: null });
    expect(settings.get('ai').cliPath).toBeNull();
  });

  it('can set nullable number to a value then back to null', () => {
    settings.update('advanced', { autoCompactPercent: 50 });
    expect(settings.get('advanced').autoCompactPercent).toBe(50);

    settings.update('advanced', { autoCompactPercent: null });
    expect(settings.get('advanced').autoCompactPercent).toBeNull();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getAll after updates
  // ─────────────────────────────────────────────────────────────────────────

  it('getAll reflects updates across categories', () => {
    settings.update('appearance', { theme: 'light' });
    settings.update('ai', { defaultModel: 'haiku' });
    settings.update('advanced', { developerMode: true });

    const all = settings.getAll();
    expect(all.appearance.theme).toBe('light');
    expect(all.ai.defaultModel).toBe('haiku');
    expect(all.advanced.developerMode).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Validation
  // ─────────────────────────────────────────────────────────────────────────

  it('rejects fontSize below minimum', () => {
    expect(() => settings.update('appearance', { fontSize: 5 })).toThrow();
  });

  it('rejects fontSize above maximum', () => {
    expect(() => settings.update('appearance', { fontSize: 30 })).toThrow();
  });

  it('rejects non-integer fontSize', () => {
    expect(() => settings.update('appearance', { fontSize: 14.5 })).toThrow();
  });

  it('rejects invalid theme value', () => {
    expect(() =>
      settings.update('appearance', { theme: 'neon' as 'light' })
    ).toThrow();
  });

  it('rejects invalid defaultModel value', () => {
    expect(() =>
      settings.update('ai', { defaultModel: 'gpt4' as 'haiku' })
    ).toThrow();
  });

  it('rejects autoCompactPercent below 0', () => {
    expect(() => settings.update('advanced', { autoCompactPercent: -1 })).toThrow();
  });

  it('rejects autoCompactPercent above 100', () => {
    expect(() => settings.update('advanced', { autoCompactPercent: 101 })).toThrow();
  });

  it('does not persist invalid updates', () => {
    settings.update('appearance', { fontSize: 18 });
    expect(() => settings.update('appearance', { fontSize: 5 })).toThrow();
    expect(settings.get('appearance').fontSize).toBe(18); // unchanged
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Forward/backward compatibility
  // ─────────────────────────────────────────────────────────────────────────

  it('strips unknown fields from stored JSON', () => {
    // Simulate a future version that wrote an extra field
    writeFileSync(settingsPath, JSON.stringify({
      appearance: { theme: 'dark', fontSize: 16, compactMode: true, unknownField: 'hello' },
    }, null, 2));

    const result = settings.get('appearance');
    expect(result).toEqual({ theme: 'dark', fontSize: 16, compactMode: true });
    expect((result as Record<string, unknown>)['unknownField']).toBeUndefined();
  });

  it('fills missing fields with defaults from stored JSON', () => {
    // Simulate an older version that only stored theme
    writeFileSync(settingsPath, JSON.stringify({
      appearance: { theme: 'light' },
    }, null, 2));

    const result = settings.get('appearance');
    expect(result.theme).toBe('light');
    expect(result.fontSize).toBe(14); // default filled
    expect(result.compactMode).toBe(false); // default filled
  });

  it('falls back to defaults on corrupted JSON file', () => {
    writeFileSync(settingsPath, 'not valid json!!!');

    const result = settings.get('appearance');
    expect(result).toEqual({ theme: 'system', fontSize: 14, compactMode: false, zoomLevel: 0 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // File format
  // ─────────────────────────────────────────────────────────────────────────

  it('writes human-readable JSON with indentation', () => {
    settings.update('appearance', { theme: 'dark' });
    const content = readFileSync(settingsPath, 'utf-8');
    expect(content).toContain('\n'); // multi-line
    expect(content).toContain('  '); // indented
    expect(content.endsWith('\n')).toBe(true); // trailing newline
  });

  it('creates parent directories if they do not exist', () => {
    const nestedPath = join(tmpDir, 'a', 'b', 'settings.json');
    const nested = new SettingsRepository(nestedPath);
    nested.update('appearance', { theme: 'dark' });
    expect(nested.get('appearance').theme).toBe('dark');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Schema defaults via parse({})
  // ─────────────────────────────────────────────────────────────────────────

  it('AllSettingsSchema.parse({}) returns complete defaults', () => {
    const defaults = AllSettingsSchema.parse({});
    expect(defaults.appearance.theme).toBe('system');
    expect(defaults.appearance.fontSize).toBe(14);
    expect(defaults.ai.defaultModel).toBe('sonnet');
    expect(defaults.advanced.developerMode).toBe(null);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // replaceAll
  // ─────────────────────────────────────────────────────────────────────────

  it('replaceAll writes all categories at once', () => {
    settings.replaceAll({
      appearance: { theme: 'dark', fontSize: 18, compactMode: true },
      ai: { defaultModel: 'opus', cliPath: '/usr/bin/claude', cliSetupComplete: true },
      advanced: { developerMode: true },
    });
    const all = settings.getAll();
    expect(all.appearance.theme).toBe('dark');
    expect(all.appearance.fontSize).toBe(18);
    expect(all.ai.defaultModel).toBe('opus');
    expect(all.ai.cliPath).toBe('/usr/bin/claude');
    expect(all.advanced.developerMode).toBe(true);
  });

  it('replaceAll fills defaults for missing fields', () => {
    settings.replaceAll({ appearance: { theme: 'light' } });
    const all = settings.getAll();
    expect(all.appearance.theme).toBe('light');
    expect(all.appearance.fontSize).toBe(14); // default
    expect(all.ai.defaultModel).toBe('sonnet'); // default
    expect(all.advanced.developerMode).toBe(null); // default
  });

  it('replaceAll strips unknown fields', () => {
    settings.replaceAll({
      appearance: { theme: 'dark', fontSize: 16, compactMode: false, extraField: 'nope' },
    });
    const raw = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    expect(raw.appearance.extraField).toBeUndefined();
  });

  it('replaceAll throws on invalid data and does not write', () => {
    settings.update('appearance', { theme: 'dark' });
    expect(() => settings.replaceAll({
      appearance: { theme: 'neon' },
    })).toThrow();
    expect(settings.get('appearance').theme).toBe('dark'); // unchanged
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Separate repository instances share the same file
  // ─────────────────────────────────────────────────────────────────────────

  it('changes are visible across repository instances', () => {
    const settings2 = new SettingsRepository(settingsPath);
    settings.update('appearance', { theme: 'dark' });
    expect(settings2.get('appearance').theme).toBe('dark');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Notifications category
  // ─────────────────────────────────────────────────────────────────────────

  describe('notifications', () => {
    it('returns empty mute maps by default', () => {
      const result = settings.get('notifications');
      expect(result.mutedSources).toEqual({});
      expect(result.mutedTypes).toEqual({});
    });

    it('updates mutedSources independently', () => {
      const result = settings.update('notifications', {
        mutedSources: { GitHub: true, 'Claude Code': false },
      });
      expect(result.mutedSources).toEqual({ GitHub: true, 'Claude Code': false });
      expect(result.mutedTypes).toEqual({});
    });

    it('updates mutedTypes independently', () => {
      const result = settings.update('notifications', {
        mutedTypes: { 'github_cli.pr.created': true },
      });
      expect(result.mutedTypes).toEqual({ 'github_cli.pr.created': true });
    });

    it('preserves the other map when updating one', () => {
      settings.update('notifications', { mutedSources: { GitHub: true } });
      settings.update('notifications', { mutedTypes: { 'core.claude-code.turn.completed': true } });
      const result = settings.get('notifications');
      expect(result.mutedSources).toEqual({ GitHub: true });
      expect(result.mutedTypes).toEqual({ 'core.claude-code.turn.completed': true });
    });

    it('can flip a mute back to unmuted', () => {
      settings.update('notifications', { mutedSources: { GitHub: true } });
      settings.update('notifications', { mutedSources: { GitHub: false } });
      expect(settings.get('notifications').mutedSources).toEqual({ GitHub: false });
    });

    it('appears in getAll() output', () => {
      const all = settings.getAll();
      expect(all.notifications).toEqual({ mutedSources: {}, mutedTypes: {} });
    });

    it('falls back to defaults when stored value is corrupted', () => {
      writeFileSync(
        settingsPath,
        JSON.stringify({ notifications: { mutedSources: 'not-an-object' } }),
      );
      const result = settings.get('notifications');
      expect(result).toEqual({ mutedSources: {}, mutedTypes: {} });
    });
  });
});
