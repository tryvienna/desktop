/**
 * SettingsRepository — Portable JSON file settings store.
 *
 * Stores all settings in a human-readable `settings.json` file
 * (VS Code–style). Zod schemas validate on every read and write —
 * missing fields are filled with defaults, unknown fields are stripped.
 * Corrupted files self-heal by falling back to defaults.
 *
 * @module app-db/settings
 */

import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import type { z } from 'zod';
import {
  AppearanceSettingsSchema,
  AiSettingsSchema,
  AdvancedSettingsSchema,
  PermissionsSettingsSchema,
  PermissionTemplatesSettingsSchema,
  NotificationsSettingsSchema,
  AllSettingsSchema,
} from './schemas';
import type {
  SettingsCategory,
  AppearanceSettings,
  AiSettings,
  AdvancedSettings,
  PermissionsSettings,
  PermissionTemplatesSettings,
  NotificationsSettings,
  AllSettings,
  UpdateAppearanceSettings,
  UpdateAiSettings,
  UpdateAdvancedSettings,
  UpdatePermissionsSettings,
  UpdatePermissionTemplatesSettings,
  UpdateNotificationsSettings,
} from './schemas';

// ─────────────────────────────────────────────────────────────────────────────
// Category schema registry
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_SCHEMAS: Record<SettingsCategory, z.ZodType> = {
  appearance: AppearanceSettingsSchema,
  ai: AiSettingsSchema,
  advanced: AdvancedSettingsSchema,
  permissions: PermissionsSettingsSchema,
  permissionTemplates: PermissionTemplatesSettingsSchema,
  notifications: NotificationsSettingsSchema,
};

// ─────────────────────────────────────────────────────────────────────────────
// Type mappings for category → settings type
// ─────────────────────────────────────────────────────────────────────────────

type CategorySettingsMap = {
  appearance: AppearanceSettings;
  ai: AiSettings;
  advanced: AdvancedSettings;
  permissions: PermissionsSettings;
  permissionTemplates: PermissionTemplatesSettings;
  notifications: NotificationsSettings;
};

type CategoryUpdateMap = {
  appearance: UpdateAppearanceSettings;
  ai: UpdateAiSettings;
  advanced: UpdateAdvancedSettings;
  permissions: UpdatePermissionsSettings;
  permissionTemplates: UpdatePermissionTemplatesSettings;
  notifications: UpdateNotificationsSettings;
};

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class SettingsRepository {
  constructor(private readonly filePath: string) {}

  /**
   * Get settings for a single category. Returns full defaults if file
   * doesn't exist or category is missing. Unknown fields are stripped,
   * missing fields are filled with defaults. Self-heals on corrupted JSON.
   */
  get<K extends SettingsCategory>(key: K): CategorySettingsMap[K] {
    const schema = CATEGORY_SCHEMAS[key];
    const data = this.readFile();
    const raw = data[key];

    if (raw === undefined) {
      return schema.parse({}) as CategorySettingsMap[K];
    }

    try {
      return schema.parse(raw) as CategorySettingsMap[K];
    } catch {
      // Corrupted category data — self-heal by returning defaults
      return schema.parse({}) as CategorySettingsMap[K];
    }
  }

  /**
   * Update settings for a single category. Merges with existing values,
   * validates the result, and writes atomically. Returns the full category after update.
   */
  update<K extends SettingsCategory>(
    key: K,
    update: CategoryUpdateMap[K]
  ): CategorySettingsMap[K] {
    const schema = CATEGORY_SCHEMAS[key];

    // Single read — avoids TOCTOU between get() and writeFile()
    const data = this.readFile();
    const existing = (() => {
      try { return schema.parse(data[key] ?? {}) as CategorySettingsMap[K]; }
      catch { return schema.parse({}) as CategorySettingsMap[K]; }
    })();

    // Merge: spread existing, overlay with defined update fields
    const merged = { ...existing };
    for (const [field, value] of Object.entries(update)) {
      if (value !== undefined) {
        (merged as Record<string, unknown>)[field] = value;
      }
    }

    // Validate merged result (throws on invalid input — write never happens)
    const validated = schema.parse(merged) as CategorySettingsMap[K];

    data[key] = validated;
    this.writeFile(data);

    return validated;
  }

  /**
   * Get all settings categories as a single object. Each category is
   * independently parsed with its schema — missing categories use defaults.
   */
  getAll(): AllSettings {
    return AllSettingsSchema.parse({
      appearance: this.get('appearance'),
      ai: this.get('ai'),
      advanced: this.get('advanced'),
      permissions: this.get('permissions'),
      permissionTemplates: this.get('permissionTemplates'),
      notifications: this.get('notifications'),
    });
  }

  /**
   * Replace all settings from a raw object. Validates every category through
   * its Zod schema — missing fields get defaults, unknown fields are stripped.
   * Throws ZodError if validation fails (file is not written on failure).
   */
  replaceAll(raw: unknown): AllSettings {
    const validated = AllSettingsSchema.parse(raw);
    this.writeFile(validated);
    return validated;
  }

  /** Read and parse the settings file. Returns {} if missing or corrupted. */
  private readFile(): Record<string, unknown> {
    try {
      const content = readFileSync(this.filePath, 'utf-8');
      return JSON.parse(content) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  /** Write settings atomically via temp file + rename. */
  private writeFile(data: Record<string, unknown>): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const tmpPath = this.filePath + '.tmp';
    writeFileSync(tmpPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
    renameSync(tmpPath, this.filePath);
  }
}
