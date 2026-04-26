/**
 * @vienna/app-db — SQLite persistence layer for app-level data.
 *
 * @module app-db
 */

import type { Database } from 'better-sqlite3';
import { ProjectRepository } from './projects';
import { WorkstreamRepository } from './workstreams';
import { WorkstreamGroupRepository } from './workstream-groups';
import { ProjectDirectoryRepository } from './project-directories';
import { WorkstreamDirectoryRepository } from './workstream-directories';
import { WorkstreamLinkedEntityRepository } from './workstream-linked-entities';
import { GroupLinkedEntityRepository } from './group-linked-entities';
import { WorkstreamReferenceRepository } from './workstream-references';
import { GroupDirectoryRepository } from './group-directories';
import { GroupBranchSelectionRepository } from './group-branch-selections';
import { BranchSelectionRepository } from './branch-selections';
import { RoutineRepository } from './routines';
import { RegistryRepository } from './registries';
import { SettingsRepository } from './settings';
import { PermissionPolicyRepository } from './permission-policies';
import { InstalledSkillRepository } from './installed-skills';
import { InstalledPluginRepository } from './installed-plugins';
import { TagRepository } from './tags';
import { TaskRepository } from './tasks';
import { TaskLabelRepository } from './task-labels';
import { InboxItemRepository } from './inbox-items';

export { openAppDatabase, closeAppDatabase } from './database';
export type { AppDatabaseOptions } from './database';

export { ProjectRepository } from './projects';
export { WorkstreamRepository } from './workstreams';
export { WorkstreamGroupRepository } from './workstream-groups';
export { ProjectDirectoryRepository } from './project-directories';
export { WorkstreamDirectoryRepository } from './workstream-directories';
export { WorkstreamLinkedEntityRepository } from './workstream-linked-entities';
export { GroupLinkedEntityRepository } from './group-linked-entities';
export { WorkstreamReferenceRepository } from './workstream-references';
export { GroupDirectoryRepository } from './group-directories';
export { GroupBranchSelectionRepository } from './group-branch-selections';
export { BranchSelectionRepository } from './branch-selections';
export type { SetBranchSelectionInput } from './branch-selections';
export { RoutineRepository } from './routines';
export type { ScheduleChangeCallback } from './routines';
export { RegistryRepository } from './registries';
export { SettingsRepository } from './settings';
export { PermissionPolicyRepository } from './permission-policies';
export { InstalledSkillRepository } from './installed-skills';
export { InstalledPluginRepository } from './installed-plugins';
export { TagRepository } from './tags';
export { TaskRepository } from './tasks';
export { TaskLabelRepository } from './task-labels';
export { InboxItemRepository } from './inbox-items';
export type { InboxListOptions } from './inbox-items';
export { TagFileStore } from './tag-store';
export type { TagDefinition, TagsFile } from './tag-store';
export { TagDefinitionSchema, TagsFileSchema } from './tag-store';
export { EntityToolStore } from './entity-tool-store';
export type { EntityToolEntry, EntityToolFile } from './entity-tool-store';
export { EntityToolEntrySchema, EntityToolFileSchema } from './entity-tool-store';

// Project config schemas
// Config resolver
export { resolveConfig } from './config-resolver';
export type {
  GlobalTier,
  UserTier,
  ProjectTier,
  ConfigTier,
  ConfigSource,
  ResolvedValue,
  ContentItemState,
  ConfigConflict,
  MissingRequirement,
  EffectiveConfig,
} from './config-resolver';

export {
  ContentRequirementSchema,
  ContentRefSchema,
  ProjectRegistryRefSchema,
  SettingRecommendationSchema,
  ProfileAuthorSchema,
  ProjectConfigSchema,
} from './project-config';
export type {
  ContentRequirement,
  ContentRef,
  ProjectRegistryRef,
  SettingRecommendation,
  ProfileAuthor,
  ProjectConfig,
} from './project-config';
export { wouldCreateCycle, topologicalSort, expandTransitiveDependencies, connectedComponent } from './dag-utils';

export { normalizeDirPath } from './path-utils';

// Permission constants and resolver
export {
  FILE_READ_TOOLS,
  FILE_WRITE_TOOLS,
  EXECUTION_TOOLS,
  WEB_TOOLS,
  AGENT_TOOLS,
  ENTITY_READ_TOOLS,
  ENTITY_WRITE_TOOLS,
  ALL_STATIC_TOOLS,
  TOOL_GROUPS,
  BUILT_IN_PRESETS,
  getBuiltInPresetRules,
} from './permission-constants';
export type { ToolGroupDef } from './permission-constants';
export { resolvePermissions } from './permission-resolver';

