/* eslint-disable */
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** ISO 8601 date-time string or unix timestamp (ms) */
  DateTime: { input: string | number; output: string | number; }
  /** Arbitrary JSON value */
  JSON: { input: Record<string, unknown>; output: Record<string, unknown>; }
};

export type ActivateSkillPayload = {
  __typename?: 'ActivateSkillPayload';
  body?: Maybe<Scalars['String']['output']>;
};

export type AddEntityToolEntryPayload = {
  __typename?: 'AddEntityToolEntryPayload';
  alreadyExists?: Maybe<Scalars['Boolean']['output']>;
  entry?: Maybe<EntityToolEntry>;
};

export type AddGroupDirectoryPayload = {
  __typename?: 'AddGroupDirectoryPayload';
  group?: Maybe<WorkstreamGroup>;
};

export type AddProjectDirectoryPayload = {
  __typename?: 'AddProjectDirectoryPayload';
  directory?: Maybe<ProjectDirectory>;
  project?: Maybe<Project>;
};

export type AddRegistryInput = {
  name: Scalars['String']['input'];
  priority?: InputMaybe<Scalars['Int']['input']>;
  url: Scalars['String']['input'];
};

export type AddRegistryPayload = {
  __typename?: 'AddRegistryPayload';
  registry?: Maybe<Registry>;
};

export type AddWorkstreamDirectoryPayload = {
  __typename?: 'AddWorkstreamDirectoryPayload';
  workstream?: Maybe<Workstream>;
};

export type AddWorkstreamReferencePayload = {
  __typename?: 'AddWorkstreamReferencePayload';
  workstream?: Maybe<Workstream>;
};

export type AddWorkstreamToGroupPayload = {
  __typename?: 'AddWorkstreamToGroupPayload';
  workstream?: Maybe<Workstream>;
};

/** Advanced/developer settings */
export type AdvancedSettings = {
  __typename?: 'AdvancedSettings';
  developerMode?: Maybe<Scalars['Boolean']['output']>;
  focusMonitorEnabled?: Maybe<Scalars['Boolean']['output']>;
  focusMonitorIntervalMs?: Maybe<Scalars['Int']['output']>;
};

/** AI and model settings */
export type AiSettings = {
  __typename?: 'AiSettings';
  autoCompactPercent?: Maybe<Scalars['Int']['output']>;
  cliPath?: Maybe<Scalars['String']['output']>;
  cliSetupComplete?: Maybe<Scalars['Boolean']['output']>;
  defaultModel?: Maybe<Scalars['String']['output']>;
};

/** UI appearance settings */
export type AppearanceSettings = {
  __typename?: 'AppearanceSettings';
  compactMode?: Maybe<Scalars['Boolean']['output']>;
  fontSize?: Maybe<Scalars['Int']['output']>;
  theme?: Maybe<Theme>;
  zoomLevel?: Maybe<Scalars['Float']['output']>;
};

export type ApplyTagPayload = {
  __typename?: 'ApplyTagPayload';
  pipelineRunId?: Maybe<Scalars['String']['output']>;
  workstreamTag?: Maybe<WorkstreamTag>;
};

export type ArchiveInboxItemPayload = {
  __typename?: 'ArchiveInboxItemPayload';
  inboxItem?: Maybe<InboxItem>;
};

export type ArchiveWorkstreamGroupPayload = {
  __typename?: 'ArchiveWorkstreamGroupPayload';
  group?: Maybe<WorkstreamGroup>;
};

export type ArchiveWorkstreamPayload = {
  __typename?: 'ArchiveWorkstreamPayload';
  workstream?: Maybe<Workstream>;
};

/** A per-directory branch override with optional worktree */
export type BranchSelection = {
  __typename?: 'BranchSelection';
  baseBranch?: Maybe<Scalars['String']['output']>;
  branch?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  directoryPath?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  workstreamId?: Maybe<Scalars['ID']['output']>;
  worktreePath?: Maybe<Scalars['String']['output']>;
};

export type ClearWorkstreamConversationPayload = {
  __typename?: 'ClearWorkstreamConversationPayload';
  workstream?: Maybe<Workstream>;
};

/** A command available in the command palette */
export type Command = {
  __typename?: 'Command';
  body?: Maybe<Scalars['String']['output']>;
  category?: Maybe<CommandCategory>;
  description?: Maybe<Scalars['String']['output']>;
  disabled?: Maybe<Scalars['Boolean']['output']>;
  disabledReason?: Maybe<Scalars['String']['output']>;
  hasFlow?: Maybe<Scalars['Boolean']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  keywords?: Maybe<Array<Scalars['String']['output']>>;
  title?: Maybe<Scalars['String']['output']>;
};

export type CommandCategory =
  | 'claude'
  | 'developer'
  | 'help'
  | 'navigation'
  | 'settings'
  | 'skill'
  | 'workstream';

/** Action to perform in the renderer after command execution */
export type CommandResultAction = {
  __typename?: 'CommandResultAction';
  message?: Maybe<Scalars['String']['output']>;
  path?: Maybe<Scalars['String']['output']>;
  text?: Maybe<Scalars['String']['output']>;
  type?: Maybe<Scalars['String']['output']>;
  variant?: Maybe<Scalars['String']['output']>;
};

export type CompactWorkstreamConversationPayload = {
  __typename?: 'CompactWorkstreamConversationPayload';
  workstream?: Maybe<Workstream>;
};

export type CompleteWorkstreamTagPayload = {
  __typename?: 'CompleteWorkstreamTagPayload';
  alreadyTerminal?: Maybe<Scalars['Boolean']['output']>;
  workstreamTag?: Maybe<WorkstreamTag>;
};

/** A conflict between project configurations */
export type ConfigConflict = {
  __typename?: 'ConfigConflict';
  conflicts?: Maybe<Array<ConflictEntry>>;
  contentId?: Maybe<Scalars['String']['output']>;
  contentType?: Maybe<Scalars['String']['output']>;
};

/** Where a configuration value originated */
export type ConfigSource = {
  __typename?: 'ConfigSource';
  detail?: Maybe<Scalars['String']['output']>;
  tier?: Maybe<ConfigTier>;
};

export type ConfigTier =
  | 'global'
  | 'project'
  | 'user';

/** One side of a configuration conflict between projects */
export type ConflictEntry = {
  __typename?: 'ConflictEntry';
  directory?: Maybe<Scalars['String']['output']>;
  reason?: Maybe<Scalars['String']['output']>;
  requirement?: Maybe<Scalars['String']['output']>;
};

/** State of a content item (plugin/skill/quick action) after tier resolution */
export type ContentItemState = {
  __typename?: 'ContentItemState';
  enabled?: Maybe<Scalars['Boolean']['output']>;
  enabledSource?: Maybe<ConfigSource>;
  id?: Maybe<Scalars['String']['output']>;
  installed?: Maybe<Scalars['Boolean']['output']>;
  projectReason?: Maybe<Scalars['String']['output']>;
  projectRequirement?: Maybe<ContentRequirement>;
  projectSource?: Maybe<Scalars['String']['output']>;
};

/** A content profile — a curated bundle of skills, plugins, quick actions, and settings */
export type ContentProfile = {
  __typename?: 'ContentProfile';
  directory?: Maybe<Scalars['String']['output']>;
  isActive?: Maybe<Scalars['Boolean']['output']>;
  isDefault?: Maybe<Scalars['Boolean']['output']>;
  isFork?: Maybe<Scalars['Boolean']['output']>;
  metadata?: Maybe<ProfileMetadata>;
  name?: Maybe<Scalars['String']['output']>;
};

export type ContentRequirement =
  | 'forbidden'
  | 'recommended'
  | 'required';

export type CreateProjectInput = {
  name: Scalars['String']['input'];
};

export type CreateRoutineInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  preferences?: InputMaybe<Scalars['JSON']['input']>;
  projectId: Scalars['ID']['input'];
  prompt: Scalars['String']['input'];
  schedule: RoutineScheduleInput;
};

export type CreateRoutinePayload = {
  __typename?: 'CreateRoutinePayload';
  routine?: Maybe<Routine>;
};

export type CreateTagInput = {
  color?: InputMaybe<Scalars['String']['input']>;
  dependsOn?: InputMaybe<Array<Scalars['String']['input']>>;
  instructions: Scalars['String']['input'];
  maxDepth?: InputMaybe<Scalars['Int']['input']>;
  name: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
  spawnWorkstream?: InputMaybe<Scalars['Boolean']['input']>;
  worktreeMode?: InputMaybe<WorktreeMode>;
};

export type CreateTagPayload = {
  __typename?: 'CreateTagPayload';
  tag?: Maybe<Tag>;
};

