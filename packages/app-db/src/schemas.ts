/**
 * Zod Schemas — Source of truth for all app-db record types.
 *
 * Every type in this package derives from these schemas via z.infer.
 * The GraphQL layer (Pothos) references these types as backing models.
 *
 * @module app-db/schemas
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Shared validators
// ─────────────────────────────────────────────────────────────────────────────

/** Validates CSS hex color strings (#RGB or #RRGGBB). */
export const HexColorSchema = z.string().regex(
  /^#(?:[0-9a-fA-F]{3}){1,2}$/,
  'Must be a valid hex color (e.g. #3B82F6)',
);

// ─────────────────────────────────────────────────────────────────────────────
// Project
// ─────────────────────────────────────────────────────────────────────────────

export const ProjectRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type ProjectRecord = z.infer<typeof ProjectRecordSchema>;

export const CreateProjectInputSchema = z.object({
  name: z.string().min(1).max(200),
});
export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;

export const UpdateProjectInputSchema = z.object({
  name: z.string().min(1).max(200).optional(),
});
export type UpdateProjectInput = z.infer<typeof UpdateProjectInputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Workstream Groups
// ─────────────────────────────────────────────────────────────────────────────

export const WorkstreamGroupRecordSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  emoji: z.string().nullable(),
  isPinned: z.boolean(),
  autoCreateWorktrees: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type WorkstreamGroupRecord = z.infer<typeof WorkstreamGroupRecordSchema>;

export const CreateWorkstreamGroupInputSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).max(200),
  emoji: z.string().nullable().optional(),
});
export type CreateWorkstreamGroupInput = z.infer<typeof CreateWorkstreamGroupInputSchema>;

export const UpdateWorkstreamGroupInputSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  emoji: z.string().nullable().optional(),
  isPinned: z.boolean().optional(),
  autoCreateWorktrees: z.boolean().optional(),
});
export type UpdateWorkstreamGroupInput = z.infer<typeof UpdateWorkstreamGroupInputSchema>;

/** Entity linked at the group level — inherited by all workstreams in the group. */
export const GroupLinkedEntityRecordSchema = z.object({
  groupId: z.string(),
  entityUri: z.string(),
  entityType: z.string(),
  entityTitle: z.string().nullable(),
  contextOverride: z.string().nullable(),
  createdAt: z.number(),
});
export type GroupLinkedEntityRecord = z.infer<typeof GroupLinkedEntityRecordSchema>;

/** Directory shared at the group level — inherited by workstreams on creation. */
export const GroupDirectoryRecordSchema = z.object({
  id: z.number(),
  groupId: z.string(),
  path: z.string(),
  label: z.string().nullable(),
  createdAt: z.number(),
});
export type GroupDirectoryRecord = z.infer<typeof GroupDirectoryRecordSchema>;

/** Branch selection at the group level — default branch per directory, inherited on workstream creation. */
export const GroupBranchSelectionRecordSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  directoryPath: z.string(),
  branch: z.string(),
  baseBranch: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type GroupBranchSelectionRecord = z.infer<typeof GroupBranchSelectionRecordSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Workstream
// ─────────────────────────────────────────────────────────────────────────────

export const WorkstreamStatusSchema = z.enum([
  'idle',                // No agent running, waiting for user
  'processing',          // Agent is working
  'waiting_permission',  // Agent needs user approval for a tool
  'completed_unviewed',  // Agent finished, user hasn't seen result
  'active',              // In focus, agent idle after finishing
  'needs_review',        // Flagged for manual review by user
]);
export type WorkstreamStatus = z.infer<typeof WorkstreamStatusSchema>;

export const WorkstreamRecordSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  groupId: z.string().nullable(),
  title: z.string(),
  status: WorkstreamStatusSchema,
  model: z.string().nullable(),
  isPinned: z.boolean(),
  isRoutineWorkstream: z.boolean(),
  isFeedWorkstream: z.boolean(),
  activeSessionId: z.string().nullable(),
  messageCount: z.number(),
  lastActivityAt: z.number().nullable(),
  archivedAt: z.number().nullable(),
  forkedFromWorkstreamId: z.string().nullable(),
  forkedAtMessageId: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type WorkstreamRecord = z.infer<typeof WorkstreamRecordSchema>;

