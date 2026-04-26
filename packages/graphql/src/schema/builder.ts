/**
 * Pothos SchemaBuilder — The single shared builder instance.
 *
 * All domain modules import this builder to define their types,
 * queries, and mutations. The generic parameters establish:
 * - Context: what resolvers receive (database access, user info)
 * - Objects: maps GraphQL type names to their backing model types
 * - Scalars: custom scalar types (DateTime, JSON)
 *
 * @module graphql/schema/builder
 */

import SchemaBuilder from '@pothos/core';
import type {
  AppDb,
  ProjectRecord,
  ProjectDirectoryRecord,
  WorkstreamRecord,
  WorkstreamGroupRecord,
  GroupLinkedEntityRecord,
  GroupDirectoryRecord,
  RoutineRecord,
  RoutineRunRecord,
  RegistryRecord,
  BranchSelectionRecord,
  DirectoryWithBranchInfo,
  AllSettings,
  AppearanceSettings,
  AiSettings,
  AdvancedSettings,
  PermissionsSettings,
  PermissionRuleConfig,
  PermissionPolicyRecord,
  PermissionTemplate,
  PermissionTemplatesSettings,
  NotificationsSettings,
  WorkstreamTagRecord,
  TaskRecord,
  TaskLabelRecord,
  InboxItemRecord,
  InboxAction,
} from '@vienna/app-db';
import type { TagDefinition, TagFileStore, EntityToolStore } from '@vienna/app-db';
import type {
  EntityRegistry,
  IntegrationRegistry,
  EntityContext,
  BaseEntity,
  EntityTypeSummary,
  EventSummary,
} from '@tryvienna/sdk';

// ─────────────────────────────────────────────────────────────────────────────
// Service interfaces — injected by the desktop app, defined here as
// interfaces to avoid package dependency cycles.
// ─────────────────────────────────────────────────────────────────────────────

/** Mirrors ImageAttachmentMeta from @vienna/agent-core (duplicated to avoid dependency cycle) */
interface ImageAttachmentMeta {
  name: string;
  mimeType: string;
  size: number;
  previewUrl: string;
}

/** Workstream agent operations (satisfied by WorkstreamManager) */
export interface WorkstreamActions {
  sendMessage(
    workstreamId: string,
    text: string,
    options?: {
      contentBlocks?: Array<{ type: string; source?: { type: string; media_type: string; data: string } }>;
      imageAttachments?: ImageAttachmentMeta[];
    },
  ): Promise<void>;
  stopAgent(workstreamId: string): Promise<void>;
  restartAgent(workstreamId: string): Promise<string>;
  respondPermission(workstreamId: string, requestId: string, response: unknown): void;
  interrupt(workstreamId: string): void;
  clearConversation(workstreamId: string): Promise<void>;
  compactConversation(workstreamId: string, instructions?: string): Promise<boolean>;
  isAgentRunning(workstreamId: string): boolean;
  setInFocus(workstreamId: string | null): void;
  getFocusedWorkstreamId(): string | null;
  replayHistory(workstreamId: string): { hasMore: boolean; oldestEventId: number | null };
  replayHistoryBefore(workstreamId: string, beforeEventId: number, limit: number): { hasMore: boolean; oldestEventId: number | null };
  switchModel(workstreamId: string, model: string): Promise<void>;
  linkEntity(workstreamId: string, entityUri: string, entityType: string, entityTitle?: string): void;
  unlinkEntity(workstreamId: string, entityUri: string): void;
  /** Notify a running agent that an entity was linked (without persisting to workstream_linked_entities). Used for group-level inheritance. */
  notifyEntityLinked(workstreamId: string, entityUri: string, entityType: string, entityTitle?: string): void;
  /** Notify a running agent that an entity was unlinked (without persisting). Used for group-level inheritance. */
  notifyEntityUnlinked(workstreamId: string, entityUri: string): void;
  rewindConversation(workstreamId: string, targetEventId: number, role?: string): Promise<void>;
  revokePermissionRule(workstreamId: string, toolName: string, scope: string): void;
  reloadPermissionsForScope(scopeType: string, scopeId: string): void;
  forkWorkstream(input: {
    sourceWorkstreamId: string;
    messageId?: string;
    providerUuid?: string;
    title?: string;
    createWorktrees?: boolean;
  }): Promise<{
    workstream: { id: string; title: string; status: string; model: string | null };
    worktrees?: Array<{ directoryPath: string; branch: string; worktreePath?: string; error?: string }>;
  }>;
  /**
   * Get user-sent message texts for a workstream, newest first.
   * Used to populate the chat input's up-arrow message history.
   *
   * @param workstreamId - The workstream to fetch messages for
   * @param limit - Maximum number of messages to return
   * @param beforeEventId - Cursor for pagination: only return messages before this event ID
   * @returns Items (newest first) and whether older messages exist
   */
  getUserMessageHistory(
    workstreamId: string,
    limit: number,
    beforeEventId?: number,
  ): { items: Array<{ eventId: number; messageId: string | null; text: string; timestamp: number }>; hasMore: boolean };
}

