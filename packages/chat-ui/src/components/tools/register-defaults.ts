/**
 * registerDefaultRenderers — Registers all built-in tool renderers
 *
 * @ai-context
 * - Call once at app initialization to populate defaultRegistry
 * - Core tools registered at priority 100 (exact name match)
 * - Specialized renderers (WebFetch, TaskOutput, EnterPlanMode, ExitPlanMode) at 110
 *   to override the generic fallbacks that handle multiple tool names
 * - MCP fallback at priority 10 (catches mcp__ prefixed tools)
 * - Additional renderers can be added after this call
 */

import { defaultRegistry } from './registry';
import { BashTool } from './renderers/bash-tool';
import { ReadTool } from './renderers/read-tool';
import { FileChangeReviewTool } from './renderers/file-change-review-tool';
import { GlobTool } from './renderers/glob-tool';
import { GrepTool } from './renderers/grep-tool';
import { WebSearchTool } from './renderers/web-search-tool';
import { WebFetchTool } from './renderers/web-fetch-tool';
import { TaskTool } from './renderers/task-tool';
import { AgentTool } from './renderers/agent-tool';
import { TaskOutputTool } from './renderers/task-output-tool';
import { TodoWriteTool } from './renderers/todo-write-tool';
import { AskUserQuestionTool } from './renderers/ask-user-question-tool';
import { EnterPlanModeTool } from './renderers/enter-plan-mode-tool';
import { ExitPlanModeTool } from './renderers/exit-plan-mode-tool';
import { MCPTool } from './renderers/mcp-tool';
import { ToolSearchTool } from './renderers/tool-search-tool';
import { NotebookEditTool } from './renderers/notebook-edit-tool';
import { SkillTool } from './renderers/skill-tool';
import { TaskStopTool } from './renderers/task-stop-tool';
import { EnterWorktreeTool } from './renderers/enter-worktree-tool';

export function registerDefaultRenderers(): void {
  // Core tools — high priority (exact name match)
  defaultRegistry.register({
    id: 'bash',
    match: (t) => t.name === 'Bash',
    component: BashTool,
    priority: 100,
  });

  defaultRegistry.register({
    id: 'read',
    match: (t) => t.name === 'Read',
    component: ReadTool,
    priority: 100,
  });

  // Edit/Write use the grouped FileChangeReviewPanel — a single panel collects
  // all Edit/Write tool uses across messages instead of rendering individual diffs.
  // The anchor pattern ensures only the first Edit/Write renders the panel.
  defaultRegistry.register({
    id: 'write',
    match: (t) => t.name === 'Write' || t.name === 'Edit',
    component: FileChangeReviewTool,
    priority: 100,
  });

  defaultRegistry.register({
    id: 'glob',
    match: (t) => t.name === 'Glob',
    component: GlobTool,
    priority: 100,
  });

  defaultRegistry.register({
    id: 'grep',
    match: (t) => t.name === 'Grep',
    component: GrepTool,
    priority: 100,
  });

  defaultRegistry.register({
    id: 'websearch',
    match: (t) => t.name === 'WebSearch',
    component: WebSearchTool,
    priority: 100,
  });

  // WebFetch gets its own specialized renderer (domain extraction, prompt, streaming)
  defaultRegistry.register({
    id: 'webfetch',
    match: (t) => t.name === 'WebFetch',
    component: WebFetchTool,
    priority: 100,
  });

  defaultRegistry.register({
    id: 'task',
    match: (t) => t.name === 'Task',
    component: TaskTool,
    priority: 100,
  });

  defaultRegistry.register({
    id: 'agent',
    match: (t) => t.name === 'Agent',
    component: AgentTool,
    priority: 100,
  });

  // TaskOutput gets its own specialized renderer (XML parsing, metadata, StreamingContent)
  defaultRegistry.register({
    id: 'taskoutput',
    match: (t) => t.name === 'TaskOutput',
    component: TaskOutputTool,
    priority: 100,
  });

  defaultRegistry.register({
    id: 'todowrite',
    match: (t) => t.name === 'TodoWrite',
    component: TodoWriteTool,
    priority: 100,
  });

  defaultRegistry.register({
    id: 'askuserquestion',
    match: (t) => t.name === 'AskUserQuestion',
    component: AskUserQuestionTool,
    priority: 100,
  });

  // Plan mode — separate renderers for enter (header-only) and exit (rich plan viewer)
  defaultRegistry.register({
    id: 'enterplanmode',
    match: (t) => t.name === 'EnterPlanMode',
    component: EnterPlanModeTool,
    priority: 100,
  });

  defaultRegistry.register({
    id: 'exitplanmode',
    match: (t) => t.name === 'ExitPlanMode',
    component: ExitPlanModeTool,
    priority: 100,
  });

  defaultRegistry.register({
    id: 'toolsearch',
    match: (t) => t.name === 'ToolSearch',
    component: ToolSearchTool,
    priority: 100,
  });

  defaultRegistry.register({
    id: 'notebookedit',
    match: (t) => t.name === 'NotebookEdit',
    component: NotebookEditTool,
    priority: 100,
  });

  defaultRegistry.register({
    id: 'skill',
    match: (t) => t.name === 'Skill',
    component: SkillTool,
    priority: 100,
  });

  defaultRegistry.register({
    id: 'taskstop',
    match: (t) => t.name === 'TaskStop',
    component: TaskStopTool,
    priority: 100,
  });

  defaultRegistry.register({
    id: 'enterworktree',
    match: (t) => t.name === 'EnterWorktree',
    component: EnterWorktreeTool,
    priority: 100,
  });

  // MCP fallback — lowest priority, catches mcp__ prefixed tools
  defaultRegistry.register({
    id: 'mcp',
    match: (t) => t.name.startsWith('mcp__'),
    component: MCPTool,
    priority: 10,
  });
}