export const CreateWorkstreamInputSchema = z.object({
  projectId: z.string(),
  groupId: z.string().nullable().optional(),
  title: z.string().min(1).max(500),
  model: z.string().nullable().optional(),
  isRoutineWorkstream: z.boolean().optional(),
  isFeedWorkstream: z.boolean().optional(),
  forkedFromWorkstreamId: z.string().nullable().optional(),
  forkedAtMessageId: z.string().nullable().optional(),
});
export type CreateWorkstreamInput = z.infer<typeof CreateWorkstreamInputSchema>;

export const UpdateWorkstreamInputSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  status: WorkstreamStatusSchema.optional(),
  model: z.string().nullable().optional(),
  isPinned: z.boolean().optional(),
  groupId: z.string().nullable().optional(),
  activeSessionId: z.string().nullable().optional(),
  messageCount: z.number().optional(),
  lastActivityAt: z.number().nullable().optional(),
  archivedAt: z.number().nullable().optional(),
});
export type UpdateWorkstreamInput = z.infer<typeof UpdateWorkstreamInputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Project Directories (global, inherited by workstreams)
// ─────────────────────────────────────────────────────────────────────────────

export const ProjectDirectoryRecordSchema = z.object({
  id: z.number(),
  projectId: z.string(),
  path: z.string(),
  label: z.string().nullable(),
  createdAt: z.number(),
});
export type ProjectDirectoryRecord = z.infer<typeof ProjectDirectoryRecordSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Workstream Directories (inherited copies + workstream-specific)
// ─────────────────────────────────────────────────────────────────────────────

export const WorkstreamDirectoryRecordSchema = z.object({
  id: z.number(),
  workstreamId: z.string(),
  path: z.string(),
  label: z.string().nullable(),
  isInherited: z.boolean(),
  createdAt: z.number(),
});
export type WorkstreamDirectoryRecord = z.infer<typeof WorkstreamDirectoryRecordSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Branch Selections (per-directory branch overrides)
// ─────────────────────────────────────────────────────────────────────────────

export const BranchSelectionRecordSchema = z.object({
  id: z.string(),
  workstreamId: z.string(),
  directoryPath: z.string(),
  branch: z.string(),
  worktreePath: z.string().nullable(),
  baseBranch: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type BranchSelectionRecord = z.infer<typeof BranchSelectionRecordSchema>;

/** Computed view joining directories with branch selections */
export const DirectoryWithBranchInfoSchema = z.object({
  path: z.string(),
  effectivePath: z.string(),
  label: z.string().nullable(),
  branch: z.string().nullable(),
  baseBranch: z.string(),
  worktreePath: z.string().nullable(),
  isInherited: z.boolean(),
});
export type DirectoryWithBranchInfo = z.infer<typeof DirectoryWithBranchInfoSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Workstream Linked Entities
// ─────────────────────────────────────────────────────────────────────────────

export const WorkstreamLinkedEntityRecordSchema = z.object({
  workstreamId: z.string(),
  entityUri: z.string(),
  entityType: z.string(),
  entityTitle: z.string().nullable(),
  contextOverride: z.string().nullable(),
  createdAt: z.number(),
});
export type WorkstreamLinkedEntityRecord = z.infer<typeof WorkstreamLinkedEntityRecordSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Workstream References (auto-detected or agent-added entity references)
// ─────────────────────────────────────────────────────────────────────────────

export const WorkstreamReferenceRecordSchema = z.object({
  workstreamId: z.string(),
  entityUri: z.string(),
  entityType: z.string(),
  entityTitle: z.string().nullable(),
  externalUrl: z.string().nullable(),
  firstReferencedAt: z.number(),
});
export type WorkstreamReferenceRecord = z.infer<typeof WorkstreamReferenceRecordSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Routines
// ─────────────────────────────────────────────────────────────────────────────

export const RoutineStatusSchema = z.enum(['active', 'paused', 'disabled']);
export type RoutineStatus = z.infer<typeof RoutineStatusSchema>;

export const RoutineScheduleSchema = z.object({
  type: z.enum(['cron', 'interval']),
  expression: z.string(),
  timezone: z.string().optional(),
});
export type RoutineSchedule = z.infer<typeof RoutineScheduleSchema>;

export const RoutineRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  prompt: z.string(),
  workstreamId: z.string(),
  status: RoutineStatusSchema,
  schedule: RoutineScheduleSchema,
  preferences: z.record(z.unknown()),
  runCount: z.number(),
  lastRunAt: z.number().nullable(),
  nextRunAt: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type RoutineRecord = z.infer<typeof RoutineRecordSchema>;

export const CreateRoutineInputSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  prompt: z.string().min(1),
  projectId: z.string(),
  schedule: RoutineScheduleSchema,
  preferences: z.record(z.unknown()).optional(),
});
export type CreateRoutineInput = z.infer<typeof CreateRoutineInputSchema>;