/** Routine execution operations (satisfied by RoutineExecutor) */
export interface RoutineActions {
  execute(routineId: string, triggeredBy: 'schedule' | 'manual' | 'retry'): Promise<void>;
}

/** Tag pipeline execution operations (satisfied by TagPipelineExecutor) */
export interface TagActions {
  executePipeline(workstreamId: string, tagNames: string[], appliedBy: string, projectId: string): Promise<string>;
  onTagCompleted(workstreamId: string, tagName: string): Promise<void>;
  onTagFailed(workstreamId: string, tagName: string): Promise<void>;
}

/** LSP status provider (satisfied by LspManager) */
export interface LspStatusProvider {
  getStatus(): Array<{ projectRoot: string; state: string; openDocuments: number }>;
}

/** Registry operations (satisfied by RegistryManager) */
export interface RegistryActions {
  add(input: { name: string; url: string; priority?: number }): Promise<RegistryRecord>;
  remove(id: string): boolean;
  list(): RegistryRecord[];
  listEnabled(): RegistryRecord[];
  update(id: string, input: { enabled?: boolean; priority?: number }): RegistryRecord | null;
  sync(): Promise<{ synced: number }>;
  getQuickActions(): Promise<Array<{ id: string; label: string; icon: string; description: string; author: { name: string }; tags: string[]; options: Array<{ id: string; label: string; prompt: string }>; registry?: string }>>;
  getQuickActionDefaults(): Promise<string[]>;
  getVerificationActions(): Promise<Array<{ id: string; type: 'builtin' | 'prompt'; label: string; builtinId?: string; prompt?: string }>>;
  getVerificationActionDefaults(): Promise<Array<{ id: string; type: 'builtin' | 'prompt'; label: string; builtinId?: string; prompt?: string }>>;
  getSkills(): Promise<Array<RegistrySkillShape>>;
  getSkillDefaults(): Promise<string[]>;
  getPlugins(): Promise<Array<RegistryPluginShape>>;
  getPluginDefaults(): Promise<string[]>;
  dispose(): void;
}

/** Shape for a skill available in a registry */
export interface RegistrySkillShape {
  id: string;
  name: string;
  description: string;
  version?: string;
  source: 'inline' | 'github' | 'local';
  repo?: string;
  icon?: string;
  category?: string;
  tags: string[];
  author?: { name: string };
  registry?: string;
}

/** Shape for an installed skill record */
export interface InstalledSkillShape {
  id: string;
  name: string;
  description: string;
  version: string | null;
  registryVersion: string | null;
  source: 'inline' | 'github' | 'local';
  sourceRef: string | null;
  registry: string | null;
  path: string;
  icon: string | null;
  category: string | null;
  tags: string[];
  author: string | null;
  enabled: boolean;
  pinned: boolean;
  installDate: string;
  lastUsed: string | null;
  useCount: number;
}

/** Skill update information */
export interface SkillUpdateShape {
  id: string;
  installedVersion: string | null;
  registryVersion: string | null;
}

/** Shape for a plugin available in a registry */
export interface RegistryPluginShape {
  id: string;
  name: string;
  description: string;
  version?: string;
  source: 'inline' | 'github';
  repo?: string;
  icon?: string;
  category?: string;
  tags: string[];
  author?: { name: string };
  registry?: string;
  canvases?: {
    'nav-sidebar': boolean;
    drawer: boolean;
    'menu-bar': boolean;
    feed: boolean;
    'workstream-widget': boolean;
  };
}

/** Shape for an installed plugin record */
export interface InstalledPluginShape {
  id: string;
  name: string;
  description: string;
  version: string | null;
  registryVersion: string | null;
  source: 'inline' | 'github';
  sourceRef: string | null;
  registry: string | null;
  path: string;
  icon: string | null;
  category: string | null;
  tags: string[];
  author: string | null;
  enabled: boolean;
  installDate: string;
}

/** Plugin update information */
export interface PluginUpdateShape {
  id: string;
  installedVersion: string | null;
  registryVersion: string | null;
}

/** Skill operations (satisfied by SkillManager) */
export interface SkillActions {
  list(): InstalledSkillShape[];
  listEnabled(): InstalledSkillShape[];
  getById(id: string): InstalledSkillShape | null;
  install(registrySkill: RegistrySkillShape, destination?: string): Promise<InstalledSkillShape>;
  uninstall(skillId: string): Promise<boolean>;
  update(skillId: string): Promise<InstalledSkillShape>;
  activate(skillId: string): Promise<string>;
  checkUpdates(): Promise<SkillUpdateShape[]>;
  toggleEnabled(id: string, enabled: boolean): InstalledSkillShape | null;
  togglePinned(id: string, pinned: boolean): InstalledSkillShape | null;
  syncLocalSkills(dirs: { global: string; projectDirs: string[] }): Promise<void>;
}

