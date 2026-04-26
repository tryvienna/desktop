/**
 * Context Builder — Pure functions for building session config from workstream state
 *
 * Builds the SessionConfig that will be passed to the provider when starting
 * or resuming an agent session. All functions are pure — no side effects,
 * no database access, trivially testable.
 *
 * @ai-context
 * - buildWorkstreamSessionConfig() is the main entry point, called by WorkstreamManager
 * - When a workstream is in a group: merges group + workstream entities, adds group awareness prompt
 * - mergeLinkedEntities(): workstream entities take precedence over group entities for same URI
 * - buildGroupAwarenessContext(): XML-formatted prompt with group name, sibling workstreams + URIs
 * - All functions are pure (no DB access) — WorkstreamManager loads data and passes it in
 *
 * @module main/workstream/context-builder
 */

import type { SessionConfig } from '@vienna/agent-core';
import type { EntityTypeSummary } from '@tryvienna/sdk';
import type {
  WorkstreamRecord,
  WorkstreamGroupRecord,
  GroupLinkedEntityRecord,
  DirectoryWithBranchInfo,
  WorkstreamLinkedEntityRecord,
  WorkstreamTagRecord,
} from '@vienna/app-db';

/** Sibling workstream summary for group awareness */
export interface SiblingWorkstreamSummary {
  id: string;
  title: string;
  status: string;
}

export interface BuildSessionConfigParams {
  workstream: WorkstreamRecord;
  directories: DirectoryWithBranchInfo[];
  linkedEntities: WorkstreamLinkedEntityRecord[];
  providerId: string;
  /** Provider's session ID for resume (from previous session_init event) */
  providerSessionId?: string;
  /** MCP server configurations to pass to the provider */
  mcpServers?: Record<string, { command: string; args?: string[]; env?: Record<string, string> }>;
  /** Additional environment variables */
  env?: Record<string, string>;
  /** Internal session working directory (Vienna's per-workstream dir) */
  sessionCwd?: string;
  /** Entity type summaries for building discovery prompt */
  entityTypeSummaries?: EntityTypeSummary[];
  /** Group this workstream belongs to (if any) */
  group?: WorkstreamGroupRecord | null;
  /** Entities linked at the group level (auto-inherited) */
  groupLinkedEntities?: GroupLinkedEntityRecord[];
  /** Sibling workstreams in the same group (for agent awareness) */
  siblingWorkstreams?: SiblingWorkstreamSummary[];
  /** Tags applied to this workstream (for agent awareness of obligations) */
  workstreamTags?: WorkstreamTagRecord[];
  /** Pre-resolved context strings keyed by entity URI (from resolveContext on entity definitions) */
  resolvedEntityContexts?: Map<string, string>;
}

/**
 * Build a SessionConfig from workstream state.
 *
 * This is the single point where workstream data is translated into
 * provider configuration. Called when starting or resuming an agent.
 */