export const UpdateRoutineInputSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  prompt: z.string().min(1).optional(),
  schedule: RoutineScheduleSchema.optional(),
  preferences: z.record(z.unknown()).optional(),
});
export type UpdateRoutineInput = z.infer<typeof UpdateRoutineInputSchema>;

export const RoutineRunStatusSchema = z.enum(['pending', 'running', 'completed', 'failed', 'skipped']);
export type RoutineRunStatus = z.infer<typeof RoutineRunStatusSchema>;

export const RoutineRunRecordSchema = z.object({
  id: z.string(),
  routineId: z.string(),
  status: RoutineRunStatusSchema,
  triggeredBy: z.enum(['schedule', 'manual', 'retry']),
  startedAt: z.number(),
  completedAt: z.number().nullable(),
  summary: z.string().nullable(),
  error: z.string().nullable(),
  metadata: z.record(z.unknown()),
  createdAt: z.number(),
});
export type RoutineRunRecord = z.infer<typeof RoutineRunRecordSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Registries (Git-backed content sources)
// ─────────────────────────────────────────────────────────────────────────────

export const RegistrySourceSchema = z.enum(['local', 'organization', 'project']);
export type RegistrySource = z.infer<typeof RegistrySourceSchema>;

export const RegistryRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  enabled: z.boolean(),
  priority: z.number(),
  source: RegistrySourceSchema,
  /** For source='project': the project directory that declared this registry. */
  projectDirectory: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type RegistryRecord = z.infer<typeof RegistryRecordSchema>;

export const CreateRegistryInputSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  url: z.string().url().startsWith('https://'),
  priority: z.number().int().min(0).max(100).optional(),
});
export type CreateRegistryInput = z.infer<typeof CreateRegistryInputSchema>;

export const UpdateRegistryInputSchema = z.object({
  enabled: z.boolean().optional(),
  priority: z.number().int().min(0).max(100).optional(),
});
export type UpdateRegistryInput = z.infer<typeof UpdateRegistryInputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Installed Skills
// ─────────────────────────────────────────────────────────────────────────────

export const InstalledSkillSourceSchema = z.enum(['inline', 'github', 'local']);
export type InstalledSkillSource = z.infer<typeof InstalledSkillSourceSchema>;

export const InstalledSkillRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  version: z.string().nullable(),
  registryVersion: z.string().nullable(),
  source: InstalledSkillSourceSchema,
  sourceRef: z.string().nullable(),
  registry: z.string().nullable(),
  path: z.string(),
  icon: z.string().nullable(),
  category: z.string().nullable(),
  tags: z.array(z.string()),
  author: z.string().nullable(),
  enabled: z.boolean(),
  pinned: z.boolean(),
  installDate: z.string(),
  lastUsed: z.string().nullable(),
  useCount: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type InstalledSkillRecord = z.infer<typeof InstalledSkillRecordSchema>;

export const CreateInstalledSkillInputSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  version: z.string().nullable().default(null),
  registryVersion: z.string().nullable().default(null),
  source: InstalledSkillSourceSchema,
  sourceRef: z.string().nullable().default(null),
  registry: z.string().nullable().default(null),
  path: z.string(),
  icon: z.string().nullable().default(null),
  category: z.string().nullable().default(null),
  tags: z.array(z.string()).default([]),
  author: z.string().nullable().default(null),
});
export type CreateInstalledSkillInput = z.infer<typeof CreateInstalledSkillInputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Installed Plugins (registry-sourced plugins installed on disk)
// ─────────────────────────────────────────────────────────────────────────────

export const InstalledPluginSourceSchema = z.enum(['inline', 'github']);
export type InstalledPluginSource = z.infer<typeof InstalledPluginSourceSchema>;

export const InstalledPluginRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  version: z.string().nullable(),
  registryVersion: z.string().nullable(),
  source: InstalledPluginSourceSchema,
  sourceRef: z.string().nullable(),
  registry: z.string().nullable(),
  path: z.string(),
  icon: z.string().nullable(),
  category: z.string().nullable(),
  tags: z.array(z.string()),
  author: z.string().nullable(),
  enabled: z.boolean(),
  installDate: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type InstalledPluginRecord = z.infer<typeof InstalledPluginRecordSchema>;

export const CreateInstalledPluginInputSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  version: z.string().nullable().default(null),
  registryVersion: z.string().nullable().default(null),
  source: InstalledPluginSourceSchema,
  sourceRef: z.string().nullable().default(null),
  registry: z.string().nullable().default(null),
  path: z.string(),
  icon: z.string().nullable().default(null),
  category: z.string().nullable().default(null),
  tags: z.array(z.string()).default([]),
  author: z.string().nullable().default(null),
});
export type CreateInstalledPluginInput = z.infer<typeof CreateInstalledPluginInputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Tags (JSON file-based definitions + DB workstream snapshots)
// ─────────────────────────────────────────────────────────────────────────────

export const WorktreeModeSchema = z.enum(['same', 'fork', 'from_main']);
export type WorktreeMode = z.infer<typeof WorktreeModeSchema>;

export const WorkstreamTagStatusSchema = z.enum(['pending', 'running', 'completed', 'failed', 'skipped']);
export type WorkstreamTagStatus = z.infer<typeof WorkstreamTagStatusSchema>;

export const WorkstreamTagAppliedBySchema = z.enum(['manual', 'agent', 'trigger', 'pipeline']);
export type WorkstreamTagAppliedBy = z.infer<typeof WorkstreamTagAppliedBySchema>;

export const WorkstreamTagRecordSchema = z.object({
  id: z.string(),
  workstreamId: z.string(),
  tagName: z.string(),
  // Snapshot fields (frozen at apply time)
  tagInstructions: z.string(),
  tagColor: z.string(),
  tagMaxDepth: z.number(),
  tagSpawnWorkstream: z.boolean(),
  tagWorktreeMode: WorktreeModeSchema,
  tagDependsOn: z.array(z.string()),
  // Execution state
  status: WorkstreamTagStatusSchema,
  appliedAt: z.number(),
  startedAt: z.number().nullable(),
  completedAt: z.number().nullable(),
  error: z.string().nullable(),
  appliedBy: WorkstreamTagAppliedBySchema,
  depth: z.number(),
  delegatedWorkstreamId: z.string().nullable(),
  sourceWorkstreamTagId: z.string().nullable(),
});
export type WorkstreamTagRecord = z.infer<typeof WorkstreamTagRecordSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────────────────────────────────────

// --- Category schemas (each field has a default — parse({}) returns full defaults) ---

export const ThemeSchema = z.enum(['light', 'dark', 'system']);
export type Theme = z.infer<typeof ThemeSchema>;

export const DefaultModelSchema = z.string();
export type DefaultModel = z.infer<typeof DefaultModelSchema>;

export const AppearanceSettingsSchema = z.object({
  theme: ThemeSchema.default('system'),
  fontSize: z.number().int().min(10).max(24).default(14),
  compactMode: z.boolean().default(false),
  /** Electron zoom level (0 = 100%). Persisted across sessions. */
  zoomLevel: z.number().min(-5).max(5).default(0),
});
export type AppearanceSettings = z.infer<typeof AppearanceSettingsSchema>;

export const AiSettingsSchema = z.object({
  defaultModel: DefaultModelSchema.default('sonnet'),
  cliPath: z.string().nullable().default(null),
  cliSetupComplete: z.boolean().default(false),
  autoCompactPercent: z.number().int().min(10).max(95).nullable().default(null),
  /** When true, uses Haiku to classify intent and pre-inject operation specs into user messages */
  operationPreInjection: z.boolean().default(false),
});
export type AiSettings = z.infer<typeof AiSettingsSchema>;

export const AdvancedSettingsSchema = z.object({
  /** null = use environment default (true for dev builds, false for production) */
  developerMode: z.boolean().nullable().default(null),
  /** Whether the focus monitor is actively polling. */
  focusMonitorEnabled: z.boolean().default(false),
  /** Polling interval in milliseconds (500ms–60s). */
  focusMonitorIntervalMs: z.number().int().min(500).max(60000).default(2000),
});
export type AdvancedSettings = z.infer<typeof AdvancedSettingsSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Permission Settings (global defaults in settings.json)
// ─────────────────────────────────────────────────────────────────────────────

export const PermissionBehaviorSettingSchema = z.enum(['allow', 'ask']);
export type PermissionBehaviorSetting = z.infer<typeof PermissionBehaviorSettingSchema>;

export const PermissionPresetSchema = z.enum(['restrictive', 'balanced', 'autonomous', 'custom']);
export type PermissionPreset = z.infer<typeof PermissionPresetSchema>;

