/**
 * Drawer Components — Barrel export for drawer content layer.
 *
 * @ai-context
 * - Re-exports the shell, registrations, content builders, and workstream settings
 * - Consumers import from this barrel: import { DrawerShell } from './drawer'
 */

export { DrawerShell } from './DrawerShell';
export { DrawerRegistrations } from './DrawerRegistrations';
export {
  WORKSTREAM_SETTINGS_CONTENT_ID,
  workstreamSettingsContent,
  isWorkstreamSettingsContent,
  getWorkstreamIdFromContent,
  GROUP_SETTINGS_CONTENT_ID,
  groupSettingsContent,
  isGroupSettingsContent,
  getGroupIdFromContent,
  ENTITY_DRAWER_CONTENT_ID,
  entityDrawerContent,
  entityDrawerTab,
  isEntityDrawerContent,
  getEntityDrawerPayload,
  FILE_EDITOR_CONTENT_ID,
  fileEditorContent,
  fileEditorTab,
  isFileEditorContent,
  getFileEditorPayload,
  FEEDBACK_CONTENT_ID,
  feedbackContent,
  isFeedbackContent,
  GIT_DIFF_REVIEW_CONTENT_ID,
  gitDiffReviewContent,
  isGitDiffReviewContent,
  PLUGIN_DRAWER_CONTENT_PREFIX,
  pluginDrawerContent,
  isPluginDrawerContent,
  getPluginDrawerInfo,
  CLAUDE_SETTINGS_EDITOR_CONTENT_ID,
  claudeSettingsEditorContent,
  claudeSettingsEditorTab,
  isClaudeSettingsEditorContent,
  getClaudeSettingsEditorPayload,
  HELP_DOC_CONTENT_ID,
  helpDocContent,
  helpDocTab,
  isHelpDocContent,
  getHelpDocPayload,
} from './content';
export type { WorkstreamSettingsPayload, GroupSettingsPayload, EntityDrawerPayload, FileEditorPayload, PluginDrawerPayload, ClaudeSettingsEditorPayload, HelpDocPayload } from './content';
export { EntityDrawerRouter } from './entity-drawers';
// EditorDrawerPanel is NOT re-exported here — it is lazy-loaded in DrawerRegistrations
// to avoid pulling in the heavy @vienna/editor / @monaco-editor/react bundle at startup.