// Re-export all schemas and types
export {
  ProjectRecordSchema,
  ProjectDirectoryRecordSchema,
  CreateProjectInputSchema,
  UpdateProjectInputSchema,
  // Workstream Group schemas
  WorkstreamGroupRecordSchema,
  CreateWorkstreamGroupInputSchema,
  UpdateWorkstreamGroupInputSchema,
  GroupLinkedEntityRecordSchema,
  GroupDirectoryRecordSchema,
  GroupBranchSelectionRecordSchema,
  // Workstream schemas
  WorkstreamStatusSchema,
  WorkstreamRecordSchema,
  CreateWorkstreamInputSchema,
  UpdateWorkstreamInputSchema,
  WorkstreamDirectoryRecordSchema,
  BranchSelectionRecordSchema,
  DirectoryWithBranchInfoSchema,
  WorkstreamLinkedEntityRecordSchema,
  WorkstreamReferenceRecordSchema,
  RoutineStatusSchema,
  RoutineScheduleSchema,
  RoutineRecordSchema,
  CreateRoutineInputSchema,
  UpdateRoutineInputSchema,
  RoutineRunStatusSchema,
  RoutineRunRecordSchema,
  // Registry schemas
  RegistrySourceSchema,
  RegistryRecordSchema,
  CreateRegistryInputSchema,
  UpdateRegistryInputSchema,
  // Installed Skill schemas
  InstalledSkillSourceSchema,
  InstalledSkillRecordSchema,
  CreateInstalledSkillInputSchema,
  // Installed Plugin schemas
  InstalledPluginSourceSchema,
  InstalledPluginRecordSchema,
  CreateInstalledPluginInputSchema,
  // Shared validators
  HexColorSchema,
  // Task schemas
  TaskStatusSchema,
  TaskPrioritySchema,
  TaskAssigneeTypeSchema,
  TaskRecordSchema,
  CreateTaskInputSchema,
  UpdateTaskInputSchema,
  TaskLabelRecordSchema,
  CreateTaskLabelInputSchema,
  UpdateTaskLabelInputSchema,
  // Inbox schemas
  InboxActionSchema,
  InboxItemRecordSchema,
  CreateInboxItemInputSchema,
  // Tag schemas
  WorktreeModeSchema,
  WorkstreamTagStatusSchema,
  WorkstreamTagAppliedBySchema,
  WorkstreamTagRecordSchema,
  // Settings schemas
  ThemeSchema,
  DefaultModelSchema,
  AppearanceSettingsSchema,
  AiSettingsSchema,
  AdvancedSettingsSchema,
  SettingsCategorySchema,
  AllSettingsSchema,
  UpdateAppearanceSettingsSchema,
  UpdateAiSettingsSchema,
  UpdateAdvancedSettingsSchema,
  // Permission schemas
  PermissionBehaviorSettingSchema,
  PermissionPresetSchema,
  PermissionRuleConfigSchema,
  PermissionsSettingsSchema,
  UpdatePermissionsSettingsSchema,
  PermissionScopeTypeSchema,
  PermissionPolicyRecordSchema,
  // Permission template schemas
  PermissionTemplateSchema,
  PermissionTemplatesSettingsSchema,
  UpdatePermissionTemplatesSettingsSchema,
  // Notification settings schemas
  NotificationsSettingsSchema,
  UpdateNotificationsSettingsSchema,
} from './schemas';
export { isNotificationMuted } from './schemas';
export { BUILTIN_NOTIFICATION_TYPES, listNotificationSources } from './notification-types';
export type { NotificationType } from './notification-types';
export type {
  ProjectRecord,
  ProjectDirectoryRecord,
  CreateProjectInput,
  UpdateProjectInput,
  // Workstream Group types
  WorkstreamGroupRecord,
  CreateWorkstreamGroupInput,
  UpdateWorkstreamGroupInput,
  GroupLinkedEntityRecord,
  GroupDirectoryRecord,
  GroupBranchSelectionRecord,
  // Workstream types
  WorkstreamStatus,
  WorkstreamRecord,
  CreateWorkstreamInput,
  UpdateWorkstreamInput,
  WorkstreamDirectoryRecord,
  BranchSelectionRecord,
  DirectoryWithBranchInfo,
  WorkstreamLinkedEntityRecord,
  WorkstreamReferenceRecord,
  RoutineStatus,
  RoutineSchedule,
  RoutineRecord,
  CreateRoutineInput,
  UpdateRoutineInput,
  RoutineRunStatus,
  RoutineRunRecord,
  // Registry types
  RegistrySource,
  RegistryRecord,
  CreateRegistryInput,
  UpdateRegistryInput,
  // Installed Skill types
  InstalledSkillSource,
  InstalledSkillRecord,
  CreateInstalledSkillInput,
  // Installed Plugin types
  InstalledPluginSource,
  InstalledPluginRecord,
  CreateInstalledPluginInput,
  // Task types
  TaskStatus,
  TaskPriority,
  TaskAssigneeType,
  TaskRecord,
  CreateTaskInput,
  UpdateTaskInput,
  TaskLabelRecord,
  CreateTaskLabelInput,
  UpdateTaskLabelInput,
  // Inbox types
  InboxAction,
  InboxItemRecord,
  CreateInboxItemInput,
  // Tag types
  WorktreeMode,
  WorkstreamTagStatus,
  WorkstreamTagAppliedBy,
  WorkstreamTagRecord,
  // Settings types
  Theme,
  DefaultModel,
  AppearanceSettings,
  AiSettings,
  AdvancedSettings,
  SettingsCategory,
  AllSettings,
  UpdateAppearanceSettings,
  UpdateAiSettings,
  UpdateAdvancedSettings,
  // Permission types
  PermissionBehaviorSetting,
  PermissionPreset,
  PermissionRuleConfig,
  PermissionsSettings,
  UpdatePermissionsSettings,
  PermissionScopeType,
  PermissionPolicyRecord,
  // Permission template types
  PermissionTemplate,
  PermissionTemplatesSettings,
  UpdatePermissionTemplatesSettings,
  // Notification settings types
  NotificationsSettings,
  UpdateNotificationsSettings,
} from './schemas';