export const PermissionRuleConfigSchema = z.object({
  tool: z.string(),
  behavior: PermissionBehaviorSettingSchema,
  entityType: z.string().optional(),
});
export type PermissionRuleConfig = z.infer<typeof PermissionRuleConfigSchema>;

export const PermissionsSettingsSchema = z.object({
  activePreset: PermissionPresetSchema.default('balanced'),
  rules: z.array(PermissionRuleConfigSchema).default([]),
}).default({});
export type PermissionsSettings = z.infer<typeof PermissionsSettingsSchema>;

export const UpdatePermissionsSettingsSchema = z.object({
  activePreset: PermissionPresetSchema.optional(),
  rules: z.array(PermissionRuleConfigSchema).optional(),
});
export type UpdatePermissionsSettings = z.infer<typeof UpdatePermissionsSettingsSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Permission Policies (scoped overrides in SQLite)
// ─────────────────────────────────────────────────────────────────────────────

export const PermissionScopeTypeSchema = z.enum(['project', 'group', 'workstream']);
export type PermissionScopeType = z.infer<typeof PermissionScopeTypeSchema>;

export const PermissionPolicyRecordSchema = z.object({
  id: z.string(),
  scopeType: PermissionScopeTypeSchema,
  scopeId: z.string(),
  rules: z.array(PermissionRuleConfigSchema),
  templateId: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type PermissionPolicyRecord = z.infer<typeof PermissionPolicyRecordSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Permission Templates (reusable rule sets in settings.json)
// ─────────────────────────────────────────────────────────────────────────────

export const PermissionTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().default(''),
  rules: z.array(PermissionRuleConfigSchema).default([]),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type PermissionTemplate = z.infer<typeof PermissionTemplateSchema>;

export const PermissionTemplatesSettingsSchema = z.object({
  templates: z.array(PermissionTemplateSchema).default([]),
}).default({});
export type PermissionTemplatesSettings = z.infer<typeof PermissionTemplatesSettingsSchema>;

export const UpdatePermissionTemplatesSettingsSchema = z.object({
  templates: z.array(PermissionTemplateSchema).optional(),
});
export type UpdatePermissionTemplatesSettings = z.infer<typeof UpdatePermissionTemplatesSettingsSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Notifications Settings
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Notification mute preferences.
 *
 * Two independent maps. A notification is muted iff its source OR its type id
 * is set to true. Unknown sources / type ids are not muted (default allow), so
 * new notification types from plugins surface immediately and the user can
 * silence them after seeing the first one.
 */
export const NotificationsSettingsSchema = z
  .object({
    /** Map of source label (e.g. 'GitHub') → muted. */
    mutedSources: z.record(z.boolean()).default({}),
    /** Map of notification type id (e.g. 'github_cli.pr.created') → muted. */
    mutedTypes: z.record(z.boolean()).default({}),
  })
  .default({});
export type NotificationsSettings = z.infer<typeof NotificationsSettingsSchema>;

export const UpdateNotificationsSettingsSchema = z.object({
  mutedSources: z.record(z.boolean()).optional(),
  mutedTypes: z.record(z.boolean()).optional(),
});
export type UpdateNotificationsSettings = z.infer<typeof UpdateNotificationsSettingsSchema>;

/**
 * Pure predicate shared between the main-process notification gate and the
 * GraphQL `pushInboxItem` mutation: should a notification of `(typeId, source)`
 * be allowed by `settings`? Source mute beats type mute.
 *
 * `null`/missing source means the caller didn't classify the item — falls back
 * to type-level check only.
 */
export function isNotificationMuted(
  typeId: string,
  source: string | null,
  settings: NotificationsSettings,
): boolean {
  if (source !== null && settings.mutedSources[source]) return true;
  if (settings.mutedTypes[typeId]) return true;
  return false;
}

// --- Aggregate settings (all categories) ---

export const SettingsCategorySchema = z.enum([
  'appearance',
  'ai',
  'advanced',
  'permissions',
  'permissionTemplates',
  'notifications',
]);
export type SettingsCategory = z.infer<typeof SettingsCategorySchema>;

export const AllSettingsSchema = z.object({
  appearance: AppearanceSettingsSchema.default({}),
  ai: AiSettingsSchema.default({}),
  advanced: AdvancedSettingsSchema.default({}),
  permissions: PermissionsSettingsSchema,
  permissionTemplates: PermissionTemplatesSettingsSchema,
  notifications: NotificationsSettingsSchema,
});
export type AllSettings = z.infer<typeof AllSettingsSchema>;

// --- Update input schemas (all fields optional for partial updates) ---

export const UpdateAppearanceSettingsSchema = z.object({
  theme: ThemeSchema.optional(),
  fontSize: z.number().int().min(10).max(24).optional(),
  compactMode: z.boolean().optional(),
  zoomLevel: z.number().min(-5).max(5).optional(),
});
export type UpdateAppearanceSettings = z.infer<typeof UpdateAppearanceSettingsSchema>;

export const UpdateAiSettingsSchema = z.object({
  defaultModel: DefaultModelSchema.optional(),
  cliPath: z.string().nullable().optional(),
  cliSetupComplete: z.boolean().optional(),
  autoCompactPercent: z.number().int().min(10).max(95).nullable().optional(),
  operationPreInjection: z.boolean().optional(),
});
export type UpdateAiSettings = z.infer<typeof UpdateAiSettingsSchema>;

export const UpdateAdvancedSettingsSchema = z.object({
  developerMode: z.boolean().nullable().optional(),
  focusMonitorEnabled: z.boolean().optional(),
  focusMonitorIntervalMs: z.number().int().min(500).max(60000).optional(),
});
export type UpdateAdvancedSettings = z.infer<typeof UpdateAdvancedSettingsSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Tasks
// ─────────────────────────────────────────────────────────────────────────────

export const TaskStatusSchema = z.enum(['backlog', 'todo', 'in_progress', 'done', 'canceled']);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskPrioritySchema = z.enum(['none', 'urgent', 'high', 'medium', 'low']);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const TaskAssigneeTypeSchema = z.enum(['self', 'workstream']);
export type TaskAssigneeType = z.infer<typeof TaskAssigneeTypeSchema>;

export const TaskRecordSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  identifier: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  assigneeType: TaskAssigneeTypeSchema.nullable(),
  assigneeWorkstreamId: z.string().nullable(),
  dueDate: z.string().nullable(),
  parentId: z.string().nullable(),
  links: z.array(z.string()),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type TaskRecord = z.infer<typeof TaskRecordSchema>;

export const CreateTaskInputSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1).max(500),
  description: z.string().nullable().optional(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  assigneeType: TaskAssigneeTypeSchema.nullable().optional(),
  assigneeWorkstreamId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  labelIds: z.array(z.string()).optional(),
  links: z.array(z.string()).optional(),
});
export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;