/** Input for creating a new task. Use labelIds (array of label ID strings) to assign labels. */
export type CreateTaskInput = {
  /** self or workstream */
  assigneeType?: InputMaybe<TaskAssigneeType>;
  /** Required when assigneeType is workstream */
  assigneeWorkstreamId?: InputMaybe<Scalars['String']['input']>;
  /** Markdown description */
  description?: InputMaybe<Scalars['String']['input']>;
  /** ISO date string (YYYY-MM-DD) */
  dueDate?: InputMaybe<Scalars['String']['input']>;
  /** Array of TaskLabel IDs to assign. Use taskLabels query to list available labels. */
  labelIds?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Array of entity URIs (e.g. @vienna//github_issue/123) */
  links?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Parent task ID for subtasks */
  parentId?: InputMaybe<Scalars['String']['input']>;
  /** Defaults to none */
  priority?: InputMaybe<TaskPriority>;
  projectId: Scalars['ID']['input'];
  /** Defaults to todo */
  status?: InputMaybe<TaskStatus>;
  title: Scalars['String']['input'];
};

export type CreateWorkstreamGroupInput = {
  emoji?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
};

export type CreateWorkstreamGroupPayload = {
  __typename?: 'CreateWorkstreamGroupPayload';
  group?: Maybe<WorkstreamGroup>;
};

export type CreateWorkstreamInput = {
  /** Base branch for worktrees (e.g. "main"). Uses repo default if omitted */
  baseBranch?: InputMaybe<Scalars['String']['input']>;
  /** Custom branch name for worktrees (auto-generated from title if omitted) */
  branchName?: InputMaybe<Scalars['String']['input']>;
  /** If true, create git worktrees for each inherited directory */
  createWorktrees?: InputMaybe<Scalars['Boolean']['input']>;
  groupId?: InputMaybe<Scalars['ID']['input']>;
  /** Name of the group (alternative to groupId — resolved by case-insensitive match) */
  groupName?: InputMaybe<Scalars['String']['input']>;
  model?: InputMaybe<Scalars['String']['input']>;
  projectId: Scalars['ID']['input'];
  title: Scalars['String']['input'];
};

export type CreateWorkstreamPayload = {
  __typename?: 'CreateWorkstreamPayload';
  workstream?: Maybe<Workstream>;
  /** Results of worktree creation (only present when createWorktrees was true) */
  worktrees?: Maybe<Array<WorktreeResult>>;
};

export type DeleteInboxItemPayload = {
  __typename?: 'DeleteInboxItemPayload';
  success?: Maybe<Scalars['Boolean']['output']>;
};

export type DeleteRoutinePayload = {
  __typename?: 'DeleteRoutinePayload';
  routine?: Maybe<Routine>;
};

export type DeleteTagPayload = {
  __typename?: 'DeleteTagPayload';
  tag?: Maybe<Tag>;
};

export type DeleteTaskPayload = {
  __typename?: 'DeleteTaskPayload';
  success?: Maybe<Scalars['Boolean']['output']>;
};

export type DeleteWorkstreamGroupPayload = {
  __typename?: 'DeleteWorkstreamGroupPayload';
  group?: Maybe<WorkstreamGroup>;
};

export type DeleteWorkstreamPayload = {
  __typename?: 'DeleteWorkstreamPayload';
  workstream?: Maybe<Workstream>;
};

/** A directory with its branch selection and computed effective path */
export type DirectoryWithBranchInfo = {
  __typename?: 'DirectoryWithBranchInfo';
  baseBranch?: Maybe<Scalars['String']['output']>;
  branch?: Maybe<Scalars['String']['output']>;
  effectivePath?: Maybe<Scalars['String']['output']>;
  isInherited?: Maybe<Scalars['Boolean']['output']>;
  label?: Maybe<Scalars['String']['output']>;
  path?: Maybe<Scalars['String']['output']>;
  worktreePath?: Maybe<Scalars['String']['output']>;
};

/** The effective configuration after resolving all tiers */
export type EffectiveConfig = {
  __typename?: 'EffectiveConfig';
  conflicts?: Maybe<Array<ConfigConflict>>;
  missingRequirements?: Maybe<Array<MissingRequirement>>;
  plugins?: Maybe<Array<ContentItemState>>;
  quickActions?: Maybe<Array<ContentItemState>>;
  settings?: Maybe<Array<ResolvedSetting>>;
  skills?: Maybe<Array<ContentItemState>>;
};

/** Generic entity resolved from the entity registry */
export type Entity = {
  __typename?: 'Entity';
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  type?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  uri?: Maybe<Scalars['String']['output']>;
};

/** A group of mutations that operate on a specific entity type */
export type EntityMutationGroup = {
  __typename?: 'EntityMutationGroup';
  entityDisplayName?: Maybe<Scalars['String']['output']>;
  entityType?: Maybe<Scalars['String']['output']>;
  mutations?: Maybe<Array<MutationCatalogEntry>>;
};

/** A saved entity URI for dev debugging */
export type EntityToolEntry = {
  __typename?: 'EntityToolEntry';
  addedAt?: Maybe<Scalars['String']['output']>;
  uri?: Maybe<Scalars['String']['output']>;
};

/** Metadata about a registered entity type */
export type EntityTypeInfo = {
  __typename?: 'EntityTypeInfo';
  display?: Maybe<Scalars['JSON']['output']>;
  displayName?: Maybe<Scalars['String']['output']>;
  icon?: Maybe<Scalars['String']['output']>;
  source?: Maybe<Scalars['String']['output']>;
  type?: Maybe<Scalars['String']['output']>;
  uriExample?: Maybe<Scalars['String']['output']>;
};

/** Result of executing a command */
export type ExecuteCommandPayload = {
  __typename?: 'ExecuteCommandPayload';
  action?: Maybe<CommandResultAction>;
  error?: Maybe<Scalars['String']['output']>;
  success?: Maybe<Scalars['Boolean']['output']>;
};

export type ExecuteInboxActionPayload = {
  __typename?: 'ExecuteInboxActionPayload';
  success?: Maybe<Scalars['Boolean']['output']>;
};

export type ForkWorkstreamInput = {
  /** If true, create new git worktrees for the forked workstream */
  createWorktrees?: InputMaybe<Scalars['Boolean']['input']>;
  /** Vienna message ID at the fork point. If omitted, forks at the latest message. */
  messageId?: InputMaybe<Scalars['ID']['input']>;
  /** JSONL uuid from the Claude Code session file at the fork point. If omitted, copies the entire provider session. */
  providerUuid?: InputMaybe<Scalars['String']['input']>;
  /** ID of the workstream to fork from */
  sourceWorkstreamId: Scalars['ID']['input'];
  /** Title for the forked workstream (defaults to 'Fork of <source title>') */
  title?: InputMaybe<Scalars['String']['input']>;
};

export type ForkWorkstreamPayload = {
  __typename?: 'ForkWorkstreamPayload';
  workstream?: Maybe<Workstream>;
  /** Results of worktree creation (only present when createWorktrees was true) */
  worktrees?: Maybe<Array<WorktreeResult>>;
};

/** A git branch */
export type GitBranch = {
  __typename?: 'GitBranch';
  hasWorktree?: Maybe<Scalars['Boolean']['output']>;
  isCurrent?: Maybe<Scalars['Boolean']['output']>;
  isRemote?: Maybe<Scalars['Boolean']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  worktreePath?: Maybe<Scalars['String']['output']>;
};

/** A git commit */
export type GitCommit = {
  __typename?: 'GitCommit';
  author?: Maybe<Scalars['String']['output']>;
  /** Commit date as epoch milliseconds */
  date?: Maybe<Scalars['Float']['output']>;
  hash?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  shortHash?: Maybe<Scalars['String']['output']>;
};

/** Summary of git diff with line counts and changed files */
export type GitDiffSummary = {
  __typename?: 'GitDiffSummary';
  additions?: Maybe<Scalars['Int']['output']>;
  deletions?: Maybe<Scalars['Int']['output']>;
  files?: Maybe<Array<GitStatusFile>>;
};

/** A file with git status information */
export type GitStatusFile = {
  __typename?: 'GitStatusFile';
  additions?: Maybe<Scalars['Int']['output']>;
  deletions?: Maybe<Scalars['Int']['output']>;
  oldPath?: Maybe<Scalars['String']['output']>;
  path?: Maybe<Scalars['String']['output']>;
  staged?: Maybe<Scalars['Boolean']['output']>;
  status?: Maybe<Scalars['String']['output']>;
};

/** A default branch selection at the group level — inherited by workstreams on creation */
export type GroupBranchSelection = {
  __typename?: 'GroupBranchSelection';
  baseBranch?: Maybe<Scalars['String']['output']>;
  branch?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  directoryPath?: Maybe<Scalars['String']['output']>;
  groupId?: Maybe<Scalars['ID']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** A shared working directory at the group level */
export type GroupDirectory = {
  __typename?: 'GroupDirectory';
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  groupId?: Maybe<Scalars['ID']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  label?: Maybe<Scalars['String']['output']>;
  path?: Maybe<Scalars['String']['output']>;
};

/** An entity linked to a workstream group — inherited by all workstreams in the group */
export type GroupLinkedEntity = {
  __typename?: 'GroupLinkedEntity';
  contextOverride?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  entityTitle?: Maybe<Scalars['String']['output']>;
  entityType?: Maybe<Scalars['String']['output']>;
  entityUri?: Maybe<Scalars['String']['output']>;
  groupId?: Maybe<Scalars['ID']['output']>;
};

/** Metadata for an image attached to a user message */
export type ImageAttachmentInput = {
  mimeType: Scalars['String']['input'];
  name: Scalars['String']['input'];
  previewUrl: Scalars['String']['input'];
  size: Scalars['Int']['input'];
};

/** Base64-encoded image content block for the Claude API */
export type ImageContentBlockInput = {
  data: Scalars['String']['input'];
  mediaType: Scalars['String']['input'];
};

/** A single action button on an inbox item */
export type InboxAction = {
  __typename?: 'InboxAction';
  id?: Maybe<Scalars['String']['output']>;
  label?: Maybe<Scalars['String']['output']>;
  payload?: Maybe<Scalars['JSON']['output']>;
};

/** A single action button to attach to an inbox item. */
export type InboxActionInput = {
  /** Registered action handler ID */
  id: Scalars['String']['input'];
  /** Human-readable button label */
  label: Scalars['String']['input'];
  /** Optional payload passed to the handler */
  payload?: InputMaybe<Scalars['JSON']['input']>;
};

/** A notification or action item in the global inbox */
export type InboxItem = {
  __typename?: 'InboxItem';
  actions?: Maybe<Array<InboxAction>>;
  archived?: Maybe<Scalars['Boolean']['output']>;
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  ctaLabel?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  entityUri?: Maybe<Scalars['String']['output']>;
  icon?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  read?: Maybe<Scalars['Boolean']['output']>;
  source?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type InstallPluginPayload = {
  __typename?: 'InstallPluginPayload';
  plugin?: Maybe<InstalledPlugin>;
};

export type InstallSkillPayload = {
  __typename?: 'InstallSkillPayload';
  skill?: Maybe<InstalledSkill>;
};

/** A plugin installed on disk from a registry or GitHub repo */
export type InstalledPlugin = {
  __typename?: 'InstalledPlugin';
  author?: Maybe<Scalars['String']['output']>;
  category?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  enabled?: Maybe<Scalars['Boolean']['output']>;
  /** Whether a newer version is available in the registry */
  hasUpdate?: Maybe<Scalars['Boolean']['output']>;
  icon?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  installDate?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  path?: Maybe<Scalars['String']['output']>;
  registry?: Maybe<Scalars['String']['output']>;
  registryVersion?: Maybe<Scalars['String']['output']>;
  source?: Maybe<PluginSource>;
  sourceRef?: Maybe<Scalars['String']['output']>;
  tags?: Maybe<Array<Scalars['String']['output']>>;
  version?: Maybe<Scalars['String']['output']>;
};

/** A skill installed on disk from a registry or GitHub repo */
export type InstalledSkill = {
  __typename?: 'InstalledSkill';
  author?: Maybe<Scalars['String']['output']>;
  category?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  enabled?: Maybe<Scalars['Boolean']['output']>;
  /** Whether a newer version is available in the registry */
  hasUpdate?: Maybe<Scalars['Boolean']['output']>;
  icon?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  installDate?: Maybe<Scalars['String']['output']>;
  lastUsed?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  path?: Maybe<Scalars['String']['output']>;
  pinned?: Maybe<Scalars['Boolean']['output']>;
  registry?: Maybe<Scalars['String']['output']>;
  registryVersion?: Maybe<Scalars['String']['output']>;
  source?: Maybe<SkillSource>;
  sourceRef?: Maybe<Scalars['String']['output']>;
  tags?: Maybe<Array<Scalars['String']['output']>>;
  useCount?: Maybe<Scalars['Int']['output']>;
  version?: Maybe<Scalars['String']['output']>;
};

/** Metadata about a registered integration */
export type IntegrationInfo = {
  __typename?: 'IntegrationInfo';
  displayName?: Maybe<Scalars['String']['output']>;
  icon?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
};

export type InterruptWorkstreamAgentPayload = {
  __typename?: 'InterruptWorkstreamAgentPayload';
  workstream?: Maybe<Workstream>;
};

export type LinkGroupEntityPayload = {
  __typename?: 'LinkGroupEntityPayload';
  group?: Maybe<WorkstreamGroup>;
};

export type LinkWorkstreamEntityPayload = {
  __typename?: 'LinkWorkstreamEntityPayload';
  workstream?: Maybe<Workstream>;
};

/** Status of an active LSP server instance */
export type LspServerStatus = {
  __typename?: 'LspServerStatus';
  /** Number of documents currently open in this server */
  openDocuments?: Maybe<Scalars['Int']['output']>;
  /** The project root directory this server manages */
  projectRoot?: Maybe<Scalars['String']['output']>;
  /** Server lifecycle state (stopped, starting, ready, error) */
  state?: Maybe<Scalars['String']['output']>;
};

export type MarkAllInboxItemsReadPayload = {
  __typename?: 'MarkAllInboxItemsReadPayload';
  count?: Maybe<Scalars['Int']['output']>;
};

export type MarkInboxItemReadPayload = {
  __typename?: 'MarkInboxItemReadPayload';
  inboxItem?: Maybe<InboxItem>;
};

/** A required content item that is not installed or enabled */
export type MissingRequirement = {
  __typename?: 'MissingRequirement';
  contentId?: Maybe<Scalars['String']['output']>;
  contentType?: Maybe<Scalars['String']['output']>;
  projectDirectory?: Maybe<Scalars['String']['output']>;
  reason?: Maybe<Scalars['String']['output']>;
  type?: Maybe<MissingRequirementType>;
};

export type MissingRequirementType =
  | 'disabled'
  | 'not_installed';

export type Mutation = {
  __typename?: 'Mutation';
  /** Read a skill's SKILL.md body for one-shot prompt injection */
  activateSkill?: Maybe<ActivateSkillPayload>;
  /** Add an entity URI to the dev entity tool */
  addEntityToolEntry?: Maybe<AddEntityToolEntryPayload>;
  /** Add a shared directory to a workstream group (cascades to member workstreams) */
  addGroupDirectory?: Maybe<AddGroupDirectoryPayload>;
  /** Add a directory to a project. Cascades to all non-archived workstreams. */
  addProjectDirectory?: Maybe<AddProjectDirectoryPayload>;
  addRegistry?: Maybe<AddRegistryPayload>;
  /** Add a working directory to a workstream */
  addWorkstreamDirectory?: Maybe<AddWorkstreamDirectoryPayload>;
  /** Add an entity reference to a workstream (auto-detected or agent-added) */
  addWorkstreamReference?: Maybe<AddWorkstreamReferencePayload>;
  /** Move a workstream into a group */
  addWorkstreamToGroup?: Maybe<AddWorkstreamToGroupPayload>;
  /** Copy a template's rules as a scoped permission policy for a workstream or group */
  applyPermissionTemplate?: Maybe<Scalars['Boolean']['output']>;
  /** Apply a tag to a workstream (snapshots definition, starts pipeline) */
  applyTagToWorkstream?: Maybe<ApplyTagPayload>;
  archiveInboxItem?: Maybe<ArchiveInboxItemPayload>;
  /** Archive a workstream */
  archiveWorkstream?: Maybe<ArchiveWorkstreamPayload>;
  /** Archive a workstream group and all its workstreams */
  archiveWorkstreamGroup?: Maybe<ArchiveWorkstreamGroupPayload>;
  /** Clear conversation history and stop the agent */
  clearWorkstreamConversation?: Maybe<ClearWorkstreamConversationPayload>;
  /** Trigger context compaction for a workstream */
  compactWorkstreamConversation?: Maybe<CompactWorkstreamConversationPayload>;
  /** Update the execution status of a tag on a workstream (completed or failed). Advances the DAG pipeline and propagates status to source workstream for delegated tags. */
  completeWorkstreamTag?: Maybe<CompleteWorkstreamTagPayload>;
  /** Create a new empty content profile */
  createContentProfile?: Maybe<ContentProfile>;
  /** Create a new permission template */
  createPermissionTemplate?: Maybe<PermissionTemplate>;
  /** Create a new project */
  createProject?: Maybe<Project>;
  createRoutine?: Maybe<CreateRoutinePayload>;
  /** Create a new tag in a project (stored in JSON file) */
  createTag?: Maybe<CreateTagPayload>;
  /** Create a new task. Returns the created task with labels resolved. */
  createTask?: Maybe<TaskPayload>;
  /** Create a task label for categorizing tasks. Use the returned label ID with createTask/updateTask labelIds. */
  createTaskLabel?: Maybe<TaskLabelPayload>;
  /** Create a new workstream in a project. Optionally resolve group by name, and create git worktrees for inherited directories. */
  createWorkstream?: Maybe<CreateWorkstreamPayload>;
  /** Create a new workstream group in a project */
  createWorkstreamGroup?: Maybe<CreateWorkstreamGroupPayload>;
  /** Delete a content profile (cannot delete default or active) */
  deleteContentProfile?: Maybe<Scalars['Boolean']['output']>;
  deleteInboxItem?: Maybe<DeleteInboxItemPayload>;
  /** Delete permission overrides for a scope */
  deletePermissionPolicy?: Maybe<Scalars['Boolean']['output']>;
  /** Delete a permission template */
  deletePermissionTemplate?: Maybe<Scalars['Boolean']['output']>;
  /** Delete a project and all its workstreams */
  deleteProject?: Maybe<Scalars['Boolean']['output']>;
  /** Delete a routine and return it for cache eviction */
  deleteRoutine?: Maybe<DeleteRoutinePayload>;
  /** Delete a tag from the project scope (does not affect snapshots) */
  deleteTag?: Maybe<DeleteTagPayload>;
  /** Delete a task and its subtasks. */
  deleteTask?: Maybe<DeleteTaskPayload>;
  /** Delete a task label. Removes it from all tasks. */
  deleteTaskLabel?: Maybe<DeleteTaskPayload>;
  /** Permanently delete a workstream and return it for cache eviction */
  deleteWorkstream?: Maybe<DeleteWorkstreamPayload>;
  /** Delete a workstream group and all its workstreams permanently. */
  deleteWorkstreamGroup?: Maybe<DeleteWorkstreamGroupPayload>;
  /** Execute a command by ID */
  executeCommand?: Maybe<ExecuteCommandPayload>;
  executeInboxAction?: Maybe<ExecuteInboxActionPayload>;
  /** Fork a content profile by cloning a git repository */
  forkContentProfile?: Maybe<ContentProfile>;
  /** Fork a workstream at a specific message, creating a new workstream with conversation context up to that point. If messageId is omitted, forks at the latest message (copies entire conversation). */
  forkWorkstream?: Maybe<ForkWorkstreamPayload>;
  installPlugin?: Maybe<InstallPluginPayload>;
  installSkill?: Maybe<InstallSkillPayload>;
  /** Interrupt the agent current generation */
  interruptWorkstreamAgent?: Maybe<InterruptWorkstreamAgentPayload>;
  /** Link an entity to a workstream group (inherited by all workstreams) */
  linkGroupEntity?: Maybe<LinkGroupEntityPayload>;
  /** Link an entity to a workstream as persistent context */
  linkWorkstreamEntity?: Maybe<LinkWorkstreamEntityPayload>;
  /** Load older event history for a workstream before a cursor (scroll-back pagination) */
  loadMoreWorkstreamHistory?: Maybe<ReplayHistoryPayload>;
  markAllInboxItemsRead?: Maybe<MarkAllInboxItemsReadPayload>;
  markInboxItemRead?: Maybe<MarkInboxItemReadPayload>;
  pauseRoutine?: Maybe<PauseRoutinePayload>;
  /** Pin a workstream to the top of the list */
  pinWorkstream?: Maybe<PinWorkstreamPayload>;
  /** Pin a workstream group to the top of the nav */
  pinWorkstreamGroup?: Maybe<PinWorkstreamGroupPayload>;
  /** Promote a reference to a linked entity (links + removes reference) */
  promoteWorkstreamReference?: Maybe<PromoteWorkstreamReferencePayload>;
  pushInboxItem?: Maybe<PushInboxItemPayload>;
  /** Remove a branch selection for a directory. If removeWorktree is true, the associated worktree will be cleaned up. */
  removeBranchSelection?: Maybe<RemoveBranchSelectionPayload>;
  /** Remove an entity URI from the dev entity tool */
  removeEntityToolEntry?: Maybe<RemoveEntityToolEntryPayload>;
  /** Remove a default branch selection for a group directory */
  removeGroupBranchSelection?: Maybe<RemoveGroupBranchSelectionPayload>;
  /** Remove a shared directory from a workstream group (cascades inherited copies) */
  removeGroupDirectory?: Maybe<RemoveGroupDirectoryPayload>;
  /** Remove a directory from a project. Cascades removal to inherited copies and branch selections in all workstreams. */
  removeProjectDirectory?: Maybe<RemoveProjectDirectoryPayload>;
  removeRegistry?: Maybe<RemoveRegistryPayload>;
  /** Remove a tag from a workstream */
  removeTagFromWorkstream?: Maybe<RemoveTagPayload>;
  /** Remove a working directory from a workstream (also removes its branch selection and optional worktree) */
  removeWorkstreamDirectory?: Maybe<RemoveWorkstreamDirectoryPayload>;
  /** Remove a workstream from its group (ungroup) */
  removeWorkstreamFromGroup?: Maybe<RemoveWorkstreamFromGroupPayload>;
  /** Remove (dismiss) an entity reference from a workstream */
  removeWorkstreamReference?: Maybe<RemoveWorkstreamReferencePayload>;
  /** Replay event history for a workstream (events stream via IPC) */
  replayWorkstreamHistory?: Maybe<ReplayHistoryPayload>;
  /** Re-scan .claude/commands directories for Claude custom commands */
  rescanClaudeCommands?: Maybe<Scalars['Boolean']['output']>;
  /** Clear all notification mutes — every source and type returns to its default-enabled state. */
  resetNotificationMutes?: Maybe<Settings>;
  /** Respond to a tool permission request */
  respondWorkstreamPermission?: Maybe<RespondWorkstreamPermissionPayload>;
  /** Restart the agent for a workstream */
  restartWorkstreamAgent?: Maybe<RestartWorkstreamAgentPayload>;
  resumeRoutine?: Maybe<ResumeRoutinePayload>;
  /** Revoke a permission rule for a workstream agent */
  revokePermissionRule?: Maybe<RevokePermissionRulePayload>;
  /** Rewind a workstream conversation to a specific point, restoring files and forgetting subsequent messages */
  rewindWorkstreamConversation?: Maybe<RewindWorkstreamConversationPayload>;
  /** Trigger immediate execution of a routine */
  runRoutineNow?: Maybe<RunRoutineNowPayload>;
  /** Send a message to a workstream agent (auto-starts if needed) */
  sendWorkstreamMessage?: Maybe<SendWorkstreamMessagePayload>;
  /** Set or update a branch selection for a directory. If createWorktree is true and gitOps is available, a worktree will be created automatically. */
  setBranchSelection?: Maybe<SetBranchSelectionPayload>;
  /** Set or update a default branch selection for a group directory */
  setGroupBranchSelection?: Maybe<SetGroupBranchSelectionPayload>;
  /** Override the auto-generated context for a linked entity */
  setLinkedEntityContextOverride?: Maybe<SetLinkedEntityContextOverridePayload>;
  /** Mute (or unmute) all notifications from a given source label. */
  setNotificationSourceMuted?: Maybe<Settings>;
  /** Mute (or unmute) a single notification type by its stable id. */
  setNotificationTypeMuted?: Maybe<Settings>;
  /** Set permission overrides for a project, group, or workstream scope */
  setPermissionPolicy?: Maybe<PermissionPolicy>;
  /** Set which workstream is visible to the user (null to clear) */
  setWorkstreamInFocus?: Maybe<SetWorkstreamInFocusPayload>;
  /** Stop the agent for a workstream */
  stopWorkstreamAgent?: Maybe<StopWorkstreamAgentPayload>;
  /** Switch to a different content profile */
  switchContentProfile?: Maybe<Scalars['Boolean']['output']>;
  /** Switch the model for a workstream (persists + restarts agent) */
  switchWorkstreamModel?: Maybe<SwitchWorkstreamModelPayload>;
  /** Re-scan .claude directories for local skills */
  syncLocalSkills?: Maybe<Scalars['Boolean']['output']>;
  /** Trigger a sync of all enabled registries */
  syncRegistries?: Maybe<SyncRegistriesPayload>;
  togglePluginEnabled?: Maybe<TogglePluginPayload>;
  toggleSkillEnabled?: Maybe<ToggleSkillPayload>;
  toggleSkillPinned?: Maybe<ToggleSkillPayload>;
  /** Restore an archived workstream */
  unarchiveWorkstream?: Maybe<UnarchiveWorkstreamPayload>;
  uninstallPlugin?: Maybe<UninstallPluginPayload>;
  uninstallSkill?: Maybe<UninstallSkillPayload>;
  /** Remove a linked entity from a workstream group */
  unlinkGroupEntity?: Maybe<UnlinkGroupEntityPayload>;
  /** Remove a linked entity from a workstream */
  unlinkWorkstreamEntity?: Maybe<UnlinkWorkstreamEntityPayload>;
  /** Unpin a workstream */
  unpinWorkstream?: Maybe<UnpinWorkstreamPayload>;
  /** Unpin a workstream group */
  unpinWorkstreamGroup?: Maybe<UnpinWorkstreamGroupPayload>;
  /** Update advanced/developer settings */
  updateAdvancedSettings?: Maybe<Settings>;
  /** Update AI settings (default model, CLI path) */
  updateAiSettings?: Maybe<Settings>;
  /** Update appearance settings (theme, font size, compact mode) */
  updateAppearanceSettings?: Maybe<Settings>;
  /** Update a permission template */
  updatePermissionTemplate?: Maybe<PermissionTemplate>;
  /** Update global permission settings (presets, rules) */
  updatePermissionsSettings?: Maybe<Settings>;
  updatePlugin?: Maybe<UpdatePluginPayload>;
  /** Update a project */
  updateProject?: Maybe<Project>;
  updateRegistry?: Maybe<UpdateRegistryPayload>;
  updateRoutine?: Maybe<UpdateRoutinePayload>;
  /** Replace all settings from a raw JSON string. Validates against Zod schemas. */
  updateSettingsRaw?: Maybe<Settings>;
  updateSkill?: Maybe<UpdateSkillPayload>;
  /** Update a tag by name within a project */
  updateTag?: Maybe<UpdateTagPayload>;
  /** Update a task. Pass only the fields you want to change. Use labelIds (array) to set labels. */
  updateTask?: Maybe<TaskPayload>;
  /** Update a task label name or color. */
  updateTaskLabel?: Maybe<TaskLabelPayload>;
  /** Update a workstream */
  updateWorkstream?: Maybe<UpdateWorkstreamPayload>;
  /** Update a workstream group */
  updateWorkstreamGroup?: Maybe<UpdateWorkstreamGroupPayload>;
};


export type MutationActivateSkillArgs = {
  skillId: Scalars['String']['input'];
};


export type MutationAddEntityToolEntryArgs = {
  uri: Scalars['String']['input'];
};


export type MutationAddGroupDirectoryArgs = {
  groupId: Scalars['ID']['input'];
  label?: InputMaybe<Scalars['String']['input']>;
  path: Scalars['String']['input'];
};


export type MutationAddProjectDirectoryArgs = {
  label?: InputMaybe<Scalars['String']['input']>;
  path: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
};


export type MutationAddRegistryArgs = {
  input: AddRegistryInput;
};


export type MutationAddWorkstreamDirectoryArgs = {
  label?: InputMaybe<Scalars['String']['input']>;
  path: Scalars['String']['input'];
  workstreamId: Scalars['ID']['input'];
};


export type MutationAddWorkstreamReferenceArgs = {
  entityTitle?: InputMaybe<Scalars['String']['input']>;
  entityType: Scalars['String']['input'];
  entityUri: Scalars['String']['input'];
  externalUrl?: InputMaybe<Scalars['String']['input']>;
  workstreamId: Scalars['ID']['input'];
};


export type MutationAddWorkstreamToGroupArgs = {
  groupId: Scalars['ID']['input'];
  workstreamId: Scalars['ID']['input'];
};


export type MutationApplyPermissionTemplateArgs = {
  scopeId: Scalars['String']['input'];
  scopeType: PermissionScopeType;
  templateId: Scalars['ID']['input'];
};


export type MutationApplyTagToWorkstreamArgs = {
  tagName: Scalars['String']['input'];
  workstreamId: Scalars['ID']['input'];
};


export type MutationArchiveInboxItemArgs = {
  id: Scalars['ID']['input'];
};


export type MutationArchiveWorkstreamArgs = {
  id: Scalars['ID']['input'];
};


export type MutationArchiveWorkstreamGroupArgs = {
  id: Scalars['ID']['input'];
};


export type MutationClearWorkstreamConversationArgs = {
  id: Scalars['ID']['input'];
};


export type MutationCompactWorkstreamConversationArgs = {
  id: Scalars['ID']['input'];
  instructions?: InputMaybe<Scalars['String']['input']>;
};


export type MutationCompleteWorkstreamTagArgs = {
  error?: InputMaybe<Scalars['String']['input']>;
  status: WorkstreamTagCompletionStatus;
  tagName: Scalars['String']['input'];
  workstreamId: Scalars['ID']['input'];
};


export type MutationCreateContentProfileArgs = {
  name: Scalars['String']['input'];
};


export type MutationCreatePermissionTemplateArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  rules: Array<PermissionRuleConfigInput>;
};


export type MutationCreateProjectArgs = {
  input: CreateProjectInput;
};


export type MutationCreateRoutineArgs = {
  input: CreateRoutineInput;
};


export type MutationCreateTagArgs = {
  input: CreateTagInput;
};


export type MutationCreateTaskArgs = {
  input: CreateTaskInput;
};


export type MutationCreateTaskLabelArgs = {
  color: Scalars['String']['input'];
  name: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
};


export type MutationCreateWorkstreamArgs = {
  input: CreateWorkstreamInput;
};


export type MutationCreateWorkstreamGroupArgs = {
  input: CreateWorkstreamGroupInput;
};


export type MutationDeleteContentProfileArgs = {
  name: Scalars['String']['input'];
};


export type MutationDeleteInboxItemArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeletePermissionPolicyArgs = {
  scopeId: Scalars['String']['input'];
  scopeType: PermissionScopeType;
};


export type MutationDeletePermissionTemplateArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteProjectArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteRoutineArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteTagArgs = {
  projectId: Scalars['ID']['input'];
  tagName: Scalars['String']['input'];
};


export type MutationDeleteTaskArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteTaskLabelArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteWorkstreamArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteWorkstreamGroupArgs = {
  id: Scalars['ID']['input'];
};


export type MutationExecuteCommandArgs = {
  args?: InputMaybe<Scalars['JSON']['input']>;
  commandId: Scalars['String']['input'];
};


export type MutationExecuteInboxActionArgs = {
  actionId: Scalars['String']['input'];
  payload?: InputMaybe<Scalars['JSON']['input']>;
};


export type MutationForkContentProfileArgs = {
  gitUrl: Scalars['String']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
};


export type MutationForkWorkstreamArgs = {
  input: ForkWorkstreamInput;
};


export type MutationInstallPluginArgs = {
  pluginId: Scalars['String']['input'];
};


export type MutationInstallSkillArgs = {
  destination?: InputMaybe<Scalars['String']['input']>;
  skillId: Scalars['String']['input'];
};


export type MutationInterruptWorkstreamAgentArgs = {
  id: Scalars['ID']['input'];
};


export type MutationLinkGroupEntityArgs = {
  entityTitle?: InputMaybe<Scalars['String']['input']>;
  entityType: Scalars['String']['input'];
  entityUri: Scalars['String']['input'];
  groupId: Scalars['ID']['input'];
};


export type MutationLinkWorkstreamEntityArgs = {
  entityTitle?: InputMaybe<Scalars['String']['input']>;
  entityType: Scalars['String']['input'];
  entityUri: Scalars['String']['input'];
  workstreamId: Scalars['ID']['input'];
};


export type MutationLoadMoreWorkstreamHistoryArgs = {
  beforeEventId: Scalars['Int']['input'];
  id: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationMarkInboxItemReadArgs = {
  id: Scalars['ID']['input'];
};


export type MutationPauseRoutineArgs = {
  id: Scalars['ID']['input'];
};


export type MutationPinWorkstreamArgs = {
  id: Scalars['ID']['input'];
};


export type MutationPinWorkstreamGroupArgs = {
  id: Scalars['ID']['input'];
};


export type MutationPromoteWorkstreamReferenceArgs = {
  entityTitle?: InputMaybe<Scalars['String']['input']>;
  entityType: Scalars['String']['input'];
  entityUri: Scalars['String']['input'];
  workstreamId: Scalars['ID']['input'];
};


export type MutationPushInboxItemArgs = {
  input: PushInboxItemInput;
};


export type MutationRemoveBranchSelectionArgs = {
  directoryPath: Scalars['String']['input'];
  removeWorktree?: InputMaybe<Scalars['Boolean']['input']>;
  workstreamId: Scalars['ID']['input'];
};


export type MutationRemoveEntityToolEntryArgs = {
  uri: Scalars['String']['input'];
};


export type MutationRemoveGroupBranchSelectionArgs = {
  directoryPath: Scalars['String']['input'];
  groupId: Scalars['ID']['input'];
};


export type MutationRemoveGroupDirectoryArgs = {
  groupId: Scalars['ID']['input'];
  path: Scalars['String']['input'];
};


export type MutationRemoveProjectDirectoryArgs = {
  path: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
};


export type MutationRemoveRegistryArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveTagFromWorkstreamArgs = {
  tagName: Scalars['String']['input'];
  workstreamId: Scalars['ID']['input'];
};


export type MutationRemoveWorkstreamDirectoryArgs = {
  path: Scalars['String']['input'];
  removeWorktree?: InputMaybe<Scalars['Boolean']['input']>;
  workstreamId: Scalars['ID']['input'];
};


export type MutationRemoveWorkstreamFromGroupArgs = {
  workstreamId: Scalars['ID']['input'];
};


export type MutationRemoveWorkstreamReferenceArgs = {
  entityUri: Scalars['String']['input'];
  workstreamId: Scalars['ID']['input'];
};


export type MutationReplayWorkstreamHistoryArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRespondWorkstreamPermissionArgs = {
  requestId: Scalars['String']['input'];
  response: PermissionResponseInput;
  workstreamId: Scalars['ID']['input'];
};


export type MutationRestartWorkstreamAgentArgs = {
  id: Scalars['ID']['input'];
};


export type MutationResumeRoutineArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRevokePermissionRuleArgs = {
  scope: PermissionRuleScope;
  toolName: Scalars['String']['input'];
  workstreamId: Scalars['ID']['input'];
};


export type MutationRewindWorkstreamConversationArgs = {
  eventId: Scalars['Int']['input'];
  id: Scalars['ID']['input'];
  role?: InputMaybe<Scalars['String']['input']>;
};


export type MutationRunRoutineNowArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSendWorkstreamMessageArgs = {
  imageAttachments?: InputMaybe<Array<ImageAttachmentInput>>;
  imageContentBlocks?: InputMaybe<Array<ImageContentBlockInput>>;
  text: Scalars['String']['input'];
  workstreamId: Scalars['ID']['input'];
};


export type MutationSetBranchSelectionArgs = {
  baseBranch?: InputMaybe<Scalars['String']['input']>;
  branch: Scalars['String']['input'];
  createWorktree?: InputMaybe<Scalars['Boolean']['input']>;
  directoryPath: Scalars['String']['input'];
  workstreamId: Scalars['ID']['input'];
  worktreePath?: InputMaybe<Scalars['String']['input']>;
};


export type MutationSetGroupBranchSelectionArgs = {
  baseBranch?: InputMaybe<Scalars['String']['input']>;
  branch: Scalars['String']['input'];
  directoryPath: Scalars['String']['input'];
  groupId: Scalars['ID']['input'];
};


export type MutationSetLinkedEntityContextOverrideArgs = {
  contextOverride?: InputMaybe<Scalars['String']['input']>;
  entityUri: Scalars['String']['input'];
  workstreamId: Scalars['ID']['input'];
};


export type MutationSetNotificationSourceMutedArgs = {
  muted: Scalars['Boolean']['input'];
  source: Scalars['String']['input'];
};


export type MutationSetNotificationTypeMutedArgs = {
  muted: Scalars['Boolean']['input'];
  typeId: Scalars['String']['input'];
};


export type MutationSetPermissionPolicyArgs = {
  rules: Array<PermissionRuleConfigInput>;
  scopeId: Scalars['String']['input'];
  scopeType: PermissionScopeType;
};


export type MutationSetWorkstreamInFocusArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationStopWorkstreamAgentArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSwitchContentProfileArgs = {
  name: Scalars['String']['input'];
};


export type MutationSwitchWorkstreamModelArgs = {
  id: Scalars['ID']['input'];
  model: Scalars['String']['input'];
};


export type MutationTogglePluginEnabledArgs = {
  enabled: Scalars['Boolean']['input'];
  pluginId: Scalars['String']['input'];
};


export type MutationToggleSkillEnabledArgs = {
  enabled: Scalars['Boolean']['input'];
  skillId: Scalars['String']['input'];
};


export type MutationToggleSkillPinnedArgs = {
  pinned: Scalars['Boolean']['input'];
  skillId: Scalars['String']['input'];
};


export type MutationUnarchiveWorkstreamArgs = {
  id: Scalars['ID']['input'];
};


export type MutationUninstallPluginArgs = {
  pluginId: Scalars['String']['input'];
};


export type MutationUninstallSkillArgs = {
  skillId: Scalars['String']['input'];
};


export type MutationUnlinkGroupEntityArgs = {
  entityUri: Scalars['String']['input'];
  groupId: Scalars['ID']['input'];
};


export type MutationUnlinkWorkstreamEntityArgs = {
  entityUri: Scalars['String']['input'];
  workstreamId: Scalars['ID']['input'];
};


export type MutationUnpinWorkstreamArgs = {
  id: Scalars['ID']['input'];
};


export type MutationUnpinWorkstreamGroupArgs = {
  id: Scalars['ID']['input'];
};


export type MutationUpdateAdvancedSettingsArgs = {
  input: UpdateAdvancedSettingsInput;
};


export type MutationUpdateAiSettingsArgs = {
  input: UpdateAiSettingsInput;
};


export type MutationUpdateAppearanceSettingsArgs = {
  input: UpdateAppearanceSettingsInput;
};


export type MutationUpdatePermissionTemplateArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  rules?: InputMaybe<Array<PermissionRuleConfigInput>>;
};


export type MutationUpdatePermissionsSettingsArgs = {
  input: UpdatePermissionsSettingsInput;
};


export type MutationUpdatePluginArgs = {
  pluginId: Scalars['String']['input'];
};


export type MutationUpdateProjectArgs = {
  id: Scalars['ID']['input'];
  input: UpdateProjectInput;
};


export type MutationUpdateRegistryArgs = {
  id: Scalars['ID']['input'];
  input: UpdateRegistryInput;
};


export type MutationUpdateRoutineArgs = {
  id: Scalars['ID']['input'];
  input: UpdateRoutineInput;
};


export type MutationUpdateSettingsRawArgs = {
  json: Scalars['String']['input'];
};


export type MutationUpdateSkillArgs = {
  skillId: Scalars['String']['input'];
};


export type MutationUpdateTagArgs = {
  input: UpdateTagInput;
  projectId: Scalars['ID']['input'];
  tagName: Scalars['String']['input'];
};


export type MutationUpdateTaskArgs = {
  id: Scalars['ID']['input'];
  input: UpdateTaskInput;
};


export type MutationUpdateTaskLabelArgs = {
  color?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUpdateWorkstreamArgs = {
  id: Scalars['ID']['input'];
  input: UpdateWorkstreamInput;
};


export type MutationUpdateWorkstreamGroupArgs = {
  id: Scalars['ID']['input'];
  input: UpdateWorkstreamGroupInput;
};

/** A GraphQL mutation associated with an entity type */
export type MutationCatalogEntry = {
  __typename?: 'MutationCatalogEntry';
  description?: Maybe<Scalars['String']['output']>;
  entityType?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
};

/** A group of notification types sharing a source label (e.g. "GitHub"). Has a master mute toggle. */
export type NotificationSource = {
  __typename?: 'NotificationSource';
  muted?: Maybe<Scalars['Boolean']['output']>;
  source?: Maybe<Scalars['String']['output']>;
  types?: Maybe<Array<NotificationType>>;
};

/** A registered inbox notification type, with the user's current mute state. */
export type NotificationType = {
  __typename?: 'NotificationType';
  defaultEnabled?: Maybe<Scalars['Boolean']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  label?: Maybe<Scalars['String']['output']>;
  muted?: Maybe<Scalars['Boolean']['output']>;
  source?: Maybe<Scalars['String']['output']>;
};

/** Per-source / per-type mute preferences for inbox notifications. */
export type NotificationsSettings = {
  __typename?: 'NotificationsSettings';
  mutedSources?: Maybe<Scalars['JSON']['output']>;
  mutedTypes?: Maybe<Scalars['JSON']['output']>;
};

export type PauseRoutinePayload = {
  __typename?: 'PauseRoutinePayload';
  routine?: Maybe<Routine>;
};

export type PermissionBehavior =
  | 'allow'
  | 'deny';

export type PermissionBehaviorSetting =
  | 'allow'
  | 'ask';

/** Scoped permission override for a project, group, or workstream */
export type PermissionPolicy = {
  __typename?: 'PermissionPolicy';
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  rules?: Maybe<Array<PermissionRuleConfig>>;
  scopeId?: Maybe<Scalars['String']['output']>;
  scopeType?: Maybe<PermissionScopeType>;
  templateId?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type PermissionPreset =
  | 'autonomous'
  | 'balanced'
  | 'custom'
  | 'restrictive';

/** Response to a tool permission request */
export type PermissionResponseInput = {
  behavior: PermissionBehavior;
  directories?: InputMaybe<Array<Scalars['String']['input']>>;
  message?: InputMaybe<Scalars['String']['input']>;
  scope: PermissionScope;
  updatedInput?: InputMaybe<Scalars['JSON']['input']>;
};

/** A single permission rule configuration */
export type PermissionRuleConfig = {
  __typename?: 'PermissionRuleConfig';
  behavior?: Maybe<PermissionBehaviorSetting>;
  entityType?: Maybe<Scalars['String']['output']>;
  tool?: Maybe<Scalars['String']['output']>;
};

export type PermissionRuleConfigInput = {
  behavior: PermissionBehaviorSetting;
  entityType?: InputMaybe<Scalars['String']['input']>;
  tool: Scalars['String']['input'];
};

export type PermissionRuleScope =
  | 'persistent'
  | 'session';

export type PermissionScope =
  | 'once'
  | 'permanent'
  | 'session';

export type PermissionScopeType =
  | 'group'
  | 'project'
  | 'workstream';

/** A reusable named set of permission rules */
export type PermissionTemplate = {
  __typename?: 'PermissionTemplate';
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  rules?: Maybe<Array<PermissionRuleConfig>>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** Container for all permission templates */
export type PermissionTemplatesSettings = {
  __typename?: 'PermissionTemplatesSettings';
  templates?: Maybe<Array<PermissionTemplate>>;
};

/** Global permission settings */
export type PermissionsSettings = {
  __typename?: 'PermissionsSettings';
  activePreset?: Maybe<PermissionPreset>;
  rules?: Maybe<Array<PermissionRuleConfig>>;
};

export type PinWorkstreamGroupPayload = {
  __typename?: 'PinWorkstreamGroupPayload';
  group?: Maybe<WorkstreamGroup>;
};

export type PinWorkstreamPayload = {
  __typename?: 'PinWorkstreamPayload';
  workstream?: Maybe<Workstream>;
};

export type PluginSource =
  | 'github'
  | 'inline';

/** Version update information for an installed plugin */
export type PluginUpdate = {
  __typename?: 'PluginUpdate';
  id?: Maybe<Scalars['String']['output']>;
  installedVersion?: Maybe<Scalars['String']['output']>;
  registryVersion?: Maybe<Scalars['String']['output']>;
};

/** Author of a content profile */
export type ProfileAuthor = {
  __typename?: 'ProfileAuthor';
  name?: Maybe<Scalars['String']['output']>;
  url?: Maybe<Scalars['String']['output']>;
};

/** Identity metadata for a shareable content profile */
export type ProfileMetadata = {
  __typename?: 'ProfileMetadata';
  author?: Maybe<ProfileAuthor>;
  description?: Maybe<Scalars['String']['output']>;
  displayName?: Maybe<Scalars['String']['output']>;
  icon?: Maybe<Scalars['String']['output']>;
  sourceUrl?: Maybe<Scalars['String']['output']>;
  tags?: Maybe<Array<Scalars['String']['output']>>;
};

/** Top-level container that groups workstreams */
export type Project = {
  __typename?: 'Project';
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  /** Project-level working directories (inherited by all workstreams) */
  directories?: Maybe<Array<ProjectDirectory>>;
  id?: Maybe<Scalars['ID']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Non-archived workstreams in this project */
  workstreams?: Maybe<Array<Workstream>>;
};

/** A project-level working directory that is inherited by all workstreams */
export type ProjectDirectory = {
  __typename?: 'ProjectDirectory';
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  label?: Maybe<Scalars['String']['output']>;
  path?: Maybe<Scalars['String']['output']>;
  projectId?: Maybe<Scalars['ID']['output']>;
};

export type PromoteWorkstreamReferencePayload = {
  __typename?: 'PromoteWorkstreamReferencePayload';
  workstream?: Maybe<Workstream>;
};

/** Input for pushing a new item to the inbox. The source is set automatically from the caller identity — plugins get their plugin ID, core gets "Vienna". */
export type PushInboxItemInput = {
  /** Action buttons to display on the item */
  actions?: InputMaybe<Array<InboxActionInput>>;
  /** Optional label for a call-to-action button (e.g. "Open", "View") */
  ctaLabel?: InputMaybe<Scalars['String']['input']>;
  /** Optional longer text or markdown */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Vienna entity URI for deep linking (e.g. @vienna//gh_pr/owner/repo/123) */
  entityUri?: InputMaybe<Scalars['String']['input']>;
  /** Optional SVG icon string */
  icon?: InputMaybe<Scalars['String']['input']>;
  /** Display title for the inbox item */
  title: Scalars['String']['input'];
};

export type PushInboxItemPayload = {
  __typename?: 'PushInboxItemPayload';
  inboxItem?: Maybe<InboxItem>;
};

export type Query = {
  __typename?: 'Query';
  /** Get the currently active content profile */
  activeContentProfile?: Maybe<ContentProfile>;
  /** List routines with active status */
  activeRoutines?: Maybe<Array<Routine>>;
  /** List archived workstreams for a project */
  archivedWorkstreams?: Maybe<Array<Workstream>>;
  /** Get branch selections for a workstream */
  branchSelections?: Maybe<Array<BranchSelection>>;
  /** Get all commands, optionally filtered by category */
  commands?: Maybe<Array<Command>>;
  /** List all content profiles */
  contentProfiles?: Maybe<Array<ContentProfile>>;
  /** Get directories with computed branch/worktree info for a workstream */
  directoriesWithBranchInfo?: Maybe<Array<DirectoryWithBranchInfo>>;
  /** Get the effective configuration for a project, resolved across all tiers. */
  effectiveConfig?: Maybe<EffectiveConfig>;
  /** List entities of a specific type with optional filters */
  entities?: Maybe<Array<Entity>>;
  /** Resolve a single entity by its URI */
  entity?: Maybe<Entity>;
  /** List all GraphQL mutations grouped by the entity type they operate on */
  entityMutationCatalog?: Maybe<Array<EntityMutationGroup>>;
  /** Search across all (or specified) entity types */
  entitySearch?: Maybe<Array<Entity>>;
  /** List all saved entity tool entries (dev debugging) */
  entityToolEntries?: Maybe<Array<EntityToolEntry>>;
  /** List all registered entity types with their metadata */
  entityTypes?: Maybe<Array<EntityTypeInfo>>;
  /** Get aggregate unified diff for all branch changes vs base */
  gitBranchDiff?: Maybe<Scalars['String']['output']>;
  /** List branches for a git repository */
  gitBranches?: Maybe<Array<GitBranch>>;
  /** Get unified diff for a single commit */
  gitCommitDiff?: Maybe<Scalars['String']['output']>;
  /** Get commit log for commits on current branch not on base ref */
  gitCommitLog?: Maybe<Array<GitCommit>>;
  /** Get the current branch for a git repository */
  gitCurrentBranch?: Maybe<Scalars['String']['output']>;
  /** Get the default branch for a git repository (main/master) */
  gitDefaultBranch?: Maybe<Scalars['String']['output']>;
  /** Get diff stat summary for branch changes vs a base ref (merge-base) */
  gitDiffSummary?: Maybe<GitDiffSummary>;
  /** Get file content at a specific git ref, or current working tree if ref is null */
  gitFileAtRef?: Maybe<Scalars['String']['output']>;
  /** Get unified diff for a single file (tries branch diff, working tree, then untracked) */
  gitFileDiff?: Maybe<Scalars['String']['output']>;
  /** Get changed files in the working tree (staged + unstaged + untracked) */
  gitStatusFiles?: Maybe<Array<GitStatusFile>>;
  /** Get unified diff for all working tree changes (staged + unstaged) vs HEAD */
  gitWorkingTreeDiff?: Maybe<Scalars['String']['output']>;
  /** Get diff stat for working tree changes (unstaged + staged + untracked) */
  gitWorkingTreeSummary?: Maybe<GitDiffSummary>;
  /** Get shared directories for a workstream group */
  groupDirectories?: Maybe<Array<GroupDirectory>>;
  /** Get entities linked to a workstream group */
  groupLinkedEntities?: Maybe<Array<GroupLinkedEntity>>;
  inboxItems?: Maybe<Array<InboxItem>>;
  inboxUnreadCount?: Maybe<Scalars['Int']['output']>;
  /** List all installed plugins */
  installedPlugins?: Maybe<Array<InstalledPlugin>>;
  /** List all installed skills */
  installedSkills?: Maybe<Array<InstalledSkill>>;
  /** List all registered integrations */
  integrations?: Maybe<Array<IntegrationInfo>>;
  /** Check if a path is inside a git repository */
  isGitRepo?: Maybe<Scalars['Boolean']['output']>;
  /** Check if the agent is running for a workstream */
  isWorkstreamAgentRunning?: Maybe<Scalars['Boolean']['output']>;
  /** List all active LSP server instances and their status */
  lspServers?: Maybe<Array<LspServerStatus>>;
  /** Notification types grouped by source, with per-source master mute state. */
  notificationSources?: Maybe<Array<NotificationSource>>;
  /** All registered notification types with their current mute state computed from settings. */
  notificationTypes?: Maybe<Array<NotificationType>>;
  permissionPolicy?: Maybe<PermissionPolicy>;
  /** Get a permission template by ID */
  permissionTemplate?: Maybe<PermissionTemplate>;
  /** List all permission templates */
  permissionTemplates?: Maybe<Array<PermissionTemplate>>;
  /** Check for version updates on installed plugins */
  pluginUpdates?: Maybe<Array<PluginUpdate>>;
  /** Get a project by ID */
  project?: Maybe<Project>;
  /** List all directories for a project */
  projectDirectories?: Maybe<Array<ProjectDirectory>>;
  /** List all projects */
  projects?: Maybe<Array<Project>>;
  /** List all registered events in the plugin event system */
  registeredEvents?: Maybe<Array<RegisteredEvent>>;
  /** List all registries */
  registries?: Maybe<Array<Registry>>;
  registry?: Maybe<Registry>;
  /** Default plugin IDs from the highest-priority registry */
  registryPluginDefaults?: Maybe<Array<Scalars['String']['output']>>;
  /** List all available plugins from enabled registries */
  registryPlugins?: Maybe<Array<RegistryPlugin>>;
  /** Default quick action IDs from the highest-priority registry */
  registryQuickActionDefaults?: Maybe<Array<Scalars['String']['output']>>;
  /** Merged quick actions from all enabled registries (priority-ordered) */
  registryQuickActions?: Maybe<Array<QuickAction>>;
  /** Default skill IDs from the highest-priority registry */
  registrySkillDefaults?: Maybe<Array<Scalars['String']['output']>>;
  /** List all available skills from enabled registries */
  registrySkills?: Maybe<Array<RegistrySkill>>;
  /** Default verification actions from the highest-priority registry */
  registryVerificationActionDefaults?: Maybe<Array<VerificationAction>>;
  /** Merged verification actions from all enabled registries (priority-ordered) */
  registryVerificationActions?: Maybe<Array<VerificationAction>>;
  /** Resolve context text for a linked entity. Uses the entity definition's resolveContext if available, otherwise builds generic context from metadata. */
  resolveLinkedEntityContext?: Maybe<Scalars['String']['output']>;
  resolvedParentPermissions?: Maybe<Array<PermissionRuleConfig>>;
  resolvedPermissions?: Maybe<Array<PermissionRuleConfig>>;
  routine?: Maybe<Routine>;
  /** Get a routine by its associated workstream ID */
  routineByWorkstreamId?: Maybe<Routine>;
  /** Get the most recent run for a routine */
  routineLatestRun?: Maybe<RoutineRun>;
  routineRunHistory?: Maybe<Array<RoutineRun>>;
  /** List all routines */
  routines?: Maybe<Array<Routine>>;
  /** List routines belonging to a project (via their workstream) */
  routinesByProject?: Maybe<Array<Routine>>;
  /** Get all app settings (with defaults for unset values) */
  settings?: Maybe<Settings>;
  /** Check for version updates on installed skills */
  skillUpdates?: Maybe<Array<SkillUpdate>>;
  /** Find a tag by name within a project (searches merged set) */
  tagByName?: Maybe<Tag>;
  /** List all merged tags for a project (global + project overrides) */
  tagsByProject?: Maybe<Array<Tag>>;
  /** Get a task by ID */
  task?: Maybe<Task>;
  /** List task labels for a project */
  taskLabels?: Maybe<Array<TaskLabel>>;
  /** List tasks for a project with optional filters. All filter args are optional — omit to list all tasks. */
  tasks?: Maybe<Array<Task>>;
  /** Get user-sent message history for a workstream (newest first). Used to populate the chat input's up-arrow message history and supports cursor-based pagination for preemptive loading. */
  userMessageHistory?: Maybe<UserMessageHistoryConnection>;
  /** Get a workstream by ID */
  workstream?: Maybe<Workstream>;
  /** Get working directories for a workstream */
  workstreamDirectories?: Maybe<Array<WorkstreamDirectory>>;
  /** Get a workstream group by ID */
  workstreamGroup?: Maybe<WorkstreamGroup>;
  /** List workstream groups for a project (pinned first) */
  workstreamGroupsByProject?: Maybe<Array<WorkstreamGroup>>;
  /** Get entities linked to a workstream (includes group-inherited entities) */
  workstreamLinkedEntities?: Maybe<Array<WorkstreamLinkedEntity>>;
  /** Get entity references detected in or added to a workstream conversation */
  workstreamReferences?: Maybe<Array<WorkstreamReference>>;
  /** Get all tags applied to a workstream (snapshot data) */
  workstreamTags?: Maybe<Array<WorkstreamTag>>;
  /** Find all workstreams linked to a given entity URI (includes group-inherited links) */
  workstreamsByEntity?: Maybe<Array<WorkstreamEntityLink>>;
  /** List non-archived workstreams for a project (pinned first) */
  workstreamsByProject?: Maybe<Array<Workstream>>;
};


export type QueryArchivedWorkstreamsArgs = {
  projectId: Scalars['ID']['input'];
};


export type QueryBranchSelectionsArgs = {
  workstreamId: Scalars['ID']['input'];
};


export type QueryCommandsArgs = {
  categoryFilter?: InputMaybe<Scalars['String']['input']>;
};


export type QueryDirectoriesWithBranchInfoArgs = {
  workstreamId: Scalars['ID']['input'];
};


export type QueryEffectiveConfigArgs = {
  projectId: Scalars['ID']['input'];
};


export type QueryEntitiesArgs = {
  filters?: InputMaybe<Scalars['JSON']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  type: Scalars['String']['input'];
};


export type QueryEntityArgs = {
  uri: Scalars['String']['input'];
};


export type QueryEntitySearchArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
  types?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type QueryGitBranchDiffArgs = {
  base: Scalars['String']['input'];
  path: Scalars['String']['input'];
};


export type QueryGitBranchesArgs = {
  path: Scalars['String']['input'];
};


export type QueryGitCommitDiffArgs = {
  hash: Scalars['String']['input'];
  path: Scalars['String']['input'];
};


export type QueryGitCommitLogArgs = {
  base: Scalars['String']['input'];
  path: Scalars['String']['input'];
};


export type QueryGitCurrentBranchArgs = {
  path: Scalars['String']['input'];
};


export type QueryGitDefaultBranchArgs = {
  path: Scalars['String']['input'];
};


export type QueryGitDiffSummaryArgs = {
  base: Scalars['String']['input'];
  path: Scalars['String']['input'];
};


export type QueryGitFileAtRefArgs = {
  filePath: Scalars['String']['input'];
  path: Scalars['String']['input'];
  ref?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGitFileDiffArgs = {
  base?: InputMaybe<Scalars['String']['input']>;
  filePath: Scalars['String']['input'];
  path: Scalars['String']['input'];
};


export type QueryGitStatusFilesArgs = {
  path: Scalars['String']['input'];
};


export type QueryGitWorkingTreeDiffArgs = {
  path: Scalars['String']['input'];
};


export type QueryGitWorkingTreeSummaryArgs = {
  path: Scalars['String']['input'];
};


export type QueryGroupDirectoriesArgs = {
  groupId: Scalars['ID']['input'];
};


export type QueryGroupLinkedEntitiesArgs = {
  groupId: Scalars['ID']['input'];
};


export type QueryInboxItemsArgs = {
  includeArchived?: InputMaybe<Scalars['Boolean']['input']>;
  includeRead?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryIsGitRepoArgs = {
  path: Scalars['String']['input'];
};


export type QueryIsWorkstreamAgentRunningArgs = {
  id: Scalars['ID']['input'];
};


export type QueryPermissionPolicyArgs = {
  scopeId: Scalars['String']['input'];
  scopeType: PermissionScopeType;
};


export type QueryPermissionTemplateArgs = {
  id: Scalars['ID']['input'];
};


export type QueryProjectArgs = {
  id: Scalars['ID']['input'];
};


export type QueryProjectDirectoriesArgs = {
  projectId: Scalars['ID']['input'];
};


export type QueryRegistryArgs = {
  id: Scalars['ID']['input'];
};


export type QueryResolveLinkedEntityContextArgs = {
  entityUri: Scalars['String']['input'];
};


export type QueryResolvedParentPermissionsArgs = {
  scopeId: Scalars['String']['input'];
  scopeType: PermissionScopeType;
};


export type QueryResolvedPermissionsArgs = {
  workstreamId: Scalars['ID']['input'];
};


export type QueryRoutineArgs = {
  id: Scalars['ID']['input'];
};


export type QueryRoutineByWorkstreamIdArgs = {
  workstreamId: Scalars['ID']['input'];
};


export type QueryRoutineLatestRunArgs = {
  routineId: Scalars['ID']['input'];
};


export type QueryRoutineRunHistoryArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  routineId: Scalars['ID']['input'];
};


export type QueryRoutinesByProjectArgs = {
  projectId: Scalars['ID']['input'];
};


export type QueryTagByNameArgs = {
  name: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
};


export type QueryTagsByProjectArgs = {
  projectId: Scalars['ID']['input'];
};


export type QueryTaskArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTaskLabelsArgs = {
  projectId: Scalars['ID']['input'];
};


export type QueryTasksArgs = {
  assigneeType?: InputMaybe<TaskAssigneeType>;
  labelId?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  parentId?: InputMaybe<Scalars['String']['input']>;
  priority?: InputMaybe<TaskPriority>;
  projectId: Scalars['ID']['input'];
  query?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<TaskStatus>;
};


export type QueryUserMessageHistoryArgs = {
  before?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  workstreamId: Scalars['ID']['input'];
};


export type QueryWorkstreamArgs = {
  id: Scalars['ID']['input'];
};


export type QueryWorkstreamDirectoriesArgs = {
  workstreamId: Scalars['ID']['input'];
};


export type QueryWorkstreamGroupArgs = {
  id: Scalars['ID']['input'];
};


export type QueryWorkstreamGroupsByProjectArgs = {
  projectId: Scalars['ID']['input'];
};


export type QueryWorkstreamLinkedEntitiesArgs = {
  workstreamId: Scalars['ID']['input'];
};


export type QueryWorkstreamReferencesArgs = {
  workstreamId: Scalars['ID']['input'];
};


export type QueryWorkstreamTagsArgs = {
  workstreamId: Scalars['ID']['input'];
};


export type QueryWorkstreamsByEntityArgs = {
  entityUri: Scalars['String']['input'];
};


export type QueryWorkstreamsByProjectArgs = {
  projectId: Scalars['ID']['input'];
};

/** A quick action provided by a registry */
export type QuickAction = {
  __typename?: 'QuickAction';
  author?: Maybe<QuickActionAuthor>;
  description?: Maybe<Scalars['String']['output']>;
  icon?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  label?: Maybe<Scalars['String']['output']>;
  options?: Maybe<Array<QuickActionOption>>;
  registry?: Maybe<Scalars['String']['output']>;
  tags?: Maybe<Array<Scalars['String']['output']>>;
};

/** Author of a quick action */
export type QuickActionAuthor = {
  __typename?: 'QuickActionAuthor';
  name?: Maybe<Scalars['String']['output']>;
};

/** A selectable option within a quick action */
export type QuickActionOption = {
  __typename?: 'QuickActionOption';
  id?: Maybe<Scalars['String']['output']>;
  label?: Maybe<Scalars['String']['output']>;
  prompt?: Maybe<Scalars['String']['output']>;
};

/** A registered event in the plugin event system */
export type RegisteredEvent = {
  __typename?: 'RegisteredEvent';
  /** Human-readable description of when this event fires */
  description?: Maybe<Scalars['String']['output']>;
  /** Number of listeners currently registered for this event */
  listenerCount?: Maybe<Scalars['Int']['output']>;
  /** Local event name without plugin prefix */
  localName?: Maybe<Scalars['String']['output']>;
  /** Plugin ID that owns/defined this event */
  ownerPluginId?: Maybe<Scalars['String']['output']>;
  /** Human-readable payload schema description */
  payloadSchema?: Maybe<Scalars['String']['output']>;
  /** Fully-qualified event name (e.g. "core.reference.detected") */
  qualifiedName?: Maybe<Scalars['String']['output']>;
};

/** A Git-backed registry providing shareable content (quick actions, etc.) */
export type Registry = {
  __typename?: 'Registry';
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  enabled?: Maybe<Scalars['Boolean']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  priority?: Maybe<Scalars['Int']['output']>;
  source?: Maybe<RegistrySource>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  url?: Maybe<Scalars['String']['output']>;
};

/** A plugin available in a registry (not yet installed) */
export type RegistryPlugin = {
  __typename?: 'RegistryPlugin';
  author?: Maybe<RegistryPluginAuthor>;
  canvases?: Maybe<RegistryPluginCanvases>;
  category?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  icon?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  registry?: Maybe<Scalars['String']['output']>;
  repo?: Maybe<Scalars['String']['output']>;
  source?: Maybe<PluginSource>;
  tags?: Maybe<Array<Scalars['String']['output']>>;
  version?: Maybe<Scalars['String']['output']>;
};

/** Author of a registry plugin */
export type RegistryPluginAuthor = {
  __typename?: 'RegistryPluginAuthor';
  name?: Maybe<Scalars['String']['output']>;
};

/** Canvas support flags for a registry plugin */
export type RegistryPluginCanvases = {
  __typename?: 'RegistryPluginCanvases';
  drawer?: Maybe<Scalars['Boolean']['output']>;
  feed?: Maybe<Scalars['Boolean']['output']>;
  menuBar?: Maybe<Scalars['Boolean']['output']>;
  navSidebar?: Maybe<Scalars['Boolean']['output']>;
  workstreamWidget?: Maybe<Scalars['Boolean']['output']>;
};

/** A skill available in a registry (not yet installed) */
export type RegistrySkill = {
  __typename?: 'RegistrySkill';
  author?: Maybe<RegistrySkillAuthor>;
  category?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  icon?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  registry?: Maybe<Scalars['String']['output']>;
  repo?: Maybe<Scalars['String']['output']>;
  source?: Maybe<SkillSource>;
  tags?: Maybe<Array<Scalars['String']['output']>>;
  version?: Maybe<Scalars['String']['output']>;
};

/** Author of a registry skill */
export type RegistrySkillAuthor = {
  __typename?: 'RegistrySkillAuthor';
  name?: Maybe<Scalars['String']['output']>;
};

export type RegistrySource =
  | 'local'
  | 'organization'
  | 'project';

export type RemoveBranchSelectionPayload = {
  __typename?: 'RemoveBranchSelectionPayload';
  removed?: Maybe<Scalars['Boolean']['output']>;
};

export type RemoveEntityToolEntryPayload = {
  __typename?: 'RemoveEntityToolEntryPayload';
  success?: Maybe<Scalars['Boolean']['output']>;
};

export type RemoveGroupBranchSelectionPayload = {
  __typename?: 'RemoveGroupBranchSelectionPayload';
  group?: Maybe<WorkstreamGroup>;
};

export type RemoveGroupDirectoryPayload = {
  __typename?: 'RemoveGroupDirectoryPayload';
  group?: Maybe<WorkstreamGroup>;
};

export type RemoveProjectDirectoryPayload = {
  __typename?: 'RemoveProjectDirectoryPayload';
  project?: Maybe<Project>;
  removed?: Maybe<Scalars['Boolean']['output']>;
};

export type RemoveRegistryPayload = {
  __typename?: 'RemoveRegistryPayload';
  registry?: Maybe<Registry>;
};

export type RemoveTagPayload = {
  __typename?: 'RemoveTagPayload';
  success?: Maybe<Scalars['Boolean']['output']>;
};

export type RemoveWorkstreamDirectoryPayload = {
  __typename?: 'RemoveWorkstreamDirectoryPayload';
  workstream?: Maybe<Workstream>;
};

export type RemoveWorkstreamFromGroupPayload = {
  __typename?: 'RemoveWorkstreamFromGroupPayload';
  workstream?: Maybe<Workstream>;
};

export type RemoveWorkstreamReferencePayload = {
  __typename?: 'RemoveWorkstreamReferencePayload';
  workstream?: Maybe<Workstream>;
};

export type ReplayHistoryPayload = {
  __typename?: 'ReplayHistoryPayload';
  hasMore?: Maybe<Scalars['Boolean']['output']>;
  oldestEventId?: Maybe<Scalars['Int']['output']>;
  workstream?: Maybe<Workstream>;
};

/** A setting resolved across all configuration tiers */
export type ResolvedSetting = {
  __typename?: 'ResolvedSetting';
  key?: Maybe<Scalars['String']['output']>;
  recommendation?: Maybe<SettingRecommendation>;
  source?: Maybe<ConfigSource>;
  value?: Maybe<Scalars['JSON']['output']>;
};

export type RespondWorkstreamPermissionPayload = {
  __typename?: 'RespondWorkstreamPermissionPayload';
  workstream?: Maybe<Workstream>;
};

export type RestartWorkstreamAgentPayload = {
  __typename?: 'RestartWorkstreamAgentPayload';
  workstream?: Maybe<Workstream>;
};

export type ResumeRoutinePayload = {
  __typename?: 'ResumeRoutinePayload';
  routine?: Maybe<Routine>;
};

export type RevokePermissionRulePayload = {
  __typename?: 'RevokePermissionRulePayload';
  workstream?: Maybe<Workstream>;
};

export type RewindWorkstreamConversationPayload = {
  __typename?: 'RewindWorkstreamConversationPayload';
  workstream?: Maybe<Workstream>;
};

/** A scheduled workstream that runs on a cron or interval */
export type Routine = {
  __typename?: 'Routine';
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  lastRunAt?: Maybe<Scalars['DateTime']['output']>;
  /** The most recent run record */
  latestRun?: Maybe<RoutineRun>;
  name?: Maybe<Scalars['String']['output']>;
  nextRunAt?: Maybe<Scalars['DateTime']['output']>;
  preferences?: Maybe<Scalars['JSON']['output']>;
  prompt?: Maybe<Scalars['String']['output']>;
  runCount?: Maybe<Scalars['Int']['output']>;
  /** Recent execution history */
  runs?: Maybe<Array<RoutineRun>>;
  schedule?: Maybe<RoutineSchedule>;
  status?: Maybe<RoutineStatus>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  /** The dedicated workstream for this routine */
  workstream?: Maybe<Workstream>;
  workstreamId?: Maybe<Scalars['String']['output']>;
};


/** A scheduled workstream that runs on a cron or interval */
export type RoutineRunsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};

/** A single execution record for a routine */
export type RoutineRun = {
  __typename?: 'RoutineRun';
  completedAt?: Maybe<Scalars['DateTime']['output']>;
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  metadata?: Maybe<Scalars['JSON']['output']>;
  routineId?: Maybe<Scalars['String']['output']>;
  startedAt?: Maybe<Scalars['DateTime']['output']>;
  status?: Maybe<RoutineRunStatus>;
  summary?: Maybe<Scalars['String']['output']>;
  triggeredBy?: Maybe<RoutineRunTriggeredBy>;
};

export type RoutineRunStatus =
  | 'completed'
  | 'failed'
  | 'pending'
  | 'running'
  | 'skipped';

export type RoutineRunTriggeredBy =
  | 'manual'
  | 'retry'
  | 'schedule';

/** Schedule configuration for a routine */
export type RoutineSchedule = {
  __typename?: 'RoutineSchedule';
  expression?: Maybe<Scalars['String']['output']>;
  timezone?: Maybe<Scalars['String']['output']>;
  type?: Maybe<ScheduleType>;
};

export type RoutineScheduleInput = {
  expression: Scalars['String']['input'];
  timezone?: InputMaybe<Scalars['String']['input']>;
  type: ScheduleType;
};

export type RoutineStatus =
  | 'active'
  | 'disabled'
  | 'paused';

export type RunRoutineNowPayload = {
  __typename?: 'RunRoutineNowPayload';
  routine?: Maybe<Routine>;
};

export type ScheduleType =
  | 'cron'
  | 'interval';

export type SendWorkstreamMessagePayload = {
  __typename?: 'SendWorkstreamMessagePayload';
  workstream?: Maybe<Workstream>;
};

export type SetBranchSelectionPayload = {
  __typename?: 'SetBranchSelectionPayload';
  branchSelection?: Maybe<BranchSelection>;
  /** Error if worktree creation failed (branch selection still saved without worktree) */
  worktreeError?: Maybe<Scalars['String']['output']>;
};

export type SetGroupBranchSelectionPayload = {
  __typename?: 'SetGroupBranchSelectionPayload';
  group?: Maybe<WorkstreamGroup>;
};

export type SetLinkedEntityContextOverridePayload = {
  __typename?: 'SetLinkedEntityContextOverridePayload';
  workstream?: Maybe<Workstream>;
};

export type SetWorkstreamInFocusPayload = {
  __typename?: 'SetWorkstreamInFocusPayload';
  workstream?: Maybe<Workstream>;
};

/** A project-recommended setting value */
export type SettingRecommendation = {
  __typename?: 'SettingRecommendation';
  reason?: Maybe<Scalars['String']['output']>;
  source?: Maybe<ConfigSource>;
  value?: Maybe<Scalars['JSON']['output']>;
};

/** App-level settings (all categories) */
export type Settings = {
  __typename?: 'Settings';
  advanced?: Maybe<AdvancedSettings>;
  ai?: Maybe<AiSettings>;
  appearance?: Maybe<AppearanceSettings>;
  notifications?: Maybe<NotificationsSettings>;
  permissionTemplates?: Maybe<PermissionTemplatesSettings>;
  permissions?: Maybe<PermissionsSettings>;
};

export type SkillSource =
  | 'github'
  | 'inline'
  | 'local';

/** Version update information for an installed skill */
export type SkillUpdate = {
  __typename?: 'SkillUpdate';
  id?: Maybe<Scalars['String']['output']>;
  installedVersion?: Maybe<Scalars['String']['output']>;
  registryVersion?: Maybe<Scalars['String']['output']>;
};

export type StopWorkstreamAgentPayload = {
  __typename?: 'StopWorkstreamAgentPayload';
  workstream?: Maybe<Workstream>;
};

export type SwitchWorkstreamModelPayload = {
  __typename?: 'SwitchWorkstreamModelPayload';
  workstream?: Maybe<Workstream>;
};

export type SyncRegistriesPayload = {
  __typename?: 'SyncRegistriesPayload';
  synced?: Maybe<Scalars['Int']['output']>;
};

/** A tag definition (from JSON file) */
export type Tag = {
  __typename?: 'Tag';
  color?: Maybe<Scalars['String']['output']>;
  dependsOn?: Maybe<Array<Scalars['String']['output']>>;
  instructions?: Maybe<Scalars['String']['output']>;
  maxDepth?: Maybe<Scalars['Int']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  spawnWorkstream?: Maybe<Scalars['Boolean']['output']>;
  worktreeMode?: Maybe<WorktreeMode>;
};

/** A project-scoped task with status, priority, and assignee */
export type Task = {
  __typename?: 'Task';
  assigneeType?: Maybe<TaskAssigneeType>;
  assigneeWorkstreamId?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  dueDate?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  identifier?: Maybe<Scalars['String']['output']>;
  /** Labels assigned to this task */
  labels?: Maybe<Array<TaskLabel>>;
  links?: Maybe<Array<Scalars['String']['output']>>;
  /** Parent task (if this is a subtask) */
  parent?: Maybe<Task>;
  parentId?: Maybe<Scalars['ID']['output']>;
  priority?: Maybe<TaskPriority>;
  projectId?: Maybe<Scalars['ID']['output']>;
  status?: Maybe<TaskStatus>;
  /** Child tasks of this task */
  subtasks?: Maybe<Array<Task>>;
  title?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type TaskAssigneeType =
  | 'self'
  | 'workstream';

/** A color-coded label for categorizing tasks */
export type TaskLabel = {
  __typename?: 'TaskLabel';
  color?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  projectId?: Maybe<Scalars['ID']['output']>;
};

export type TaskLabelPayload = {
  __typename?: 'TaskLabelPayload';
  label?: Maybe<TaskLabel>;
};

export type TaskPayload = {
  __typename?: 'TaskPayload';
  task?: Maybe<Task>;
};

export type TaskPriority =
  | 'high'
  | 'low'
  | 'medium'
  | 'none'
  | 'urgent';

export type TaskStatus =
  | 'backlog'
  | 'canceled'
  | 'done'
  | 'in_progress'
  | 'todo';

export type Theme =
  | 'dark'
  | 'light'
  | 'system';

export type TogglePluginPayload = {
  __typename?: 'TogglePluginPayload';
  plugin?: Maybe<InstalledPlugin>;
};

export type ToggleSkillPayload = {
  __typename?: 'ToggleSkillPayload';
  skill?: Maybe<InstalledSkill>;
};

export type UnarchiveWorkstreamPayload = {
  __typename?: 'UnarchiveWorkstreamPayload';
  workstream?: Maybe<Workstream>;
};

export type UninstallPluginPayload = {
  __typename?: 'UninstallPluginPayload';
  success?: Maybe<Scalars['Boolean']['output']>;
};

export type UninstallSkillPayload = {
  __typename?: 'UninstallSkillPayload';
  success?: Maybe<Scalars['Boolean']['output']>;
};

export type UnlinkGroupEntityPayload = {
  __typename?: 'UnlinkGroupEntityPayload';
  group?: Maybe<WorkstreamGroup>;
};

export type UnlinkWorkstreamEntityPayload = {
  __typename?: 'UnlinkWorkstreamEntityPayload';
  workstream?: Maybe<Workstream>;
};

export type UnpinWorkstreamGroupPayload = {
  __typename?: 'UnpinWorkstreamGroupPayload';
  group?: Maybe<WorkstreamGroup>;
};

export type UnpinWorkstreamPayload = {
  __typename?: 'UnpinWorkstreamPayload';
  workstream?: Maybe<Workstream>;
};

export type UpdateAdvancedSettingsInput = {
  developerMode?: InputMaybe<Scalars['Boolean']['input']>;
  focusMonitorEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  focusMonitorIntervalMs?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateAiSettingsInput = {
  autoCompactPercent?: InputMaybe<Scalars['Int']['input']>;
  cliPath?: InputMaybe<Scalars['String']['input']>;
  cliSetupComplete?: InputMaybe<Scalars['Boolean']['input']>;
  defaultModel?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateAppearanceSettingsInput = {
  compactMode?: InputMaybe<Scalars['Boolean']['input']>;
  fontSize?: InputMaybe<Scalars['Int']['input']>;
  theme?: InputMaybe<Theme>;
  zoomLevel?: InputMaybe<Scalars['Float']['input']>;
};

export type UpdatePermissionsSettingsInput = {
  activePreset?: InputMaybe<PermissionPreset>;
  rules?: InputMaybe<Array<PermissionRuleConfigInput>>;
};

export type UpdatePluginPayload = {
  __typename?: 'UpdatePluginPayload';
  plugin?: Maybe<InstalledPlugin>;
};

export type UpdateProjectInput = {
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateRegistryInput = {
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  priority?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateRegistryPayload = {
  __typename?: 'UpdateRegistryPayload';
  registry?: Maybe<Registry>;
};

export type UpdateRoutineInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  preferences?: InputMaybe<Scalars['JSON']['input']>;
  prompt?: InputMaybe<Scalars['String']['input']>;
  schedule?: InputMaybe<RoutineScheduleInput>;
};

export type UpdateRoutinePayload = {
  __typename?: 'UpdateRoutinePayload';
  routine?: Maybe<Routine>;
};

export type UpdateSkillPayload = {
  __typename?: 'UpdateSkillPayload';
  skill?: Maybe<InstalledSkill>;
};

export type UpdateTagInput = {
  color?: InputMaybe<Scalars['String']['input']>;
  dependsOn?: InputMaybe<Array<Scalars['String']['input']>>;
  instructions?: InputMaybe<Scalars['String']['input']>;
  maxDepth?: InputMaybe<Scalars['Int']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  spawnWorkstream?: InputMaybe<Scalars['Boolean']['input']>;
  worktreeMode?: InputMaybe<WorktreeMode>;
};

export type UpdateTagPayload = {
  __typename?: 'UpdateTagPayload';
  tag?: Maybe<Tag>;
};

/** Input for updating a task. Use labelIds (array of label ID strings) to replace all assigned labels. */
export type UpdateTaskInput = {
  /** self or workstream */
  assigneeType?: InputMaybe<TaskAssigneeType>;
  /** Required when assigneeType is workstream */
  assigneeWorkstreamId?: InputMaybe<Scalars['String']['input']>;
  /** Markdown description */
  description?: InputMaybe<Scalars['String']['input']>;
  /** ISO date string (YYYY-MM-DD) */
  dueDate?: InputMaybe<Scalars['String']['input']>;
  /** Array of TaskLabel IDs — replaces all current labels. Use taskLabels query to list available labels. */
  labelIds?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Array of entity URIs — replaces all current links */
  links?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Parent task ID for subtasks */
  parentId?: InputMaybe<Scalars['String']['input']>;
  priority?: InputMaybe<TaskPriority>;
  status?: InputMaybe<TaskStatus>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateWorkstreamGroupInput = {
  autoCreateWorktrees?: InputMaybe<Scalars['Boolean']['input']>;
  emoji?: InputMaybe<Scalars['String']['input']>;
  isPinned?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateWorkstreamGroupPayload = {
  __typename?: 'UpdateWorkstreamGroupPayload';
  group?: Maybe<WorkstreamGroup>;
};

export type UpdateWorkstreamInput = {
  groupId?: InputMaybe<Scalars['ID']['input']>;
  isPinned?: InputMaybe<Scalars['Boolean']['input']>;
  model?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<WorkstreamStatus>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateWorkstreamPayload = {
  __typename?: 'UpdateWorkstreamPayload';
  workstream?: Maybe<Workstream>;
};

/** Paginated user message history for a workstream */
export type UserMessageHistoryConnection = {
  __typename?: 'UserMessageHistoryConnection';
  hasMore?: Maybe<Scalars['Boolean']['output']>;
  items?: Maybe<Array<UserMessageHistoryItem>>;
};

/** A user-sent message extracted from the event log (for input history) */
export type UserMessageHistoryItem = {
  __typename?: 'UserMessageHistoryItem';
  eventId?: Maybe<Scalars['Int']['output']>;
  messageId?: Maybe<Scalars['String']['output']>;
  text?: Maybe<Scalars['String']['output']>;
  timestamp?: Maybe<Scalars['DateTime']['output']>;
};

/** A post-verification action (builtin lifecycle or prompt-based) */
export type VerificationAction = {
  __typename?: 'VerificationAction';
  builtinId?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  label?: Maybe<Scalars['String']['output']>;
  prompt?: Maybe<Scalars['String']['output']>;
  type?: Maybe<VerificationActionType>;
};

export type VerificationActionType =
  | 'builtin'
  | 'prompt';

/** A conversation within a project */
export type Workstream = {
  __typename?: 'Workstream';
  activeSessionId?: Maybe<Scalars['String']['output']>;
  archivedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Branch selections for this workstream's directories */
  branchSelections?: Maybe<Array<BranchSelection>>;
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  /** Working directories for this workstream */
  directories?: Maybe<Array<WorkstreamDirectory>>;
  /** Directories with computed branch/worktree info */
  directoriesWithBranchInfo?: Maybe<Array<DirectoryWithBranchInfo>>;
  /** Vienna message ID at the fork point (null if not a fork) */
  forkedAtMessageId?: Maybe<Scalars['String']['output']>;
  /** ID of the workstream this was forked from (null if not a fork) */
  forkedFromWorkstreamId?: Maybe<Scalars['ID']['output']>;
  /** The workstream group this workstream belongs to (if any) */
  group?: Maybe<WorkstreamGroup>;
  groupId?: Maybe<Scalars['ID']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  /** Whether this workstream is currently focused in the UI */
  inFocus?: Maybe<Scalars['Boolean']['output']>;
  isPinned?: Maybe<Scalars['Boolean']['output']>;
  isRoutineWorkstream?: Maybe<Scalars['Boolean']['output']>;
  lastActivityAt?: Maybe<Scalars['DateTime']['output']>;
  /** Entities linked to this workstream as persistent context (includes group-inherited) */
  linkedEntities?: Maybe<Array<WorkstreamLinkedEntity>>;
  messageCount?: Maybe<Scalars['Int']['output']>;
  model?: Maybe<Scalars['String']['output']>;
  /** The project this workstream belongs to */
  project?: Maybe<Project>;
  status?: Maybe<WorkstreamStatus>;
  /** Tags applied to this workstream with execution status */
  tags?: Maybe<Array<WorkstreamTag>>;
  title?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** A working directory associated with a workstream */
export type WorkstreamDirectory = {
  __typename?: 'WorkstreamDirectory';
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  isInherited?: Maybe<Scalars['Boolean']['output']>;
  label?: Maybe<Scalars['String']['output']>;
  path?: Maybe<Scalars['String']['output']>;
  workstreamId?: Maybe<Scalars['ID']['output']>;
};

/** A link from an entity to a workstream (reverse lookup result) */
export type WorkstreamEntityLink = {
  __typename?: 'WorkstreamEntityLink';
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  entityTitle?: Maybe<Scalars['String']['output']>;
  entityType?: Maybe<Scalars['String']['output']>;
  entityUri?: Maybe<Scalars['String']['output']>;
  groupId?: Maybe<Scalars['ID']['output']>;
  /** The linked workstream */
  workstream?: Maybe<Workstream>;
  workstreamId?: Maybe<Scalars['ID']['output']>;
};

/** A named collection of related workstreams within a project */
export type WorkstreamGroup = {
  __typename?: 'WorkstreamGroup';
  autoCreateWorktrees?: Maybe<Scalars['Boolean']['output']>;
  /** Default branch selections for group directories (inherited on workstream creation) */
  branchSelections?: Maybe<Array<GroupBranchSelection>>;
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  /** Priority-derived status from child workstreams (highest priority wins). Used for collapsed nav display. */
  derivedStatus?: Maybe<WorkstreamStatus>;
  /** Shared directories for this group (inherited by workstreams on creation) */
  directories?: Maybe<Array<GroupDirectory>>;
  emoji?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  isPinned?: Maybe<Scalars['Boolean']['output']>;
  /** Entities linked to this group (inherited by all workstreams) */
  linkedEntities?: Maybe<Array<GroupLinkedEntity>>;
  name?: Maybe<Scalars['String']['output']>;
  /** The project this group belongs to */
  project?: Maybe<Project>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Non-archived workstreams in this group */
  workstreams?: Maybe<Array<Workstream>>;
};

/** An entity linked to a workstream as persistent context */
export type WorkstreamLinkedEntity = {
  __typename?: 'WorkstreamLinkedEntity';
  contextOverride?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  entityTitle?: Maybe<Scalars['String']['output']>;
  entityType?: Maybe<Scalars['String']['output']>;
  entityUri?: Maybe<Scalars['String']['output']>;
  isInherited?: Maybe<Scalars['Boolean']['output']>;
  workstreamId?: Maybe<Scalars['ID']['output']>;
};

/** An entity reference detected in or added to a workstream conversation */
export type WorkstreamReference = {
  __typename?: 'WorkstreamReference';
  entityTitle?: Maybe<Scalars['String']['output']>;
  entityType?: Maybe<Scalars['String']['output']>;
  entityUri?: Maybe<Scalars['String']['output']>;
  externalUrl?: Maybe<Scalars['String']['output']>;
  firstReferencedAt?: Maybe<Scalars['DateTime']['output']>;
  workstreamId?: Maybe<Scalars['ID']['output']>;
};

export type WorkstreamStatus =
  | 'active'
  | 'completed_unviewed'
  | 'idle'
  | 'needs_review'
  | 'processing'
  | 'waiting_permission';

/** A tag applied to a workstream with snapshot data and execution status */
export type WorkstreamTag = {
  __typename?: 'WorkstreamTag';
  appliedAt?: Maybe<Scalars['DateTime']['output']>;
  appliedBy?: Maybe<WorkstreamTagAppliedBy>;
  completedAt?: Maybe<Scalars['DateTime']['output']>;
  delegatedWorkstreamId?: Maybe<Scalars['ID']['output']>;
  depth?: Maybe<Scalars['Int']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  sourceWorkstreamTagId?: Maybe<Scalars['ID']['output']>;
  startedAt?: Maybe<Scalars['DateTime']['output']>;
  status?: Maybe<WorkstreamTagStatus>;
  /** Current tag definition (null if tag was deleted) */
  tag?: Maybe<Tag>;
  tagColor?: Maybe<Scalars['String']['output']>;
  tagDependsOn?: Maybe<Array<Scalars['String']['output']>>;
  tagInstructions?: Maybe<Scalars['String']['output']>;
  tagMaxDepth?: Maybe<Scalars['Int']['output']>;
  tagName?: Maybe<Scalars['String']['output']>;
  tagSpawnWorkstream?: Maybe<Scalars['Boolean']['output']>;
  tagWorktreeMode?: Maybe<WorktreeMode>;
  workstreamId?: Maybe<Scalars['ID']['output']>;
};

export type WorkstreamTagAppliedBy =
  | 'agent'
  | 'manual'
  | 'pipeline'
  | 'trigger';

export type WorkstreamTagCompletionStatus =
  | 'completed'
  | 'failed';

export type WorkstreamTagStatus =
  | 'completed'
  | 'failed'
  | 'pending'
  | 'running'
  | 'skipped';

export type WorktreeMode =
  | 'fork'
  | 'from_main'
  | 'same';

export type WorktreeResult = {
  __typename?: 'WorktreeResult';
  branch?: Maybe<Scalars['String']['output']>;
  directoryPath?: Maybe<Scalars['String']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  worktreePath?: Maybe<Scalars['String']['output']>;
};

export type GetProjectsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetProjectsQuery = { __typename?: 'Query', projects?: Array<{ __typename?: 'Project', id?: string | null, name?: string | null, createdAt?: string | number | null, updatedAt?: string | number | null }> | null };

export type GetProjectQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetProjectQuery = { __typename?: 'Query', project?: { __typename?: 'Project', id?: string | null, name?: string | null, createdAt?: string | number | null, updatedAt?: string | number | null, workstreams?: Array<{ __typename?: 'Workstream', id?: string | null, title?: string | null, status?: WorkstreamStatus | null, isPinned?: boolean | null, messageCount?: number | null, lastActivityAt?: string | number | null }> | null } | null };

export type CreateProjectMutationVariables = Exact<{
  input: CreateProjectInput;
}>;


export type CreateProjectMutation = { __typename?: 'Mutation', createProject?: { __typename?: 'Project', id?: string | null, name?: string | null, createdAt?: string | number | null, updatedAt?: string | number | null } | null };

export type UpdateProjectMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateProjectInput;
}>;


export type UpdateProjectMutation = { __typename?: 'Mutation', updateProject?: { __typename?: 'Project', id?: string | null, name?: string | null, updatedAt?: string | number | null } | null };

export type DeleteProjectMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteProjectMutation = { __typename?: 'Mutation', deleteProject?: boolean | null };

export type GetWorkstreamsByProjectQueryVariables = Exact<{
  projectId: Scalars['ID']['input'];
}>;


export type GetWorkstreamsByProjectQuery = { __typename?: 'Query', workstreamsByProject?: Array<{ __typename?: 'Workstream', id?: string | null, title?: string | null, status?: WorkstreamStatus | null, model?: string | null, isPinned?: boolean | null, isRoutineWorkstream?: boolean | null, groupId?: string | null, messageCount?: number | null, lastActivityAt?: string | number | null, createdAt?: string | number | null, updatedAt?: string | number | null, inFocus?: boolean | null }> | null };

export type GetWorkstreamQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetWorkstreamQuery = { __typename?: 'Query', workstream?: { __typename?: 'Workstream', id?: string | null, title?: string | null, status?: WorkstreamStatus | null, model?: string | null, isPinned?: boolean | null, messageCount?: number | null, lastActivityAt?: string | number | null, createdAt?: string | number | null, updatedAt?: string | number | null, project?: { __typename?: 'Project', id?: string | null, name?: string | null } | null } | null };

export type GetArchivedWorkstreamsQueryVariables = Exact<{
  projectId: Scalars['ID']['input'];
}>;


export type GetArchivedWorkstreamsQuery = { __typename?: 'Query', archivedWorkstreams?: Array<{ __typename?: 'Workstream', id?: string | null, title?: string | null, status?: WorkstreamStatus | null, messageCount?: number | null, archivedAt?: string | number | null, updatedAt?: string | number | null }> | null };

export type CreateWorkstreamMutationVariables = Exact<{
  input: CreateWorkstreamInput;
}>;


export type CreateWorkstreamMutation = { __typename?: 'Mutation', createWorkstream?: { __typename?: 'CreateWorkstreamPayload', workstream?: { __typename?: 'Workstream', id?: string | null, title?: string | null, status?: WorkstreamStatus | null, model?: string | null, isPinned?: boolean | null, messageCount?: number | null, createdAt?: string | number | null } | null } | null };

export type ForkWorkstreamMutationVariables = Exact<{
  input: ForkWorkstreamInput;
}>;


export type ForkWorkstreamMutation = { __typename?: 'Mutation', forkWorkstream?: { __typename?: 'ForkWorkstreamPayload', workstream?: { __typename?: 'Workstream', id?: string | null, title?: string | null, status?: WorkstreamStatus | null, model?: string | null, isPinned?: boolean | null, messageCount?: number | null, createdAt?: string | number | null, groupId?: string | null } | null, worktrees?: Array<{ __typename?: 'WorktreeResult', directoryPath?: string | null, branch?: string | null, worktreePath?: string | null, error?: string | null }> | null } | null };

export type UpdateWorkstreamMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateWorkstreamInput;
}>;


export type UpdateWorkstreamMutation = { __typename?: 'Mutation', updateWorkstream?: { __typename?: 'UpdateWorkstreamPayload', workstream?: { __typename?: 'Workstream', id?: string | null, title?: string | null, status?: WorkstreamStatus | null, model?: string | null, isPinned?: boolean | null, updatedAt?: string | number | null } | null } | null };

export type ArchiveWorkstreamMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ArchiveWorkstreamMutation = { __typename?: 'Mutation', archiveWorkstream?: { __typename?: 'ArchiveWorkstreamPayload', workstream?: { __typename?: 'Workstream', id?: string | null, status?: WorkstreamStatus | null, archivedAt?: string | number | null, updatedAt?: string | number | null } | null } | null };

export type UnarchiveWorkstreamMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type UnarchiveWorkstreamMutation = { __typename?: 'Mutation', unarchiveWorkstream?: { __typename?: 'UnarchiveWorkstreamPayload', workstream?: { __typename?: 'Workstream', id?: string | null, status?: WorkstreamStatus | null, archivedAt?: string | number | null, updatedAt?: string | number | null } | null } | null };

export type PinWorkstreamMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type PinWorkstreamMutation = { __typename?: 'Mutation', pinWorkstream?: { __typename?: 'PinWorkstreamPayload', workstream?: { __typename?: 'Workstream', id?: string | null, isPinned?: boolean | null } | null } | null };

export type UnpinWorkstreamMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type UnpinWorkstreamMutation = { __typename?: 'Mutation', unpinWorkstream?: { __typename?: 'UnpinWorkstreamPayload', workstream?: { __typename?: 'Workstream', id?: string | null, isPinned?: boolean | null } | null } | null };

export type DeleteWorkstreamMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteWorkstreamMutation = { __typename?: 'Mutation', deleteWorkstream?: { __typename?: 'DeleteWorkstreamPayload', workstream?: { __typename?: 'Workstream', id?: string | null } | null } | null };

export type GetEntityQueryVariables = Exact<{
  uri: Scalars['String']['input'];
}>;


export type GetEntityQuery = { __typename?: 'Query', entity?: { __typename?: 'Entity', id?: string | null, type?: string | null, uri?: string | null, title?: string | null, description?: string | null, createdAt?: string | number | null, updatedAt?: string | number | null } | null };

export type GetEntitiesQueryVariables = Exact<{
  type: Scalars['String']['input'];
  query?: InputMaybe<Scalars['String']['input']>;
  filters?: InputMaybe<Scalars['JSON']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetEntitiesQuery = { __typename?: 'Query', entities?: Array<{ __typename?: 'Entity', id?: string | null, type?: string | null, uri?: string | null, title?: string | null, description?: string | null, createdAt?: string | number | null, updatedAt?: string | number | null }> | null };

export type SearchEntitiesQueryVariables = Exact<{
  query: Scalars['String']['input'];
  types?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type SearchEntitiesQuery = { __typename?: 'Query', entitySearch?: Array<{ __typename?: 'Entity', id?: string | null, type?: string | null, uri?: string | null, title?: string | null, description?: string | null, createdAt?: string | number | null, updatedAt?: string | number | null }> | null };

export type GetEntityTypesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetEntityTypesQuery = { __typename?: 'Query', entityTypes?: Array<{ __typename?: 'EntityTypeInfo', type?: string | null, displayName?: string | null, icon?: string | null, source?: string | null, uriExample?: string | null, display?: Record<string, unknown> | null }> | null };

export type GetEntityMutationCatalogQueryVariables = Exact<{ [key: string]: never; }>;


export type GetEntityMutationCatalogQuery = { __typename?: 'Query', entityMutationCatalog?: Array<{ __typename?: 'EntityMutationGroup', entityType?: string | null, entityDisplayName?: string | null, mutations?: Array<{ __typename?: 'MutationCatalogEntry', name?: string | null, description?: string | null, entityType?: string | null }> | null }> | null };

export type GetRoutinesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetRoutinesQuery = { __typename?: 'Query', routines?: Array<{ __typename?: 'Routine', id?: string | null, name?: string | null, description?: string | null, workstreamId?: string | null, status?: RoutineStatus | null, runCount?: number | null, lastRunAt?: string | number | null, nextRunAt?: string | number | null, createdAt?: string | number | null, updatedAt?: string | number | null, schedule?: { __typename?: 'RoutineSchedule', type?: ScheduleType | null, expression?: string | null, timezone?: string | null } | null, latestRun?: { __typename?: 'RoutineRun', id?: string | null, status?: RoutineRunStatus | null, triggeredBy?: RoutineRunTriggeredBy | null, startedAt?: string | number | null, completedAt?: string | number | null } | null }> | null };

export type GetRoutinesByProjectQueryVariables = Exact<{
  projectId: Scalars['ID']['input'];
}>;


export type GetRoutinesByProjectQuery = { __typename?: 'Query', routinesByProject?: Array<{ __typename?: 'Routine', id?: string | null, name?: string | null, description?: string | null, workstreamId?: string | null, status?: RoutineStatus | null, runCount?: number | null, lastRunAt?: string | number | null, nextRunAt?: string | number | null, createdAt?: string | number | null, updatedAt?: string | number | null, schedule?: { __typename?: 'RoutineSchedule', type?: ScheduleType | null, expression?: string | null, timezone?: string | null } | null, latestRun?: { __typename?: 'RoutineRun', id?: string | null, status?: RoutineRunStatus | null, triggeredBy?: RoutineRunTriggeredBy | null, startedAt?: string | number | null, completedAt?: string | number | null } | null }> | null };

export type GetRoutineQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetRoutineQuery = { __typename?: 'Query', routine?: { __typename?: 'Routine', id?: string | null, name?: string | null, description?: string | null, prompt?: string | null, workstreamId?: string | null, status?: RoutineStatus | null, preferences?: Record<string, unknown> | null, runCount?: number | null, lastRunAt?: string | number | null, nextRunAt?: string | number | null, createdAt?: string | number | null, updatedAt?: string | number | null, schedule?: { __typename?: 'RoutineSchedule', type?: ScheduleType | null, expression?: string | null, timezone?: string | null } | null, workstream?: { __typename?: 'Workstream', id?: string | null, title?: string | null, status?: WorkstreamStatus | null } | null, latestRun?: { __typename?: 'RoutineRun', id?: string | null, status?: RoutineRunStatus | null, triggeredBy?: RoutineRunTriggeredBy | null, startedAt?: string | number | null, completedAt?: string | number | null, summary?: string | null, error?: string | null } | null } | null };

export type GetRoutineByWorkstreamQueryVariables = Exact<{
  workstreamId: Scalars['ID']['input'];
}>;


export type GetRoutineByWorkstreamQuery = { __typename?: 'Query', routineByWorkstreamId?: { __typename?: 'Routine', id?: string | null, name?: string | null, description?: string | null, prompt?: string | null, status?: RoutineStatus | null, runCount?: number | null, lastRunAt?: string | number | null, nextRunAt?: string | number | null, schedule?: { __typename?: 'RoutineSchedule', type?: ScheduleType | null, expression?: string | null, timezone?: string | null } | null } | null };

export type GetRoutineRunHistoryQueryVariables = Exact<{
  routineId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetRoutineRunHistoryQuery = { __typename?: 'Query', routineRunHistory?: Array<{ __typename?: 'RoutineRun', id?: string | null, routineId?: string | null, status?: RoutineRunStatus | null, triggeredBy?: RoutineRunTriggeredBy | null, startedAt?: string | number | null, completedAt?: string | number | null, summary?: string | null, error?: string | null, createdAt?: string | number | null }> | null };

export type GetRoutineLatestRunQueryVariables = Exact<{
  routineId: Scalars['ID']['input'];
}>;


export type GetRoutineLatestRunQuery = { __typename?: 'Query', routineLatestRun?: { __typename?: 'RoutineRun', id?: string | null, status?: RoutineRunStatus | null, triggeredBy?: RoutineRunTriggeredBy | null, startedAt?: string | number | null, completedAt?: string | number | null, summary?: string | null, error?: string | null } | null };

export type CreateRoutineMutationVariables = Exact<{
  input: CreateRoutineInput;
}>;


export type CreateRoutineMutation = { __typename?: 'Mutation', createRoutine?: { __typename?: 'CreateRoutinePayload', routine?: { __typename?: 'Routine', id?: string | null, name?: string | null, description?: string | null, prompt?: string | null, workstreamId?: string | null, status?: RoutineStatus | null, runCount?: number | null, createdAt?: string | number | null, schedule?: { __typename?: 'RoutineSchedule', type?: ScheduleType | null, expression?: string | null, timezone?: string | null } | null } | null } | null };

export type UpdateRoutineMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateRoutineInput;
}>;


export type UpdateRoutineMutation = { __typename?: 'Mutation', updateRoutine?: { __typename?: 'UpdateRoutinePayload', routine?: { __typename?: 'Routine', id?: string | null, name?: string | null, description?: string | null, prompt?: string | null, status?: RoutineStatus | null, updatedAt?: string | number | null, schedule?: { __typename?: 'RoutineSchedule', type?: ScheduleType | null, expression?: string | null, timezone?: string | null } | null } | null } | null };

export type DeleteRoutineMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteRoutineMutation = { __typename?: 'Mutation', deleteRoutine?: { __typename?: 'DeleteRoutinePayload', routine?: { __typename?: 'Routine', id?: string | null, name?: string | null } | null } | null };

export type PauseRoutineMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type PauseRoutineMutation = { __typename?: 'Mutation', pauseRoutine?: { __typename?: 'PauseRoutinePayload', routine?: { __typename?: 'Routine', id?: string | null, status?: RoutineStatus | null, updatedAt?: string | number | null } | null } | null };

export type ResumeRoutineMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ResumeRoutineMutation = { __typename?: 'Mutation', resumeRoutine?: { __typename?: 'ResumeRoutinePayload', routine?: { __typename?: 'Routine', id?: string | null, status?: RoutineStatus | null, nextRunAt?: string | number | null, updatedAt?: string | number | null } | null } | null };

export type RunRoutineNowMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RunRoutineNowMutation = { __typename?: 'Mutation', runRoutineNow?: { __typename?: 'RunRoutineNowPayload', routine?: { __typename?: 'Routine', id?: string | null, status?: RoutineStatus | null, runCount?: number | null, lastRunAt?: string | number | null, latestRun?: { __typename?: 'RoutineRun', id?: string | null, status?: RoutineRunStatus | null, triggeredBy?: RoutineRunTriggeredBy | null, startedAt?: string | number | null, completedAt?: string | number | null } | null } | null } | null };

export type SendWorkstreamMessageMutationVariables = Exact<{
  workstreamId: Scalars['ID']['input'];
  text: Scalars['String']['input'];
  imageAttachments?: InputMaybe<Array<ImageAttachmentInput> | ImageAttachmentInput>;
  imageContentBlocks?: InputMaybe<Array<ImageContentBlockInput> | ImageContentBlockInput>;
}>;


export type SendWorkstreamMessageMutation = { __typename?: 'Mutation', sendWorkstreamMessage?: { __typename?: 'SendWorkstreamMessagePayload', workstream?: { __typename?: 'Workstream', id?: string | null, status?: WorkstreamStatus | null, messageCount?: number | null, lastActivityAt?: string | number | null, updatedAt?: string | number | null } | null } | null };

export type StopWorkstreamAgentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type StopWorkstreamAgentMutation = { __typename?: 'Mutation', stopWorkstreamAgent?: { __typename?: 'StopWorkstreamAgentPayload', workstream?: { __typename?: 'Workstream', id?: string | null, status?: WorkstreamStatus | null, updatedAt?: string | number | null } | null } | null };

export type RestartWorkstreamAgentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RestartWorkstreamAgentMutation = { __typename?: 'Mutation', restartWorkstreamAgent?: { __typename?: 'RestartWorkstreamAgentPayload', workstream?: { __typename?: 'Workstream', id?: string | null, status?: WorkstreamStatus | null, updatedAt?: string | number | null } | null } | null };

export type RespondWorkstreamPermissionMutationVariables = Exact<{
  workstreamId: Scalars['ID']['input'];
  requestId: Scalars['String']['input'];
  response: PermissionResponseInput;
}>;


export type RespondWorkstreamPermissionMutation = { __typename?: 'Mutation', respondWorkstreamPermission?: { __typename?: 'RespondWorkstreamPermissionPayload', workstream?: { __typename?: 'Workstream', id?: string | null, status?: WorkstreamStatus | null, updatedAt?: string | number | null } | null } | null };

export type RevokePermissionRuleMutationVariables = Exact<{
  workstreamId: Scalars['ID']['input'];
  toolName: Scalars['String']['input'];
  scope: PermissionRuleScope;
}>;


export type RevokePermissionRuleMutation = { __typename?: 'Mutation', revokePermissionRule?: { __typename?: 'RevokePermissionRulePayload', workstream?: { __typename?: 'Workstream', id?: string | null, status?: WorkstreamStatus | null, updatedAt?: string | number | null } | null } | null };

export type InterruptWorkstreamAgentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type InterruptWorkstreamAgentMutation = { __typename?: 'Mutation', interruptWorkstreamAgent?: { __typename?: 'InterruptWorkstreamAgentPayload', workstream?: { __typename?: 'Workstream', id?: string | null, status?: WorkstreamStatus | null, updatedAt?: string | number | null } | null } | null };

export type ClearWorkstreamConversationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ClearWorkstreamConversationMutation = { __typename?: 'Mutation', clearWorkstreamConversation?: { __typename?: 'ClearWorkstreamConversationPayload', workstream?: { __typename?: 'Workstream', id?: string | null, status?: WorkstreamStatus | null, updatedAt?: string | number | null } | null } | null };

export type CompactWorkstreamConversationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  instructions?: InputMaybe<Scalars['String']['input']>;
}>;


export type CompactWorkstreamConversationMutation = { __typename?: 'Mutation', compactWorkstreamConversation?: { __typename?: 'CompactWorkstreamConversationPayload', workstream?: { __typename?: 'Workstream', id?: string | null, status?: WorkstreamStatus | null, updatedAt?: string | number | null } | null } | null };

export type RewindWorkstreamConversationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  eventId: Scalars['Int']['input'];
  role?: InputMaybe<Scalars['String']['input']>;
}>;


export type RewindWorkstreamConversationMutation = { __typename?: 'Mutation', rewindWorkstreamConversation?: { __typename?: 'RewindWorkstreamConversationPayload', workstream?: { __typename?: 'Workstream', id?: string | null, status?: WorkstreamStatus | null, updatedAt?: string | number | null } | null } | null };

export type SetWorkstreamInFocusMutationVariables = Exact<{
  id?: InputMaybe<Scalars['ID']['input']>;
}>;


export type SetWorkstreamInFocusMutation = { __typename?: 'Mutation', setWorkstreamInFocus?: { __typename?: 'SetWorkstreamInFocusPayload', workstream?: { __typename?: 'Workstream', id?: string | null, status?: WorkstreamStatus | null, updatedAt?: string | number | null, inFocus?: boolean | null } | null } | null };

export type ReplayWorkstreamHistoryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ReplayWorkstreamHistoryMutation = { __typename?: 'Mutation', replayWorkstreamHistory?: { __typename?: 'ReplayHistoryPayload', hasMore?: boolean | null, oldestEventId?: number | null, workstream?: { __typename?: 'Workstream', id?: string | null, status?: WorkstreamStatus | null, updatedAt?: string | number | null } | null } | null };

export type LoadMoreWorkstreamHistoryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  beforeEventId: Scalars['Int']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type LoadMoreWorkstreamHistoryMutation = { __typename?: 'Mutation', loadMoreWorkstreamHistory?: { __typename?: 'ReplayHistoryPayload', hasMore?: boolean | null, oldestEventId?: number | null, workstream?: { __typename?: 'Workstream', id?: string | null, status?: WorkstreamStatus | null, updatedAt?: string | number | null } | null } | null };

export type IsWorkstreamAgentRunningQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type IsWorkstreamAgentRunningQuery = { __typename?: 'Query', isWorkstreamAgentRunning?: boolean | null };

export type GetUserMessageHistoryQueryVariables = Exact<{
  workstreamId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  before?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetUserMessageHistoryQuery = { __typename?: 'Query', userMessageHistory?: { __typename?: 'UserMessageHistoryConnection', hasMore?: boolean | null, items?: Array<{ __typename?: 'UserMessageHistoryItem', eventId?: number | null, messageId?: string | null, text?: string | null, timestamp?: string | number | null }> | null } | null };

export type GetWorkstreamLinkedEntitiesQueryVariables = Exact<{
  workstreamId: Scalars['ID']['input'];
}>;


export type GetWorkstreamLinkedEntitiesQuery = { __typename?: 'Query', workstreamLinkedEntities?: Array<{ __typename?: 'WorkstreamLinkedEntity', workstreamId?: string | null, entityUri?: string | null, entityType?: string | null, entityTitle?: string | null, contextOverride?: string | null, createdAt?: string | number | null, isInherited?: boolean | null }> | null };

export type GetWorkstreamDirectoriesQueryVariables = Exact<{
  workstreamId: Scalars['ID']['input'];
}>;


export type GetWorkstreamDirectoriesQuery = { __typename?: 'Query', workstreamDirectories?: Array<{ __typename?: 'WorkstreamDirectory', id?: string | null, workstreamId?: string | null, path?: string | null, label?: string | null, isInherited?: boolean | null, createdAt?: string | number | null }> | null };

export type SwitchWorkstreamModelMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  model: Scalars['String']['input'];
}>;


export type SwitchWorkstreamModelMutation = { __typename?: 'Mutation', switchWorkstreamModel?: { __typename?: 'SwitchWorkstreamModelPayload', workstream?: { __typename?: 'Workstream', id?: string | null, model?: string | null, updatedAt?: string | number | null } | null } | null };

export type LinkWorkstreamEntityMutationVariables = Exact<{
  workstreamId: Scalars['ID']['input'];
  entityUri: Scalars['String']['input'];
  entityType: Scalars['String']['input'];
  entityTitle?: InputMaybe<Scalars['String']['input']>;
}>;


export type LinkWorkstreamEntityMutation = { __typename?: 'Mutation', linkWorkstreamEntity?: { __typename?: 'LinkWorkstreamEntityPayload', workstream?: { __typename?: 'Workstream', id?: string | null, updatedAt?: string | number | null } | null } | null };

export type UnlinkWorkstreamEntityMutationVariables = Exact<{
  workstreamId: Scalars['ID']['input'];
  entityUri: Scalars['String']['input'];
}>;


export type UnlinkWorkstreamEntityMutation = { __typename?: 'Mutation', unlinkWorkstreamEntity?: { __typename?: 'UnlinkWorkstreamEntityPayload', workstream?: { __typename?: 'Workstream', id?: string | null, updatedAt?: string | number | null } | null } | null };

export type SetLinkedEntityContextOverrideMutationVariables = Exact<{
  workstreamId: Scalars['ID']['input'];
  entityUri: Scalars['String']['input'];
  contextOverride?: InputMaybe<Scalars['String']['input']>;
}>;


export type SetLinkedEntityContextOverrideMutation = { __typename?: 'Mutation', setLinkedEntityContextOverride?: { __typename?: 'SetLinkedEntityContextOverridePayload', workstream?: { __typename?: 'Workstream', id?: string | null, updatedAt?: string | number | null } | null } | null };

export type GetWorkstreamReferencesQueryVariables = Exact<{
  workstreamId: Scalars['ID']['input'];
}>;


export type GetWorkstreamReferencesQuery = { __typename?: 'Query', workstreamReferences?: Array<{ __typename?: 'WorkstreamReference', workstreamId?: string | null, entityUri?: string | null, entityType?: string | null, entityTitle?: string | null, externalUrl?: string | null, firstReferencedAt?: string | number | null }> | null };

export type AddWorkstreamReferenceMutationVariables = Exact<{
  workstreamId: Scalars['ID']['input'];
  entityUri: Scalars['String']['input'];
  entityType: Scalars['String']['input'];
  entityTitle?: InputMaybe<Scalars['String']['input']>;
}>;


export type AddWorkstreamReferenceMutation = { __typename?: 'Mutation', addWorkstreamReference?: { __typename?: 'AddWorkstreamReferencePayload', workstream?: { __typename?: 'Workstream', id?: string | null, updatedAt?: string | number | null } | null } | null };

export type RemoveWorkstreamReferenceMutationVariables = Exact<{
  workstreamId: Scalars['ID']['input'];
  entityUri: Scalars['String']['input'];
}>;


export type RemoveWorkstreamReferenceMutation = { __typename?: 'Mutation', removeWorkstreamReference?: { __typename?: 'RemoveWorkstreamReferencePayload', workstream?: { __typename?: 'Workstream', id?: string | null, updatedAt?: string | number | null } | null } | null };

export type PromoteWorkstreamReferenceMutationVariables = Exact<{
  workstreamId: Scalars['ID']['input'];
  entityUri: Scalars['String']['input'];
  entityType: Scalars['String']['input'];
  entityTitle?: InputMaybe<Scalars['String']['input']>;
}>;


export type PromoteWorkstreamReferenceMutation = { __typename?: 'Mutation', promoteWorkstreamReference?: { __typename?: 'PromoteWorkstreamReferencePayload', workstream?: { __typename?: 'Workstream', id?: string | null, updatedAt?: string | number | null } | null } | null };

export type GetWorkstreamsByEntityQueryVariables = Exact<{
  entityUri: Scalars['String']['input'];
}>;


export type GetWorkstreamsByEntityQuery = { __typename?: 'Query', workstreamsByEntity?: Array<{ __typename?: 'WorkstreamEntityLink', entityUri?: string | null, entityType?: string | null, entityTitle?: string | null, workstreamId?: string | null, groupId?: string | null, createdAt?: string | number | null, workstream?: { __typename?: 'Workstream', id?: string | null, title?: string | null, status?: WorkstreamStatus | null, groupId?: string | null } | null }> | null };

export type ResolveLinkedEntityContextQueryVariables = Exact<{
  entityUri: Scalars['String']['input'];
}>;


export type ResolveLinkedEntityContextQuery = { __typename?: 'Query', resolveLinkedEntityContext?: string | null };

export type EntitySearchQueryVariables = Exact<{
  query: Scalars['String']['input'];
  types?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type EntitySearchQuery = { __typename?: 'Query', entitySearch?: Array<{ __typename?: 'Entity', id?: string | null, type?: string | null, uri?: string | null, title?: string | null }> | null };

export type AddWorkstreamDirectoryMutationVariables = Exact<{
  workstreamId: Scalars['ID']['input'];
  path: Scalars['String']['input'];
  label?: InputMaybe<Scalars['String']['input']>;
}>;


export type AddWorkstreamDirectoryMutation = { __typename?: 'Mutation', addWorkstreamDirectory?: { __typename?: 'AddWorkstreamDirectoryPayload', workstream?: { __typename?: 'Workstream', id?: string | null, updatedAt?: string | number | null } | null } | null };

export type RemoveWorkstreamDirectoryMutationVariables = Exact<{
  workstreamId: Scalars['ID']['input'];
  path: Scalars['String']['input'];
}>;


export type RemoveWorkstreamDirectoryMutation = { __typename?: 'Mutation', removeWorkstreamDirectory?: { __typename?: 'RemoveWorkstreamDirectoryPayload', workstream?: { __typename?: 'Workstream', id?: string | null, updatedAt?: string | number | null } | null } | null };

export type GetProjectDirectoriesQueryVariables = Exact<{
  projectId: Scalars['ID']['input'];
}>;


export type GetProjectDirectoriesQuery = { __typename?: 'Query', projectDirectories?: Array<{ __typename?: 'ProjectDirectory', id?: string | null, projectId?: string | null, path?: string | null, label?: string | null, createdAt?: string | number | null }> | null };

export type AddProjectDirectoryMutationVariables = Exact<{
  projectId: Scalars['ID']['input'];
  path: Scalars['String']['input'];
  label?: InputMaybe<Scalars['String']['input']>;
}>;


export type AddProjectDirectoryMutation = { __typename?: 'Mutation', addProjectDirectory?: { __typename?: 'AddProjectDirectoryPayload', project?: { __typename?: 'Project', id?: string | null, updatedAt?: string | number | null } | null, directory?: { __typename?: 'ProjectDirectory', id?: string | null, path?: string | null, label?: string | null, createdAt?: string | number | null } | null } | null };

export type RemoveProjectDirectoryMutationVariables = Exact<{
  projectId: Scalars['ID']['input'];
  path: Scalars['String']['input'];
}>;


export type RemoveProjectDirectoryMutation = { __typename?: 'Mutation', removeProjectDirectory?: { __typename?: 'RemoveProjectDirectoryPayload', removed?: boolean | null, project?: { __typename?: 'Project', id?: string | null, updatedAt?: string | number | null } | null } | null };

export type GetBranchSelectionsQueryVariables = Exact<{
  workstreamId: Scalars['ID']['input'];
}>;


export type GetBranchSelectionsQuery = { __typename?: 'Query', branchSelections?: Array<{ __typename?: 'BranchSelection', id?: string | null, workstreamId?: string | null, directoryPath?: string | null, branch?: string | null, worktreePath?: string | null, baseBranch?: string | null, createdAt?: string | number | null, updatedAt?: string | number | null }> | null };

export type GetDirectoriesWithBranchInfoQueryVariables = Exact<{
  workstreamId: Scalars['ID']['input'];
}>;


export type GetDirectoriesWithBranchInfoQuery = { __typename?: 'Query', directoriesWithBranchInfo?: Array<{ __typename?: 'DirectoryWithBranchInfo', path?: string | null, effectivePath?: string | null, label?: string | null, branch?: string | null, baseBranch?: string | null, worktreePath?: string | null, isInherited?: boolean | null }> | null };

export type SetBranchSelectionMutationVariables = Exact<{
  workstreamId: Scalars['ID']['input'];
  directoryPath: Scalars['String']['input'];
  branch: Scalars['String']['input'];
  worktreePath?: InputMaybe<Scalars['String']['input']>;
  baseBranch?: InputMaybe<Scalars['String']['input']>;
  createWorktree?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type SetBranchSelectionMutation = { __typename?: 'Mutation', setBranchSelection?: { __typename?: 'SetBranchSelectionPayload', worktreeError?: string | null, branchSelection?: { __typename?: 'BranchSelection', id?: string | null, directoryPath?: string | null, branch?: string | null, worktreePath?: string | null, baseBranch?: string | null, updatedAt?: string | number | null } | null } | null };

export type RemoveBranchSelectionMutationVariables = Exact<{
  workstreamId: Scalars['ID']['input'];
  directoryPath: Scalars['String']['input'];
}>;


export type RemoveBranchSelectionMutation = { __typename?: 'Mutation', removeBranchSelection?: { __typename?: 'RemoveBranchSelectionPayload', removed?: boolean | null } | null };

export type GetGroupDirectoriesWithBranchesQueryVariables = Exact<{
  groupId: Scalars['ID']['input'];
}>;


export type GetGroupDirectoriesWithBranchesQuery = { __typename?: 'Query', workstreamGroup?: { __typename?: 'WorkstreamGroup', id?: string | null, autoCreateWorktrees?: boolean | null, directories?: Array<{ __typename?: 'GroupDirectory', id?: string | null, path?: string | null, label?: string | null }> | null, branchSelections?: Array<{ __typename?: 'GroupBranchSelection', id?: string | null, directoryPath?: string | null, branch?: string | null, baseBranch?: string | null }> | null } | null };

export type AddGroupDirectoryMutationVariables = Exact<{
  groupId: Scalars['ID']['input'];
  path: Scalars['String']['input'];
  label?: InputMaybe<Scalars['String']['input']>;
}>;


export type AddGroupDirectoryMutation = { __typename?: 'Mutation', addGroupDirectory?: { __typename?: 'AddGroupDirectoryPayload', group?: { __typename?: 'WorkstreamGroup', id?: string | null } | null } | null };

export type RemoveGroupDirectoryMutationVariables = Exact<{
  groupId: Scalars['ID']['input'];
  path: Scalars['String']['input'];
}>;


export type RemoveGroupDirectoryMutation = { __typename?: 'Mutation', removeGroupDirectory?: { __typename?: 'RemoveGroupDirectoryPayload', group?: { __typename?: 'WorkstreamGroup', id?: string | null } | null } | null };

export type SetGroupBranchSelectionMutationVariables = Exact<{
  groupId: Scalars['ID']['input'];
  directoryPath: Scalars['String']['input'];
  branch: Scalars['String']['input'];
  baseBranch?: InputMaybe<Scalars['String']['input']>;
}>;


export type SetGroupBranchSelectionMutation = { __typename?: 'Mutation', setGroupBranchSelection?: { __typename?: 'SetGroupBranchSelectionPayload', group?: { __typename?: 'WorkstreamGroup', id?: string | null } | null } | null };

export type RemoveGroupBranchSelectionMutationVariables = Exact<{
  groupId: Scalars['ID']['input'];
  directoryPath: Scalars['String']['input'];
}>;


export type RemoveGroupBranchSelectionMutation = { __typename?: 'Mutation', removeGroupBranchSelection?: { __typename?: 'RemoveGroupBranchSelectionPayload', group?: { __typename?: 'WorkstreamGroup', id?: string | null } | null } | null };

export type UpdateGroupAutoCreateWorktreesMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  autoCreateWorktrees: Scalars['Boolean']['input'];
}>;


export type UpdateGroupAutoCreateWorktreesMutation = { __typename?: 'Mutation', updateWorkstreamGroup?: { __typename?: 'UpdateWorkstreamGroupPayload', group?: { __typename?: 'WorkstreamGroup', id?: string | null, autoCreateWorktrees?: boolean | null } | null } | null };

export type ArchiveWorkstreamGroupMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ArchiveWorkstreamGroupMutation = { __typename?: 'Mutation', archiveWorkstreamGroup?: { __typename?: 'ArchiveWorkstreamGroupPayload', group?: { __typename?: 'WorkstreamGroup', id?: string | null } | null } | null };

export type GetWorkstreamGroupsByProjectQueryVariables = Exact<{
  projectId: Scalars['ID']['input'];
}>;


export type GetWorkstreamGroupsByProjectQuery = { __typename?: 'Query', workstreamGroupsByProject?: Array<{ __typename?: 'WorkstreamGroup', id?: string | null, name?: string | null, emoji?: string | null, isPinned?: boolean | null, autoCreateWorktrees?: boolean | null }> | null };

export type CreateWorkstreamGroupMutationVariables = Exact<{
  input: CreateWorkstreamGroupInput;
}>;


export type CreateWorkstreamGroupMutation = { __typename?: 'Mutation', createWorkstreamGroup?: { __typename?: 'CreateWorkstreamGroupPayload', group?: { __typename?: 'WorkstreamGroup', id?: string | null, name?: string | null, emoji?: string | null, isPinned?: boolean | null } | null } | null };

export type UpdateWorkstreamGroupMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateWorkstreamGroupInput;
}>;


export type UpdateWorkstreamGroupMutation = { __typename?: 'Mutation', updateWorkstreamGroup?: { __typename?: 'UpdateWorkstreamGroupPayload', group?: { __typename?: 'WorkstreamGroup', id?: string | null, name?: string | null, emoji?: string | null, isPinned?: boolean | null } | null } | null };

export type PinWorkstreamGroupMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type PinWorkstreamGroupMutation = { __typename?: 'Mutation', pinWorkstreamGroup?: { __typename?: 'PinWorkstreamGroupPayload', group?: { __typename?: 'WorkstreamGroup', id?: string | null, isPinned?: boolean | null } | null } | null };

export type UnpinWorkstreamGroupMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type UnpinWorkstreamGroupMutation = { __typename?: 'Mutation', unpinWorkstreamGroup?: { __typename?: 'UnpinWorkstreamGroupPayload', group?: { __typename?: 'WorkstreamGroup', id?: string | null, isPinned?: boolean | null } | null } | null };

export type DeleteWorkstreamGroupMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteWorkstreamGroupMutation = { __typename?: 'Mutation', deleteWorkstreamGroup?: { __typename?: 'DeleteWorkstreamGroupPayload', group?: { __typename?: 'WorkstreamGroup', id?: string | null } | null } | null };

export type AddWorkstreamToGroupMutationVariables = Exact<{
  workstreamId: Scalars['ID']['input'];
  groupId: Scalars['ID']['input'];
}>;


export type AddWorkstreamToGroupMutation = { __typename?: 'Mutation', addWorkstreamToGroup?: { __typename?: 'AddWorkstreamToGroupPayload', workstream?: { __typename?: 'Workstream', id?: string | null, groupId?: string | null } | null } | null };

export type RemoveWorkstreamFromGroupMutationVariables = Exact<{
  workstreamId: Scalars['ID']['input'];
}>;


export type RemoveWorkstreamFromGroupMutation = { __typename?: 'Mutation', removeWorkstreamFromGroup?: { __typename?: 'RemoveWorkstreamFromGroupPayload', workstream?: { __typename?: 'Workstream', id?: string | null, groupId?: string | null } | null } | null };

export type LinkGroupEntityMutationVariables = Exact<{
  groupId: Scalars['ID']['input'];
  entityUri: Scalars['String']['input'];
  entityType: Scalars['String']['input'];
  entityTitle?: InputMaybe<Scalars['String']['input']>;
}>;


export type LinkGroupEntityMutation = { __typename?: 'Mutation', linkGroupEntity?: { __typename?: 'LinkGroupEntityPayload', group?: { __typename?: 'WorkstreamGroup', id?: string | null } | null } | null };

export type UnlinkGroupEntityMutationVariables = Exact<{
  groupId: Scalars['ID']['input'];
  entityUri: Scalars['String']['input'];
}>;


export type UnlinkGroupEntityMutation = { __typename?: 'Mutation', unlinkGroupEntity?: { __typename?: 'UnlinkGroupEntityPayload', group?: { __typename?: 'WorkstreamGroup', id?: string | null } | null } | null };

export type GetGroupLinkedEntitiesQueryVariables = Exact<{
  groupId: Scalars['ID']['input'];
}>;


export type GetGroupLinkedEntitiesQuery = { __typename?: 'Query', groupLinkedEntities?: Array<{ __typename?: 'GroupLinkedEntity', groupId?: string | null, entityUri?: string | null, entityType?: string | null, entityTitle?: string | null, contextOverride?: string | null, createdAt?: string | number | null }> | null };

export type IsGitRepoQueryVariables = Exact<{
  path: Scalars['String']['input'];
}>;


export type IsGitRepoQuery = { __typename?: 'Query', isGitRepo?: boolean | null };

export type GetGitBranchesQueryVariables = Exact<{
  path: Scalars['String']['input'];
}>;


export type GetGitBranchesQuery = { __typename?: 'Query', gitBranches?: Array<{ __typename?: 'GitBranch', name?: string | null, isCurrent?: boolean | null, isRemote?: boolean | null, hasWorktree?: boolean | null, worktreePath?: string | null }> | null };

export type GetGitCurrentBranchQueryVariables = Exact<{
  path: Scalars['String']['input'];
}>;


export type GetGitCurrentBranchQuery = { __typename?: 'Query', gitCurrentBranch?: string | null };

export type GetGitDefaultBranchQueryVariables = Exact<{
  path: Scalars['String']['input'];
}>;


export type GetGitDefaultBranchQuery = { __typename?: 'Query', gitDefaultBranch?: string | null };

export type GetGitDiffSummaryQueryVariables = Exact<{
  path: Scalars['String']['input'];
  base: Scalars['String']['input'];
}>;


export type GetGitDiffSummaryQuery = { __typename?: 'Query', gitDiffSummary?: { __typename?: 'GitDiffSummary', additions?: number | null, deletions?: number | null, files?: Array<{ __typename?: 'GitStatusFile', path?: string | null, status?: string | null, oldPath?: string | null, staged?: boolean | null, additions?: number | null, deletions?: number | null }> | null } | null };

export type GetGitWorkingTreeSummaryQueryVariables = Exact<{
  path: Scalars['String']['input'];
}>;


export type GetGitWorkingTreeSummaryQuery = { __typename?: 'Query', gitWorkingTreeSummary?: { __typename?: 'GitDiffSummary', additions?: number | null, deletions?: number | null, files?: Array<{ __typename?: 'GitStatusFile', path?: string | null, status?: string | null, oldPath?: string | null, staged?: boolean | null, additions?: number | null, deletions?: number | null }> | null } | null };

export type GetGitCommitLogQueryVariables = Exact<{
  path: Scalars['String']['input'];
  base: Scalars['String']['input'];
}>;


export type GetGitCommitLogQuery = { __typename?: 'Query', gitCommitLog?: Array<{ __typename?: 'GitCommit', hash?: string | null, shortHash?: string | null, message?: string | null, author?: string | null, date?: number | null }> | null };

export type GetGitCommitDiffQueryVariables = Exact<{
  path: Scalars['String']['input'];
  hash: Scalars['String']['input'];
}>;


export type GetGitCommitDiffQuery = { __typename?: 'Query', gitCommitDiff?: string | null };

export type GetGitBranchDiffQueryVariables = Exact<{
  path: Scalars['String']['input'];
  base: Scalars['String']['input'];
}>;


export type GetGitBranchDiffQuery = { __typename?: 'Query', gitBranchDiff?: string | null };

export type GetGitWorkingTreeDiffQueryVariables = Exact<{
  path: Scalars['String']['input'];
}>;


export type GetGitWorkingTreeDiffQuery = { __typename?: 'Query', gitWorkingTreeDiff?: string | null };

export type GetGitStatusFilesQueryVariables = Exact<{
  path: Scalars['String']['input'];
}>;


export type GetGitStatusFilesQuery = { __typename?: 'Query', gitStatusFiles?: Array<{ __typename?: 'GitStatusFile', path?: string | null, status?: string | null, oldPath?: string | null, staged?: boolean | null, additions?: number | null, deletions?: number | null }> | null };

export type GetGitFileDiffQueryVariables = Exact<{
  path: Scalars['String']['input'];
  filePath: Scalars['String']['input'];
  base?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetGitFileDiffQuery = { __typename?: 'Query', gitFileDiff?: string | null };

export type GetGitFileAtRefQueryVariables = Exact<{
  path: Scalars['String']['input'];
  filePath: Scalars['String']['input'];
  ref?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetGitFileAtRefQuery = { __typename?: 'Query', gitFileAtRef?: string | null };

export type GetSettingsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetSettingsQuery = { __typename?: 'Query', settings?: { __typename?: 'Settings', appearance?: { __typename?: 'AppearanceSettings', theme?: Theme | null, fontSize?: number | null, compactMode?: boolean | null, zoomLevel?: number | null } | null, ai?: { __typename?: 'AiSettings', defaultModel?: string | null, cliPath?: string | null, cliSetupComplete?: boolean | null, autoCompactPercent?: number | null } | null, advanced?: { __typename?: 'AdvancedSettings', developerMode?: boolean | null, focusMonitorEnabled?: boolean | null, focusMonitorIntervalMs?: number | null } | null, permissions?: { __typename?: 'PermissionsSettings', activePreset?: PermissionPreset | null, rules?: Array<{ __typename?: 'PermissionRuleConfig', tool?: string | null, behavior?: PermissionBehaviorSetting | null, entityType?: string | null }> | null } | null, notifications?: { __typename?: 'NotificationsSettings', mutedSources?: Record<string, unknown> | null, mutedTypes?: Record<string, unknown> | null } | null } | null };

export type UpdateAppearanceSettingsMutationVariables = Exact<{
  input: UpdateAppearanceSettingsInput;
}>;


export type UpdateAppearanceSettingsMutation = { __typename?: 'Mutation', updateAppearanceSettings?: { __typename?: 'Settings', appearance?: { __typename?: 'AppearanceSettings', theme?: Theme | null, fontSize?: number | null, compactMode?: boolean | null, zoomLevel?: number | null } | null, ai?: { __typename?: 'AiSettings', defaultModel?: string | null, cliPath?: string | null, cliSetupComplete?: boolean | null, autoCompactPercent?: number | null } | null, advanced?: { __typename?: 'AdvancedSettings', developerMode?: boolean | null, focusMonitorEnabled?: boolean | null, focusMonitorIntervalMs?: number | null } | null, permissions?: { __typename?: 'PermissionsSettings', activePreset?: PermissionPreset | null, rules?: Array<{ __typename?: 'PermissionRuleConfig', tool?: string | null, behavior?: PermissionBehaviorSetting | null, entityType?: string | null }> | null } | null, notifications?: { __typename?: 'NotificationsSettings', mutedSources?: Record<string, unknown> | null, mutedTypes?: Record<string, unknown> | null } | null } | null };

export type UpdateAiSettingsMutationVariables = Exact<{
  input: UpdateAiSettingsInput;
}>;


export type UpdateAiSettingsMutation = { __typename?: 'Mutation', updateAiSettings?: { __typename?: 'Settings', appearance?: { __typename?: 'AppearanceSettings', theme?: Theme | null, fontSize?: number | null, compactMode?: boolean | null, zoomLevel?: number | null } | null, ai?: { __typename?: 'AiSettings', defaultModel?: string | null, cliPath?: string | null, cliSetupComplete?: boolean | null, autoCompactPercent?: number | null } | null, advanced?: { __typename?: 'AdvancedSettings', developerMode?: boolean | null, focusMonitorEnabled?: boolean | null, focusMonitorIntervalMs?: number | null } | null, permissions?: { __typename?: 'PermissionsSettings', activePreset?: PermissionPreset | null, rules?: Array<{ __typename?: 'PermissionRuleConfig', tool?: string | null, behavior?: PermissionBehaviorSetting | null, entityType?: string | null }> | null } | null, notifications?: { __typename?: 'NotificationsSettings', mutedSources?: Record<string, unknown> | null, mutedTypes?: Record<string, unknown> | null } | null } | null };

export type UpdateAdvancedSettingsMutationVariables = Exact<{
  input: UpdateAdvancedSettingsInput;
}>;


export type UpdateAdvancedSettingsMutation = { __typename?: 'Mutation', updateAdvancedSettings?: { __typename?: 'Settings', appearance?: { __typename?: 'AppearanceSettings', theme?: Theme | null, fontSize?: number | null, compactMode?: boolean | null, zoomLevel?: number | null } | null, ai?: { __typename?: 'AiSettings', defaultModel?: string | null, cliPath?: string | null, cliSetupComplete?: boolean | null, autoCompactPercent?: number | null } | null, advanced?: { __typename?: 'AdvancedSettings', developerMode?: boolean | null, focusMonitorEnabled?: boolean | null, focusMonitorIntervalMs?: number | null } | null, permissions?: { __typename?: 'PermissionsSettings', activePreset?: PermissionPreset | null, rules?: Array<{ __typename?: 'PermissionRuleConfig', tool?: string | null, behavior?: PermissionBehaviorSetting | null, entityType?: string | null }> | null } | null, notifications?: { __typename?: 'NotificationsSettings', mutedSources?: Record<string, unknown> | null, mutedTypes?: Record<string, unknown> | null } | null } | null };

export type UpdateSettingsRawMutationVariables = Exact<{
  json: Scalars['String']['input'];
}>;


export type UpdateSettingsRawMutation = { __typename?: 'Mutation', updateSettingsRaw?: { __typename?: 'Settings', appearance?: { __typename?: 'AppearanceSettings', theme?: Theme | null, fontSize?: number | null, compactMode?: boolean | null, zoomLevel?: number | null } | null, ai?: { __typename?: 'AiSettings', defaultModel?: string | null, cliPath?: string | null, cliSetupComplete?: boolean | null, autoCompactPercent?: number | null } | null, advanced?: { __typename?: 'AdvancedSettings', developerMode?: boolean | null, focusMonitorEnabled?: boolean | null, focusMonitorIntervalMs?: number | null } | null, permissions?: { __typename?: 'PermissionsSettings', activePreset?: PermissionPreset | null, rules?: Array<{ __typename?: 'PermissionRuleConfig', tool?: string | null, behavior?: PermissionBehaviorSetting | null, entityType?: string | null }> | null } | null, notifications?: { __typename?: 'NotificationsSettings', mutedSources?: Record<string, unknown> | null, mutedTypes?: Record<string, unknown> | null } | null } | null };

export type GetNotificationSourcesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetNotificationSourcesQuery = { __typename?: 'Query', notificationSources?: Array<{ __typename?: 'NotificationSource', source?: string | null, muted?: boolean | null, types?: Array<{ __typename?: 'NotificationType', id?: string | null, source?: string | null, label?: string | null, description?: string | null, defaultEnabled?: boolean | null, muted?: boolean | null }> | null }> | null };

export type SetNotificationSourceMutedMutationVariables = Exact<{
  source: Scalars['String']['input'];
  muted: Scalars['Boolean']['input'];
}>;


export type SetNotificationSourceMutedMutation = { __typename?: 'Mutation', setNotificationSourceMuted?: { __typename?: 'Settings', notifications?: { __typename?: 'NotificationsSettings', mutedSources?: Record<string, unknown> | null, mutedTypes?: Record<string, unknown> | null } | null } | null };

export type SetNotificationTypeMutedMutationVariables = Exact<{
  typeId: Scalars['String']['input'];
  muted: Scalars['Boolean']['input'];
}>;


export type SetNotificationTypeMutedMutation = { __typename?: 'Mutation', setNotificationTypeMuted?: { __typename?: 'Settings', notifications?: { __typename?: 'NotificationsSettings', mutedSources?: Record<string, unknown> | null, mutedTypes?: Record<string, unknown> | null } | null } | null };

export type ResetNotificationMutesMutationVariables = Exact<{ [key: string]: never; }>;


export type ResetNotificationMutesMutation = { __typename?: 'Mutation', resetNotificationMutes?: { __typename?: 'Settings', notifications?: { __typename?: 'NotificationsSettings', mutedSources?: Record<string, unknown> | null, mutedTypes?: Record<string, unknown> | null } | null } | null };

export type GetRegistriesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetRegistriesQuery = { __typename?: 'Query', registries?: Array<{ __typename?: 'Registry', id?: string | null, name?: string | null, url?: string | null, enabled?: boolean | null, priority?: number | null, source?: RegistrySource | null, createdAt?: string | number | null, updatedAt?: string | number | null }> | null };

export type GetRegistryQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetRegistryQuery = { __typename?: 'Query', registry?: { __typename?: 'Registry', id?: string | null, name?: string | null, url?: string | null, enabled?: boolean | null, priority?: number | null, source?: RegistrySource | null, createdAt?: string | number | null, updatedAt?: string | number | null } | null };

export type GetRegistryQuickActionsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetRegistryQuickActionsQuery = { __typename?: 'Query', registryQuickActions?: Array<{ __typename?: 'QuickAction', id?: string | null, label?: string | null, icon?: string | null, description?: string | null, tags?: Array<string> | null, registry?: string | null, author?: { __typename?: 'QuickActionAuthor', name?: string | null } | null, options?: Array<{ __typename?: 'QuickActionOption', id?: string | null, label?: string | null, prompt?: string | null }> | null }> | null };

export type GetRegistryQuickActionDefaultsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetRegistryQuickActionDefaultsQuery = { __typename?: 'Query', registryQuickActionDefaults?: Array<string> | null };

export type GetRegistryVerificationActionsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetRegistryVerificationActionsQuery = { __typename?: 'Query', registryVerificationActions?: Array<{ __typename?: 'VerificationAction', id?: string | null, type?: VerificationActionType | null, label?: string | null, builtinId?: string | null, prompt?: string | null }> | null };

export type GetRegistryVerificationActionDefaultsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetRegistryVerificationActionDefaultsQuery = { __typename?: 'Query', registryVerificationActionDefaults?: Array<{ __typename?: 'VerificationAction', id?: string | null, type?: VerificationActionType | null, label?: string | null, builtinId?: string | null, prompt?: string | null }> | null };

export type AddRegistryMutationVariables = Exact<{
  input: AddRegistryInput;
}>;


export type AddRegistryMutation = { __typename?: 'Mutation', addRegistry?: { __typename?: 'AddRegistryPayload', registry?: { __typename?: 'Registry', id?: string | null, name?: string | null, url?: string | null, enabled?: boolean | null, priority?: number | null, source?: RegistrySource | null, createdAt?: string | number | null, updatedAt?: string | number | null } | null } | null };

export type RemoveRegistryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RemoveRegistryMutation = { __typename?: 'Mutation', removeRegistry?: { __typename?: 'RemoveRegistryPayload', registry?: { __typename?: 'Registry', id?: string | null, name?: string | null } | null } | null };

export type UpdateRegistryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateRegistryInput;
}>;


export type UpdateRegistryMutation = { __typename?: 'Mutation', updateRegistry?: { __typename?: 'UpdateRegistryPayload', registry?: { __typename?: 'Registry', id?: string | null, name?: string | null, url?: string | null, enabled?: boolean | null, priority?: number | null, updatedAt?: string | number | null } | null } | null };

export type SyncRegistriesMutationVariables = Exact<{ [key: string]: never; }>;


export type SyncRegistriesMutation = { __typename?: 'Mutation', syncRegistries?: { __typename?: 'SyncRegistriesPayload', synced?: number | null } | null };

export type GetInstalledSkillsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetInstalledSkillsQuery = { __typename?: 'Query', installedSkills?: Array<{ __typename?: 'InstalledSkill', id?: string | null, name?: string | null, description?: string | null, version?: string | null, registryVersion?: string | null, source?: SkillSource | null, sourceRef?: string | null, registry?: string | null, path?: string | null, icon?: string | null, category?: string | null, tags?: Array<string> | null, author?: string | null, enabled?: boolean | null, pinned?: boolean | null, installDate?: string | null, lastUsed?: string | null, useCount?: number | null, hasUpdate?: boolean | null }> | null };

export type GetRegistrySkillsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetRegistrySkillsQuery = { __typename?: 'Query', registrySkills?: Array<{ __typename?: 'RegistrySkill', id?: string | null, name?: string | null, description?: string | null, version?: string | null, source?: SkillSource | null, repo?: string | null, icon?: string | null, category?: string | null, tags?: Array<string> | null, registry?: string | null, author?: { __typename?: 'RegistrySkillAuthor', name?: string | null } | null }> | null };

export type InstallSkillMutationVariables = Exact<{
  skillId: Scalars['String']['input'];
  destination?: InputMaybe<Scalars['String']['input']>;
}>;


export type InstallSkillMutation = { __typename?: 'Mutation', installSkill?: { __typename?: 'InstallSkillPayload', skill?: { __typename?: 'InstalledSkill', id?: string | null, name?: string | null, description?: string | null, version?: string | null, registryVersion?: string | null, source?: SkillSource | null, sourceRef?: string | null, registry?: string | null, path?: string | null, icon?: string | null, category?: string | null, tags?: Array<string> | null, author?: string | null, enabled?: boolean | null, pinned?: boolean | null, installDate?: string | null, lastUsed?: string | null, useCount?: number | null, hasUpdate?: boolean | null } | null } | null };

export type UninstallSkillMutationVariables = Exact<{
  skillId: Scalars['String']['input'];
}>;


export type UninstallSkillMutation = { __typename?: 'Mutation', uninstallSkill?: { __typename?: 'UninstallSkillPayload', success?: boolean | null } | null };

export type UpdateSkillMutationVariables = Exact<{
  skillId: Scalars['String']['input'];
}>;


export type UpdateSkillMutation = { __typename?: 'Mutation', updateSkill?: { __typename?: 'UpdateSkillPayload', skill?: { __typename?: 'InstalledSkill', id?: string | null, name?: string | null, description?: string | null, version?: string | null, registryVersion?: string | null, source?: SkillSource | null, sourceRef?: string | null, registry?: string | null, path?: string | null, icon?: string | null, category?: string | null, tags?: Array<string> | null, author?: string | null, enabled?: boolean | null, pinned?: boolean | null, installDate?: string | null, lastUsed?: string | null, useCount?: number | null, hasUpdate?: boolean | null } | null } | null };

export type ActivateSkillMutationVariables = Exact<{
  skillId: Scalars['String']['input'];
}>;


export type ActivateSkillMutation = { __typename?: 'Mutation', activateSkill?: { __typename?: 'ActivateSkillPayload', body?: string | null } | null };

export type ToggleSkillEnabledMutationVariables = Exact<{
  skillId: Scalars['String']['input'];
  enabled: Scalars['Boolean']['input'];
}>;


export type ToggleSkillEnabledMutation = { __typename?: 'Mutation', toggleSkillEnabled?: { __typename?: 'ToggleSkillPayload', skill?: { __typename?: 'InstalledSkill', id?: string | null, enabled?: boolean | null } | null } | null };

export type ToggleSkillPinnedMutationVariables = Exact<{
  skillId: Scalars['String']['input'];
  pinned: Scalars['Boolean']['input'];
}>;


export type ToggleSkillPinnedMutation = { __typename?: 'Mutation', toggleSkillPinned?: { __typename?: 'ToggleSkillPayload', skill?: { __typename?: 'InstalledSkill', id?: string | null, pinned?: boolean | null } | null } | null };

export type SyncLocalSkillsMutationVariables = Exact<{ [key: string]: never; }>;


export type SyncLocalSkillsMutation = { __typename?: 'Mutation', syncLocalSkills?: boolean | null };

export type GetInstalledPluginsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetInstalledPluginsQuery = { __typename?: 'Query', installedPlugins?: Array<{ __typename?: 'InstalledPlugin', id?: string | null, name?: string | null, description?: string | null, version?: string | null, registryVersion?: string | null, source?: PluginSource | null, sourceRef?: string | null, registry?: string | null, path?: string | null, icon?: string | null, category?: string | null, tags?: Array<string> | null, author?: string | null, enabled?: boolean | null, installDate?: string | null, hasUpdate?: boolean | null }> | null };

export type GetRegistryPluginsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetRegistryPluginsQuery = { __typename?: 'Query', registryPlugins?: Array<{ __typename?: 'RegistryPlugin', id?: string | null, name?: string | null, description?: string | null, version?: string | null, source?: PluginSource | null, repo?: string | null, icon?: string | null, category?: string | null, tags?: Array<string> | null, registry?: string | null, author?: { __typename?: 'RegistryPluginAuthor', name?: string | null } | null, canvases?: { __typename?: 'RegistryPluginCanvases', navSidebar?: boolean | null, drawer?: boolean | null, menuBar?: boolean | null, feed?: boolean | null } | null }> | null };

export type InstallPluginMutationVariables = Exact<{
  pluginId: Scalars['String']['input'];
}>;


export type InstallPluginMutation = { __typename?: 'Mutation', installPlugin?: { __typename?: 'InstallPluginPayload', plugin?: { __typename?: 'InstalledPlugin', id?: string | null, name?: string | null, description?: string | null, version?: string | null, registryVersion?: string | null, source?: PluginSource | null, sourceRef?: string | null, registry?: string | null, path?: string | null, icon?: string | null, category?: string | null, tags?: Array<string> | null, author?: string | null, enabled?: boolean | null, installDate?: string | null, hasUpdate?: boolean | null } | null } | null };

export type UninstallPluginMutationVariables = Exact<{
  pluginId: Scalars['String']['input'];
}>;


export type UninstallPluginMutation = { __typename?: 'Mutation', uninstallPlugin?: { __typename?: 'UninstallPluginPayload', success?: boolean | null } | null };

export type UpdatePluginMutationVariables = Exact<{
  pluginId: Scalars['String']['input'];
}>;


export type UpdatePluginMutation = { __typename?: 'Mutation', updatePlugin?: { __typename?: 'UpdatePluginPayload', plugin?: { __typename?: 'InstalledPlugin', id?: string | null, name?: string | null, description?: string | null, version?: string | null, registryVersion?: string | null, source?: PluginSource | null, sourceRef?: string | null, registry?: string | null, path?: string | null, icon?: string | null, category?: string | null, tags?: Array<string> | null, author?: string | null, enabled?: boolean | null, installDate?: string | null, hasUpdate?: boolean | null } | null } | null };

export type TogglePluginEnabledMutationVariables = Exact<{
  pluginId: Scalars['String']['input'];
  enabled: Scalars['Boolean']['input'];
}>;


export type TogglePluginEnabledMutation = { __typename?: 'Mutation', togglePluginEnabled?: { __typename?: 'TogglePluginPayload', plugin?: { __typename?: 'InstalledPlugin', id?: string | null, enabled?: boolean | null } | null } | null };

export type GetCommandsQueryVariables = Exact<{
  categoryFilter?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetCommandsQuery = { __typename?: 'Query', commands?: Array<{ __typename?: 'Command', id?: string | null, category?: CommandCategory | null, title?: string | null, description?: string | null, keywords?: Array<string> | null, disabled?: boolean | null, disabledReason?: string | null, hasFlow?: boolean | null, body?: string | null }> | null };

export type ExecuteCommandMutationVariables = Exact<{
  commandId: Scalars['String']['input'];
  args?: InputMaybe<Scalars['JSON']['input']>;
}>;


export type ExecuteCommandMutation = { __typename?: 'Mutation', executeCommand?: { __typename?: 'ExecuteCommandPayload', success?: boolean | null, error?: string | null, action?: { __typename?: 'CommandResultAction', type?: string | null, path?: string | null, message?: string | null, variant?: string | null, text?: string | null } | null } | null };

export type RescanClaudeCommandsMutationVariables = Exact<{ [key: string]: never; }>;


export type RescanClaudeCommandsMutation = { __typename?: 'Mutation', rescanClaudeCommands?: boolean | null };

export type UpdatePermissionsSettingsMutationVariables = Exact<{
  input: UpdatePermissionsSettingsInput;
}>;


export type UpdatePermissionsSettingsMutation = { __typename?: 'Mutation', updatePermissionsSettings?: { __typename?: 'Settings', appearance?: { __typename?: 'AppearanceSettings', theme?: Theme | null, fontSize?: number | null, compactMode?: boolean | null, zoomLevel?: number | null } | null, ai?: { __typename?: 'AiSettings', defaultModel?: string | null, cliPath?: string | null, cliSetupComplete?: boolean | null, autoCompactPercent?: number | null } | null, advanced?: { __typename?: 'AdvancedSettings', developerMode?: boolean | null, focusMonitorEnabled?: boolean | null, focusMonitorIntervalMs?: number | null } | null, permissions?: { __typename?: 'PermissionsSettings', activePreset?: PermissionPreset | null, rules?: Array<{ __typename?: 'PermissionRuleConfig', tool?: string | null, behavior?: PermissionBehaviorSetting | null, entityType?: string | null }> | null } | null, notifications?: { __typename?: 'NotificationsSettings', mutedSources?: Record<string, unknown> | null, mutedTypes?: Record<string, unknown> | null } | null } | null };

export type GetPermissionPolicyQueryVariables = Exact<{
  scopeType: PermissionScopeType;
  scopeId: Scalars['String']['input'];
}>;


export type GetPermissionPolicyQuery = { __typename?: 'Query', permissionPolicy?: { __typename?: 'PermissionPolicy', id?: string | null, scopeType?: PermissionScopeType | null, scopeId?: string | null, templateId?: string | null, createdAt?: string | number | null, updatedAt?: string | number | null, rules?: Array<{ __typename?: 'PermissionRuleConfig', tool?: string | null, behavior?: PermissionBehaviorSetting | null, entityType?: string | null }> | null } | null };

export type SetPermissionPolicyMutationVariables = Exact<{
  scopeType: PermissionScopeType;
  scopeId: Scalars['String']['input'];
  rules: Array<PermissionRuleConfigInput> | PermissionRuleConfigInput;
}>;


export type SetPermissionPolicyMutation = { __typename?: 'Mutation', setPermissionPolicy?: { __typename?: 'PermissionPolicy', id?: string | null, scopeType?: PermissionScopeType | null, scopeId?: string | null, templateId?: string | null, rules?: Array<{ __typename?: 'PermissionRuleConfig', tool?: string | null, behavior?: PermissionBehaviorSetting | null, entityType?: string | null }> | null } | null };

export type DeletePermissionPolicyMutationVariables = Exact<{
  scopeType: PermissionScopeType;
  scopeId: Scalars['String']['input'];
}>;


export type DeletePermissionPolicyMutation = { __typename?: 'Mutation', deletePermissionPolicy?: boolean | null };

export type GetResolvedPermissionsQueryVariables = Exact<{
  workstreamId: Scalars['ID']['input'];
}>;


export type GetResolvedPermissionsQuery = { __typename?: 'Query', resolvedPermissions?: Array<{ __typename?: 'PermissionRuleConfig', tool?: string | null, behavior?: PermissionBehaviorSetting | null, entityType?: string | null }> | null };

export type GetResolvedParentPermissionsQueryVariables = Exact<{
  scopeType: PermissionScopeType;
  scopeId: Scalars['String']['input'];
}>;


export type GetResolvedParentPermissionsQuery = { __typename?: 'Query', resolvedParentPermissions?: Array<{ __typename?: 'PermissionRuleConfig', tool?: string | null, behavior?: PermissionBehaviorSetting | null, entityType?: string | null }> | null };

export type GetPermissionTemplatesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetPermissionTemplatesQuery = { __typename?: 'Query', permissionTemplates?: Array<{ __typename?: 'PermissionTemplate', id?: string | null, name?: string | null, description?: string | null, createdAt?: string | number | null, updatedAt?: string | number | null, rules?: Array<{ __typename?: 'PermissionRuleConfig', tool?: string | null, behavior?: PermissionBehaviorSetting | null, entityType?: string | null }> | null }> | null };

export type GetPermissionTemplateQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetPermissionTemplateQuery = { __typename?: 'Query', permissionTemplate?: { __typename?: 'PermissionTemplate', id?: string | null, name?: string | null, description?: string | null, createdAt?: string | number | null, updatedAt?: string | number | null, rules?: Array<{ __typename?: 'PermissionRuleConfig', tool?: string | null, behavior?: PermissionBehaviorSetting | null, entityType?: string | null }> | null } | null };

export type CreatePermissionTemplateMutationVariables = Exact<{
  name: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  rules: Array<PermissionRuleConfigInput> | PermissionRuleConfigInput;
}>;


export type CreatePermissionTemplateMutation = { __typename?: 'Mutation', createPermissionTemplate?: { __typename?: 'PermissionTemplate', id?: string | null, name?: string | null, description?: string | null, createdAt?: string | number | null, updatedAt?: string | number | null, rules?: Array<{ __typename?: 'PermissionRuleConfig', tool?: string | null, behavior?: PermissionBehaviorSetting | null, entityType?: string | null }> | null } | null };

export type UpdatePermissionTemplateMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  rules?: InputMaybe<Array<PermissionRuleConfigInput> | PermissionRuleConfigInput>;
}>;


export type UpdatePermissionTemplateMutation = { __typename?: 'Mutation', updatePermissionTemplate?: { __typename?: 'PermissionTemplate', id?: string | null, name?: string | null, description?: string | null, createdAt?: string | number | null, updatedAt?: string | number | null, rules?: Array<{ __typename?: 'PermissionRuleConfig', tool?: string | null, behavior?: PermissionBehaviorSetting | null, entityType?: string | null }> | null } | null };

export type DeletePermissionTemplateMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeletePermissionTemplateMutation = { __typename?: 'Mutation', deletePermissionTemplate?: boolean | null };

export type ApplyPermissionTemplateMutationVariables = Exact<{
  templateId: Scalars['ID']['input'];
  scopeType: PermissionScopeType;
  scopeId: Scalars['String']['input'];
}>;


export type ApplyPermissionTemplateMutation = { __typename?: 'Mutation', applyPermissionTemplate?: boolean | null };

export type GetTagsByProjectQueryVariables = Exact<{
  projectId: Scalars['ID']['input'];
}>;


export type GetTagsByProjectQuery = { __typename?: 'Query', tagsByProject?: Array<{ __typename?: 'Tag', name?: string | null, instructions?: string | null, color?: string | null, maxDepth?: number | null, spawnWorkstream?: boolean | null, worktreeMode?: WorktreeMode | null, dependsOn?: Array<string> | null }> | null };

export type GetTagByNameQueryVariables = Exact<{
  projectId: Scalars['ID']['input'];
  name: Scalars['String']['input'];
}>;


export type GetTagByNameQuery = { __typename?: 'Query', tagByName?: { __typename?: 'Tag', name?: string | null, instructions?: string | null, color?: string | null, maxDepth?: number | null, spawnWorkstream?: boolean | null, worktreeMode?: WorktreeMode | null, dependsOn?: Array<string> | null } | null };

export type GetWorkstreamTagsQueryVariables = Exact<{
  workstreamId: Scalars['ID']['input'];
}>;


export type GetWorkstreamTagsQuery = { __typename?: 'Query', workstreamTags?: Array<{ __typename?: 'WorkstreamTag', id?: string | null, workstreamId?: string | null, tagName?: string | null, tagInstructions?: string | null, tagColor?: string | null, tagMaxDepth?: number | null, tagSpawnWorkstream?: boolean | null, tagWorktreeMode?: WorktreeMode | null, tagDependsOn?: Array<string> | null, status?: WorkstreamTagStatus | null, appliedAt?: string | number | null, startedAt?: string | number | null, completedAt?: string | number | null, error?: string | null, appliedBy?: WorkstreamTagAppliedBy | null, depth?: number | null, delegatedWorkstreamId?: string | null }> | null };

export type CreateTagMutationVariables = Exact<{
  input: CreateTagInput;
}>;


export type CreateTagMutation = { __typename?: 'Mutation', createTag?: { __typename?: 'CreateTagPayload', tag?: { __typename?: 'Tag', name?: string | null, instructions?: string | null, color?: string | null, maxDepth?: number | null, spawnWorkstream?: boolean | null, worktreeMode?: WorktreeMode | null, dependsOn?: Array<string> | null } | null } | null };

export type UpdateTagMutationVariables = Exact<{
  projectId: Scalars['ID']['input'];
  tagName: Scalars['String']['input'];
  input: UpdateTagInput;
}>;


export type UpdateTagMutation = { __typename?: 'Mutation', updateTag?: { __typename?: 'UpdateTagPayload', tag?: { __typename?: 'Tag', name?: string | null, instructions?: string | null, color?: string | null, maxDepth?: number | null, spawnWorkstream?: boolean | null, worktreeMode?: WorktreeMode | null, dependsOn?: Array<string> | null } | null } | null };

export type DeleteTagMutationVariables = Exact<{
  projectId: Scalars['ID']['input'];
  tagName: Scalars['String']['input'];
}>;


export type DeleteTagMutation = { __typename?: 'Mutation', deleteTag?: { __typename?: 'DeleteTagPayload', tag?: { __typename?: 'Tag', name?: string | null } | null } | null };

export type ApplyTagToWorkstreamMutationVariables = Exact<{
  workstreamId: Scalars['ID']['input'];
  tagName: Scalars['String']['input'];
}>;


export type ApplyTagToWorkstreamMutation = { __typename?: 'Mutation', applyTagToWorkstream?: { __typename?: 'ApplyTagPayload', pipelineRunId?: string | null, workstreamTag?: { __typename?: 'WorkstreamTag', id?: string | null, workstreamId?: string | null, tagName?: string | null, tagColor?: string | null, status?: WorkstreamTagStatus | null, appliedAt?: string | number | null, appliedBy?: WorkstreamTagAppliedBy | null, depth?: number | null } | null } | null };

export type RemoveTagFromWorkstreamMutationVariables = Exact<{
  workstreamId: Scalars['ID']['input'];
  tagName: Scalars['String']['input'];
}>;


export type RemoveTagFromWorkstreamMutation = { __typename?: 'Mutation', removeTagFromWorkstream?: { __typename?: 'RemoveTagPayload', success?: boolean | null } | null };

export type GetContentProfilesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetContentProfilesQuery = { __typename?: 'Query', contentProfiles?: Array<{ __typename?: 'ContentProfile', name?: string | null, directory?: string | null, isDefault?: boolean | null, isActive?: boolean | null, isFork?: boolean | null, metadata?: { __typename?: 'ProfileMetadata', displayName?: string | null, description?: string | null, icon?: string | null, tags?: Array<string> | null, sourceUrl?: string | null, author?: { __typename?: 'ProfileAuthor', name?: string | null, url?: string | null } | null } | null }> | null };

export type GetActiveContentProfileQueryVariables = Exact<{ [key: string]: never; }>;


export type GetActiveContentProfileQuery = { __typename?: 'Query', activeContentProfile?: { __typename?: 'ContentProfile', name?: string | null, directory?: string | null, isDefault?: boolean | null, isActive?: boolean | null, isFork?: boolean | null, metadata?: { __typename?: 'ProfileMetadata', displayName?: string | null, description?: string | null, icon?: string | null, tags?: Array<string> | null, sourceUrl?: string | null } | null } | null };

export type ForkContentProfileMutationVariables = Exact<{
  gitUrl: Scalars['String']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
}>;


export type ForkContentProfileMutation = { __typename?: 'Mutation', forkContentProfile?: { __typename?: 'ContentProfile', name?: string | null, directory?: string | null, isDefault?: boolean | null, isActive?: boolean | null, isFork?: boolean | null, metadata?: { __typename?: 'ProfileMetadata', displayName?: string | null, description?: string | null, icon?: string | null, sourceUrl?: string | null } | null } | null };

export type SwitchContentProfileMutationVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type SwitchContentProfileMutation = { __typename?: 'Mutation', switchContentProfile?: boolean | null };

export type DeleteContentProfileMutationVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type DeleteContentProfileMutation = { __typename?: 'Mutation', deleteContentProfile?: boolean | null };

export type GetTaskQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetTaskQuery = { __typename?: 'Query', task?: { __typename?: 'Task', id?: string | null, projectId?: string | null, identifier?: string | null, title?: string | null, description?: string | null, status?: TaskStatus | null, priority?: TaskPriority | null, assigneeType?: TaskAssigneeType | null, assigneeWorkstreamId?: string | null, dueDate?: string | null, parentId?: string | null, links?: Array<string> | null, createdAt?: string | number | null, updatedAt?: string | number | null, labels?: Array<{ __typename?: 'TaskLabel', id?: string | null, name?: string | null, color?: string | null }> | null, subtasks?: Array<{ __typename?: 'Task', id?: string | null, identifier?: string | null, title?: string | null, status?: TaskStatus | null, priority?: TaskPriority | null }> | null, parent?: { __typename?: 'Task', id?: string | null, identifier?: string | null, title?: string | null } | null } | null };

export type GetTasksQueryVariables = Exact<{
  projectId: Scalars['ID']['input'];
  status?: InputMaybe<TaskStatus>;
  priority?: InputMaybe<TaskPriority>;
  assigneeType?: InputMaybe<TaskAssigneeType>;
  labelId?: InputMaybe<Scalars['String']['input']>;
  parentId?: InputMaybe<Scalars['String']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetTasksQuery = { __typename?: 'Query', tasks?: Array<{ __typename?: 'Task', id?: string | null, projectId?: string | null, identifier?: string | null, title?: string | null, description?: string | null, status?: TaskStatus | null, priority?: TaskPriority | null, assigneeType?: TaskAssigneeType | null, assigneeWorkstreamId?: string | null, dueDate?: string | null, parentId?: string | null, links?: Array<string> | null, createdAt?: string | number | null, updatedAt?: string | number | null, labels?: Array<{ __typename?: 'TaskLabel', id?: string | null, name?: string | null, color?: string | null }> | null }> | null };

export type GetTaskLabelsQueryVariables = Exact<{
  projectId: Scalars['ID']['input'];
}>;


export type GetTaskLabelsQuery = { __typename?: 'Query', taskLabels?: Array<{ __typename?: 'TaskLabel', id?: string | null, projectId?: string | null, name?: string | null, color?: string | null, createdAt?: string | number | null }> | null };

export type CreateTaskMutationVariables = Exact<{
  input: CreateTaskInput;
}>;


export type CreateTaskMutation = { __typename?: 'Mutation', createTask?: { __typename?: 'TaskPayload', task?: { __typename?: 'Task', id?: string | null, projectId?: string | null, identifier?: string | null, title?: string | null, status?: TaskStatus | null, priority?: TaskPriority | null, createdAt?: string | number | null } | null } | null };

export type UpdateTaskMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateTaskInput;
}>;


export type UpdateTaskMutation = { __typename?: 'Mutation', updateTask?: { __typename?: 'TaskPayload', task?: { __typename?: 'Task', id?: string | null, projectId?: string | null, identifier?: string | null, title?: string | null, description?: string | null, status?: TaskStatus | null, priority?: TaskPriority | null, assigneeType?: TaskAssigneeType | null, assigneeWorkstreamId?: string | null, dueDate?: string | null, parentId?: string | null, links?: Array<string> | null, createdAt?: string | number | null, updatedAt?: string | number | null, labels?: Array<{ __typename?: 'TaskLabel', id?: string | null, name?: string | null, color?: string | null }> | null } | null } | null };

export type DeleteTaskMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteTaskMutation = { __typename?: 'Mutation', deleteTask?: { __typename?: 'DeleteTaskPayload', success?: boolean | null } | null };

export type CreateTaskLabelMutationVariables = Exact<{
  projectId: Scalars['ID']['input'];
  name: Scalars['String']['input'];
  color: Scalars['String']['input'];
}>;


export type CreateTaskLabelMutation = { __typename?: 'Mutation', createTaskLabel?: { __typename?: 'TaskLabelPayload', label?: { __typename?: 'TaskLabel', id?: string | null, projectId?: string | null, name?: string | null, color?: string | null, createdAt?: string | number | null } | null } | null };

export type UpdateTaskLabelMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  color?: InputMaybe<Scalars['String']['input']>;
}>;


export type UpdateTaskLabelMutation = { __typename?: 'Mutation', updateTaskLabel?: { __typename?: 'TaskLabelPayload', label?: { __typename?: 'TaskLabel', id?: string | null, projectId?: string | null, name?: string | null, color?: string | null, createdAt?: string | number | null } | null } | null };

export type DeleteTaskLabelMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteTaskLabelMutation = { __typename?: 'Mutation', deleteTaskLabel?: { __typename?: 'DeleteTaskPayload', success?: boolean | null } | null };

export type GetInboxItemsQueryVariables = Exact<{
  includeArchived?: InputMaybe<Scalars['Boolean']['input']>;
  includeRead?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetInboxItemsQuery = { __typename?: 'Query', inboxItems?: Array<{ __typename?: 'InboxItem', id?: string | null, title?: string | null, description?: string | null, icon?: string | null, source?: string | null, entityUri?: string | null, ctaLabel?: string | null, read?: boolean | null, archived?: boolean | null, createdAt?: string | number | null, updatedAt?: string | number | null, actions?: Array<{ __typename?: 'InboxAction', id?: string | null, label?: string | null, payload?: Record<string, unknown> | null }> | null }> | null };

export type GetInboxUnreadCountQueryVariables = Exact<{ [key: string]: never; }>;


export type GetInboxUnreadCountQuery = { __typename?: 'Query', inboxUnreadCount?: number | null };

export type PushInboxItemMutationVariables = Exact<{
  input: PushInboxItemInput;
}>;


export type PushInboxItemMutation = { __typename?: 'Mutation', pushInboxItem?: { __typename?: 'PushInboxItemPayload', inboxItem?: { __typename?: 'InboxItem', id?: string | null, title?: string | null, description?: string | null, icon?: string | null, source?: string | null, entityUri?: string | null, ctaLabel?: string | null, read?: boolean | null, archived?: boolean | null, createdAt?: string | number | null, updatedAt?: string | number | null, actions?: Array<{ __typename?: 'InboxAction', id?: string | null, label?: string | null, payload?: Record<string, unknown> | null }> | null } | null } | null };

export type MarkInboxItemReadMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type MarkInboxItemReadMutation = { __typename?: 'Mutation', markInboxItemRead?: { __typename?: 'MarkInboxItemReadPayload', inboxItem?: { __typename?: 'InboxItem', id?: string | null, read?: boolean | null } | null } | null };

export type MarkAllInboxItemsReadMutationVariables = Exact<{ [key: string]: never; }>;


export type MarkAllInboxItemsReadMutation = { __typename?: 'Mutation', markAllInboxItemsRead?: { __typename?: 'MarkAllInboxItemsReadPayload', count?: number | null } | null };

export type ArchiveInboxItemMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ArchiveInboxItemMutation = { __typename?: 'Mutation', archiveInboxItem?: { __typename?: 'ArchiveInboxItemPayload', inboxItem?: { __typename?: 'InboxItem', id?: string | null, archived?: boolean | null } | null } | null };

export type DeleteInboxItemMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteInboxItemMutation = { __typename?: 'Mutation', deleteInboxItem?: { __typename?: 'DeleteInboxItemPayload', success?: boolean | null } | null };

export type ExecuteInboxActionMutationVariables = Exact<{
  actionId: Scalars['String']['input'];
  payload?: InputMaybe<Scalars['JSON']['input']>;
}>;


export type ExecuteInboxActionMutation = { __typename?: 'Mutation', executeInboxAction?: { __typename?: 'ExecuteInboxActionPayload', success?: boolean | null } | null };

export type GetRegisteredEventsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetRegisteredEventsQuery = { __typename?: 'Query', registeredEvents?: Array<{ __typename?: 'RegisteredEvent', qualifiedName?: string | null, localName?: string | null, description?: string | null, ownerPluginId?: string | null, listenerCount?: number | null, payloadSchema?: string | null }> | null };

export type GetEntityToolEntriesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetEntityToolEntriesQuery = { __typename?: 'Query', entityToolEntries?: Array<{ __typename?: 'EntityToolEntry', uri?: string | null, addedAt?: string | null }> | null };

export type AddEntityToolEntryMutationVariables = Exact<{
  uri: Scalars['String']['input'];
}>;


export type AddEntityToolEntryMutation = { __typename?: 'Mutation', addEntityToolEntry?: { __typename?: 'AddEntityToolEntryPayload', alreadyExists?: boolean | null, entry?: { __typename?: 'EntityToolEntry', uri?: string | null, addedAt?: string | null } | null } | null };

export type RemoveEntityToolEntryMutationVariables = Exact<{
  uri: Scalars['String']['input'];
}>;


export type RemoveEntityToolEntryMutation = { __typename?: 'Mutation', removeEntityToolEntry?: { __typename?: 'RemoveEntityToolEntryPayload', success?: boolean | null } | null };


export const GetProjectsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetProjects"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"projects"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetProjectsQuery, GetProjectsQueryVariables>;
export const GetProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"project"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"workstreams"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"isPinned"}},{"kind":"Field","name":{"kind":"Name","value":"messageCount"}},{"kind":"Field","name":{"kind":"Name","value":"lastActivityAt"}}]}}]}}]}}]} as unknown as DocumentNode<GetProjectQuery, GetProjectQueryVariables>;
export const CreateProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateProjectInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<CreateProjectMutation, CreateProjectMutationVariables>;
export const UpdateProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateProjectInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateProjectMutation, UpdateProjectMutationVariables>;
export const DeleteProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteProjectMutation, DeleteProjectMutationVariables>;
export const GetWorkstreamsByProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetWorkstreamsByProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstreamsByProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"isPinned"}},{"kind":"Field","name":{"kind":"Name","value":"isRoutineWorkstream"}},{"kind":"Field","name":{"kind":"Name","value":"groupId"}},{"kind":"Field","name":{"kind":"Name","value":"messageCount"}},{"kind":"Field","name":{"kind":"Name","value":"lastActivityAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"inFocus"}}]}}]}}]} as unknown as DocumentNode<GetWorkstreamsByProjectQuery, GetWorkstreamsByProjectQueryVariables>;
export const GetWorkstreamDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetWorkstream"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstream"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"isPinned"}},{"kind":"Field","name":{"kind":"Name","value":"messageCount"}},{"kind":"Field","name":{"kind":"Name","value":"lastActivityAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"project"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode<GetWorkstreamQuery, GetWorkstreamQueryVariables>;
export const GetArchivedWorkstreamsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetArchivedWorkstreams"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"archivedWorkstreams"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"messageCount"}},{"kind":"Field","name":{"kind":"Name","value":"archivedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetArchivedWorkstreamsQuery, GetArchivedWorkstreamsQueryVariables>;
export const CreateWorkstreamDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateWorkstream"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateWorkstreamInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createWorkstream"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstream"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"isPinned"}},{"kind":"Field","name":{"kind":"Name","value":"messageCount"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]}}]} as unknown as DocumentNode<CreateWorkstreamMutation, CreateWorkstreamMutationVariables>;
export const ForkWorkstreamDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ForkWorkstream"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ForkWorkstreamInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"forkWorkstream"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstream"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"isPinned"}},{"kind":"Field","name":{"kind":"Name","value":"messageCount"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"groupId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"worktrees"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"directoryPath"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"worktreePath"}},{"kind":"Field","name":{"kind":"Name","value":"error"}}]}}]}}]}}]} as unknown as DocumentNode<ForkWorkstreamMutation, ForkWorkstreamMutationVariables>;
export const UpdateWorkstreamDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateWorkstream"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateWorkstreamInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateWorkstream"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstream"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"isPinned"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateWorkstreamMutation, UpdateWorkstreamMutationVariables>;
export const ArchiveWorkstreamDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ArchiveWorkstream"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"archiveWorkstream"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstream"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"archivedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<ArchiveWorkstreamMutation, ArchiveWorkstreamMutationVariables>;
export const UnarchiveWorkstreamDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnarchiveWorkstream"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unarchiveWorkstream"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstream"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"archivedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<UnarchiveWorkstreamMutation, UnarchiveWorkstreamMutationVariables>;
export const PinWorkstreamDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PinWorkstream"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pinWorkstream"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstream"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"isPinned"}}]}}]}}]}}]} as unknown as DocumentNode<PinWorkstreamMutation, PinWorkstreamMutationVariables>;
export const UnpinWorkstreamDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnpinWorkstream"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unpinWorkstream"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstream"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"isPinned"}}]}}]}}]}}]} as unknown as DocumentNode<UnpinWorkstreamMutation, UnpinWorkstreamMutationVariables>;
export const DeleteWorkstreamDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteWorkstream"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteWorkstream"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstream"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]}}]} as unknown as DocumentNode<DeleteWorkstreamMutation, DeleteWorkstreamMutationVariables>;
export const GetEntityDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetEntity"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"uri"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"entity"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"uri"},"value":{"kind":"Variable","name":{"kind":"Name","value":"uri"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"uri"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetEntityQuery, GetEntityQueryVariables>;
export const GetEntitiesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetEntities"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"type"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filters"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"entities"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"type"},"value":{"kind":"Variable","name":{"kind":"Name","value":"type"}}},{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}},{"kind":"Argument","name":{"kind":"Name","value":"filters"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filters"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"uri"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetEntitiesQuery, GetEntitiesQueryVariables>;
export const SearchEntitiesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SearchEntities"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"types"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"entitySearch"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}},{"kind":"Argument","name":{"kind":"Name","value":"types"},"value":{"kind":"Variable","name":{"kind":"Name","value":"types"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"uri"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<SearchEntitiesQuery, SearchEntitiesQueryVariables>;
export const GetEntityTypesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetEntityTypes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"entityTypes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"uriExample"}},{"kind":"Field","name":{"kind":"Name","value":"display"}}]}}]}}]} as unknown as DocumentNode<GetEntityTypesQuery, GetEntityTypesQueryVariables>;
export const GetEntityMutationCatalogDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetEntityMutationCatalog"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"entityMutationCatalog"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"entityType"}},{"kind":"Field","name":{"kind":"Name","value":"entityDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"mutations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}}]}}]}}]}}]} as unknown as DocumentNode<GetEntityMutationCatalogQuery, GetEntityMutationCatalogQueryVariables>;
export const GetRoutinesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetRoutines"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"routines"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"workstreamId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"schedule"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"expression"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}}]}},{"kind":"Field","name":{"kind":"Name","value":"runCount"}},{"kind":"Field","name":{"kind":"Name","value":"lastRunAt"}},{"kind":"Field","name":{"kind":"Name","value":"nextRunAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"latestRun"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"triggeredBy"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}}]}}]}}]}}]} as unknown as DocumentNode<GetRoutinesQuery, GetRoutinesQueryVariables>;
export const GetRoutinesByProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetRoutinesByProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"routinesByProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"workstreamId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"schedule"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"expression"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}}]}},{"kind":"Field","name":{"kind":"Name","value":"runCount"}},{"kind":"Field","name":{"kind":"Name","value":"lastRunAt"}},{"kind":"Field","name":{"kind":"Name","value":"nextRunAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"latestRun"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"triggeredBy"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}}]}}]}}]}}]} as unknown as DocumentNode<GetRoutinesByProjectQuery, GetRoutinesByProjectQueryVariables>;
export const GetRoutineDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetRoutine"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"routine"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"prompt"}},{"kind":"Field","name":{"kind":"Name","value":"workstreamId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"schedule"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"expression"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}}]}},{"kind":"Field","name":{"kind":"Name","value":"preferences"}},{"kind":"Field","name":{"kind":"Name","value":"runCount"}},{"kind":"Field","name":{"kind":"Name","value":"lastRunAt"}},{"kind":"Field","name":{"kind":"Name","value":"nextRunAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"workstream"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}},{"kind":"Field","name":{"kind":"Name","value":"latestRun"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"triggeredBy"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"error"}}]}}]}}]}}]} as unknown as DocumentNode<GetRoutineQuery, GetRoutineQueryVariables>;
export const GetRoutineByWorkstreamDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetRoutineByWorkstream"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"routineByWorkstreamId"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workstreamId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"prompt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"schedule"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"expression"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}}]}},{"kind":"Field","name":{"kind":"Name","value":"runCount"}},{"kind":"Field","name":{"kind":"Name","value":"lastRunAt"}},{"kind":"Field","name":{"kind":"Name","value":"nextRunAt"}}]}}]}}]} as unknown as DocumentNode<GetRoutineByWorkstreamQuery, GetRoutineByWorkstreamQueryVariables>;
export const GetRoutineRunHistoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetRoutineRunHistory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"routineId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"routineRunHistory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"routineId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"routineId"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"routineId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"triggeredBy"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"error"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<GetRoutineRunHistoryQuery, GetRoutineRunHistoryQueryVariables>;
export const GetRoutineLatestRunDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetRoutineLatestRun"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"routineId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"routineLatestRun"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"routineId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"routineId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"triggeredBy"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"error"}}]}}]}}]} as unknown as DocumentNode<GetRoutineLatestRunQuery, GetRoutineLatestRunQueryVariables>;
export const CreateRoutineDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateRoutine"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateRoutineInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createRoutine"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"routine"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"prompt"}},{"kind":"Field","name":{"kind":"Name","value":"workstreamId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"schedule"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"expression"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}}]}},{"kind":"Field","name":{"kind":"Name","value":"runCount"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]}}]} as unknown as DocumentNode<CreateRoutineMutation, CreateRoutineMutationVariables>;
export const UpdateRoutineDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateRoutine"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateRoutineInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateRoutine"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"routine"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"prompt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"schedule"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"expression"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}}]}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateRoutineMutation, UpdateRoutineMutationVariables>;
export const DeleteRoutineDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteRoutine"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteRoutine"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"routine"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode<DeleteRoutineMutation, DeleteRoutineMutationVariables>;
export const PauseRoutineDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PauseRoutine"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pauseRoutine"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"routine"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<PauseRoutineMutation, PauseRoutineMutationVariables>;
export const ResumeRoutineDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ResumeRoutine"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"resumeRoutine"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"routine"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"nextRunAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<ResumeRoutineMutation, ResumeRoutineMutationVariables>;
export const RunRoutineNowDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RunRoutineNow"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"runRoutineNow"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"routine"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"runCount"}},{"kind":"Field","name":{"kind":"Name","value":"lastRunAt"}},{"kind":"Field","name":{"kind":"Name","value":"latestRun"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"triggeredBy"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}}]}}]}}]}}]}}]} as unknown as DocumentNode<RunRoutineNowMutation, RunRoutineNowMutationVariables>;
export const SendWorkstreamMessageDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SendWorkstreamMessage"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"text"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"imageAttachments"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ImageAttachmentInput"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"imageContentBlocks"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ImageContentBlockInput"}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sendWorkstreamMessage"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workstreamId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}}},{"kind":"Argument","name":{"kind":"Name","value":"text"},"value":{"kind":"Variable","name":{"kind":"Name","value":"text"}}},{"kind":"Argument","name":{"kind":"Name","value":"imageAttachments"},"value":{"kind":"Variable","name":{"kind":"Name","value":"imageAttachments"}}},{"kind":"Argument","name":{"kind":"Name","value":"imageContentBlocks"},"value":{"kind":"Variable","name":{"kind":"Name","value":"imageContentBlocks"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstream"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"messageCount"}},{"kind":"Field","name":{"kind":"Name","value":"lastActivityAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<SendWorkstreamMessageMutation, SendWorkstreamMessageMutationVariables>;
export const StopWorkstreamAgentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StopWorkstreamAgent"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"stopWorkstreamAgent"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstream"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<StopWorkstreamAgentMutation, StopWorkstreamAgentMutationVariables>;
export const RestartWorkstreamAgentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RestartWorkstreamAgent"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"restartWorkstreamAgent"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstream"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<RestartWorkstreamAgentMutation, RestartWorkstreamAgentMutationVariables>;
export const RespondWorkstreamPermissionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RespondWorkstreamPermission"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"requestId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"response"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PermissionResponseInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"respondWorkstreamPermission"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workstreamId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}}},{"kind":"Argument","name":{"kind":"Name","value":"requestId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"requestId"}}},{"kind":"Argument","name":{"kind":"Name","value":"response"},"value":{"kind":"Variable","name":{"kind":"Name","value":"response"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstream"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<RespondWorkstreamPermissionMutation, RespondWorkstreamPermissionMutationVariables>;
export const RevokePermissionRuleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RevokePermissionRule"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"toolName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"scope"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PermissionRuleScope"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"revokePermissionRule"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workstreamId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}}},{"kind":"Argument","name":{"kind":"Name","value":"toolName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"toolName"}}},{"kind":"Argument","name":{"kind":"Name","value":"scope"},"value":{"kind":"Variable","name":{"kind":"Name","value":"scope"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstream"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<RevokePermissionRuleMutation, RevokePermissionRuleMutationVariables>;
export const InterruptWorkstreamAgentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"InterruptWorkstreamAgent"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"interruptWorkstreamAgent"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstream"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<InterruptWorkstreamAgentMutation, InterruptWorkstreamAgentMutationVariables>;
export const ClearWorkstreamConversationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ClearWorkstreamConversation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"clearWorkstreamConversation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstream"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<ClearWorkstreamConversationMutation, ClearWorkstreamConversationMutationVariables>;
export const CompactWorkstreamConversationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CompactWorkstreamConversation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"instructions"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"compactWorkstreamConversation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"instructions"},"value":{"kind":"Variable","name":{"kind":"Name","value":"instructions"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstream"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<CompactWorkstreamConversationMutation, CompactWorkstreamConversationMutationVariables>;
export const RewindWorkstreamConversationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RewindWorkstreamConversation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"eventId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"role"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rewindWorkstreamConversation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"eventId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"eventId"}}},{"kind":"Argument","name":{"kind":"Name","value":"role"},"value":{"kind":"Variable","name":{"kind":"Name","value":"role"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstream"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<RewindWorkstreamConversationMutation, RewindWorkstreamConversationMutationVariables>;
export const SetWorkstreamInFocusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetWorkstreamInFocus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setWorkstreamInFocus"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstream"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"inFocus"}}]}}]}}]}}]} as unknown as DocumentNode<SetWorkstreamInFocusMutation, SetWorkstreamInFocusMutationVariables>;
export const ReplayWorkstreamHistoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ReplayWorkstreamHistory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"replayWorkstreamHistory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstream"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"hasMore"}},{"kind":"Field","name":{"kind":"Name","value":"oldestEventId"}}]}}]}}]} as unknown as DocumentNode<ReplayWorkstreamHistoryMutation, ReplayWorkstreamHistoryMutationVariables>;
export const LoadMoreWorkstreamHistoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"LoadMoreWorkstreamHistory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"beforeEventId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"loadMoreWorkstreamHistory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"beforeEventId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"beforeEventId"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstream"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"hasMore"}},{"kind":"Field","name":{"kind":"Name","value":"oldestEventId"}}]}}]}}]} as unknown as DocumentNode<LoadMoreWorkstreamHistoryMutation, LoadMoreWorkstreamHistoryMutationVariables>;
export const IsWorkstreamAgentRunningDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"IsWorkstreamAgentRunning"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"isWorkstreamAgentRunning"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<IsWorkstreamAgentRunningQuery, IsWorkstreamAgentRunningQueryVariables>;
export const GetUserMessageHistoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUserMessageHistory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"before"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userMessageHistory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workstreamId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"before"},"value":{"kind":"Variable","name":{"kind":"Name","value":"before"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"eventId"}},{"kind":"Field","name":{"kind":"Name","value":"messageId"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"timestamp"}}]}},{"kind":"Field","name":{"kind":"Name","value":"hasMore"}}]}}]}}]} as unknown as DocumentNode<GetUserMessageHistoryQuery, GetUserMessageHistoryQueryVariables>;
export const GetWorkstreamLinkedEntitiesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetWorkstreamLinkedEntities"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstreamLinkedEntities"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workstreamId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstreamId"}},{"kind":"Field","name":{"kind":"Name","value":"entityUri"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}},{"kind":"Field","name":{"kind":"Name","value":"entityTitle"}},{"kind":"Field","name":{"kind":"Name","value":"contextOverride"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"isInherited"}}]}}]}}]} as unknown as DocumentNode<GetWorkstreamLinkedEntitiesQuery, GetWorkstreamLinkedEntitiesQueryVariables>;
export const GetWorkstreamDirectoriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetWorkstreamDirectories"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstreamDirectories"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workstreamId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"workstreamId"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"isInherited"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<GetWorkstreamDirectoriesQuery, GetWorkstreamDirectoriesQueryVariables>;
export const SwitchWorkstreamModelDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SwitchWorkstreamModel"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"model"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"switchWorkstreamModel"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"model"},"value":{"kind":"Variable","name":{"kind":"Name","value":"model"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstream"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<SwitchWorkstreamModelMutation, SwitchWorkstreamModelMutationVariables>;
export const LinkWorkstreamEntityDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"LinkWorkstreamEntity"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"entityUri"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"entityType"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"entityTitle"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"linkWorkstreamEntity"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workstreamId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}}},{"kind":"Argument","name":{"kind":"Name","value":"entityUri"},"value":{"kind":"Variable","name":{"kind":"Name","value":"entityUri"}}},{"kind":"Argument","name":{"kind":"Name","value":"entityType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"entityType"}}},{"kind":"Argument","name":{"kind":"Name","value":"entityTitle"},"value":{"kind":"Variable","name":{"kind":"Name","value":"entityTitle"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstream"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<LinkWorkstreamEntityMutation, LinkWorkstreamEntityMutationVariables>;
export const UnlinkWorkstreamEntityDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnlinkWorkstreamEntity"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"entityUri"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unlinkWorkstreamEntity"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workstreamId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}}},{"kind":"Argument","name":{"kind":"Name","value":"entityUri"},"value":{"kind":"Variable","name":{"kind":"Name","value":"entityUri"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstream"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<UnlinkWorkstreamEntityMutation, UnlinkWorkstreamEntityMutationVariables>;
export const SetLinkedEntityContextOverrideDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetLinkedEntityContextOverride"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"entityUri"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"contextOverride"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setLinkedEntityContextOverride"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workstreamId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}}},{"kind":"Argument","name":{"kind":"Name","value":"entityUri"},"value":{"kind":"Variable","name":{"kind":"Name","value":"entityUri"}}},{"kind":"Argument","name":{"kind":"Name","value":"contextOverride"},"value":{"kind":"Variable","name":{"kind":"Name","value":"contextOverride"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstream"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<SetLinkedEntityContextOverrideMutation, SetLinkedEntityContextOverrideMutationVariables>;
export const GetWorkstreamReferencesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetWorkstreamReferences"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstreamReferences"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workstreamId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstreamId"}},{"kind":"Field","name":{"kind":"Name","value":"entityUri"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}},{"kind":"Field","name":{"kind":"Name","value":"entityTitle"}},{"kind":"Field","name":{"kind":"Name","value":"externalUrl"}},{"kind":"Field","name":{"kind":"Name","value":"firstReferencedAt"}}]}}]}}]} as unknown as DocumentNode<GetWorkstreamReferencesQuery, GetWorkstreamReferencesQueryVariables>;
export const AddWorkstreamReferenceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddWorkstreamReference"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"entityUri"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"entityType"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"entityTitle"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addWorkstreamReference"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workstreamId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}}},{"kind":"Argument","name":{"kind":"Name","value":"entityUri"},"value":{"kind":"Variable","name":{"kind":"Name","value":"entityUri"}}},{"kind":"Argument","name":{"kind":"Name","value":"entityType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"entityType"}}},{"kind":"Argument","name":{"kind":"Name","value":"entityTitle"},"value":{"kind":"Variable","name":{"kind":"Name","value":"entityTitle"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstream"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<AddWorkstreamReferenceMutation, AddWorkstreamReferenceMutationVariables>;
export const RemoveWorkstreamReferenceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveWorkstreamReference"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"entityUri"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeWorkstreamReference"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workstreamId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}}},{"kind":"Argument","name":{"kind":"Name","value":"entityUri"},"value":{"kind":"Variable","name":{"kind":"Name","value":"entityUri"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstream"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<RemoveWorkstreamReferenceMutation, RemoveWorkstreamReferenceMutationVariables>;
export const PromoteWorkstreamReferenceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PromoteWorkstreamReference"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"entityUri"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"entityType"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"entityTitle"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"promoteWorkstreamReference"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workstreamId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}}},{"kind":"Argument","name":{"kind":"Name","value":"entityUri"},"value":{"kind":"Variable","name":{"kind":"Name","value":"entityUri"}}},{"kind":"Argument","name":{"kind":"Name","value":"entityType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"entityType"}}},{"kind":"Argument","name":{"kind":"Name","value":"entityTitle"},"value":{"kind":"Variable","name":{"kind":"Name","value":"entityTitle"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstream"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<PromoteWorkstreamReferenceMutation, PromoteWorkstreamReferenceMutationVariables>;
export const GetWorkstreamsByEntityDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetWorkstreamsByEntity"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"entityUri"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstreamsByEntity"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"entityUri"},"value":{"kind":"Variable","name":{"kind":"Name","value":"entityUri"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"entityUri"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}},{"kind":"Field","name":{"kind":"Name","value":"entityTitle"}},{"kind":"Field","name":{"kind":"Name","value":"workstreamId"}},{"kind":"Field","name":{"kind":"Name","value":"groupId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"workstream"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"groupId"}}]}}]}}]}}]} as unknown as DocumentNode<GetWorkstreamsByEntityQuery, GetWorkstreamsByEntityQueryVariables>;
export const ResolveLinkedEntityContextDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ResolveLinkedEntityContext"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"entityUri"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"resolveLinkedEntityContext"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"entityUri"},"value":{"kind":"Variable","name":{"kind":"Name","value":"entityUri"}}}]}]}}]} as unknown as DocumentNode<ResolveLinkedEntityContextQuery, ResolveLinkedEntityContextQueryVariables>;
export const EntitySearchDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"EntitySearch"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"types"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"entitySearch"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}},{"kind":"Argument","name":{"kind":"Name","value":"types"},"value":{"kind":"Variable","name":{"kind":"Name","value":"types"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"uri"}},{"kind":"Field","name":{"kind":"Name","value":"title"}}]}}]}}]} as unknown as DocumentNode<EntitySearchQuery, EntitySearchQueryVariables>;
export const AddWorkstreamDirectoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddWorkstreamDirectory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"path"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"label"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addWorkstreamDirectory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workstreamId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}}},{"kind":"Argument","name":{"kind":"Name","value":"path"},"value":{"kind":"Variable","name":{"kind":"Name","value":"path"}}},{"kind":"Argument","name":{"kind":"Name","value":"label"},"value":{"kind":"Variable","name":{"kind":"Name","value":"label"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstream"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<AddWorkstreamDirectoryMutation, AddWorkstreamDirectoryMutationVariables>;
export const RemoveWorkstreamDirectoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveWorkstreamDirectory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"path"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeWorkstreamDirectory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workstreamId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}}},{"kind":"Argument","name":{"kind":"Name","value":"path"},"value":{"kind":"Variable","name":{"kind":"Name","value":"path"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstream"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<RemoveWorkstreamDirectoryMutation, RemoveWorkstreamDirectoryMutationVariables>;
export const GetProjectDirectoriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetProjectDirectories"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"projectDirectories"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"projectId"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<GetProjectDirectoriesQuery, GetProjectDirectoriesQueryVariables>;
export const AddProjectDirectoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddProjectDirectory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"path"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"label"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addProjectDirectory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}},{"kind":"Argument","name":{"kind":"Name","value":"path"},"value":{"kind":"Variable","name":{"kind":"Name","value":"path"}}},{"kind":"Argument","name":{"kind":"Name","value":"label"},"value":{"kind":"Variable","name":{"kind":"Name","value":"label"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"project"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"directory"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]}}]} as unknown as DocumentNode<AddProjectDirectoryMutation, AddProjectDirectoryMutationVariables>;
export const RemoveProjectDirectoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveProjectDirectory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"path"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeProjectDirectory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}},{"kind":"Argument","name":{"kind":"Name","value":"path"},"value":{"kind":"Variable","name":{"kind":"Name","value":"path"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"project"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"removed"}}]}}]}}]} as unknown as DocumentNode<RemoveProjectDirectoryMutation, RemoveProjectDirectoryMutationVariables>;
export const GetBranchSelectionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBranchSelections"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"branchSelections"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workstreamId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"workstreamId"}},{"kind":"Field","name":{"kind":"Name","value":"directoryPath"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"worktreePath"}},{"kind":"Field","name":{"kind":"Name","value":"baseBranch"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetBranchSelectionsQuery, GetBranchSelectionsQueryVariables>;
export const GetDirectoriesWithBranchInfoDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetDirectoriesWithBranchInfo"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"directoriesWithBranchInfo"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workstreamId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"effectivePath"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"baseBranch"}},{"kind":"Field","name":{"kind":"Name","value":"worktreePath"}},{"kind":"Field","name":{"kind":"Name","value":"isInherited"}}]}}]}}]} as unknown as DocumentNode<GetDirectoriesWithBranchInfoQuery, GetDirectoriesWithBranchInfoQueryVariables>;
export const SetBranchSelectionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetBranchSelection"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"directoryPath"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"branch"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"worktreePath"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"baseBranch"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"createWorktree"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setBranchSelection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workstreamId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}}},{"kind":"Argument","name":{"kind":"Name","value":"directoryPath"},"value":{"kind":"Variable","name":{"kind":"Name","value":"directoryPath"}}},{"kind":"Argument","name":{"kind":"Name","value":"branch"},"value":{"kind":"Variable","name":{"kind":"Name","value":"branch"}}},{"kind":"Argument","name":{"kind":"Name","value":"worktreePath"},"value":{"kind":"Variable","name":{"kind":"Name","value":"worktreePath"}}},{"kind":"Argument","name":{"kind":"Name","value":"baseBranch"},"value":{"kind":"Variable","name":{"kind":"Name","value":"baseBranch"}}},{"kind":"Argument","name":{"kind":"Name","value":"createWorktree"},"value":{"kind":"Variable","name":{"kind":"Name","value":"createWorktree"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"branchSelection"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"directoryPath"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"worktreePath"}},{"kind":"Field","name":{"kind":"Name","value":"baseBranch"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"worktreeError"}}]}}]}}]} as unknown as DocumentNode<SetBranchSelectionMutation, SetBranchSelectionMutationVariables>;
export const RemoveBranchSelectionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveBranchSelection"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"directoryPath"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeBranchSelection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workstreamId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}}},{"kind":"Argument","name":{"kind":"Name","value":"directoryPath"},"value":{"kind":"Variable","name":{"kind":"Name","value":"directoryPath"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removed"}}]}}]}}]} as unknown as DocumentNode<RemoveBranchSelectionMutation, RemoveBranchSelectionMutationVariables>;
export const GetGroupDirectoriesWithBranchesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetGroupDirectoriesWithBranches"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"groupId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstreamGroup"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"groupId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"autoCreateWorktrees"}},{"kind":"Field","name":{"kind":"Name","value":"directories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"label"}}]}},{"kind":"Field","name":{"kind":"Name","value":"branchSelections"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"directoryPath"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"baseBranch"}}]}}]}}]}}]} as unknown as DocumentNode<GetGroupDirectoriesWithBranchesQuery, GetGroupDirectoriesWithBranchesQueryVariables>;
export const AddGroupDirectoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddGroupDirectory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"groupId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"path"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"label"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addGroupDirectory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"groupId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"groupId"}}},{"kind":"Argument","name":{"kind":"Name","value":"path"},"value":{"kind":"Variable","name":{"kind":"Name","value":"path"}}},{"kind":"Argument","name":{"kind":"Name","value":"label"},"value":{"kind":"Variable","name":{"kind":"Name","value":"label"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"group"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]}}]} as unknown as DocumentNode<AddGroupDirectoryMutation, AddGroupDirectoryMutationVariables>;
export const RemoveGroupDirectoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveGroupDirectory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"groupId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"path"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeGroupDirectory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"groupId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"groupId"}}},{"kind":"Argument","name":{"kind":"Name","value":"path"},"value":{"kind":"Variable","name":{"kind":"Name","value":"path"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"group"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]}}]} as unknown as DocumentNode<RemoveGroupDirectoryMutation, RemoveGroupDirectoryMutationVariables>;
export const SetGroupBranchSelectionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetGroupBranchSelection"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"groupId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"directoryPath"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"branch"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"baseBranch"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setGroupBranchSelection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"groupId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"groupId"}}},{"kind":"Argument","name":{"kind":"Name","value":"directoryPath"},"value":{"kind":"Variable","name":{"kind":"Name","value":"directoryPath"}}},{"kind":"Argument","name":{"kind":"Name","value":"branch"},"value":{"kind":"Variable","name":{"kind":"Name","value":"branch"}}},{"kind":"Argument","name":{"kind":"Name","value":"baseBranch"},"value":{"kind":"Variable","name":{"kind":"Name","value":"baseBranch"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"group"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]}}]} as unknown as DocumentNode<SetGroupBranchSelectionMutation, SetGroupBranchSelectionMutationVariables>;
export const RemoveGroupBranchSelectionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveGroupBranchSelection"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"groupId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"directoryPath"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeGroupBranchSelection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"groupId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"groupId"}}},{"kind":"Argument","name":{"kind":"Name","value":"directoryPath"},"value":{"kind":"Variable","name":{"kind":"Name","value":"directoryPath"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"group"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]}}]} as unknown as DocumentNode<RemoveGroupBranchSelectionMutation, RemoveGroupBranchSelectionMutationVariables>;
export const UpdateGroupAutoCreateWorktreesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateGroupAutoCreateWorktrees"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"autoCreateWorktrees"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateWorkstreamGroup"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"autoCreateWorktrees"},"value":{"kind":"Variable","name":{"kind":"Name","value":"autoCreateWorktrees"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"group"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"autoCreateWorktrees"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateGroupAutoCreateWorktreesMutation, UpdateGroupAutoCreateWorktreesMutationVariables>;
export const ArchiveWorkstreamGroupDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ArchiveWorkstreamGroup"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"archiveWorkstreamGroup"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"group"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]}}]} as unknown as DocumentNode<ArchiveWorkstreamGroupMutation, ArchiveWorkstreamGroupMutationVariables>;
export const GetWorkstreamGroupsByProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetWorkstreamGroupsByProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstreamGroupsByProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"emoji"}},{"kind":"Field","name":{"kind":"Name","value":"isPinned"}},{"kind":"Field","name":{"kind":"Name","value":"autoCreateWorktrees"}}]}}]}}]} as unknown as DocumentNode<GetWorkstreamGroupsByProjectQuery, GetWorkstreamGroupsByProjectQueryVariables>;
export const CreateWorkstreamGroupDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateWorkstreamGroup"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateWorkstreamGroupInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createWorkstreamGroup"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"group"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"emoji"}},{"kind":"Field","name":{"kind":"Name","value":"isPinned"}}]}}]}}]}}]} as unknown as DocumentNode<CreateWorkstreamGroupMutation, CreateWorkstreamGroupMutationVariables>;
export const UpdateWorkstreamGroupDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateWorkstreamGroup"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateWorkstreamGroupInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateWorkstreamGroup"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"group"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"emoji"}},{"kind":"Field","name":{"kind":"Name","value":"isPinned"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateWorkstreamGroupMutation, UpdateWorkstreamGroupMutationVariables>;
export const PinWorkstreamGroupDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PinWorkstreamGroup"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pinWorkstreamGroup"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"group"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"isPinned"}}]}}]}}]}}]} as unknown as DocumentNode<PinWorkstreamGroupMutation, PinWorkstreamGroupMutationVariables>;
export const UnpinWorkstreamGroupDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnpinWorkstreamGroup"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unpinWorkstreamGroup"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"group"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"isPinned"}}]}}]}}]}}]} as unknown as DocumentNode<UnpinWorkstreamGroupMutation, UnpinWorkstreamGroupMutationVariables>;
export const DeleteWorkstreamGroupDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteWorkstreamGroup"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteWorkstreamGroup"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"group"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]}}]} as unknown as DocumentNode<DeleteWorkstreamGroupMutation, DeleteWorkstreamGroupMutationVariables>;
export const AddWorkstreamToGroupDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddWorkstreamToGroup"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"groupId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addWorkstreamToGroup"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workstreamId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}}},{"kind":"Argument","name":{"kind":"Name","value":"groupId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"groupId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstream"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"groupId"}}]}}]}}]}}]} as unknown as DocumentNode<AddWorkstreamToGroupMutation, AddWorkstreamToGroupMutationVariables>;
export const RemoveWorkstreamFromGroupDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveWorkstreamFromGroup"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeWorkstreamFromGroup"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workstreamId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstream"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"groupId"}}]}}]}}]}}]} as unknown as DocumentNode<RemoveWorkstreamFromGroupMutation, RemoveWorkstreamFromGroupMutationVariables>;
export const LinkGroupEntityDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"LinkGroupEntity"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"groupId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"entityUri"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"entityType"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"entityTitle"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"linkGroupEntity"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"groupId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"groupId"}}},{"kind":"Argument","name":{"kind":"Name","value":"entityUri"},"value":{"kind":"Variable","name":{"kind":"Name","value":"entityUri"}}},{"kind":"Argument","name":{"kind":"Name","value":"entityType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"entityType"}}},{"kind":"Argument","name":{"kind":"Name","value":"entityTitle"},"value":{"kind":"Variable","name":{"kind":"Name","value":"entityTitle"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"group"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]}}]} as unknown as DocumentNode<LinkGroupEntityMutation, LinkGroupEntityMutationVariables>;
export const UnlinkGroupEntityDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnlinkGroupEntity"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"groupId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"entityUri"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unlinkGroupEntity"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"groupId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"groupId"}}},{"kind":"Argument","name":{"kind":"Name","value":"entityUri"},"value":{"kind":"Variable","name":{"kind":"Name","value":"entityUri"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"group"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]}}]} as unknown as DocumentNode<UnlinkGroupEntityMutation, UnlinkGroupEntityMutationVariables>;
export const GetGroupLinkedEntitiesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetGroupLinkedEntities"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"groupId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"groupLinkedEntities"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"groupId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"groupId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"groupId"}},{"kind":"Field","name":{"kind":"Name","value":"entityUri"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}},{"kind":"Field","name":{"kind":"Name","value":"entityTitle"}},{"kind":"Field","name":{"kind":"Name","value":"contextOverride"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<GetGroupLinkedEntitiesQuery, GetGroupLinkedEntitiesQueryVariables>;
export const IsGitRepoDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"IsGitRepo"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"path"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"isGitRepo"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"path"},"value":{"kind":"Variable","name":{"kind":"Name","value":"path"}}}]}]}}]} as unknown as DocumentNode<IsGitRepoQuery, IsGitRepoQueryVariables>;
export const GetGitBranchesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetGitBranches"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"path"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"gitBranches"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"path"},"value":{"kind":"Variable","name":{"kind":"Name","value":"path"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"isCurrent"}},{"kind":"Field","name":{"kind":"Name","value":"isRemote"}},{"kind":"Field","name":{"kind":"Name","value":"hasWorktree"}},{"kind":"Field","name":{"kind":"Name","value":"worktreePath"}}]}}]}}]} as unknown as DocumentNode<GetGitBranchesQuery, GetGitBranchesQueryVariables>;
export const GetGitCurrentBranchDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetGitCurrentBranch"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"path"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"gitCurrentBranch"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"path"},"value":{"kind":"Variable","name":{"kind":"Name","value":"path"}}}]}]}}]} as unknown as DocumentNode<GetGitCurrentBranchQuery, GetGitCurrentBranchQueryVariables>;
export const GetGitDefaultBranchDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetGitDefaultBranch"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"path"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"gitDefaultBranch"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"path"},"value":{"kind":"Variable","name":{"kind":"Name","value":"path"}}}]}]}}]} as unknown as DocumentNode<GetGitDefaultBranchQuery, GetGitDefaultBranchQueryVariables>;
export const GetGitDiffSummaryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetGitDiffSummary"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"path"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"base"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"gitDiffSummary"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"path"},"value":{"kind":"Variable","name":{"kind":"Name","value":"path"}}},{"kind":"Argument","name":{"kind":"Name","value":"base"},"value":{"kind":"Variable","name":{"kind":"Name","value":"base"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"additions"}},{"kind":"Field","name":{"kind":"Name","value":"deletions"}},{"kind":"Field","name":{"kind":"Name","value":"files"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"oldPath"}},{"kind":"Field","name":{"kind":"Name","value":"staged"}},{"kind":"Field","name":{"kind":"Name","value":"additions"}},{"kind":"Field","name":{"kind":"Name","value":"deletions"}}]}}]}}]}}]} as unknown as DocumentNode<GetGitDiffSummaryQuery, GetGitDiffSummaryQueryVariables>;
export const GetGitWorkingTreeSummaryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetGitWorkingTreeSummary"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"path"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"gitWorkingTreeSummary"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"path"},"value":{"kind":"Variable","name":{"kind":"Name","value":"path"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"additions"}},{"kind":"Field","name":{"kind":"Name","value":"deletions"}},{"kind":"Field","name":{"kind":"Name","value":"files"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"oldPath"}},{"kind":"Field","name":{"kind":"Name","value":"staged"}},{"kind":"Field","name":{"kind":"Name","value":"additions"}},{"kind":"Field","name":{"kind":"Name","value":"deletions"}}]}}]}}]}}]} as unknown as DocumentNode<GetGitWorkingTreeSummaryQuery, GetGitWorkingTreeSummaryQueryVariables>;
export const GetGitCommitLogDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetGitCommitLog"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"path"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"base"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"gitCommitLog"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"path"},"value":{"kind":"Variable","name":{"kind":"Name","value":"path"}}},{"kind":"Argument","name":{"kind":"Name","value":"base"},"value":{"kind":"Variable","name":{"kind":"Name","value":"base"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"shortHash"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"author"}},{"kind":"Field","name":{"kind":"Name","value":"date"}}]}}]}}]} as unknown as DocumentNode<GetGitCommitLogQuery, GetGitCommitLogQueryVariables>;
export const GetGitCommitDiffDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetGitCommitDiff"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"path"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"hash"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"gitCommitDiff"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"path"},"value":{"kind":"Variable","name":{"kind":"Name","value":"path"}}},{"kind":"Argument","name":{"kind":"Name","value":"hash"},"value":{"kind":"Variable","name":{"kind":"Name","value":"hash"}}}]}]}}]} as unknown as DocumentNode<GetGitCommitDiffQuery, GetGitCommitDiffQueryVariables>;
export const GetGitBranchDiffDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetGitBranchDiff"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"path"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"base"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"gitBranchDiff"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"path"},"value":{"kind":"Variable","name":{"kind":"Name","value":"path"}}},{"kind":"Argument","name":{"kind":"Name","value":"base"},"value":{"kind":"Variable","name":{"kind":"Name","value":"base"}}}]}]}}]} as unknown as DocumentNode<GetGitBranchDiffQuery, GetGitBranchDiffQueryVariables>;
export const GetGitWorkingTreeDiffDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetGitWorkingTreeDiff"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"path"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"gitWorkingTreeDiff"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"path"},"value":{"kind":"Variable","name":{"kind":"Name","value":"path"}}}]}]}}]} as unknown as DocumentNode<GetGitWorkingTreeDiffQuery, GetGitWorkingTreeDiffQueryVariables>;
export const GetGitStatusFilesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetGitStatusFiles"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"path"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"gitStatusFiles"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"path"},"value":{"kind":"Variable","name":{"kind":"Name","value":"path"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"oldPath"}},{"kind":"Field","name":{"kind":"Name","value":"staged"}},{"kind":"Field","name":{"kind":"Name","value":"additions"}},{"kind":"Field","name":{"kind":"Name","value":"deletions"}}]}}]}}]} as unknown as DocumentNode<GetGitStatusFilesQuery, GetGitStatusFilesQueryVariables>;
export const GetGitFileDiffDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetGitFileDiff"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"path"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filePath"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"base"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"gitFileDiff"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"path"},"value":{"kind":"Variable","name":{"kind":"Name","value":"path"}}},{"kind":"Argument","name":{"kind":"Name","value":"filePath"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filePath"}}},{"kind":"Argument","name":{"kind":"Name","value":"base"},"value":{"kind":"Variable","name":{"kind":"Name","value":"base"}}}]}]}}]} as unknown as DocumentNode<GetGitFileDiffQuery, GetGitFileDiffQueryVariables>;
export const GetGitFileAtRefDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetGitFileAtRef"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"path"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filePath"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ref"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"gitFileAtRef"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"path"},"value":{"kind":"Variable","name":{"kind":"Name","value":"path"}}},{"kind":"Argument","name":{"kind":"Name","value":"filePath"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filePath"}}},{"kind":"Argument","name":{"kind":"Name","value":"ref"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ref"}}}]}]}}]} as unknown as DocumentNode<GetGitFileAtRefQuery, GetGitFileAtRefQueryVariables>;
export const GetSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetSettings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"settings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"appearance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"theme"}},{"kind":"Field","name":{"kind":"Name","value":"fontSize"}},{"kind":"Field","name":{"kind":"Name","value":"compactMode"}},{"kind":"Field","name":{"kind":"Name","value":"zoomLevel"}}]}},{"kind":"Field","name":{"kind":"Name","value":"ai"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"defaultModel"}},{"kind":"Field","name":{"kind":"Name","value":"cliPath"}},{"kind":"Field","name":{"kind":"Name","value":"cliSetupComplete"}},{"kind":"Field","name":{"kind":"Name","value":"autoCompactPercent"}}]}},{"kind":"Field","name":{"kind":"Name","value":"advanced"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"developerMode"}},{"kind":"Field","name":{"kind":"Name","value":"focusMonitorEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"focusMonitorIntervalMs"}}]}},{"kind":"Field","name":{"kind":"Name","value":"permissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"activePreset"}},{"kind":"Field","name":{"kind":"Name","value":"rules"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tool"}},{"kind":"Field","name":{"kind":"Name","value":"behavior"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"notifications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mutedSources"}},{"kind":"Field","name":{"kind":"Name","value":"mutedTypes"}}]}}]}}]}}]} as unknown as DocumentNode<GetSettingsQuery, GetSettingsQueryVariables>;
export const UpdateAppearanceSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateAppearanceSettings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateAppearanceSettingsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateAppearanceSettings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"appearance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"theme"}},{"kind":"Field","name":{"kind":"Name","value":"fontSize"}},{"kind":"Field","name":{"kind":"Name","value":"compactMode"}},{"kind":"Field","name":{"kind":"Name","value":"zoomLevel"}}]}},{"kind":"Field","name":{"kind":"Name","value":"ai"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"defaultModel"}},{"kind":"Field","name":{"kind":"Name","value":"cliPath"}},{"kind":"Field","name":{"kind":"Name","value":"cliSetupComplete"}},{"kind":"Field","name":{"kind":"Name","value":"autoCompactPercent"}}]}},{"kind":"Field","name":{"kind":"Name","value":"advanced"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"developerMode"}},{"kind":"Field","name":{"kind":"Name","value":"focusMonitorEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"focusMonitorIntervalMs"}}]}},{"kind":"Field","name":{"kind":"Name","value":"permissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"activePreset"}},{"kind":"Field","name":{"kind":"Name","value":"rules"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tool"}},{"kind":"Field","name":{"kind":"Name","value":"behavior"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"notifications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mutedSources"}},{"kind":"Field","name":{"kind":"Name","value":"mutedTypes"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateAppearanceSettingsMutation, UpdateAppearanceSettingsMutationVariables>;
export const UpdateAiSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateAiSettings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateAiSettingsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateAiSettings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"appearance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"theme"}},{"kind":"Field","name":{"kind":"Name","value":"fontSize"}},{"kind":"Field","name":{"kind":"Name","value":"compactMode"}},{"kind":"Field","name":{"kind":"Name","value":"zoomLevel"}}]}},{"kind":"Field","name":{"kind":"Name","value":"ai"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"defaultModel"}},{"kind":"Field","name":{"kind":"Name","value":"cliPath"}},{"kind":"Field","name":{"kind":"Name","value":"cliSetupComplete"}},{"kind":"Field","name":{"kind":"Name","value":"autoCompactPercent"}}]}},{"kind":"Field","name":{"kind":"Name","value":"advanced"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"developerMode"}},{"kind":"Field","name":{"kind":"Name","value":"focusMonitorEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"focusMonitorIntervalMs"}}]}},{"kind":"Field","name":{"kind":"Name","value":"permissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"activePreset"}},{"kind":"Field","name":{"kind":"Name","value":"rules"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tool"}},{"kind":"Field","name":{"kind":"Name","value":"behavior"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"notifications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mutedSources"}},{"kind":"Field","name":{"kind":"Name","value":"mutedTypes"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateAiSettingsMutation, UpdateAiSettingsMutationVariables>;
export const UpdateAdvancedSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateAdvancedSettings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateAdvancedSettingsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateAdvancedSettings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"appearance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"theme"}},{"kind":"Field","name":{"kind":"Name","value":"fontSize"}},{"kind":"Field","name":{"kind":"Name","value":"compactMode"}},{"kind":"Field","name":{"kind":"Name","value":"zoomLevel"}}]}},{"kind":"Field","name":{"kind":"Name","value":"ai"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"defaultModel"}},{"kind":"Field","name":{"kind":"Name","value":"cliPath"}},{"kind":"Field","name":{"kind":"Name","value":"cliSetupComplete"}},{"kind":"Field","name":{"kind":"Name","value":"autoCompactPercent"}}]}},{"kind":"Field","name":{"kind":"Name","value":"advanced"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"developerMode"}},{"kind":"Field","name":{"kind":"Name","value":"focusMonitorEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"focusMonitorIntervalMs"}}]}},{"kind":"Field","name":{"kind":"Name","value":"permissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"activePreset"}},{"kind":"Field","name":{"kind":"Name","value":"rules"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tool"}},{"kind":"Field","name":{"kind":"Name","value":"behavior"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"notifications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mutedSources"}},{"kind":"Field","name":{"kind":"Name","value":"mutedTypes"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateAdvancedSettingsMutation, UpdateAdvancedSettingsMutationVariables>;
export const UpdateSettingsRawDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateSettingsRaw"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"json"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateSettingsRaw"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"json"},"value":{"kind":"Variable","name":{"kind":"Name","value":"json"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"appearance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"theme"}},{"kind":"Field","name":{"kind":"Name","value":"fontSize"}},{"kind":"Field","name":{"kind":"Name","value":"compactMode"}},{"kind":"Field","name":{"kind":"Name","value":"zoomLevel"}}]}},{"kind":"Field","name":{"kind":"Name","value":"ai"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"defaultModel"}},{"kind":"Field","name":{"kind":"Name","value":"cliPath"}},{"kind":"Field","name":{"kind":"Name","value":"cliSetupComplete"}},{"kind":"Field","name":{"kind":"Name","value":"autoCompactPercent"}}]}},{"kind":"Field","name":{"kind":"Name","value":"advanced"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"developerMode"}},{"kind":"Field","name":{"kind":"Name","value":"focusMonitorEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"focusMonitorIntervalMs"}}]}},{"kind":"Field","name":{"kind":"Name","value":"permissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"activePreset"}},{"kind":"Field","name":{"kind":"Name","value":"rules"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tool"}},{"kind":"Field","name":{"kind":"Name","value":"behavior"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"notifications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mutedSources"}},{"kind":"Field","name":{"kind":"Name","value":"mutedTypes"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateSettingsRawMutation, UpdateSettingsRawMutationVariables>;
export const GetNotificationSourcesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetNotificationSources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notificationSources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"muted"}},{"kind":"Field","name":{"kind":"Name","value":"types"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"defaultEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"muted"}}]}}]}}]}}]} as unknown as DocumentNode<GetNotificationSourcesQuery, GetNotificationSourcesQueryVariables>;
export const SetNotificationSourceMutedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetNotificationSourceMuted"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"source"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"muted"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setNotificationSourceMuted"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"source"},"value":{"kind":"Variable","name":{"kind":"Name","value":"source"}}},{"kind":"Argument","name":{"kind":"Name","value":"muted"},"value":{"kind":"Variable","name":{"kind":"Name","value":"muted"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notifications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mutedSources"}},{"kind":"Field","name":{"kind":"Name","value":"mutedTypes"}}]}}]}}]}}]} as unknown as DocumentNode<SetNotificationSourceMutedMutation, SetNotificationSourceMutedMutationVariables>;
export const SetNotificationTypeMutedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetNotificationTypeMuted"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"typeId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"muted"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setNotificationTypeMuted"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"typeId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"typeId"}}},{"kind":"Argument","name":{"kind":"Name","value":"muted"},"value":{"kind":"Variable","name":{"kind":"Name","value":"muted"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notifications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mutedSources"}},{"kind":"Field","name":{"kind":"Name","value":"mutedTypes"}}]}}]}}]}}]} as unknown as DocumentNode<SetNotificationTypeMutedMutation, SetNotificationTypeMutedMutationVariables>;
export const ResetNotificationMutesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ResetNotificationMutes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"resetNotificationMutes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notifications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mutedSources"}},{"kind":"Field","name":{"kind":"Name","value":"mutedTypes"}}]}}]}}]}}]} as unknown as DocumentNode<ResetNotificationMutesMutation, ResetNotificationMutesMutationVariables>;
export const GetRegistriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetRegistries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"registries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"priority"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetRegistriesQuery, GetRegistriesQueryVariables>;
export const GetRegistryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetRegistry"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"registry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"priority"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetRegistryQuery, GetRegistryQueryVariables>;
export const GetRegistryQuickActionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetRegistryQuickActions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"registryQuickActions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"registry"}},{"kind":"Field","name":{"kind":"Name","value":"options"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"prompt"}}]}}]}}]}}]} as unknown as DocumentNode<GetRegistryQuickActionsQuery, GetRegistryQuickActionsQueryVariables>;
export const GetRegistryQuickActionDefaultsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetRegistryQuickActionDefaults"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"registryQuickActionDefaults"}}]}}]} as unknown as DocumentNode<GetRegistryQuickActionDefaultsQuery, GetRegistryQuickActionDefaultsQueryVariables>;
export const GetRegistryVerificationActionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetRegistryVerificationActions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"registryVerificationActions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"builtinId"}},{"kind":"Field","name":{"kind":"Name","value":"prompt"}}]}}]}}]} as unknown as DocumentNode<GetRegistryVerificationActionsQuery, GetRegistryVerificationActionsQueryVariables>;
export const GetRegistryVerificationActionDefaultsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetRegistryVerificationActionDefaults"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"registryVerificationActionDefaults"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"builtinId"}},{"kind":"Field","name":{"kind":"Name","value":"prompt"}}]}}]}}]} as unknown as DocumentNode<GetRegistryVerificationActionDefaultsQuery, GetRegistryVerificationActionDefaultsQueryVariables>;
export const AddRegistryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddRegistry"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AddRegistryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addRegistry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"registry"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"priority"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<AddRegistryMutation, AddRegistryMutationVariables>;
export const RemoveRegistryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveRegistry"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeRegistry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"registry"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode<RemoveRegistryMutation, RemoveRegistryMutationVariables>;
export const UpdateRegistryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateRegistry"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateRegistryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateRegistry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"registry"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"priority"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateRegistryMutation, UpdateRegistryMutationVariables>;
export const SyncRegistriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SyncRegistries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"syncRegistries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"synced"}}]}}]}}]} as unknown as DocumentNode<SyncRegistriesMutation, SyncRegistriesMutationVariables>;
export const GetInstalledSkillsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetInstalledSkills"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"installedSkills"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"registryVersion"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"sourceRef"}},{"kind":"Field","name":{"kind":"Name","value":"registry"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"author"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"pinned"}},{"kind":"Field","name":{"kind":"Name","value":"installDate"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"useCount"}},{"kind":"Field","name":{"kind":"Name","value":"hasUpdate"}}]}}]}}]} as unknown as DocumentNode<GetInstalledSkillsQuery, GetInstalledSkillsQueryVariables>;
export const GetRegistrySkillsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetRegistrySkills"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"registrySkills"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"repo"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"registry"}}]}}]}}]} as unknown as DocumentNode<GetRegistrySkillsQuery, GetRegistrySkillsQueryVariables>;
export const InstallSkillDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"InstallSkill"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"skillId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"destination"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"installSkill"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"skillId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"skillId"}}},{"kind":"Argument","name":{"kind":"Name","value":"destination"},"value":{"kind":"Variable","name":{"kind":"Name","value":"destination"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"skill"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"registryVersion"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"sourceRef"}},{"kind":"Field","name":{"kind":"Name","value":"registry"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"author"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"pinned"}},{"kind":"Field","name":{"kind":"Name","value":"installDate"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"useCount"}},{"kind":"Field","name":{"kind":"Name","value":"hasUpdate"}}]}}]}}]}}]} as unknown as DocumentNode<InstallSkillMutation, InstallSkillMutationVariables>;
export const UninstallSkillDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UninstallSkill"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"skillId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"uninstallSkill"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"skillId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"skillId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<UninstallSkillMutation, UninstallSkillMutationVariables>;
export const UpdateSkillDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateSkill"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"skillId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateSkill"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"skillId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"skillId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"skill"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"registryVersion"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"sourceRef"}},{"kind":"Field","name":{"kind":"Name","value":"registry"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"author"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"pinned"}},{"kind":"Field","name":{"kind":"Name","value":"installDate"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"useCount"}},{"kind":"Field","name":{"kind":"Name","value":"hasUpdate"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateSkillMutation, UpdateSkillMutationVariables>;
export const ActivateSkillDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ActivateSkill"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"skillId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"activateSkill"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"skillId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"skillId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"body"}}]}}]}}]} as unknown as DocumentNode<ActivateSkillMutation, ActivateSkillMutationVariables>;
export const ToggleSkillEnabledDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ToggleSkillEnabled"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"skillId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"enabled"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"toggleSkillEnabled"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"skillId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"skillId"}}},{"kind":"Argument","name":{"kind":"Name","value":"enabled"},"value":{"kind":"Variable","name":{"kind":"Name","value":"enabled"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"skill"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}}]}}]}}]}}]} as unknown as DocumentNode<ToggleSkillEnabledMutation, ToggleSkillEnabledMutationVariables>;
export const ToggleSkillPinnedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ToggleSkillPinned"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"skillId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"pinned"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"toggleSkillPinned"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"skillId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"skillId"}}},{"kind":"Argument","name":{"kind":"Name","value":"pinned"},"value":{"kind":"Variable","name":{"kind":"Name","value":"pinned"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"skill"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"pinned"}}]}}]}}]}}]} as unknown as DocumentNode<ToggleSkillPinnedMutation, ToggleSkillPinnedMutationVariables>;
export const SyncLocalSkillsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SyncLocalSkills"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"syncLocalSkills"}}]}}]} as unknown as DocumentNode<SyncLocalSkillsMutation, SyncLocalSkillsMutationVariables>;
export const GetInstalledPluginsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetInstalledPlugins"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"installedPlugins"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"registryVersion"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"sourceRef"}},{"kind":"Field","name":{"kind":"Name","value":"registry"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"author"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"installDate"}},{"kind":"Field","name":{"kind":"Name","value":"hasUpdate"}}]}}]}}]} as unknown as DocumentNode<GetInstalledPluginsQuery, GetInstalledPluginsQueryVariables>;
export const GetRegistryPluginsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetRegistryPlugins"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"registryPlugins"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"repo"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"registry"}},{"kind":"Field","name":{"kind":"Name","value":"canvases"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"navSidebar"}},{"kind":"Field","name":{"kind":"Name","value":"drawer"}},{"kind":"Field","name":{"kind":"Name","value":"menuBar"}},{"kind":"Field","name":{"kind":"Name","value":"feed"}}]}}]}}]}}]} as unknown as DocumentNode<GetRegistryPluginsQuery, GetRegistryPluginsQueryVariables>;
export const InstallPluginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"InstallPlugin"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"pluginId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"installPlugin"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"pluginId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"pluginId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"plugin"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"registryVersion"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"sourceRef"}},{"kind":"Field","name":{"kind":"Name","value":"registry"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"author"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"installDate"}},{"kind":"Field","name":{"kind":"Name","value":"hasUpdate"}}]}}]}}]}}]} as unknown as DocumentNode<InstallPluginMutation, InstallPluginMutationVariables>;
export const UninstallPluginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UninstallPlugin"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"pluginId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"uninstallPlugin"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"pluginId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"pluginId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<UninstallPluginMutation, UninstallPluginMutationVariables>;
export const UpdatePluginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdatePlugin"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"pluginId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updatePlugin"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"pluginId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"pluginId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"plugin"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"registryVersion"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"sourceRef"}},{"kind":"Field","name":{"kind":"Name","value":"registry"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"author"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"installDate"}},{"kind":"Field","name":{"kind":"Name","value":"hasUpdate"}}]}}]}}]}}]} as unknown as DocumentNode<UpdatePluginMutation, UpdatePluginMutationVariables>;
export const TogglePluginEnabledDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"TogglePluginEnabled"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"pluginId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"enabled"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"togglePluginEnabled"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"pluginId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"pluginId"}}},{"kind":"Argument","name":{"kind":"Name","value":"enabled"},"value":{"kind":"Variable","name":{"kind":"Name","value":"enabled"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"plugin"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}}]}}]}}]}}]} as unknown as DocumentNode<TogglePluginEnabledMutation, TogglePluginEnabledMutationVariables>;
export const GetCommandsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCommands"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"categoryFilter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commands"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"categoryFilter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"categoryFilter"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"keywords"}},{"kind":"Field","name":{"kind":"Name","value":"disabled"}},{"kind":"Field","name":{"kind":"Name","value":"disabledReason"}},{"kind":"Field","name":{"kind":"Name","value":"hasFlow"}},{"kind":"Field","name":{"kind":"Name","value":"body"}}]}}]}}]} as unknown as DocumentNode<GetCommandsQuery, GetCommandsQueryVariables>;
export const ExecuteCommandDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ExecuteCommand"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"commandId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"args"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"executeCommand"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"commandId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"commandId"}}},{"kind":"Argument","name":{"kind":"Name","value":"args"},"value":{"kind":"Variable","name":{"kind":"Name","value":"args"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"error"}},{"kind":"Field","name":{"kind":"Name","value":"action"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"variant"}},{"kind":"Field","name":{"kind":"Name","value":"text"}}]}}]}}]}}]} as unknown as DocumentNode<ExecuteCommandMutation, ExecuteCommandMutationVariables>;
export const RescanClaudeCommandsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RescanClaudeCommands"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rescanClaudeCommands"}}]}}]} as unknown as DocumentNode<RescanClaudeCommandsMutation, RescanClaudeCommandsMutationVariables>;
export const UpdatePermissionsSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdatePermissionsSettings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdatePermissionsSettingsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updatePermissionsSettings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"appearance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"theme"}},{"kind":"Field","name":{"kind":"Name","value":"fontSize"}},{"kind":"Field","name":{"kind":"Name","value":"compactMode"}},{"kind":"Field","name":{"kind":"Name","value":"zoomLevel"}}]}},{"kind":"Field","name":{"kind":"Name","value":"ai"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"defaultModel"}},{"kind":"Field","name":{"kind":"Name","value":"cliPath"}},{"kind":"Field","name":{"kind":"Name","value":"cliSetupComplete"}},{"kind":"Field","name":{"kind":"Name","value":"autoCompactPercent"}}]}},{"kind":"Field","name":{"kind":"Name","value":"advanced"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"developerMode"}},{"kind":"Field","name":{"kind":"Name","value":"focusMonitorEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"focusMonitorIntervalMs"}}]}},{"kind":"Field","name":{"kind":"Name","value":"permissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"activePreset"}},{"kind":"Field","name":{"kind":"Name","value":"rules"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tool"}},{"kind":"Field","name":{"kind":"Name","value":"behavior"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"notifications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mutedSources"}},{"kind":"Field","name":{"kind":"Name","value":"mutedTypes"}}]}}]}}]}}]} as unknown as DocumentNode<UpdatePermissionsSettingsMutation, UpdatePermissionsSettingsMutationVariables>;
export const GetPermissionPolicyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetPermissionPolicy"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"scopeType"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PermissionScopeType"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"scopeId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"permissionPolicy"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"scopeType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"scopeType"}}},{"kind":"Argument","name":{"kind":"Name","value":"scopeId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"scopeId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"scopeType"}},{"kind":"Field","name":{"kind":"Name","value":"scopeId"}},{"kind":"Field","name":{"kind":"Name","value":"rules"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tool"}},{"kind":"Field","name":{"kind":"Name","value":"behavior"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}}]}},{"kind":"Field","name":{"kind":"Name","value":"templateId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetPermissionPolicyQuery, GetPermissionPolicyQueryVariables>;
export const SetPermissionPolicyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetPermissionPolicy"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"scopeType"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PermissionScopeType"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"scopeId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"rules"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PermissionRuleConfigInput"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setPermissionPolicy"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"scopeType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"scopeType"}}},{"kind":"Argument","name":{"kind":"Name","value":"scopeId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"scopeId"}}},{"kind":"Argument","name":{"kind":"Name","value":"rules"},"value":{"kind":"Variable","name":{"kind":"Name","value":"rules"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"scopeType"}},{"kind":"Field","name":{"kind":"Name","value":"scopeId"}},{"kind":"Field","name":{"kind":"Name","value":"rules"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tool"}},{"kind":"Field","name":{"kind":"Name","value":"behavior"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}}]}},{"kind":"Field","name":{"kind":"Name","value":"templateId"}}]}}]}}]} as unknown as DocumentNode<SetPermissionPolicyMutation, SetPermissionPolicyMutationVariables>;
export const DeletePermissionPolicyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeletePermissionPolicy"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"scopeType"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PermissionScopeType"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"scopeId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deletePermissionPolicy"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"scopeType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"scopeType"}}},{"kind":"Argument","name":{"kind":"Name","value":"scopeId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"scopeId"}}}]}]}}]} as unknown as DocumentNode<DeletePermissionPolicyMutation, DeletePermissionPolicyMutationVariables>;
export const GetResolvedPermissionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetResolvedPermissions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"resolvedPermissions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workstreamId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tool"}},{"kind":"Field","name":{"kind":"Name","value":"behavior"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}}]}}]}}]} as unknown as DocumentNode<GetResolvedPermissionsQuery, GetResolvedPermissionsQueryVariables>;
export const GetResolvedParentPermissionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetResolvedParentPermissions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"scopeType"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PermissionScopeType"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"scopeId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"resolvedParentPermissions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"scopeType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"scopeType"}}},{"kind":"Argument","name":{"kind":"Name","value":"scopeId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"scopeId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tool"}},{"kind":"Field","name":{"kind":"Name","value":"behavior"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}}]}}]}}]} as unknown as DocumentNode<GetResolvedParentPermissionsQuery, GetResolvedParentPermissionsQueryVariables>;
export const GetPermissionTemplatesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetPermissionTemplates"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"permissionTemplates"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"rules"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tool"}},{"kind":"Field","name":{"kind":"Name","value":"behavior"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetPermissionTemplatesQuery, GetPermissionTemplatesQueryVariables>;
export const GetPermissionTemplateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetPermissionTemplate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"permissionTemplate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"rules"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tool"}},{"kind":"Field","name":{"kind":"Name","value":"behavior"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetPermissionTemplateQuery, GetPermissionTemplateQueryVariables>;
export const CreatePermissionTemplateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreatePermissionTemplate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"description"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"rules"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PermissionRuleConfigInput"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createPermissionTemplate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"description"},"value":{"kind":"Variable","name":{"kind":"Name","value":"description"}}},{"kind":"Argument","name":{"kind":"Name","value":"rules"},"value":{"kind":"Variable","name":{"kind":"Name","value":"rules"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"rules"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tool"}},{"kind":"Field","name":{"kind":"Name","value":"behavior"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<CreatePermissionTemplateMutation, CreatePermissionTemplateMutationVariables>;
export const UpdatePermissionTemplateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdatePermissionTemplate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"description"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"rules"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PermissionRuleConfigInput"}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updatePermissionTemplate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"description"},"value":{"kind":"Variable","name":{"kind":"Name","value":"description"}}},{"kind":"Argument","name":{"kind":"Name","value":"rules"},"value":{"kind":"Variable","name":{"kind":"Name","value":"rules"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"rules"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tool"}},{"kind":"Field","name":{"kind":"Name","value":"behavior"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdatePermissionTemplateMutation, UpdatePermissionTemplateMutationVariables>;
export const DeletePermissionTemplateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeletePermissionTemplate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deletePermissionTemplate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeletePermissionTemplateMutation, DeletePermissionTemplateMutationVariables>;
export const ApplyPermissionTemplateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ApplyPermissionTemplate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"templateId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"scopeType"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PermissionScopeType"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"scopeId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"applyPermissionTemplate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"templateId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"templateId"}}},{"kind":"Argument","name":{"kind":"Name","value":"scopeType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"scopeType"}}},{"kind":"Argument","name":{"kind":"Name","value":"scopeId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"scopeId"}}}]}]}}]} as unknown as DocumentNode<ApplyPermissionTemplateMutation, ApplyPermissionTemplateMutationVariables>;
export const GetTagsByProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetTagsByProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tagsByProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"instructions"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"maxDepth"}},{"kind":"Field","name":{"kind":"Name","value":"spawnWorkstream"}},{"kind":"Field","name":{"kind":"Name","value":"worktreeMode"}},{"kind":"Field","name":{"kind":"Name","value":"dependsOn"}}]}}]}}]} as unknown as DocumentNode<GetTagsByProjectQuery, GetTagsByProjectQueryVariables>;
export const GetTagByNameDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetTagByName"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tagByName"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"instructions"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"maxDepth"}},{"kind":"Field","name":{"kind":"Name","value":"spawnWorkstream"}},{"kind":"Field","name":{"kind":"Name","value":"worktreeMode"}},{"kind":"Field","name":{"kind":"Name","value":"dependsOn"}}]}}]}}]} as unknown as DocumentNode<GetTagByNameQuery, GetTagByNameQueryVariables>;
export const GetWorkstreamTagsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetWorkstreamTags"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstreamTags"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workstreamId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"workstreamId"}},{"kind":"Field","name":{"kind":"Name","value":"tagName"}},{"kind":"Field","name":{"kind":"Name","value":"tagInstructions"}},{"kind":"Field","name":{"kind":"Name","value":"tagColor"}},{"kind":"Field","name":{"kind":"Name","value":"tagMaxDepth"}},{"kind":"Field","name":{"kind":"Name","value":"tagSpawnWorkstream"}},{"kind":"Field","name":{"kind":"Name","value":"tagWorktreeMode"}},{"kind":"Field","name":{"kind":"Name","value":"tagDependsOn"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"appliedAt"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}},{"kind":"Field","name":{"kind":"Name","value":"error"}},{"kind":"Field","name":{"kind":"Name","value":"appliedBy"}},{"kind":"Field","name":{"kind":"Name","value":"depth"}},{"kind":"Field","name":{"kind":"Name","value":"delegatedWorkstreamId"}}]}}]}}]} as unknown as DocumentNode<GetWorkstreamTagsQuery, GetWorkstreamTagsQueryVariables>;
export const CreateTagDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateTag"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateTagInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createTag"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tag"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"instructions"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"maxDepth"}},{"kind":"Field","name":{"kind":"Name","value":"spawnWorkstream"}},{"kind":"Field","name":{"kind":"Name","value":"worktreeMode"}},{"kind":"Field","name":{"kind":"Name","value":"dependsOn"}}]}}]}}]}}]} as unknown as DocumentNode<CreateTagMutation, CreateTagMutationVariables>;
export const UpdateTagDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateTag"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tagName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateTagInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateTag"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}},{"kind":"Argument","name":{"kind":"Name","value":"tagName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tagName"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tag"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"instructions"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"maxDepth"}},{"kind":"Field","name":{"kind":"Name","value":"spawnWorkstream"}},{"kind":"Field","name":{"kind":"Name","value":"worktreeMode"}},{"kind":"Field","name":{"kind":"Name","value":"dependsOn"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateTagMutation, UpdateTagMutationVariables>;
export const DeleteTagDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteTag"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tagName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteTag"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}},{"kind":"Argument","name":{"kind":"Name","value":"tagName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tagName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tag"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode<DeleteTagMutation, DeleteTagMutationVariables>;
export const ApplyTagToWorkstreamDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ApplyTagToWorkstream"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tagName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"applyTagToWorkstream"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workstreamId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}}},{"kind":"Argument","name":{"kind":"Name","value":"tagName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tagName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workstreamTag"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"workstreamId"}},{"kind":"Field","name":{"kind":"Name","value":"tagName"}},{"kind":"Field","name":{"kind":"Name","value":"tagColor"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"appliedAt"}},{"kind":"Field","name":{"kind":"Name","value":"appliedBy"}},{"kind":"Field","name":{"kind":"Name","value":"depth"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pipelineRunId"}}]}}]}}]} as unknown as DocumentNode<ApplyTagToWorkstreamMutation, ApplyTagToWorkstreamMutationVariables>;
export const RemoveTagFromWorkstreamDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveTagFromWorkstream"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tagName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeTagFromWorkstream"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workstreamId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workstreamId"}}},{"kind":"Argument","name":{"kind":"Name","value":"tagName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tagName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<RemoveTagFromWorkstreamMutation, RemoveTagFromWorkstreamMutationVariables>;
export const GetContentProfilesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetContentProfiles"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contentProfiles"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"directory"}},{"kind":"Field","name":{"kind":"Name","value":"isDefault"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"isFork"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"sourceUrl"}}]}}]}}]}}]} as unknown as DocumentNode<GetContentProfilesQuery, GetContentProfilesQueryVariables>;
export const GetActiveContentProfileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetActiveContentProfile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"activeContentProfile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"directory"}},{"kind":"Field","name":{"kind":"Name","value":"isDefault"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"isFork"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"sourceUrl"}}]}}]}}]}}]} as unknown as DocumentNode<GetActiveContentProfileQuery, GetActiveContentProfileQueryVariables>;
export const ForkContentProfileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ForkContentProfile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"gitUrl"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"forkContentProfile"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"gitUrl"},"value":{"kind":"Variable","name":{"kind":"Name","value":"gitUrl"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"directory"}},{"kind":"Field","name":{"kind":"Name","value":"isDefault"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"isFork"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"sourceUrl"}}]}}]}}]}}]} as unknown as DocumentNode<ForkContentProfileMutation, ForkContentProfileMutationVariables>;
export const SwitchContentProfileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SwitchContentProfile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"switchContentProfile"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}]}]}}]} as unknown as DocumentNode<SwitchContentProfileMutation, SwitchContentProfileMutationVariables>;
export const DeleteContentProfileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteContentProfile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteContentProfile"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}]}]}}]} as unknown as DocumentNode<DeleteContentProfileMutation, DeleteContentProfileMutationVariables>;
export const GetTaskDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetTask"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"task"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"projectId"}},{"kind":"Field","name":{"kind":"Name","value":"identifier"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"priority"}},{"kind":"Field","name":{"kind":"Name","value":"assigneeType"}},{"kind":"Field","name":{"kind":"Name","value":"assigneeWorkstreamId"}},{"kind":"Field","name":{"kind":"Name","value":"dueDate"}},{"kind":"Field","name":{"kind":"Name","value":"parentId"}},{"kind":"Field","name":{"kind":"Name","value":"links"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"labels"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"color"}}]}},{"kind":"Field","name":{"kind":"Name","value":"subtasks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"identifier"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"priority"}}]}},{"kind":"Field","name":{"kind":"Name","value":"parent"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"identifier"}},{"kind":"Field","name":{"kind":"Name","value":"title"}}]}}]}}]}}]} as unknown as DocumentNode<GetTaskQuery, GetTaskQueryVariables>;
export const GetTasksDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetTasks"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"TaskStatus"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"priority"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"TaskPriority"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"assigneeType"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"TaskAssigneeType"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"labelId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"parentId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tasks"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}},{"kind":"Argument","name":{"kind":"Name","value":"priority"},"value":{"kind":"Variable","name":{"kind":"Name","value":"priority"}}},{"kind":"Argument","name":{"kind":"Name","value":"assigneeType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"assigneeType"}}},{"kind":"Argument","name":{"kind":"Name","value":"labelId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"labelId"}}},{"kind":"Argument","name":{"kind":"Name","value":"parentId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"parentId"}}},{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"projectId"}},{"kind":"Field","name":{"kind":"Name","value":"identifier"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"priority"}},{"kind":"Field","name":{"kind":"Name","value":"assigneeType"}},{"kind":"Field","name":{"kind":"Name","value":"assigneeWorkstreamId"}},{"kind":"Field","name":{"kind":"Name","value":"dueDate"}},{"kind":"Field","name":{"kind":"Name","value":"parentId"}},{"kind":"Field","name":{"kind":"Name","value":"links"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"labels"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"color"}}]}}]}}]}}]} as unknown as DocumentNode<GetTasksQuery, GetTasksQueryVariables>;
export const GetTaskLabelsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetTaskLabels"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"taskLabels"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"projectId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<GetTaskLabelsQuery, GetTaskLabelsQueryVariables>;
export const CreateTaskDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateTask"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateTaskInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createTask"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"task"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"projectId"}},{"kind":"Field","name":{"kind":"Name","value":"identifier"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"priority"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]}}]} as unknown as DocumentNode<CreateTaskMutation, CreateTaskMutationVariables>;
export const UpdateTaskDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateTask"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateTaskInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateTask"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"task"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"projectId"}},{"kind":"Field","name":{"kind":"Name","value":"identifier"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"priority"}},{"kind":"Field","name":{"kind":"Name","value":"assigneeType"}},{"kind":"Field","name":{"kind":"Name","value":"assigneeWorkstreamId"}},{"kind":"Field","name":{"kind":"Name","value":"dueDate"}},{"kind":"Field","name":{"kind":"Name","value":"parentId"}},{"kind":"Field","name":{"kind":"Name","value":"links"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"labels"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"color"}}]}}]}}]}}]}}]} as unknown as DocumentNode<UpdateTaskMutation, UpdateTaskMutationVariables>;
export const DeleteTaskDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteTask"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteTask"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<DeleteTaskMutation, DeleteTaskMutationVariables>;
export const CreateTaskLabelDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateTaskLabel"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"color"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createTaskLabel"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"color"},"value":{"kind":"Variable","name":{"kind":"Name","value":"color"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"label"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"projectId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]}}]} as unknown as DocumentNode<CreateTaskLabelMutation, CreateTaskLabelMutationVariables>;
export const UpdateTaskLabelDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateTaskLabel"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"color"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateTaskLabel"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"color"},"value":{"kind":"Variable","name":{"kind":"Name","value":"color"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"label"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"projectId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateTaskLabelMutation, UpdateTaskLabelMutationVariables>;
export const DeleteTaskLabelDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteTaskLabel"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteTaskLabel"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<DeleteTaskLabelMutation, DeleteTaskLabelMutationVariables>;
export const GetInboxItemsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetInboxItems"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"includeArchived"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"includeRead"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"inboxItems"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"includeArchived"},"value":{"kind":"Variable","name":{"kind":"Name","value":"includeArchived"}}},{"kind":"Argument","name":{"kind":"Name","value":"includeRead"},"value":{"kind":"Variable","name":{"kind":"Name","value":"includeRead"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"actions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"payload"}}]}},{"kind":"Field","name":{"kind":"Name","value":"entityUri"}},{"kind":"Field","name":{"kind":"Name","value":"ctaLabel"}},{"kind":"Field","name":{"kind":"Name","value":"read"}},{"kind":"Field","name":{"kind":"Name","value":"archived"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetInboxItemsQuery, GetInboxItemsQueryVariables>;
export const GetInboxUnreadCountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetInboxUnreadCount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"inboxUnreadCount"}}]}}]} as unknown as DocumentNode<GetInboxUnreadCountQuery, GetInboxUnreadCountQueryVariables>;
export const PushInboxItemDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PushInboxItem"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PushInboxItemInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pushInboxItem"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"inboxItem"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"actions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"payload"}}]}},{"kind":"Field","name":{"kind":"Name","value":"entityUri"}},{"kind":"Field","name":{"kind":"Name","value":"ctaLabel"}},{"kind":"Field","name":{"kind":"Name","value":"read"}},{"kind":"Field","name":{"kind":"Name","value":"archived"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<PushInboxItemMutation, PushInboxItemMutationVariables>;
export const MarkInboxItemReadDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarkInboxItemRead"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"markInboxItemRead"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"inboxItem"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"read"}}]}}]}}]}}]} as unknown as DocumentNode<MarkInboxItemReadMutation, MarkInboxItemReadMutationVariables>;
export const MarkAllInboxItemsReadDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarkAllInboxItemsRead"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"markAllInboxItemsRead"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"count"}}]}}]}}]} as unknown as DocumentNode<MarkAllInboxItemsReadMutation, MarkAllInboxItemsReadMutationVariables>;
export const ArchiveInboxItemDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ArchiveInboxItem"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"archiveInboxItem"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"inboxItem"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"archived"}}]}}]}}]}}]} as unknown as DocumentNode<ArchiveInboxItemMutation, ArchiveInboxItemMutationVariables>;
export const DeleteInboxItemDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteInboxItem"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteInboxItem"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<DeleteInboxItemMutation, DeleteInboxItemMutationVariables>;
export const ExecuteInboxActionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ExecuteInboxAction"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"actionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"payload"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"executeInboxAction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"actionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"actionId"}}},{"kind":"Argument","name":{"kind":"Name","value":"payload"},"value":{"kind":"Variable","name":{"kind":"Name","value":"payload"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<ExecuteInboxActionMutation, ExecuteInboxActionMutationVariables>;
export const GetRegisteredEventsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetRegisteredEvents"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"registeredEvents"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"qualifiedName"}},{"kind":"Field","name":{"kind":"Name","value":"localName"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"ownerPluginId"}},{"kind":"Field","name":{"kind":"Name","value":"listenerCount"}},{"kind":"Field","name":{"kind":"Name","value":"payloadSchema"}}]}}]}}]} as unknown as DocumentNode<GetRegisteredEventsQuery, GetRegisteredEventsQueryVariables>;
export const GetEntityToolEntriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetEntityToolEntries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"entityToolEntries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"uri"}},{"kind":"Field","name":{"kind":"Name","value":"addedAt"}}]}}]}}]} as unknown as DocumentNode<GetEntityToolEntriesQuery, GetEntityToolEntriesQueryVariables>;
export const AddEntityToolEntryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddEntityToolEntry"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"uri"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addEntityToolEntry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"uri"},"value":{"kind":"Variable","name":{"kind":"Name","value":"uri"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"entry"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"uri"}},{"kind":"Field","name":{"kind":"Name","value":"addedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"alreadyExists"}}]}}]}}]} as unknown as DocumentNode<AddEntityToolEntryMutation, AddEntityToolEntryMutationVariables>;
export const RemoveEntityToolEntryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveEntityToolEntry"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"uri"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeEntityToolEntry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"uri"},"value":{"kind":"Variable","name":{"kind":"Name","value":"uri"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<RemoveEntityToolEntryMutation, RemoveEntityToolEntryMutationVariables>;