export function buildWorkstreamSessionConfig(params: BuildSessionConfigParams): SessionConfig {
  const {
    workstream, directories, linkedEntities, providerSessionId,
    mcpServers, env, sessionCwd, entityTypeSummaries,
    group, groupLinkedEntities, siblingWorkstreams, workstreamTags,
    resolvedEntityContexts,
  } = params;

  // Use effective paths (worktree when branch selected, original otherwise)
  const effectivePaths = directories.map((d) => d.effectivePath);
  const cwd = sessionCwd ?? effectivePaths[0] ?? process.env.HOME ?? '/tmp';

  const appendPromptParts: string[] = [];

  // Group awareness context (injected first for maximum visibility)
  const groupContext = buildGroupAwarenessContext(group ?? null, siblingWorkstreams ?? []);
  if (groupContext) {
    appendPromptParts.push(groupContext);
  }

  // Directory context
  const dirContext = buildDirectoryContext(directories, sessionCwd);
  if (dirContext) {
    appendPromptParts.push(dirContext);
  }

  // Entity discovery prompt — tells Claude about available entity types and reference syntax
  const entityDiscovery = buildEntityDiscoveryPrompt(entityTypeSummaries ?? []);
  if (entityDiscovery) {
    appendPromptParts.push(entityDiscovery);
  }

  // Merge group-level and workstream-level linked entities (workstream overrides group)
  const mergedEntities = mergeLinkedEntities(linkedEntities, groupLinkedEntities ?? []);
  const entityContext = buildLinkedEntityContext(mergedEntities, resolvedEntityContexts);
  if (entityContext) {
    appendPromptParts.push(entityContext);
  }

  // Tag awareness — persistent reminder of tag obligations
  const tagContext = buildTagAwarenessContext(workstream.id, workstreamTags ?? []);
  if (tagContext) {
    appendPromptParts.push(tagContext);
  }

  // Append workstream ID to MCP server args so each process knows its workstream.
  // The MCP bridge reads this and includes it in socket requests for context-aware classification.
  const enrichedMcpServers = mcpServers
    ? Object.fromEntries(
        Object.entries(mcpServers).map(([name, config]) => [
          name,
          { ...config, args: [...(config.args ?? []), '--workstream-id', workstream.id] },
        ]),
      )
    : undefined;

  return {
    sessionId: providerSessionId,
    model: workstream.model ?? undefined,
    cwd,
    directories: effectivePaths,
    appendSystemPrompt: appendPromptParts.length > 0 ? appendPromptParts.join('\n\n') : undefined,
    mcpServers: enrichedMcpServers,
    env,
  };
}

/**
 * Build an XML-formatted context block describing the workstream's directories.
 *
 * Tells the agent about available project directories, active branch selections,
 * and worktree paths. Instructs the agent to work in project directories rather
 * than the internal session directory.
 *
 * Returns empty string if no directories are configured.
 */
export function buildDirectoryContext(
  directories: DirectoryWithBranchInfo[],
  sessionCwd?: string,
): string {
  if (directories.length === 0) return '';

  const lines: string[] = [
    '<vienna-working-directories>',
    '## Project Directories',
    '',
    "The user has added the following project directories to this workstream:",
  ];

  for (const dir of directories) {
    const label = dir.label ? ` (${dir.label})` : '';
    const inherited = dir.isInherited ? ' [inherited]' : '';

    if (dir.branch && dir.worktreePath) {
      lines.push(
        `- \`${dir.path}\`${label}${inherited} — branch "${dir.branch}" (worktree at ${dir.worktreePath})`,
      );
    } else if (dir.branch) {
      lines.push(`- \`${dir.path}\`${label}${inherited} — branch "${dir.branch}"`);
    } else {
      lines.push(`- \`${dir.path}\`${label}${inherited}`);
    }
  }

  if (sessionCwd) {
    lines.push('');
    lines.push(
      `Your current working directory (\`${sessionCwd}\`) is an internal Vienna session directory — do NOT work in it. ` +
      'When the user asks you to work on files, explore code, or make changes, always use the project directories listed above.',
    );
  }

  // Branch selection instructions
  const branchDirs = directories.filter((d) => d.branch && d.worktreePath);
  if (branchDirs.length > 0) {
    lines.push('');
    lines.push('## Active Branch Selections');
    lines.push('You are working with the following git branch selections:');
    for (const dir of branchDirs) {
      const label = dir.label ?? dir.path.split('/').pop() ?? dir.path;
      lines.push(`- ${label}: branch "${dir.branch}" (worktree at ${dir.worktreePath})`);
    }
    lines.push('');
    lines.push('IMPORTANT: Work in the worktree directories listed above, not in the primary working directory.');
  }

  lines.push('</vienna-working-directories>');

  return lines.join('\n');
}

/**
 * Build the entity discovery prompt that tells Claude about available entity
 * types and how to render entity references as interactive UI elements.
 *
 * This is injected into appendSystemPrompt so Claude knows about the
 * `[@vienna//type/id]` and `[[@vienna//type/id]]` syntax from the start.
 */
