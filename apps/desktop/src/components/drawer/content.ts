/**
 * Drawer Content Descriptors — Builders and matchers for drawer content types.
 *
 * @ai-context
 * - Each drawer content type gets a builder function (creates descriptor) and a matcher (type guard)
 * - workstreamSettingsContent() creates a descriptor for the workstream settings panel
 * - isWorkstreamSettingsContent() is the corresponding type guard for registry matching
 * - Content IDs are string constants to avoid typos across registration and matching
 */

import { getEntityTypeFromURI } from '@tryvienna/sdk';
import type { DrawerContentDescriptor, OpenTabOptions } from '../../lib/drawer';

// ─── Content IDs ──────────────────────────────────────────────────────────────

export const FEEDBACK_CONTENT_ID = 'feedback';
export const WORKSTREAM_SETTINGS_CONTENT_ID = 'workstream-settings';
export const ENTITY_DRAWER_CONTENT_ID = 'entity-drawer';

// ─── Workstream Settings ──────────────────────────────────────────────────────

export interface WorkstreamSettingsPayload extends Record<string, unknown> {
  workstreamId: string;
  initialTab?: 'permissions';
}

export function workstreamSettingsContent(
  workstreamId: string,
  initialTab?: 'permissions',
): DrawerContentDescriptor {
  return {
    contentId: WORKSTREAM_SETTINGS_CONTENT_ID,
    payload: { workstreamId, initialTab },
  };
}

export function isWorkstreamSettingsContent(
  content: DrawerContentDescriptor
): content is DrawerContentDescriptor & { payload: WorkstreamSettingsPayload } {
  return (
    content.contentId === WORKSTREAM_SETTINGS_CONTENT_ID &&
    typeof content.payload?.workstreamId === 'string'
  );
}

/**
 * Extracts the workstreamId from a validated workstream settings descriptor.
 * Returns null if the descriptor doesn't match.
 */
export function getWorkstreamIdFromContent(
  content: DrawerContentDescriptor
): string | null {
  if (!isWorkstreamSettingsContent(content)) return null;
  return content.payload.workstreamId;
}

// ─── Entity Drawer ───────────────────────────────────────────────────────────

export interface EntityDrawerPayload {
  entityUri: string;
  entityType: string;
}

export function entityDrawerContent(
  entityUri: string,
  entityType?: string,
): DrawerContentDescriptor {
  return {
    contentId: ENTITY_DRAWER_CONTENT_ID,
    payload: { entityUri, entityType: entityType ?? getEntityTypeFromURI(entityUri) },
  };
}