/** Plugin operations (satisfied by PluginInstaller) */
export interface PluginActions {
  list(): InstalledPluginShape[];
  listEnabled(): InstalledPluginShape[];
  getById(id: string): InstalledPluginShape | null;
  install(registryPlugin: RegistryPluginShape): Promise<InstalledPluginShape>;
  uninstall(pluginId: string): Promise<boolean>;
  update(pluginId: string): Promise<InstalledPluginShape>;
  checkUpdates(): Promise<PluginUpdateShape[]>;
  toggleEnabled(id: string, enabled: boolean): Promise<InstalledPluginShape | null>;
}

/** Event registry operations (satisfied by PluginSystem.getEventSummaries) */
export interface EventActions {
  getEventSummaries(): EventSummary[];
}

/** Inbox action execution (satisfied by InboxActionRegistry) */
export interface InboxActions {
  executeAction(actionId: string, payload: unknown): Promise<void>;
  hasAction(actionId: string): boolean;
}

/** Git operations for branch selection side-effects (satisfied by @vienna/git-utils) */
export interface GitOps {
  isGitRepo(path: string): boolean;
  getCurrentBranch(path: string): string | null;
  getDefaultBranch(path: string): string;
  listBranches(path: string): Promise<Array<{ name: string; isCurrent: boolean; isRemote: boolean; hasWorktree: boolean; worktreePath: string | null }>>;
  createWorktree(repoPath: string, branch: string, targetPath: string): Promise<void>;
  removeWorktree(repoPath: string, targetPath: string, force?: boolean): Promise<void>;
  generateWorktreePath(repoPath: string, branch: string): string;
  isWorktree(path: string): boolean;
  // Diff & status operations
  getStatusFiles(path: string): Promise<Array<{ path: string; status: string; oldPath: string | null; staged: boolean }>>;
  getDiffStatSummary(path: string, base: string): Promise<{ additions: number; deletions: number; files: Array<{ path: string; status: string; oldPath: string | null; staged: boolean }> }>;
  getWorkingTreeDiffStat(path: string): Promise<{ additions: number; deletions: number; files: Array<{ path: string; status: string; oldPath: string | null; staged: boolean }> }>;
  getCommitLog(path: string, base: string): Promise<Array<{ hash: string; shortHash: string; message: string; author: string; date: number }>>;
  getDiffForCommit(path: string, commitHash: string): Promise<string>;
  getDiffAgainstBase(path: string, base: string): Promise<string>;
  getWorkingTreeDiff(path: string): Promise<string>;
  getFileDiff(path: string, filePath: string, base?: string): Promise<string>;
  getFileAtRef(repoPath: string, filePath: string, ref?: string): Promise<string>;
}

/** Backing record for the Command GraphQL type. */
export interface CommandDefinitionRecord {
  id: string;
  category: string;
  title: string;
  description?: string;
  keywords?: string[];
  disabled?: boolean;
  disabledReason?: string;
  hasFlow?: boolean;
  body?: string;
}

/** Command result action returned after execution. */
export interface CommandResultActionRecord {
  type: string;
  path?: string;
  message?: string;
  variant?: string;
  text?: string;
}

