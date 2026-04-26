/**
 * Pure Markdown Formatters
 *
 * All formatting logic is extracted into pure functions with no side effects.
 * Each function takes data and returns a markdown string.
 * This makes formatting trivially testable without any mocks.
 */

import type { BaseEntity, EntityTypeSummary } from '@tryvienna/sdk';

// ─────────────────────────────────────────────────────────────────────────────
// Primitives
// ─────────────────────────────────────────────────────────────────────────────

/** Format a single value for display in markdown */
export function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** Build a base64-encoded label for entity URI references */
export function encodeLabel(label: string): string {
  return btoa(encodeURIComponent(label));
}

/** Build the entity reference hint block for Claude */
export function formatReferenceHint(uri: string, label?: string): string {
  const labelSuffix = label ? `?label=${encodeLabel(label)}` : '';
  return [
    `> **Reference:** \`[${uri}${labelSuffix}]\` (inline chip) or \`[[${uri}${labelSuffix}]]\` (block card).`,
    '> Never wrap entity references in **bold** or *italic*.',
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Entity Details (single entity)
// ─────────────────────────────────────────────────────────────────────────────

export function formatEntityDetails(entity: BaseEntity): string {
  const lines: string[] = [
    `# ${entity.title}`,
    '',
    formatReferenceHint(entity.uri, entity.title),
    '',
    `- **URI:** \`${entity.uri}\``,
    `- **Type:** ${entity.type}`,
  ];

  if (entity.description) {
    lines.push(`- **Description:** ${entity.description}`);
  }

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Entity Types (discovery)
// ─────────────────────────────────────────────────────────────────────────────

export function formatEntityTypes(summaries: EntityTypeSummary[]): string {
  const lines: string[] = [
    '# Vienna Entity Types',
    '',
    `${summaries.length} entity types available:`,
    '',
  ];

  for (const summary of summaries) {
    lines.push(`## ${summary.type}`);
    lines.push(`${summary.displayName}`);
    lines.push('');
    lines.push(`**URI Pattern:** \`${summary.uriExample}\``);
    lines.push(`**Source:** ${summary.source}`);
    lines.push('');

    if (summary.display?.description) {
      lines.push(summary.display.description);
      lines.push('');
    }

    if (summary.display?.filterDescriptions?.length) {
      lines.push('**List Filters:**');
      for (const f of summary.display.filterDescriptions) {
        lines.push(`- \`${f.name}\` (${f.type}): ${f.description}`);
      }
      lines.push('');
    }

  }

  lines.push('---');
  lines.push('');
  lines.push('**How to access data:**');
  lines.push('- `graphql_operations`: Search for typed queries/mutations by keyword (e.g., "pr", "workstream")');
  lines.push('- `graphql_execute`: Run a discovered query or mutation');
  lines.push('- `entity_get`: Resolve entity details by URI');
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// GraphQL Execution Result
// ─────────────────────────────────────────────────────────────────────────────

/** Check if a value contains empty objects in arrays (sign of missing subfield selection) */
export function hasEmptyObjects(value: unknown): boolean {
  if (value === null || value === undefined || typeof value !== 'object') return false;
  if (Array.isArray(value)) {
    return value.some((item) => {
      if (item && typeof item === 'object' && !Array.isArray(item) && Object.keys(item).length === 0) {
        return true;
      }
      return hasEmptyObjects(item);
    });
  }
  return Object.values(value).some(hasEmptyObjects);
}

export function formatGraphqlResult(result: unknown): string {
  const lines: string[] = [
    '```json',
    JSON.stringify(result, null, 2),
    '```',
  ];

  if (hasEmptyObjects(result)) {
    lines.push('');
    lines.push('> **Tip:** Some fields returned empty objects — add subfield selections (e.g., `labels { name }`) to retrieve their data.');
  }

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Workstream Create Result
// ─────────────────────────────────────────────────────────────────────────────

export function formatWorkstreamCreateResult(result: {
  workstream: { id: string; title: string; status: string; model: string | null };
  worktrees?: Array<{ directoryPath: string; branch: string; worktreePath?: string; error?: string }>;
}): string {
  const ws = result.workstream;
  const uri = `@vienna//workstream/${ws.id}`;

  const lines: string[] = [
    `# Workstream Created: ${ws.title}`,
    '',
    formatReferenceHint(uri, ws.title),
    '',
    `- **URI:** \`${uri}\``,
    `- **ID:** ${ws.id}`,
    `- **Status:** ${ws.status}`,
    `- **Model:** ${ws.model ?? 'default'}`,
  ];

  if (result.worktrees && result.worktrees.length > 0) {
    lines.push('');
    lines.push('## Worktrees');
    lines.push('');
    for (const wt of result.worktrees) {
      if (wt.error) {
        lines.push(`- **${wt.directoryPath}:** Error: ${wt.error}`);
      } else if (wt.worktreePath) {
        lines.push(`- **${wt.directoryPath}**`);
        lines.push(`  - Branch: \`${wt.branch}\``);
        lines.push(`  - Worktree: \`${wt.worktreePath}\``);
      } else {
        lines.push(`- **${wt.directoryPath}:** Branch \`${wt.branch}\` (no worktree)`);
      }
    }
  }

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Workstream Send Message Result
// ─────────────────────────────────────────────────────────────────────────────

export function formatWorkstreamSendMessageResult(result: {
  workstream: { id: string; status: string; messageCount: number };
}): string {
  const ws = result.workstream;
  const uri = `@vienna//workstream/${ws.id}`;

  return [
    '# Message Sent',
    '',
    formatReferenceHint(uri),
    '',
    `- **Workstream:** \`${uri}\``,
    `- **Status:** ${ws.status}`,
    `- **Message Count:** ${ws.messageCount}`,
    '',
    'The agent has been started and is processing the message.',
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// GraphQL Operations Discovery
// ─────────────────────────────────────────────────────────────────────────────

interface InputFieldInfo {
  name: string;
  type: string;
  description?: string;
  inputFields?: InputFieldInfo[];
}

export interface OperationSummary {
  kind: string;
  name: string;
  description: string;
  args: Array<{
    name: string;
    type: string;
    description?: string;
    inputFields?: InputFieldInfo[];
  }>;
  returnType: string;
  returnFields?: string[];
}

/** Generate a placeholder value string for an arg type (for example queries) */
function exampleValue(
  type: string,
  inputFields?: InputFieldInfo[],
): string {
  const inner = type.replace(/[!\[\]]/g, '');
  if (inner === 'Int' || inner === 'Float') return '10';
  if (inner === 'Boolean') return 'true';
  if (inner === 'JSON') return '{}';

  // For InputObjectType args, show required fields expanded
  if (inputFields && inputFields.length > 0) {
    const required = inputFields.filter((f) => f.type.endsWith('!'));
    const shown = required.length > 0 ? required : inputFields.slice(0, 4);
    const pairs = shown.map((f) => `${f.name}: ${exampleValue(f.type, f.inputFields)}`).join(', ');
    const value = `{ ${pairs} }`;
    // Wrap in array if the type is a list
    return type.includes('[') ? `[${value}]` : value;
  }

  // If type is a list of scalars, wrap in array
  if (type.includes('[')) return `["..."]`;

  return `"..."`;
}

/** Compact one-liner per operation — used when there are many results */
export function formatCompactOperations(operations: OperationSummary[], query?: string): string {
  const lines: string[] = [];
  const suffix = query ? ` matching "${query}"` : '';
  lines.push(`Found ${operations.length} operations${suffix}.`);
  lines.push('Use `graphql_operations` with an exact operation name for full spec + examples.');
  lines.push('');

  for (const op of operations) {
    // Include arg names so the agent can construct calls without a full-spec lookup
    const argHint = op.args.length > 0
      ? `(${op.args.map((a) => a.name).join(', ')})`
      : '';
    const desc = op.description ? ` — ${op.description}` : '';
    lines.push(`- **${op.kind}** \`${op.name}${argHint}\`${desc}`);
  }

  return lines.join('\n');
}

/** Full spec per operation — used when there are few results */
export function formatFullOperations(operations: OperationSummary[], query?: string): string {
  const lines: string[] = [];
  const suffix = query ? ` matching "${query}"` : '';
  lines.push(`Found ${operations.length} operations${suffix}.`);
  lines.push('Use \`graphql_execute\` to run any of these.');
  lines.push('');

  for (const op of operations) {
    // Compact signature line — expand InputObjectType fields inline (with nesting)
    const formatFieldHint = (fields: InputFieldInfo[]): string =>
      ` { ${fields.map((f) => {
        const nested = f.inputFields ? formatFieldHint(f.inputFields) : '';
        return `${f.name}: ${f.type}${nested}`;
      }).join(', ')} }`;

    const argStr = op.args.length > 0
      ? `(${op.args.map((a) => {
          const fieldHint = a.inputFields ? formatFieldHint(a.inputFields) : '';
          return `${a.name}: ${a.type}${fieldHint}`;
        }).join(', ')})`
      : '';
    lines.push(`**${op.kind}** \`${op.name}${argStr}\`: ${op.returnType}`);
    if (op.description) {
      lines.push(`  ${op.description}`);
    }

    // Show arg descriptions (so the agent knows what values to pass)
    const describedArgs = op.args.filter((a) => a.description);
    if (describedArgs.length > 0) {
      for (const a of describedArgs) {
        lines.push(`  - \`${a.name}\`: ${a.description}`);
      }
    }

    // Generate a ready-to-use example query
    const requiredArgs = op.args.filter((a) => a.type.endsWith('!'));
    const optionalArgs = op.args.filter((a) => !a.type.endsWith('!'));

    // Build variable declarations and arg pass-through
    const allExampleArgs = [...requiredArgs, ...optionalArgs.slice(0, 2)]; // required + up to 2 optional
    if (allExampleArgs.length > 0) {
      const varDecls = allExampleArgs.map((a) => `$${a.name}: ${a.type}`).join(', ');
      const argPasses = allExampleArgs.map((a) => `${a.name}: $${a.name}`).join(', ');
      const fields = op.returnFields?.slice(0, 6).join(' ') || '__typename';
      const opType = op.kind === 'mutation' ? 'mutation' : 'query';

      lines.push(`  \`\`\`graphql`);
      lines.push(`  ${opType}(${varDecls}) { ${op.name}(${argPasses}) { ${fields} } }`);
      lines.push(`  \`\`\``);
      lines.push(`  variables: { ${allExampleArgs.map((a) => `${a.name}: ${exampleValue(a.type, a.inputFields)}`).join(', ')} }`);
    } else if (op.returnFields?.length) {
      const fields = op.returnFields.slice(0, 6).join(' ');
      lines.push(`  \`\`\`graphql`);
      lines.push(`  { ${op.name} { ${fields} } }`);
      lines.push(`  \`\`\``);
    }

    lines.push('');
  }

  return lines.join('\n');
}

/** Auto-tiered formatting: compact catalog for many results, full spec for few */
export function formatGraphqlOperations(operations: OperationSummary[], query?: string): string {
  if (operations.length > 3) {
    return formatCompactOperations(operations, query);
  }
  return formatFullOperations(operations, query);
}
