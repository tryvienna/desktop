import { describe, it, expect } from 'vitest';
import { resolveConfig } from './config-resolver';
import type { GlobalTier, UserTier, ProjectTier } from './config-resolver';
import type { AllSettings, InstalledPluginRecord, InstalledSkillRecord } from './schemas';
import type { ProjectConfig } from './project-config';

// ─────────────────────────────────────────────────────────────────────────────
// Test helpers
// ─────────────────────────────────────────────────────────────────────────────

function defaultSettings(): AllSettings {
  return {
    appearance: { theme: 'system', fontSize: 14, compactMode: false, zoomLevel: 0 },
    ai: {
      defaultModel: 'sonnet',
      cliPath: null,
      cliSetupComplete: false,
      autoCompactPercent: null,
      operationPreInjection: false,
    },
    advanced: {
      developerMode: null,
      focusMonitorEnabled: false,
      focusMonitorIntervalMs: 2000,
    },
    permissions: { activePreset: 'balanced', rules: [] },
    permissionTemplates: { templates: [] },
  };
}

function makeGlobal(overrides?: Partial<GlobalTier>): GlobalTier {
  return {
    settingsDefaults: defaultSettings(),
    registryDefaults: { plugins: [], skills: [], quickActions: [] },
    ...overrides,
  };
}

function makeUser(overrides?: Partial<UserTier>): UserTier {
  return {
    settings: defaultSettings(),
    installedPlugins: [],
    installedSkills: [],
    ...overrides,
  };
}

