/**
 * Config Resolution Engine — Pure function that merges 3 tiers into effective state.
 *
 * Tiers (lowest to highest priority):
 *   Global  → app defaults + registry _defaults.json
 *   User    → profile settings.json + installed plugins/skills state
 *   Project → .vienna/config.json directives (recommend, require, forbid)
 *
 * Merge strategies:
 *   Scalars (theme, model)    → user wins; project can recommend
 *   Collections (content)     → union with per-item project directives
 *   Permissions               → most restrictive wins
 *
 * This module is a pure function with NO I/O or side effects.
 *
 * @module app-db/config-resolver
 */

import type { AllSettings, InstalledPluginRecord, InstalledSkillRecord } from './schemas';
import type { ProjectConfig, ContentRequirement } from './project-config';

// ─────────────────────────────────────────────────────────────────────────────
// Input types (one per tier)
// ─────────────────────────────────────────────────────────────────────────────

/** Global tier: app defaults + registry defaults. */
export interface GlobalTier {
  /** Default settings from Zod schema defaults. */
  settingsDefaults: AllSettings;
  /** Default-enabled content IDs from registry _defaults.json files. */
  registryDefaults: {
    plugins: string[];
    skills: string[];
    quickActions: string[];
  };
}

/** User tier: profile-level state from DB + settings.json. */
export interface UserTier {
  /** User's current settings. */
  settings: AllSettings;
  /** User's installed plugins (with enabled state). */
  installedPlugins: InstalledPluginRecord[];
  /** User's installed skills (with enabled/pinned state). */
  installedSkills: InstalledSkillRecord[];
}

/** Project tier: parsed from a single .vienna/config.json. */
export interface ProjectTier {
  /** Absolute path to the project directory containing .vienna/. */
  directory: string;
  /** Parsed config. */
  config: ProjectConfig;
}

// ─────────────────────────────────────────────────────────────────────────────
// Output types
// ─────────────────────────────────────────────────────────────────────────────

export type ConfigTier = 'global' | 'user' | 'project';

export interface ConfigSource {
  tier: ConfigTier;
  /** Human-readable detail: "app-default", "settings.json", "/path/.vienna/config.json" */
  detail: string;
}

export interface ResolvedValue<T> {
  value: T;
  source: ConfigSource;
  /** Project recommendation (if project suggests a different value). */
  recommendation?: {
    value: T;
    source: ConfigSource;
    reason?: string;
  };
}

export interface ContentItemState {
  id: string;
  installed: boolean;
  enabled: boolean;
  enabledSource: ConfigSource;
  /** Project directive, if any. */
  projectRequirement: ContentRequirement | null;
  /** Which .vienna/config.json declared the requirement. */
  projectSource: string | null;
  /** Human-readable reason from config. */
  projectReason: string | null;
}

export interface ConfigConflict {
  contentType: 'plugin' | 'skill' | 'quickAction' | 'setting';
  contentId: string;
  conflicts: Array<{
    directory: string;
    requirement: string;
    reason?: string;
  }>;
}

export interface MissingRequirement {
  contentType: 'plugin' | 'skill' | 'quickAction';
  contentId: string;
  /** The project directory that requires this. */
  projectDirectory: string;
  reason?: string;
  /** Whether the item is installed but disabled, vs not installed at all. */
  type: 'not_installed' | 'disabled';
}

