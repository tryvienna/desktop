/**
 * Permission Constants — Tool groups and built-in presets.
 *
 * Pure data (no React). UI-layer constants with icons live in the
 * desktop app's settings/permissions/constants.tsx.
 *
 * @module app-db/permission-constants
 */

import type { PermissionRuleConfig } from './schemas';

// ─────────────────────────────────────────────────────────────────────────────
// Tool name constants
// ─────────────────────────────────────────────────────────────────────────────

export const FILE_READ_TOOLS = ['Read', 'Glob', 'Grep'] as const;
export const FILE_WRITE_TOOLS = ['Write', 'Edit'] as const;
export const EXECUTION_TOOLS = ['Bash', 'NotebookEdit'] as const;
export const WEB_TOOLS = ['WebFetch', 'WebSearch'] as const;
export const AGENT_TOOLS = ['Agent', 'TodoWrite', 'Skill', 'ToolSearch'] as const;

export const ENTITY_READ_TOOLS = [
  'mcp__vienna-entities__entity_get',
  'mcp__vienna-entities__entity_types',
  'mcp__vienna-entities__graphql_operations',
  'mcp__vienna-entities__graphql_execute',
] as const;

export const ENTITY_WRITE_TOOLS = [
  'mcp__vienna-entities__workstream_create',
  'mcp__vienna-entities__workstream_send_message',
] as const;

/** Plan review tools — ExitPlanMode presents a plan and waits for approval */
export const PLAN_TOOLS = ['ExitPlanMode'] as const;

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

// ─────────────────────────────────────────────────────────────────────────────
// Tool group definitions (for UI accordion layout)
// ─────────────────────────────────────────────────────────────────────────────

export interface ToolGroupDef {
  id: string;
  label: string;
  description: string;
  tools: readonly string[];
}

export const TOOL_GROUPS: readonly ToolGroupDef[] = [
  {
    id: 'file_read',
    label: 'File Reading',
    description: 'Read, search, and browse files',
    tools: FILE_READ_TOOLS,
  },
  {
    id: 'file_write',
    label: 'File Writing',
    description: 'Create and modify files',
    tools: FILE_WRITE_TOOLS,
  },
  {
    id: 'execution',
    label: 'Execution',
    description: 'Run shell commands and notebooks',
    tools: EXECUTION_TOOLS,
  },
  {
    id: 'web',
    label: 'Web Access',
    description: 'Fetch URLs and search the web',
    tools: WEB_TOOLS,
  },
  {
    id: 'agent',
    label: 'Agent Tools',
    description: 'Sub-agents, tasks, and skills',
    tools: AGENT_TOOLS,
  },
  {
    id: 'entity_read',
    label: 'Entity Reading',
    description: 'Search and browse entities',
    tools: ENTITY_READ_TOOLS,
  },
  {
    id: 'entity_write',
    label: 'Workstream Actions',
    description: 'Create workstreams and send messages',
    tools: ENTITY_WRITE_TOOLS,
  },
  {
    id: 'plans',
    label: 'Plans',
    description: 'Review agent plans before proceeding',
    tools: PLAN_TOOLS,
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Built-in presets
// ─────────────────────────────────────────────────────────────────────────────

function allow(tool: string): PermissionRuleConfig {
  return { tool, behavior: 'allow' };
}

/** Restrictive: everything asks (empty rules = all default to ask) */
const RESTRICTIVE_RULES: PermissionRuleConfig[] = [];

/** Balanced: auto-allow reads and entity reads, ask for writes/execution */
const BALANCED_RULES: PermissionRuleConfig[] = [
  ...FILE_READ_TOOLS.map(allow),
  ...ENTITY_READ_TOOLS.map(allow),
];

/** Autonomous: auto-allow everything */
const AUTONOMOUS_RULES: PermissionRuleConfig[] = [
  { tool: '*', behavior: 'allow' },
];

export const BUILT_IN_PRESETS: Record<string, PermissionRuleConfig[]> = {
  restrictive: RESTRICTIVE_RULES,
  balanced: BALANCED_RULES,
  autonomous: AUTONOMOUS_RULES,
};

/**
 * Get the rules for a built-in preset by ID.
 * Returns undefined for 'custom' or unknown preset IDs.
 */
export function getBuiltInPresetRules(presetId: string): PermissionRuleConfig[] | undefined {
  return BUILT_IN_PRESETS[presetId];
}
