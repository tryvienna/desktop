/**
 * ProjectRequirementChecker — Compares project requirements against current state.
 *
 * Takes the effective config (output of resolveConfig) and produces
 * user-facing notifications about missing, disabled, or conflicting requirements.
 *
 * @module main/config/ProjectRequirementChecker
 */

import type { EffectiveConfig, MissingRequirement, ConfigConflict } from '@vienna/app-db';

// ─────────────────────────────────────────────────────────────────────────────
// Notification types
// ─────────────────────────────────────────────────────────────────────────────

export type RequirementNotificationType =
  | 'missing_required'
  | 'disabled_required'
  | 'recommended'
  | 'forbidden_active'
  | 'conflict';

export interface RequirementNotification {
  type: RequirementNotificationType;
  contentType: 'plugin' | 'skill' | 'quickAction';
  contentId: string;
  projectDirectory: string;
  reason?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Checker
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract user-facing notifications from an EffectiveConfig.
 * These are meant to be shown in the UI to guide users toward
 * satisfying project requirements.
 */
export function checkRequirements(config: EffectiveConfig): RequirementNotification[] {
  const notifications: RequirementNotification[] = [];

  // Missing requirements (not installed or disabled)
  for (const req of config.missingRequirements) {
    notifications.push({
      type: req.type === 'not_installed' ? 'missing_required' : 'disabled_required',
      contentType: req.contentType,
      contentId: req.contentId,
      projectDirectory: req.projectDirectory,
      reason: req.reason,
    });
  }

  // Recommended items that aren't installed
  for (const item of [...config.plugins, ...config.skills, ...config.quickActions]) {
    if (item.projectRequirement === 'recommended' && !item.installed) {
      notifications.push({
        type: 'recommended',
        contentType: inferContentType(item.id, config),
        contentId: item.id,
        projectDirectory: item.projectSource ?? '',
        reason: item.projectReason ?? undefined,
      });
    }
  }

  // Forbidden items that are currently enabled
  for (const item of [...config.plugins, ...config.skills, ...config.quickActions]) {
    if (item.projectRequirement === 'forbidden' && item.enabled) {
      notifications.push({
        type: 'forbidden_active',
        contentType: inferContentType(item.id, config),
        contentId: item.id,
        projectDirectory: item.projectSource ?? '',
        reason: item.projectReason ?? undefined,
      });
    }
  }

  // Conflicts
  for (const conflict of config.conflicts) {
    if (conflict.contentType === 'setting') continue; // Settings conflicts are shown differently
    for (const entry of conflict.conflicts) {
      notifications.push({
        type: 'conflict',
        contentType: conflict.contentType as 'plugin' | 'skill' | 'quickAction',
        contentId: conflict.contentId,
        projectDirectory: entry.directory,
        reason: entry.reason,
      });
    }
  }

  return notifications;
}

/** Determine which content type an item belongs to based on which array it's in. */
function inferContentType(
  id: string,
  config: EffectiveConfig,
): 'plugin' | 'skill' | 'quickAction' {
  if (config.plugins.some((p) => p.id === id)) return 'plugin';
  if (config.skills.some((s) => s.id === id)) return 'skill';
  return 'quickAction';
}