/** Humanize an entity type slug: "docs_document" → "Doc", "gmail_thread" → "Gmail Thread" */
function humanizeEntityType(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Build OpenTabOptions that open an entity in the tabbed drawer. */
export function entityDrawerTab(entityUri: string, title?: string): OpenTabOptions {
  const entityType = getEntityTypeFromURI(entityUri);
  return {
    id: `entity:${entityUri}`,
    label: title ?? humanizeEntityType(entityType),
    initialContent: entityDrawerContent(entityUri, entityType),
  };
}

export function isEntityDrawerContent(
  content: DrawerContentDescriptor,
): content is DrawerContentDescriptor & { payload: EntityDrawerPayload } {
  return (
    content.contentId === ENTITY_DRAWER_CONTENT_ID &&
    typeof content.payload?.entityUri === 'string' &&
    typeof content.payload?.entityType === 'string'
  );
}

export function getEntityDrawerPayload(
  content: DrawerContentDescriptor,
): EntityDrawerPayload | null {
  if (!isEntityDrawerContent(content)) return null;
  return content.payload;
}

// ─── Group Settings ──────────────────────────────────────────────────────────

export const GROUP_SETTINGS_CONTENT_ID = 'group-settings';

export interface GroupSettingsPayload {
  groupId: string;
}

export function groupSettingsContent(
  groupId: string
): DrawerContentDescriptor {
  return {
    contentId: GROUP_SETTINGS_CONTENT_ID,
    payload: { groupId },
  };
}

export function isGroupSettingsContent(
  content: DrawerContentDescriptor
): content is DrawerContentDescriptor & { payload: GroupSettingsPayload } {
  return (
    content.contentId === GROUP_SETTINGS_CONTENT_ID &&
    typeof content.payload?.groupId === 'string'
  );
}

/**
 * Extracts the groupId from a validated group settings descriptor.
 * Returns null if the descriptor doesn't match.
 */
export function getGroupIdFromContent(
  content: DrawerContentDescriptor
): string | null {
  if (!isGroupSettingsContent(content)) return null;
  return content.payload.groupId;
}

// ─── File Change Review ──────────────────────────────────────────────────────

export const FILE_CHANGE_REVIEW_CONTENT_ID = 'file-change-review';

export function fileChangeReviewContent(): DrawerContentDescriptor {
  return {
    contentId: FILE_CHANGE_REVIEW_CONTENT_ID,
    payload: {},
  };
}

export function isFileChangeReviewContent(
  content: DrawerContentDescriptor
): boolean {
  return content.contentId === FILE_CHANGE_REVIEW_CONTENT_ID;
}

// ─── Paste Editor ────────────────────────────────────────────────────────────

export const PASTE_CONTENT_ID = 'paste';

export interface PastePayload {
  pasteId: string;
  content: string;
  preview: string;
  readOnly: boolean;
  onSave?: (newContent: string) => void;
}

export function pasteContent(
  pasteId: string,
  content: string,
  preview: string,
  readOnly = true,
  onSave?: (newContent: string) => void,
): DrawerContentDescriptor {
  return {
    contentId: PASTE_CONTENT_ID,
    payload: { pasteId, content, preview, readOnly, onSave },
  };
}

export function isPasteContent(
  content: DrawerContentDescriptor,
): content is DrawerContentDescriptor & { payload: PastePayload } {
  return (
    content.contentId === PASTE_CONTENT_ID &&
    typeof content.payload?.pasteId === 'string'
  );
}

export function getPastePayload(
  content: DrawerContentDescriptor,
): PastePayload | null {
  if (!isPasteContent(content)) return null;
  return content.payload;
}

// ─── Scoped Permissions ─────────────────────────────────────────────────────

export const SCOPED_PERMISSIONS_CONTENT_ID = 'scoped-permissions';

export interface ScopedPermissionsPayload {
  scopeType: 'workstream' | 'group';
  scopeId: string;
  scopeLabel: string;
}

export function scopedPermissionsContent(
  scopeType: 'workstream' | 'group',
  scopeId: string,
  scopeLabel: string,
): DrawerContentDescriptor {
  return {
    contentId: SCOPED_PERMISSIONS_CONTENT_ID,
    payload: { scopeType, scopeId, scopeLabel },
  };
}

export function isScopedPermissionsContent(
  content: DrawerContentDescriptor,
): content is DrawerContentDescriptor & { payload: ScopedPermissionsPayload } {
  return (
    content.contentId === SCOPED_PERMISSIONS_CONTENT_ID &&
    typeof content.payload?.scopeType === 'string' &&
    typeof content.payload?.scopeId === 'string'
  );
}

export function getScopedPermissionsPayload(
  content: DrawerContentDescriptor,
): ScopedPermissionsPayload | null {
  if (!isScopedPermissionsContent(content)) return null;
  return content.payload;
}

// ─── Plugin Drawer ──────────────────────────────────────────────────────────

export const PLUGIN_DRAWER_CONTENT_PREFIX = 'plugin:';

export interface PluginDrawerPayload extends Record<string, unknown> {
  view?: string;
}

export function pluginDrawerContent(
  pluginId: string,
  payload?: PluginDrawerPayload,
): DrawerContentDescriptor {
  return {
    contentId: `${PLUGIN_DRAWER_CONTENT_PREFIX}${pluginId}`,
    payload: payload ?? {},
  };
}

export function isPluginDrawerContent(
  content: DrawerContentDescriptor,
): boolean {
  return content.contentId.startsWith(PLUGIN_DRAWER_CONTENT_PREFIX);
}

export function getPluginDrawerInfo(
  content: DrawerContentDescriptor,
): { pluginId: string; payload: PluginDrawerPayload } | null {
  if (!isPluginDrawerContent(content)) return null;
  const pluginId = content.contentId.slice(PLUGIN_DRAWER_CONTENT_PREFIX.length);
  return { pluginId, payload: (content.payload ?? {}) as PluginDrawerPayload };
}

// ─── File Editor ────────────────────────────────────────────────────────────

export const FILE_EDITOR_CONTENT_ID = 'file-editor';

export interface FileEditorPayload {
  filePath: string;
  line?: number;
  column?: number;
  branch?: string | null;
  /** Original project directory path (for branch switching in editor). */
  directoryPath?: string | null;
}

export function fileEditorContent(
  filePath: string,
  options?: { line?: number; column?: number; branch?: string | null; directoryPath?: string | null },
): DrawerContentDescriptor {
  return {
    contentId: FILE_EDITOR_CONTENT_ID,
    payload: { filePath, ...options },
  };
}

/** Build OpenTabOptions that open a file in the Monaco editor drawer tab. */
export function fileEditorTab(filePath: string, options?: { line?: number }): OpenTabOptions {
  const fileName = filePath.split('/').pop() || 'Untitled';
  return {
    id: `file-editor:${filePath}`,
    label: fileName,
    initialContent: fileEditorContent(filePath, options),
  };
}

export function isFileEditorContent(
  content: DrawerContentDescriptor,
): content is DrawerContentDescriptor & { payload: FileEditorPayload } {
  return (
    content.contentId === FILE_EDITOR_CONTENT_ID &&
    typeof content.payload?.filePath === 'string'
  );
}

export function getFileEditorPayload(
  content: DrawerContentDescriptor,
): FileEditorPayload | null {
  if (!isFileEditorContent(content)) return null;
  return content.payload;
}

// ─── Verification Actions Config ─────────────────────────────────────────────

const VERIFICATION_ACTIONS_CONFIG_CONTENT_ID = 'verification-actions-config';

export function verificationActionsConfigContent(): DrawerContentDescriptor {
  return {
    contentId: VERIFICATION_ACTIONS_CONFIG_CONTENT_ID,
    payload: {},
  };
}

export function isVerificationActionsConfigContent(
  content: DrawerContentDescriptor,
): boolean {
  return content.contentId === VERIFICATION_ACTIONS_CONFIG_CONTENT_ID;
}

// ─── Feedback ────────────────────────────────────────────────────────────────

export function feedbackContent(): DrawerContentDescriptor {
  return {
    contentId: FEEDBACK_CONTENT_ID,
    payload: {},
  };
}

export function isFeedbackContent(
  content: DrawerContentDescriptor,
): boolean {
  return content.contentId === FEEDBACK_CONTENT_ID;
}

// ─── Git Diff Review ─────────────────────────────────────────────────────────

export const GIT_DIFF_REVIEW_CONTENT_ID = 'git-diff-review';

export interface GitDiffReviewPayload {
  workstreamId: string;
}

export function gitDiffReviewContent(
  workstreamId: string,
): DrawerContentDescriptor {
  return {
    contentId: GIT_DIFF_REVIEW_CONTENT_ID,
    payload: { workstreamId },
  };
}

export function isGitDiffReviewContent(
  content: DrawerContentDescriptor,
): content is DrawerContentDescriptor & { payload: GitDiffReviewPayload } {
  return (
    content.contentId === GIT_DIFF_REVIEW_CONTENT_ID &&
    typeof content.payload?.workstreamId === 'string'
  );
}

// ─── Plan Review ──────────────────────────────────────────────────────────────

export const PLAN_REVIEW_CONTENT_ID = 'plan-review';

export interface PlanReviewPayload {
  toolUseId: string;
  requestId: string;
}

export function planReviewContent(
  toolUseId: string,
  requestId: string,
): DrawerContentDescriptor {
  return {
    contentId: PLAN_REVIEW_CONTENT_ID,
    payload: { toolUseId, requestId },
  };
}

export function isPlanReviewContent(
  content: DrawerContentDescriptor,
): content is DrawerContentDescriptor & { payload: PlanReviewPayload } {
  return (
    content.contentId === PLAN_REVIEW_CONTENT_ID &&
    typeof content.payload?.toolUseId === 'string' &&
    typeof content.payload?.requestId === 'string'
  );
}

export function getPlanReviewPayload(
  content: DrawerContentDescriptor,
): PlanReviewPayload | null {
  if (!isPlanReviewContent(content)) return null;
  return content.payload;
}

// ─── Skill Browser ──────────────────────────────────────────────────────────

export const SKILL_BROWSER_CONTENT_ID = 'skill-browser';

export function skillBrowserContent(): DrawerContentDescriptor {
  return {
    contentId: SKILL_BROWSER_CONTENT_ID,
    payload: {},
  };
}

export function isSkillBrowserContent(
  content: DrawerContentDescriptor,
): boolean {
  return content.contentId === SKILL_BROWSER_CONTENT_ID;
}

// ─── Skill Detail ───────────────────────────────────────────────────────────

export const SKILL_DETAIL_CONTENT_ID = 'skill-detail';

export interface SkillDetailPayload {
  skillId: string;
}

export function skillDetailContent(skillId: string): DrawerContentDescriptor {
  return {
    contentId: SKILL_DETAIL_CONTENT_ID,
    payload: { skillId },
  };
}

export function isSkillDetailContent(
  content: DrawerContentDescriptor,
): content is DrawerContentDescriptor & { payload: SkillDetailPayload } {
  return (
    content.contentId === SKILL_DETAIL_CONTENT_ID &&
    typeof content.payload?.skillId === 'string'
  );
}

export function getSkillDetailPayload(
  content: DrawerContentDescriptor,
): SkillDetailPayload | null {
  if (!isSkillDetailContent(content)) return null;
  return content.payload;
}

// ─── Plugin Store ───────────────────────────────────────────────────────────

export const PLUGIN_STORE_CONTENT_ID = 'plugin-store';

export interface PluginStorePayload extends Record<string, unknown> {
  pluginId?: string;
  tab?: string;
  /** Pre-fill the search input. */
  search?: string;
  /** Pre-select canvas type filters (e.g. ['feed']). */
  canvasFilters?: string[];
}

export function pluginStoreContent(options?: PluginStorePayload): DrawerContentDescriptor {
  return {
    contentId: PLUGIN_STORE_CONTENT_ID,
    payload: options ?? {},
  };
}

export function isPluginStoreContent(
  content: DrawerContentDescriptor,
): boolean {
  return content.contentId === PLUGIN_STORE_CONTENT_ID;
}

export function getPluginStorePayload(
  content: DrawerContentDescriptor,
): PluginStorePayload | null {
  if (!isPluginStoreContent(content)) return null;
  return (content.payload ?? {}) as PluginStorePayload;
}

// ─── Claude Settings Editor ─────────────────────────────────────────────────

export const CLAUDE_SETTINGS_EDITOR_CONTENT_ID = 'claude-settings-editor';

export interface ClaudeSettingsEditorPayload {
  filePath: string;
}

export function claudeSettingsEditorContent(
  filePath: string,
): DrawerContentDescriptor {
  return {
    contentId: CLAUDE_SETTINGS_EDITOR_CONTENT_ID,
    payload: { filePath },
  };
}

export function claudeSettingsEditorTab(filePath: string): OpenTabOptions {
  const fileName = filePath.split('/').pop() || 'Settings';
  return {
    id: `claude-settings-editor:${filePath}`,
    label: fileName,
    initialContent: claudeSettingsEditorContent(filePath),
  };
}

export function isClaudeSettingsEditorContent(
  content: DrawerContentDescriptor,
): content is DrawerContentDescriptor & { payload: ClaudeSettingsEditorPayload } {
  return (
    content.contentId === CLAUDE_SETTINGS_EDITOR_CONTENT_ID &&
    typeof content.payload?.filePath === 'string'
  );
}

export function getClaudeSettingsEditorPayload(
  content: DrawerContentDescriptor,
): ClaudeSettingsEditorPayload | null {
  if (!isClaudeSettingsEditorContent(content)) return null;
  return content.payload;
}

// ─── Feed Plugins (legacy alias — prefer feedWidgetsContent) ───────────────

export const FEED_PLUGINS_CONTENT_ID = 'feed-plugins';

export interface FeedPluginsPayload {
  filePath: string;
  tier: 'profile' | 'global' | 'project';
  label: string;
  projectId: string;
}

export function feedPluginsContent(
  filePath: string,
  tier: 'profile' | 'global' | 'project',
  label: string,
  projectId: string,
): DrawerContentDescriptor {
  return {
    contentId: FEED_PLUGINS_CONTENT_ID,
    payload: { filePath, tier, label, projectId },
  };
}

export function isFeedPluginsContent(
  content: DrawerContentDescriptor,
): content is DrawerContentDescriptor & { payload: FeedPluginsPayload } {
  return (
    content.contentId === FEED_PLUGINS_CONTENT_ID &&
    typeof content.payload?.filePath === 'string'
  );
}

export function getFeedPluginsPayload(
  content: DrawerContentDescriptor,
): FeedPluginsPayload | null {
  if (!isFeedPluginsContent(content)) return null;
  return content.payload;
}

// ─── Feed Widgets (combined built-in + plugins toggle list) ────────────────

export const FEED_WIDGETS_CONTENT_ID = 'feed-widgets';

export interface FeedWidgetsPayload {
  filePath: string;
  tier: 'profile' | 'global' | 'project';
  label: string;
  projectId: string;
}

export function feedWidgetsContent(
  filePath: string,
  tier: 'profile' | 'global' | 'project',
  label: string,
  projectId: string,
): DrawerContentDescriptor {
  return {
    contentId: FEED_WIDGETS_CONTENT_ID,
    payload: { filePath, tier, label, projectId },
  };
}

export function isFeedWidgetsContent(
  content: DrawerContentDescriptor,
): content is DrawerContentDescriptor & { payload: FeedWidgetsPayload } {
  return (
    content.contentId === FEED_WIDGETS_CONTENT_ID &&
    typeof content.payload?.filePath === 'string'
  );
}

export function getFeedWidgetsPayload(
  content: DrawerContentDescriptor,
): FeedWidgetsPayload | null {
  if (!isFeedWidgetsContent(content)) return null;
  return content.payload;
}

// ─── Feed Editor ────────────────────────────────────────────────────────────

export const FEED_EDITOR_CONTENT_ID = 'feed-editor';

export interface FeedEditorPayload {
  filePath: string;
  tier: 'profile' | 'global' | 'project';
  label: string;
  projectId: string;
}

export function feedEditorContent(
  filePath: string,
  tier: 'profile' | 'global' | 'project',
  label: string,
  projectId: string,
): DrawerContentDescriptor {
  return {
    contentId: FEED_EDITOR_CONTENT_ID,
    payload: { filePath, tier, label, projectId },
  };
}

export function feedEditorTab(
  filePath: string,
  tier: 'profile' | 'global' | 'project',
  label: string,
  projectId: string,
): OpenTabOptions {
  return {
    id: `feed-editor:${filePath}`,
    label: `feed.md (${label})`,
    initialContent: feedEditorContent(filePath, tier, label, projectId),
  };
}

export function isFeedEditorContent(
  content: DrawerContentDescriptor,
): content is DrawerContentDescriptor & { payload: FeedEditorPayload } {
  return (
    content.contentId === FEED_EDITOR_CONTENT_ID &&
    typeof content.payload?.filePath === 'string'
  );
}

export function getFeedEditorPayload(
  content: DrawerContentDescriptor,
): FeedEditorPayload | null {
  if (!isFeedEditorContent(content)) return null;
  return content.payload;
}

// ─── Tag Manager ───────────────────────────────────────────────────────────

export const TAG_MANAGER_CONTENT_ID = 'tag-manager';

export interface TagManagerPayload {
  projectId: string;
  initialView: 'list' | 'create';
}

export function tagManagerContent(
  projectId: string,
  initialView: 'list' | 'create' = 'list',
): DrawerContentDescriptor {
  return {
    contentId: TAG_MANAGER_CONTENT_ID,
    payload: { projectId, initialView },
  };
}

export function isTagManagerContent(
  content: DrawerContentDescriptor,
): content is DrawerContentDescriptor & { payload: TagManagerPayload } {
  return (
    content.contentId === TAG_MANAGER_CONTENT_ID &&
    typeof content.payload?.projectId === 'string'
  );
}

export function getTagManagerPayload(
  content: DrawerContentDescriptor,
): TagManagerPayload | null {
  if (!isTagManagerContent(content)) return null;
  return content.payload;
}

// ─── Tag Editor (in-drawer navigation target) ──────────────────────────────

export const TAG_EDITOR_CONTENT_ID = 'tag-editor-drawer';

export interface TagEditorDrawerPayload {
  projectId: string;
  tagName: string;
}

export function tagEditorDrawerContent(
  projectId: string,
  tagName: string,
): DrawerContentDescriptor {
  return {
    contentId: TAG_EDITOR_CONTENT_ID,
    payload: { projectId, tagName },
  };
}

export function isTagEditorDrawerContent(
  content: DrawerContentDescriptor,
): content is DrawerContentDescriptor & { payload: TagEditorDrawerPayload } {
  return (
    content.contentId === TAG_EDITOR_CONTENT_ID &&
    typeof content.payload?.projectId === 'string' &&
    typeof content.payload?.tagName === 'string'
  );
}

export function getTagEditorDrawerPayload(
  content: DrawerContentDescriptor,
): TagEditorDrawerPayload | null {
  if (!isTagEditorDrawerContent(content)) return null;
  return content.payload;
}

// ─── Tag Creator (in-drawer navigation target) ─────────────────────────────

export const TAG_CREATOR_CONTENT_ID = 'tag-creator-drawer';

export interface TagCreatorDrawerPayload {
  projectId: string;
}

export function tagCreatorDrawerContent(
  projectId: string,
): DrawerContentDescriptor {
  return {
    contentId: TAG_CREATOR_CONTENT_ID,
    payload: { projectId },
  };
}

export function isTagCreatorDrawerContent(
  content: DrawerContentDescriptor,
): content is DrawerContentDescriptor & { payload: TagCreatorDrawerPayload } {
  return (
    content.contentId === TAG_CREATOR_CONTENT_ID &&
    typeof content.payload?.projectId === 'string'
  );
}

// ─── Reference Detail ───────────────────────────────────────────────────────

export const REFERENCE_DETAIL_CONTENT_ID = 'reference-detail';

export interface ReferenceDetailPayload extends Record<string, unknown> {
  workstreamId: string;
  entityUri: string;
  entityType: string;
  entityTitle: string | null;
  externalUrl: string | null;
  firstReferencedAt: string;
}

export function referenceDetailContent(
  payload: ReferenceDetailPayload,
): DrawerContentDescriptor {
  return {
    contentId: REFERENCE_DETAIL_CONTENT_ID,
    payload,
  };
}

export function referenceDetailTab(
  payload: ReferenceDetailPayload,
  title?: string,
): OpenTabOptions {
  return {
    id: `reference:${payload.entityUri}`,
    label: title ?? payload.entityTitle ?? 'Reference',
    initialContent: referenceDetailContent(payload),
  };
}

export function isReferenceDetailContent(
  content: DrawerContentDescriptor,
): content is DrawerContentDescriptor & { payload: ReferenceDetailPayload } {
  return (
    content.contentId === REFERENCE_DETAIL_CONTENT_ID &&
    typeof content.payload?.entityUri === 'string'
  );
}

export function getReferenceDetailPayload(
  content: DrawerContentDescriptor,
): ReferenceDetailPayload | null {
  if (!isReferenceDetailContent(content)) return null;
  return content.payload;
}

// ─── Help Doc ────────────────────────────────────────────────────────────────

export const HELP_DOC_CONTENT_ID = 'help-doc';

export interface HelpDocPayload {
  docId: string;
  title: string;
  content: string;
}

export function helpDocContent(
  docId: string,
  title: string,
  content: string,
): DrawerContentDescriptor {
  return {
    contentId: HELP_DOC_CONTENT_ID,
    payload: { docId, title, content },
  };
}

export function helpDocTab(docId: string, title: string, content: string): OpenTabOptions {
  return {
    id: `help:${docId}`,
    label: title,
    initialContent: helpDocContent(docId, title, content),
  };
}

export function isHelpDocContent(
  content: DrawerContentDescriptor,
): content is DrawerContentDescriptor & { payload: HelpDocPayload } {
  return (
    content.contentId === HELP_DOC_CONTENT_ID &&
    typeof content.payload?.docId === 'string'
  );
}

export function getHelpDocPayload(
  content: DrawerContentDescriptor,
): HelpDocPayload | null {
  if (!isHelpDocContent(content)) return null;
  return content.payload;
}

// ─── Task Settings ──────────────────────────────────────────────────────────

export const TASK_SETTINGS_CONTENT_ID = 'task-settings';

export interface TaskSettingsPayload {
  projectId: string;
}

export function taskSettingsContent(
  projectId: string,
): DrawerContentDescriptor {
  return {
    contentId: TASK_SETTINGS_CONTENT_ID,
    payload: { projectId },
  };
}

export function isTaskSettingsContent(
  content: DrawerContentDescriptor,
): content is DrawerContentDescriptor & { payload: TaskSettingsPayload } {
  return (
    content.contentId === TASK_SETTINGS_CONTENT_ID &&
    typeof content.payload?.projectId === 'string'
  );
}

export function getTaskSettingsPayload(
  content: DrawerContentDescriptor,
): TaskSettingsPayload | null {
  if (!isTaskSettingsContent(content)) return null;
  return content.payload;
}

// ─── Release Notes ──────────────────────────────────────────────────────────

export const RELEASE_NOTES_CONTENT_ID = 'release-notes';

export interface ReleaseNotesPayload {
  version: string;
  releaseNotes: string;
  downloadUrl: string;
  publishedAt: string | null;
}

export function releaseNotesContent(
  version: string,
  releaseNotes: string,
  downloadUrl: string,
  publishedAt: string | null,
): DrawerContentDescriptor {
  return {
    contentId: RELEASE_NOTES_CONTENT_ID,
    payload: { version, releaseNotes, downloadUrl, publishedAt },
  };
}

export function isReleaseNotesContent(
  content: DrawerContentDescriptor,
): content is DrawerContentDescriptor & { payload: ReleaseNotesPayload } {
  return (
    content.contentId === RELEASE_NOTES_CONTENT_ID &&
    typeof content.payload?.version === 'string'
  );
}

export function getReleaseNotesPayload(
  content: DrawerContentDescriptor,
): ReleaseNotesPayload | null {
  if (!isReleaseNotesContent(content)) return null;
  return content.payload;
}