/** Command palette operations (satisfied by CommandRegistry) */
export interface CommandActions {
  getCatalog(categoryFilter?: string): CommandDefinitionRecord[];
  execute(commandId: string, args?: Record<string, unknown>): Promise<{
    success: boolean;
    error?: string;
    action?: CommandResultActionRecord;
  }>;
  /** Re-scan .claude/commands directories for Claude custom commands. */
  rescanClaudeCommands(projectDirs: string[]): Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context — passed to every resolver
// ─────────────────────────────────────────────────────────────────────────────

export interface GraphQLContext {
  /** App-level database repositories */
  db: AppDb;
  /** Authenticated user ID (null if unauthenticated) */
  userId: string | null;
  /** Entity registry for generic entity operations (optional — injected when available) */
  entityRegistry?: EntityRegistry;
  /** Integration registry for integration method calls (optional — injected when available) */
  integrationRegistry?: IntegrationRegistry;
  /** Workstream agent operations (optional — injected when WorkstreamManager is available) */
  workstream?: WorkstreamActions;
  /** Routine execution (optional — injected when RoutineExecutor is available) */
  routine?: RoutineActions;
  /** Registry operations (optional — injected when RegistryManager is available) */
  registry?: RegistryActions;
  /** Git operations (optional — injected when git-utils is available) */
  gitOps?: GitOps;
  /** LSP server status (optional — injected when LspManager is available) */
  lspStatus?: LspStatusProvider;
  /** Command palette operations (optional — injected when CommandRegistry is available) */
  command?: CommandActions;
  /** Skill operations (optional — injected when SkillManager is available) */
  skills?: SkillActions;
  /** Plugin operations (optional — injected when PluginInstaller is available) */
  plugins?: PluginActions;
  /** Event registry operations (optional — injected when PluginSystem is available) */
  events?: EventActions;
  /** Tag pipeline operations (optional — injected when TagPipelineExecutor is available) */
  tag?: TagActions;
  /** Tag file store for JSON-based tag definitions (optional — injected when available) */
  tagFileStore?: TagFileStore;
  /** Entity tool store for dev debugging (optional — injected when available) */
  entityToolStore?: EntityToolStore;
  /**
   * Factory that creates a real EntityContext (with live integration clients)
   * for a given entity type. Used by entity resolvers to replace the static
   * mock context so that plugin entities (e.g. github_pr) can access Octokit.
   */
  entityContextFactory?: (entityType: string) => EntityContext;
  /** Get an integration's authenticated client by integration ID. */
  getIntegrationClient?: (integrationId: string) => Promise<unknown>;
  /** Content profile operations (optional — injected when ContentProfileManager is available) */
  contentProfiles?: ContentProfileActions;
  /** Inbox action operations (optional — injected when InboxActionRegistry is available) */
  inbox?: InboxActions;
  /**
   * Plugin ID of the caller, if the request originated from a plugin.
   * Set automatically by the SDK — not user-controllable.
   * Used to auto-populate `source` on inbox items.
   */
  callerPluginId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Content profile action interface
// ─────────────────────────────────────────────────────────────────────────────

export interface ContentProfileShape {
  name: string;
  directory: string;
  isDefault: boolean;
  isActive: boolean;
  isFork: boolean;
  metadata: ProfileMetadataShape | null;
}

export interface ProfileMetadataShape {
  displayName?: string;
  description?: string;
  author?: { name: string; url?: string };
  icon?: string;
  tags: string[];
  sourceUrl?: string;
}

export interface ContentProfileActions {
  list(): ContentProfileShape[];
  getActive(): ContentProfileShape;
  create(name: string): Promise<ContentProfileShape>;
  fork(gitUrl: string, name?: string): Promise<ContentProfileShape>;
  switchTo(name: string): Promise<void>;
  delete(name: string): Promise<boolean>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Builder
// ─────────────────────────────────────────────────────────────────────────────

export const builder = new SchemaBuilder<{
  Context: GraphQLContext;
  Objects: {
    Project: ProjectRecord;
    ProjectDirectory: ProjectDirectoryRecord;
    Workstream: WorkstreamRecord;
    WorkstreamGroup: WorkstreamGroupRecord;
    GroupLinkedEntity: GroupLinkedEntityRecord;
    GroupDirectory: GroupDirectoryRecord;
    Routine: RoutineRecord;
    RoutineRun: RoutineRunRecord;
    Registry: RegistryRecord;
    Entity: BaseEntity;
    EntityTypeInfo: EntityTypeSummary;
    BranchSelection: BranchSelectionRecord;
    DirectoryWithBranchInfo: DirectoryWithBranchInfo;
    Settings: AllSettings;
    AppearanceSettings: AppearanceSettings;
    AiSettings: AiSettings;
    AdvancedSettings: AdvancedSettings;
    PermissionsSettings: PermissionsSettings;
    PermissionRuleConfig: PermissionRuleConfig;
    PermissionPolicy: PermissionPolicyRecord;
    PermissionTemplate: PermissionTemplate;
    PermissionTemplatesSettings: PermissionTemplatesSettings;
    NotificationsSettings: NotificationsSettings;
    Command: CommandDefinitionRecord;
    CommandResultAction: CommandResultActionRecord;
    InstalledSkill: InstalledSkillShape;
    RegistrySkill: RegistrySkillShape;
    SkillUpdate: SkillUpdateShape;
    InstalledPlugin: InstalledPluginShape;
    RegistryPlugin: RegistryPluginShape;
    PluginUpdate: PluginUpdateShape;
    Tag: TagDefinition;
    WorkstreamTag: WorkstreamTagRecord;
    Task: TaskRecord;
    TaskLabel: TaskLabelRecord;
    InboxAction: InboxAction;
    InboxItem: InboxItemRecord;
    RegisteredEvent: EventSummary;
  };
  Scalars: {
    DateTime: { Input: string; Output: string | number | Date };
    JSON: { Input: unknown; Output: unknown };
  };
}>({});