export interface EffectiveConfig {
  /** Resolved scalar settings with provenance. */
  settings: Record<string, ResolvedValue<unknown>>;
  /** Resolved content item states. */
  plugins: ContentItemState[];
  skills: ContentItemState[];
  quickActions: ContentItemState[];
  /** Conflicting requirements across projects. */
  conflicts: ConfigConflict[];
  /** Missing or disabled required items. */
  missingRequirements: MissingRequirement[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolver
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the effective configuration from all three tiers.
 * Pure function — no I/O, no side effects.
 */
export function resolveConfig(
  global: GlobalTier,
  user: UserTier,
  projects: ProjectTier[],
): EffectiveConfig {
  const conflicts: ConfigConflict[] = [];
  const missingRequirements: MissingRequirement[] = [];

  // --- Settings resolution ---
  const settings = resolveSettings(global, user, projects, conflicts);

  // --- Content resolution ---
  const plugins = resolveContent(
    'plugin',
    global.registryDefaults.plugins,
    user.installedPlugins.map((p) => ({ id: p.id, installed: true, enabled: p.enabled })),
    projects,
    conflicts,
    missingRequirements,
  );

  const skills = resolveContent(
    'skill',
    global.registryDefaults.skills,
    user.installedSkills.map((s) => ({ id: s.id, installed: true, enabled: s.enabled })),
    projects,
    conflicts,
    missingRequirements,
  );

  const quickActions = resolveContent(
    'quickAction',
    global.registryDefaults.quickActions,
    [], // Quick actions don't have a user-installed table yet
    projects,
    conflicts,
    missingRequirements,
  );

  return { settings, plugins, skills, quickActions, conflicts, missingRequirements };
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings resolution (scalars)
// ─────────────────────────────────────────────────────────────────────────────

function resolveSettings(
  global: GlobalTier,
  user: UserTier,
  projects: ProjectTier[],
  conflicts: ConfigConflict[],
): Record<string, ResolvedValue<unknown>> {
  const result: Record<string, ResolvedValue<unknown>> = {};

  // Flatten settings into dot-paths
  const globalFlat = flattenSettings(global.settingsDefaults);
  const userFlat = flattenSettings(user.settings);

  // Collect project recommendations per key
  const projectRecs = new Map<string, Array<{ value: unknown; directory: string; reason?: string }>>();
  for (const project of projects) {
    for (const rec of project.config.settings) {
      const existing = projectRecs.get(rec.key) ?? [];
      existing.push({ value: rec.value, directory: project.directory, reason: rec.reason });
      projectRecs.set(rec.key, existing);
    }
  }

  // For each known setting key, resolve
  const allKeys = new Set([...Object.keys(globalFlat), ...Object.keys(userFlat)]);
  for (const key of allKeys) {
    const globalVal = globalFlat[key];
    const userVal = userFlat[key];
    const hasUserOverride = key in userFlat && userVal !== globalVal;

    const resolved: ResolvedValue<unknown> = {
      value: hasUserOverride ? userVal : globalVal,
      source: hasUserOverride
        ? { tier: 'user', detail: 'settings.json' }
        : { tier: 'global', detail: 'app-default' },
    };

    // Check project recommendations
    const recs = projectRecs.get(key);
    if (recs && recs.length > 0) {
      // If multiple projects recommend different values, that's a conflict
      const uniqueValues = new Set(recs.map((r) => JSON.stringify(r.value)));
      if (uniqueValues.size > 1) {
        conflicts.push({
          contentType: 'setting',
          contentId: key,
          conflicts: recs.map((r) => ({
            directory: r.directory,
            requirement: 'recommended',
            reason: r.reason,
          })),
        });
      }

      // Attach the first recommendation (if it differs from current value)
      const firstRec = recs[0]!;
      if (JSON.stringify(firstRec.value) !== JSON.stringify(resolved.value)) {
        resolved.recommendation = {
          value: firstRec.value,
          source: { tier: 'project', detail: firstRec.directory },
          reason: firstRec.reason,
        };
      }
    }

    result[key] = resolved;
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Content resolution (plugins, skills, quick actions)
// ─────────────────────────────────────────────────────────────────────────────

interface UserContentItem {
  id: string;
  installed: boolean;
  enabled: boolean;
}

type ContentType = 'plugin' | 'skill' | 'quickAction';

function resolveContent(
  contentType: ContentType,
  globalDefaults: string[],
  userItems: UserContentItem[],
  projects: ProjectTier[],
  conflicts: ConfigConflict[],
  missingRequirements: MissingRequirement[],
): ContentItemState[] {
  // Build a map of all known content IDs
  const itemMap = new Map<string, ContentItemState>();

  // Seed from global defaults
  for (const id of globalDefaults) {
    itemMap.set(id, {
      id,
      installed: false,
      enabled: false,
      enabledSource: { tier: 'global', detail: 'registry-default' },
      projectRequirement: null,
      projectSource: null,
      projectReason: null,
    });
  }

  // Overlay with user state
  for (const item of userItems) {
    const existing = itemMap.get(item.id);
    itemMap.set(item.id, {
      id: item.id,
      installed: item.installed,
      enabled: item.enabled,
      enabledSource: { tier: 'user', detail: 'installed' },
      projectRequirement: existing?.projectRequirement ?? null,
      projectSource: existing?.projectSource ?? null,
      projectReason: existing?.projectReason ?? null,
    });
  }

  // Collect project directives per content ID
  const configKey = contentType === 'quickAction' ? 'quickActions' : `${contentType}s` as 'plugins' | 'skills' | 'quickActions';
  const projectDirectives = new Map<string, Array<{ requirement: ContentRequirement; directory: string; reason?: string }>>();

  for (const project of projects) {
    const refs = project.config[configKey];
    for (const ref of refs) {
      const existing = projectDirectives.get(ref.id) ?? [];
      existing.push({
        requirement: ref.requirement,
        directory: project.directory,
        reason: ref.reason,
      });
      projectDirectives.set(ref.id, existing);
    }
  }

  // Apply project directives
  for (const [id, directives] of projectDirectives) {
    // Check for conflicts (e.g. one project requires, another forbids)
    const requirements = new Set(directives.map((d) => d.requirement));
    if (requirements.has('required') && requirements.has('forbidden')) {
      conflicts.push({
        contentType,
        contentId: id,
        conflicts: directives.map((d) => ({
          directory: d.directory,
          requirement: d.requirement,
          reason: d.reason,
        })),
      });
    }

    // Determine effective directive (forbidden > required > recommended)
    let effectiveReq: ContentRequirement;
    if (requirements.has('forbidden')) {
      effectiveReq = 'forbidden';
    } else if (requirements.has('required')) {
      effectiveReq = 'required';
    } else {
      effectiveReq = 'recommended';
    }

    const firstDirective = directives[0]!;
    const item = itemMap.get(id) ?? {
      id,
      installed: false,
      enabled: false,
      enabledSource: { tier: 'global', detail: 'registry-default' },
      projectRequirement: null,
      projectSource: null,
      projectReason: null,
    };

    item.projectRequirement = effectiveReq;
    item.projectSource = firstDirective.directory;
    item.projectReason = firstDirective.reason ?? null;

    // Generate missing requirement notifications
    if (effectiveReq === 'required') {
      if (!item.installed) {
        missingRequirements.push({
          contentType,
          contentId: id,
          projectDirectory: firstDirective.directory,
          reason: firstDirective.reason,
          type: 'not_installed',
        });
      } else if (!item.enabled) {
        missingRequirements.push({
          contentType,
          contentId: id,
          projectDirectory: firstDirective.directory,
          reason: firstDirective.reason,
          type: 'disabled',
        });
      }
    }

    itemMap.set(id, item);
  }

  return Array.from(itemMap.values());
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Flatten a nested settings object into dot-path keys. */
function flattenSettings(
  obj: Record<string, unknown>,
  prefix = '',
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenSettings(value as Record<string, unknown>, fullKey));
    } else {
      result[fullKey] = value;
    }
  }

  return result;
}