export const UpdateTaskInputSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().nullable().optional(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  assigneeType: TaskAssigneeTypeSchema.nullable().optional(),
  assigneeWorkstreamId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  labelIds: z.array(z.string()).optional(),
  links: z.array(z.string()).optional(),
});
export type UpdateTaskInput = z.infer<typeof UpdateTaskInputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Task Labels
// ─────────────────────────────────────────────────────────────────────────────

export const TaskLabelRecordSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  color: z.string(),
  createdAt: z.number(),
});
export type TaskLabelRecord = z.infer<typeof TaskLabelRecordSchema>;

export const CreateTaskLabelInputSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).max(100),
  color: HexColorSchema,
});
export type CreateTaskLabelInput = z.infer<typeof CreateTaskLabelInputSchema>;

export const UpdateTaskLabelInputSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: HexColorSchema.optional(),
});
export type UpdateTaskLabelInput = z.infer<typeof UpdateTaskLabelInputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Inbox Items
// ─────────────────────────────────────────────────────────────────────────────

/** A single action button on an inbox item. */
export const InboxActionSchema = z.object({
  /** Registered action handler ID. */
  id: z.string(),
  /** Human-readable button label. */
  label: z.string(),
  /** Optional JSON payload passed to the handler. */
  payload: z.unknown().optional(),
});
export type InboxAction = z.infer<typeof InboxActionSchema>;

export const InboxItemRecordSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  source: z.string().nullable(),
  actions: z.array(InboxActionSchema),
  entityUri: z.string().nullable(),
  ctaLabel: z.string().nullable(),
  read: z.boolean(),
  archived: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type InboxItemRecord = z.infer<typeof InboxItemRecordSchema>;

export const CreateInboxItemInputSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  actions: z.array(InboxActionSchema).optional(),
  entityUri: z.string().nullable().optional(),
  ctaLabel: z.string().nullable().optional(),
});
export type CreateInboxItemInput = z.infer<typeof CreateInboxItemInputSchema>;