export function buildEntityDiscoveryPrompt(
  typeSummaries: EntityTypeSummary[],
): string {
  if (typeSummaries.length === 0) return '';

  // Build a concise type table for the prompt
  const typeLines = typeSummaries.map((t) => {
    // Extract a search keyword from the type name: "github_issue" → "issue", "workstream" → "workstream"
    const parts = t.type.split('_');
    const keyword = parts.length > 1 ? parts.slice(1).join('_') : t.type;
    return `- **${t.displayName}** (\`${t.type}\`) — search: "${keyword}"`;
  });

  return `<vienna-entities>
You have access to the user's Vienna entities via vienna-entities MCP tools.

**Available Entity Types:**
${typeLines.join('\n')}

**Available tools:** \`graphql_operations\`, \`graphql_execute\`, \`entity_get\`, \`entity_types\`

**How to use (discover → execute):**
1. \`graphql_operations\` — describe what you want in plain English (e.g., "list all issues", "add label to issue", "create workstream"). The tool understands intent and returns full operation specs with args and example queries.
2. \`graphql_execute\` — copy the query from the spec, fill in variables, execute.

Most requests need only these 2 calls. If the first call returns a compact catalog instead of full specs, call \`graphql_operations\` again with the **exact operation name** to get the full spec.

**Special-purpose tools:**
- \`entity_get\` — resolve a \`@vienna//\` URI to its entity details
- \`entity_types\` — list all available entity types and integrations
- \`reference_add\` — add an entity to this workstream's References (visible in sidebar). Use after creating or mentioning a PR, issue, or other trackable entity.
- \`reference_remove\` — remove an entity from this workstream's References

**CRITICAL — Entity reference syntax for your responses:**
When mentioning entities in your response text, you MUST use URI bracket syntax so they render as interactive UI elements:
- Inline chip: \`[@vienna//type/id]\` — renders as a small clickable chip inline with text
- Block card: \`[[@vienna//type/id]]\` — renders as a rich card on its own line
- With label: \`[@vienna//type/id?label=BASE64_ENCODED_LABEL]\`

**Rules:**
- Prefer inline chips \`[uri]\` by default. Only use block cards \`[[uri]]\` when showing 1-2 entities as a focused result.
- When listing 3+ entities, ALWAYS use inline chips, not cards.
- NEVER wrap entity references in markdown emphasis like \`**[uri]**\` or \`*[uri]*\` — the \`**\` and \`*\` characters render visually broken around chips/cards. Just write the \`[uri]\` bare.
- Never write entity names as plain text when you have their URI.
</vienna-entities>`;
}

/**
 * Build a markdown-formatted context block from linked entities.
 * Returns empty string if no entities are linked.
 *
 * Priority order for each entity's context:
 * 1. contextOverride (user-edited override)
 * 2. resolvedContexts map (from entity definition's resolveContext)
 * 3. Generic fallback (type + title + URI)
 */
export function buildLinkedEntityContext(
  entities: WorkstreamLinkedEntityRecord[],
  resolvedContexts?: Map<string, string>,
): string {
  if (entities.length === 0) return '';

  const sections = entities.map((entity) => {
    // 1. User-edited context override takes top priority
    if (entity.contextOverride) return entity.contextOverride;

    // 2. Pre-resolved context from entity definition's resolveContext
    const resolved = resolvedContexts?.get(entity.entityUri);
    if (resolved) return resolved;

    // 3. Generic fallback
    const parts = [`### ${entity.entityType}: ${entity.entityTitle ?? entity.entityUri}`];
    parts.push(`- URI: ${entity.entityUri}`);
    return parts.join('\n');
  });

  return [
    '<vienna-linked-entities>',
    '## Linked Entities',
    '',
    'The following entities are linked to this workstream for context:',
    '',
    ...sections,
    '</vienna-linked-entities>',
  ].join('\n');
}

/**
 * Merge group-level and workstream-level linked entities.
 * Workstream-level entities take precedence (override) when the same URI
 * appears in both. Returns a single array of WorkstreamLinkedEntityRecord.
 */
