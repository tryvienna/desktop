/**
 * @vienna/claude-session
 *
 * Efficient, typed watcher for Claude Code JSONL session files.
 * Monitors ~/.claude/projects/ and emits events when sessions start,
 * turns complete, tools are used, questions are asked, etc.
 */

// Core
export { ClaudeSessionWatcher } from './session-watcher';
export type { ClaudeSessionWatcherOptions } from './session-watcher';
export { SessionEventBus } from './event-bus';
export { JsonlTailer } from './jsonl-tailer';
export { SessionTracker } from './session-tracker';
export type { SessionState, PendingTool, PendingPlan } from './session-tracker';

// Event payload types (derived from Zod schemas)
export type {
  SessionEventMap,
  SessionEventName,
  SessionStartedPayload,
  TurnStartedPayload,
  TurnCompletedPayload,
  ToolUsedPayload,
  ToolResultPayload,
  PlanAcceptedPayload,
  PrCreatedPayload,
  Unsubscribe,
} from './types';

// Event payload Zod schemas (for defineEvent() registration in the bridge)
export {
  SessionStartedSchema,
  TurnStartedSchema,
  TurnCompletedSchema,
  ToolUsedSchema,
  ToolResultSchema,
  PlanAcceptedSchema,
  PrCreatedSchema,
  SESSION_EVENT_SCHEMAS,
} from './types';

// Raw JSONL record types (for advanced consumers / testing)
export type {
  SessionRecord,
  UserRecord,
  AssistantRecord,
  PrLinkRecord,
  Usage,
  ToolUseContent,
  TextContent,
  ThinkingContent,
  ToolResultContent,
  AssistantContentBlock,
  UserContentBlock,
  SessionMeta,
} from './types';

// Path utilities
export {
  getClaudeProjectsDir,
  getClaudeSessionsDir,
  decodeProjectPath,
  decodeProjectPathVerified,
  encodeProjectPath,
  extractSessionId,
} from './path-utils';