// ─────────────────────────────────────────────────────────────────────────────
// AppDb — Unified access to all repositories
// ─────────────────────────────────────────────────────────────────────────────

export interface AppDb {
  readonly projects: ProjectRepository;
  readonly projectDirectories: ProjectDirectoryRepository;
  readonly workstreams: WorkstreamRepository;
  readonly workstreamGroups: WorkstreamGroupRepository;
  readonly workstreamDirectories: WorkstreamDirectoryRepository;
  readonly workstreamLinkedEntities: WorkstreamLinkedEntityRepository;
  readonly workstreamReferences: WorkstreamReferenceRepository;
  readonly groupLinkedEntities: GroupLinkedEntityRepository;
  readonly groupDirectories: GroupDirectoryRepository;
  readonly groupBranchSelections: GroupBranchSelectionRepository;
  readonly branchSelections: BranchSelectionRepository;
  readonly routines: RoutineRepository;
  readonly registries: RegistryRepository;
  readonly installedSkills: InstalledSkillRepository;
  readonly installedPlugins: InstalledPluginRepository;
  readonly tags: TagRepository;
  readonly tasks: TaskRepository;
  readonly taskLabels: TaskLabelRepository;
  readonly inboxItems: InboxItemRepository;
  readonly settings: SettingsRepository;
  readonly permissionPolicies: PermissionPolicyRepository;
}

/**
 * Create an AppDb instance from a database handle.
 * Each repository creates prepared statements once on construction.
 *
 * @param db         - The SQLite database handle
 * @param settingsPath - Path to the settings.json file (portable, human-editable)
 */
export function createAppDb(db: Database, settingsPath: string): AppDb {
  const projects = new ProjectRepository(db);
  const projectDirectories = new ProjectDirectoryRepository(db);
  const workstreams = new WorkstreamRepository(db);
  const workstreamGroups = new WorkstreamGroupRepository(db);
  const workstreamDirectories = new WorkstreamDirectoryRepository(db);
  const workstreamLinkedEntities = new WorkstreamLinkedEntityRepository(db);
  const workstreamReferences = new WorkstreamReferenceRepository(db);
  const groupLinkedEntities = new GroupLinkedEntityRepository(db);
  const groupDirectories = new GroupDirectoryRepository(db);
  const groupBranchSelections = new GroupBranchSelectionRepository(db);
  const branchSelections = new BranchSelectionRepository(db);
  const routines = new RoutineRepository(db, workstreams);
  const registries = new RegistryRepository(db);
  const installedSkills = new InstalledSkillRepository(db);
  const installedPlugins = new InstalledPluginRepository(db);
  const tags = new TagRepository(db);
  const tasks = new TaskRepository(db);
  const taskLabels = new TaskLabelRepository(db);
  const inboxItems = new InboxItemRepository(db);

  return {
    projects,
    projectDirectories,
    workstreams,
    workstreamGroups,
    workstreamDirectories,
    workstreamLinkedEntities,
    workstreamReferences,
    groupLinkedEntities,
    groupDirectories,
    groupBranchSelections,
    branchSelections,
    routines,
    registries,
    installedSkills,
    installedPlugins,
    tags,
    tasks,
    taskLabels,
    inboxItems,
    settings: new SettingsRepository(settingsPath),
    permissionPolicies: new PermissionPolicyRepository(db),
  };
}