export function mergeLinkedEntities(
  workstreamEntities: WorkstreamLinkedEntityRecord[],
  groupEntities: GroupLinkedEntityRecord[],
): WorkstreamLinkedEntityRecord[] {
  // Start with workstream-level entities (these take precedence)
  const byUri = new Map<string, WorkstreamLinkedEntityRecord>();
  for (const entity of workstreamEntities) {
    byUri.set(entity.entityUri, entity);
  }

  // Add group-level entities only if not already present at workstream level
  for (const ge of groupEntities) {
    if (!byUri.has(ge.entityUri)) {
      byUri.set(ge.entityUri, {
        workstreamId: '', // placeholder — not used in context building
        entityUri: ge.entityUri,
        entityType: ge.entityType,
        entityTitle: ge.entityTitle,
        contextOverride: ge.contextOverride,
        createdAt: ge.createdAt,
      });
    }
  }

  return [...byUri.values()];
}

/**
 * Build an XML-formatted context block for group awareness.
 * Tells the agent which group it belongs to and lists sibling workstreams.
 * Returns empty string if the workstream doesn't belong to a group.
 */
export function buildGroupAwarenessContext(
  group: WorkstreamGroupRecord | null,
  siblings: SiblingWorkstreamSummary[],
): string {
  if (!group) return '';

  const lines: string[] = [
    '<vienna-workstream-group>',
    '## Workstream Scope Context',
    '',
    `You are working within the scope **"${group.name}"**.`,
  ];

  if (siblings.length > 0) {
    lines.push('');
    lines.push('Sibling workstreams in this scope:');
    for (const sibling of siblings) {
      lines.push(`- "${sibling.title}" (status: ${sibling.status}) — @vienna//workstream/${sibling.id}`);
    }
    lines.push('');
    lines.push('You can reference sibling workstreams using the MCP workstream entity tools.');
  }

  lines.push('</vienna-workstream-group>');
  return lines.join('\n');
}

/**
 * Build a tag awareness context block for the agent system prompt.
 *
 * Includes full instructions for non-completed tags so the agent retains
 * awareness of obligations (including deferred ones like "when work is done,
 * apply tag X") even after context compaction. Completed tags are listed
 * by name only.
 */
export function buildTagAwarenessContext(
  workstreamId: string,
  tags: WorkstreamTagRecord[],
): string {
  if (tags.length === 0) return '';

  const incomplete = tags.filter((t) => t.status === 'pending' || t.status === 'running');
  const completed = tags.filter((t) => t.status === 'completed');
  const failed = tags.filter((t) => t.status === 'failed' || t.status === 'skipped');

  const lines: string[] = [
    '<vienna-workstream-tags>',
    '## Workstream Tags',
    '',
  ];

  // Show full instructions for incomplete tags — these are the obligations Claude must remember
  if (incomplete.length > 0) {
    for (const tag of incomplete) {
      const deps = tag.tagDependsOn.length > 0 ? ` (after: ${tag.tagDependsOn.join(', ')})` : '';
      lines.push(`### ${tag.tagName} — ${tag.status}${deps}`);
      lines.push(tag.tagInstructions);
      lines.push('');
    }
  }

  // Completed tags — name only
  if (completed.length > 0) {
    lines.push(`**Completed:** ${completed.map((t) => t.tagName).join(', ')}`);
    lines.push('');
  }

  // Failed/skipped tags — name only
  if (failed.length > 0) {
    lines.push(`**Failed/skipped:** ${failed.map((t) => `${t.tagName} (${t.status})`).join(', ')}`);
    lines.push('');
  }

  // Completion rules
  if (incomplete.length > 0) {
    lines.push('**Tag completion rules:**');
    lines.push('- Do NOT mark a tag as "completed" until you have **fully executed** every action it requires.');
    lines.push('  "Completed" means all instructions have been carried out — not just read or acknowledged.');
    lines.push('- Some tags have deferred obligations (e.g. "when work is done, apply tag X").');
    lines.push('  These tags should stay incomplete until the triggering condition is met and the action is taken.');
    lines.push(`- To mark complete: call \`update-tag-status\` on @vienna//workstream/${workstreamId} with the tag name and status "completed".`);
  }

  lines.push('</vienna-workstream-tags>');
  return lines.join('\n');
}
