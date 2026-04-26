/**
 * Permission UI Constants — Tool definitions with icons and descriptions.
 *
 * Extends the pure data constants from @vienna/app-db with React-specific
 * display information (icons, human-readable names, descriptions).
 */

import {
  File,
  FileEdit,
  Terminal,
  Globe,
  Bot,
  Search,
  Database,
  Zap,
  Shield,
  ShieldCheck,
  ShieldOff,
  ClipboardList,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
// ─────────────────────────────────────────────────────────────────────────────
// Tool name constants (mirrored from @vienna/app-db/permission-constants
// to avoid pulling Node.js modules into the renderer)
// ─────────────────────────────────────────────────────────────────────────────

const FILE_READ_TOOLS = ['Read', 'Glob', 'Grep'] as const;
const FILE_WRITE_TOOLS = ['Write', 'Edit'] as const;
const EXECUTION_TOOLS = ['Bash', 'NotebookEdit'] as const;
const WEB_TOOLS = ['WebFetch', 'WebSearch'] as const;
const AGENT_TOOLS = ['Agent', 'TodoWrite', 'Skill', 'ToolSearch'] as const;
const ENTITY_READ_TOOLS = [
  'mcp__vienna-entities__entity_get',
  'mcp__vienna-entities__entity_types',
  'mcp__vienna-entities__graphql_operations',
  'mcp__vienna-entities__graphql_execute',
] as const;
const ENTITY_WRITE_TOOLS = [
  'mcp__vienna-entities__workstream_create',
  'mcp__vienna-entities__workstream_send_message',
] as const;
const PLAN_TOOLS = ['ExitPlanMode'] as const;

export const ALL_STATIC_TOOLS = [
  ...FILE_READ_TOOLS,
  ...FILE_WRITE_TOOLS,
  ...EXECUTION_TOOLS,
  ...WEB_TOOLS,
  ...AGENT_TOOLS,
  ...ENTITY_READ_TOOLS,
  ...ENTITY_WRITE_TOOLS,
  ...PLAN_TOOLS,
] as const;

interface ToolGroupDef {
  id: string;
  label: string;
  description: string;
  tools: readonly string[];
}

const TOOL_GROUPS: readonly ToolGroupDef[] = [
  { id: 'file_read', label: 'File Reading', description: 'Read, search, and browse files', tools: FILE_READ_TOOLS },
  { id: 'file_write', label: 'File Writing', description: 'Create and modify files', tools: FILE_WRITE_TOOLS },
  { id: 'execution', label: 'Execution', description: 'Run shell commands and notebooks', tools: EXECUTION_TOOLS },
  { id: 'web', label: 'Web Access', description: 'Fetch URLs and search the web', tools: WEB_TOOLS },
  { id: 'agent', label: 'Agent Tools', description: 'Sub-agents, tasks, and skills', tools: AGENT_TOOLS },
  { id: 'entity_read', label: 'Entity Reading', description: 'Search and browse entities', tools: ENTITY_READ_TOOLS },
  { id: 'entity_write', label: 'Workstream Actions', description: 'Create workstreams and send messages', tools: ENTITY_WRITE_TOOLS },
  { id: 'plans', label: 'Plans', description: 'Review agent plans before proceeding', tools: PLAN_TOOLS },
];

import type { PermissionRuleConfig } from './permission-rules';

function allow(tool: string): PermissionRuleConfig {
  return { tool, behavior: 'allow' };
}

export const BUILT_IN_PRESETS: Record<string, PermissionRuleConfig[]> = {
  restrictive: [],
  balanced: [...FILE_READ_TOOLS.map(allow), ...ENTITY_READ_TOOLS.map(allow)],
  autonomous: [{ tool: '*', behavior: 'allow' }],
};

// ─────────────────────────────────────────────────────────────────────────────
// Tool display metadata
// ─────────────────────────────────────────────────────────────────────────────

export interface ToolDisplayInfo {
  name: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const TOOL_DISPLAY: Record<string, ToolDisplayInfo> = {
  Read: { name: 'Read', label: 'Read', description: 'Read file contents', icon: File },
  Glob: { name: 'Glob', label: 'Glob', description: 'Search files by pattern', icon: Search },
  Grep: { name: 'Grep', label: 'Grep', description: 'Search file contents', icon: Search },
  Write: { name: 'Write', label: 'Write', description: 'Create or overwrite files', icon: FileEdit },
  Edit: { name: 'Edit', label: 'Edit', description: 'Edit existing files', icon: FileEdit },
  Bash: { name: 'Bash', label: 'Bash', description: 'Execute shell commands', icon: Terminal },
  NotebookEdit: { name: 'NotebookEdit', label: 'Notebook Edit', description: 'Edit Jupyter notebooks', icon: Terminal },
  WebFetch: { name: 'WebFetch', label: 'Web Fetch', description: 'Fetch URLs', icon: Globe },
  WebSearch: { name: 'WebSearch', label: 'Web Search', description: 'Search the web', icon: Globe },
  Agent: { name: 'Agent', label: 'Agent', description: 'Launch sub-agents', icon: Bot },
  TodoWrite: { name: 'TodoWrite', label: 'Todo Write', description: 'Manage task lists', icon: Bot },
  Skill: { name: 'Skill', label: 'Skill', description: 'Execute skills', icon: Zap },
  ToolSearch: { name: 'ToolSearch', label: 'Tool Search', description: 'Discover deferred tools', icon: Search },
  'mcp__vienna-entities__entity_get': { name: 'mcp__vienna-entities__entity_get', label: 'Entity Get', description: 'Get entity details by URI', icon: Database },
  'mcp__vienna-entities__entity_types': { name: 'mcp__vienna-entities__entity_types', label: 'Entity Types', description: 'Discover entity types and integrations', icon: Database },
  'mcp__vienna-entities__graphql_operations': { name: 'mcp__vienna-entities__graphql_operations', label: 'GraphQL Operations', description: 'Discover available queries and mutations', icon: Search },
  'mcp__vienna-entities__graphql_execute': { name: 'mcp__vienna-entities__graphql_execute', label: 'GraphQL Execute', description: 'Execute GraphQL queries and mutations', icon: Database },
  'mcp__vienna-entities__workstream_create': { name: 'mcp__vienna-entities__workstream_create', label: 'Create Workstream', description: 'Create new workstreams', icon: Zap },
  'mcp__vienna-entities__workstream_send_message': { name: 'mcp__vienna-entities__workstream_send_message', label: 'Send Message', description: 'Send messages to workstream agents', icon: Zap },
  ExitPlanMode: { name: 'ExitPlanMode', label: 'Plan Review', description: 'Present a plan and wait for approval before proceeding', icon: ClipboardList },
};

// ─────────────────────────────────────────────────────────────────────────────
// Tool group display metadata
// ─────────────────────────────────────────────────────────────────────────────

export interface ToolGroupDisplayInfo {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  tools: readonly string[];
}

const GROUP_ICONS: Record<string, LucideIcon> = {
  file_read: File,
  file_write: FileEdit,
  execution: Terminal,
  web: Globe,
  agent: Bot,
  entity_read: Database,
  entity_write: Zap,
  plans: ClipboardList,
};

export const TOOL_GROUP_DISPLAY: ToolGroupDisplayInfo[] = TOOL_GROUPS.map((g) => ({
  id: g.id,
  label: g.label,
  description: g.description,
  icon: GROUP_ICONS[g.id] ?? Shield,
  tools: g.tools,
}));

// ─────────────────────────────────────────────────────────────────────────────
// Preset display metadata
// ─────────────────────────────────────────────────────────────────────────────

export interface PresetDisplayInfo {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const PRESET_DISPLAY: PresetDisplayInfo[] = [
  { id: 'restrictive', label: 'Restrictive', description: 'Ask before every tool use', icon: ShieldOff },
  { id: 'balanced', label: 'Balanced', description: 'Auto-allow reads, ask for writes', icon: Shield },
  { id: 'autonomous', label: 'Autonomous', description: 'Auto-allow all tools', icon: ShieldCheck },
];