function makePlugin(id: string, enabled = true): InstalledPluginRecord {
  return {
    id,
    name: id,
    description: '',
    version: null,
    registryVersion: null,
    source: 'inline',
    sourceRef: null,
    registry: null,
    path: `/plugins/${id}`,
    icon: null,
    category: null,
    tags: [],
    author: null,
    enabled,
    installDate: '2024-01-01',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function makeSkill(id: string, enabled = true, pinned = false): InstalledSkillRecord {
  return {
    id,
    name: id,
    description: '',
    version: null,
    registryVersion: null,
    source: 'inline',
    sourceRef: null,
    registry: null,
    path: `/skills/${id}`,
    icon: null,
    category: null,
    tags: [],
    author: null,
    enabled,
    pinned,
    installDate: '2024-01-01',
    lastUsed: null,
    useCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function makeProject(directory: string, config: Partial<ProjectConfig> = {}): ProjectTier {
  return {
    directory,
    config: {
      version: 1 as const,
      registries: [],
      plugins: [],
      skills: [],
      quickActions: [],
      settings: [],
      ...config,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveConfig', () => {
  describe('settings resolution', () => {
    it('returns global defaults when no user overrides or project recs', () => {
      const result = resolveConfig(makeGlobal(), makeUser(), []);
      expect(result.settings['appearance.theme']!.value).toBe('system');
      expect(result.settings['appearance.theme']!.source.tier).toBe('global');
    });

    it('user settings override global defaults', () => {
      const user = makeUser({
        settings: {
          ...defaultSettings(),
          appearance: { theme: 'dark', fontSize: 14, compactMode: false },
        },
      });
      const result = resolveConfig(makeGlobal(), user, []);
      expect(result.settings['appearance.theme']!.value).toBe('dark');
      expect(result.settings['appearance.theme']!.source.tier).toBe('user');
    });

    it('project recommendation attached when different from user value', () => {
      const project = makeProject('/project', {
        settings: [{ key: 'ai.defaultModel', value: 'opus', reason: 'Team standard' }],
      });
      const result = resolveConfig(makeGlobal(), makeUser(), [project]);

      const modelSetting = result.settings['ai.defaultModel']!;
      expect(modelSetting.value).toBe('sonnet'); // User value wins
      expect(modelSetting.recommendation).toBeDefined();
      expect(modelSetting.recommendation!.value).toBe('opus');
      expect(modelSetting.recommendation!.reason).toBe('Team standard');
    });

    it('no recommendation when project value matches user value', () => {
      const project = makeProject('/project', {
        settings: [{ key: 'ai.defaultModel', value: 'sonnet' }],
      });
      const result = resolveConfig(makeGlobal(), makeUser(), [project]);

      const modelSetting = result.settings['ai.defaultModel']!;
      expect(modelSetting.recommendation).toBeUndefined();
    });

    it('conflicting project recommendations create a conflict', () => {
      const project1 = makeProject('/project1', {
        settings: [{ key: 'ai.defaultModel', value: 'opus', reason: 'Team A' }],
      });
      const project2 = makeProject('/project2', {
        settings: [{ key: 'ai.defaultModel', value: 'haiku', reason: 'Team B' }],
      });
      const result = resolveConfig(makeGlobal(), makeUser(), [project1, project2]);

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]!.contentType).toBe('setting');
      expect(result.conflicts[0]!.contentId).toBe('ai.defaultModel');
      expect(result.conflicts[0]!.conflicts).toHaveLength(2);
    });

    it('matching project recommendations do not create a conflict', () => {
      const project1 = makeProject('/project1', {
        settings: [{ key: 'ai.defaultModel', value: 'opus' }],
      });
      const project2 = makeProject('/project2', {
        settings: [{ key: 'ai.defaultModel', value: 'opus' }],
      });
      const result = resolveConfig(makeGlobal(), makeUser(), [project1, project2]);
      expect(result.conflicts).toHaveLength(0);
    });
  });

  describe('plugin resolution', () => {
    it('returns user installed plugins with user source', () => {
      const user = makeUser({ installedPlugins: [makePlugin('github')] });
      const result = resolveConfig(makeGlobal(), user, []);

      expect(result.plugins).toHaveLength(1);
      expect(result.plugins[0]!.id).toBe('github');
      expect(result.plugins[0]!.installed).toBe(true);
      expect(result.plugins[0]!.enabled).toBe(true);
      expect(result.plugins[0]!.enabledSource.tier).toBe('user');
    });

    it('global defaults appear as not-installed items', () => {
      const global = makeGlobal({ registryDefaults: { plugins: ['weather'], skills: [], quickActions: [] } });
      const result = resolveConfig(global, makeUser(), []);

      expect(result.plugins).toHaveLength(1);
      expect(result.plugins[0]!.id).toBe('weather');
      expect(result.plugins[0]!.installed).toBe(false);
    });

    it('user state overlays global defaults', () => {
      const global = makeGlobal({ registryDefaults: { plugins: ['weather'], skills: [], quickActions: [] } });
      const user = makeUser({ installedPlugins: [makePlugin('weather')] });
      const result = resolveConfig(global, user, []);

      expect(result.plugins).toHaveLength(1);
      expect(result.plugins[0]!.installed).toBe(true);
      expect(result.plugins[0]!.enabled).toBe(true);
    });

    it('project required plugin that is not installed creates missing requirement', () => {
      const project = makeProject('/project', {
        plugins: [{ id: 'github', requirement: 'required', reason: 'Team uses GitHub' }],
      });
      const result = resolveConfig(makeGlobal(), makeUser(), [project]);

      expect(result.missingRequirements).toHaveLength(1);
      expect(result.missingRequirements[0]!.contentId).toBe('github');
      expect(result.missingRequirements[0]!.type).toBe('not_installed');
      expect(result.missingRequirements[0]!.reason).toBe('Team uses GitHub');
    });

    it('project required plugin that is disabled creates missing requirement', () => {
      const user = makeUser({ installedPlugins: [makePlugin('github', false)] });
      const project = makeProject('/project', {
        plugins: [{ id: 'github', requirement: 'required' }],
      });
      const result = resolveConfig(makeGlobal(), user, [project]);

      expect(result.missingRequirements).toHaveLength(1);
      expect(result.missingRequirements[0]!.type).toBe('disabled');
    });

    it('project required plugin that is installed and enabled has no missing requirement', () => {
      const user = makeUser({ installedPlugins: [makePlugin('github')] });
      const project = makeProject('/project', {
        plugins: [{ id: 'github', requirement: 'required' }],
      });
      const result = resolveConfig(makeGlobal(), user, [project]);
      expect(result.missingRequirements).toHaveLength(0);
    });

    it('project recommended plugin sets projectRequirement metadata', () => {
      const project = makeProject('/project', {
        plugins: [{ id: 'slack', requirement: 'recommended' }],
      });
      const result = resolveConfig(makeGlobal(), makeUser(), [project]);

      const slack = result.plugins.find((p) => p.id === 'slack');
      expect(slack).toBeDefined();
      expect(slack!.projectRequirement).toBe('recommended');
    });

    it('project forbidden plugin overrides and warns', () => {
      const user = makeUser({ installedPlugins: [makePlugin('dangerous')] });
      const project = makeProject('/project', {
        plugins: [{ id: 'dangerous', requirement: 'forbidden', reason: 'Security risk' }],
      });
      const result = resolveConfig(makeGlobal(), user, [project]);

      const item = result.plugins.find((p) => p.id === 'dangerous');
      expect(item).toBeDefined();
      expect(item!.projectRequirement).toBe('forbidden');
      expect(item!.projectReason).toBe('Security risk');
    });
  });

  describe('skill resolution', () => {
    it('resolves installed skills with user source', () => {
      const user = makeUser({ installedSkills: [makeSkill('commit')] });
      const result = resolveConfig(makeGlobal(), user, []);

      expect(result.skills).toHaveLength(1);
      expect(result.skills[0]!.id).toBe('commit');
      expect(result.skills[0]!.installed).toBe(true);
      expect(result.skills[0]!.enabled).toBe(true);
    });

    it('project required skill creates missing requirement when not installed', () => {
      const project = makeProject('/project', {
        skills: [{ id: 'deploy', requirement: 'required', reason: 'Custom deploy' }],
      });
      const result = resolveConfig(makeGlobal(), makeUser(), [project]);

      expect(result.missingRequirements).toHaveLength(1);
      expect(result.missingRequirements[0]!.contentType).toBe('skill');
      expect(result.missingRequirements[0]!.contentId).toBe('deploy');
    });
  });

  describe('multi-project conflicts', () => {
    it('required + forbidden from different projects creates a conflict', () => {
      const project1 = makeProject('/project1', {
        plugins: [{ id: 'controversial', requirement: 'required', reason: 'Team A needs it' }],
      });
      const project2 = makeProject('/project2', {
        plugins: [{ id: 'controversial', requirement: 'forbidden', reason: 'Team B forbids it' }],
      });
      const result = resolveConfig(makeGlobal(), makeUser(), [project1, project2]);

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]!.contentId).toBe('controversial');
      expect(result.conflicts[0]!.conflicts).toHaveLength(2);
    });

    it('forbidden wins over required in effective state', () => {
      const project1 = makeProject('/project1', {
        plugins: [{ id: 'x', requirement: 'required' }],
      });
      const project2 = makeProject('/project2', {
        plugins: [{ id: 'x', requirement: 'forbidden' }],
      });
      const result = resolveConfig(makeGlobal(), makeUser(), [project1, project2]);

      const item = result.plugins.find((p) => p.id === 'x');
      expect(item!.projectRequirement).toBe('forbidden');
    });

    it('multiple projects requiring the same thing does not conflict', () => {
      const project1 = makeProject('/project1', {
        plugins: [{ id: 'github', requirement: 'required' }],
      });
      const project2 = makeProject('/project2', {
        plugins: [{ id: 'github', requirement: 'required' }],
      });
      const result = resolveConfig(makeGlobal(), makeUser(), [project1, project2]);
      expect(result.conflicts).toHaveLength(0);
    });
  });

  describe('empty inputs', () => {
    it('handles all empty inputs gracefully', () => {
      const result = resolveConfig(makeGlobal(), makeUser(), []);
      expect(result.plugins).toEqual([]);
      expect(result.skills).toEqual([]);
      expect(result.quickActions).toEqual([]);
      expect(result.conflicts).toEqual([]);
      expect(result.missingRequirements).toEqual([]);
      expect(Object.keys(result.settings).length).toBeGreaterThan(0);
    });

    it('handles project with empty config', () => {
      const project = makeProject('/empty');
      const result = resolveConfig(makeGlobal(), makeUser(), [project]);
      expect(result.conflicts).toEqual([]);
      expect(result.missingRequirements).toEqual([]);
    });
  });
});
