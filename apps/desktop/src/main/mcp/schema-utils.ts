/**
 * GraphQL Schema Introspection Utilities
 *
 * Shared helpers for introspecting the Pothos-built GraphQL schema.
 * Used by MCP handlers (graphql.operations) and the intent classifier.
 *
 * @module main/mcp/schema-utils
 */

import {
  isObjectType,
  isInputObjectType,
  isListType,
  isNonNullType,
  type GraphQLOutputType,
  type GraphQLInputType,
} from 'graphql';
import { getSchema } from '@vienna/graphql/schema';

// ─────────────────────────────────────────────────────────────────────────────
// Type Unwrapping
// ─────────────────────────────────────────────────────────────────────────────

/** Unwrap NonNull/List wrappers and return the named type string (e.g. "GitHubIssue") */
export function getUnwrappedTypeName(type: GraphQLOutputType): string {
  let unwrapped: GraphQLOutputType = type;
  while (isNonNullType(unwrapped) || isListType(unwrapped)) {
    unwrapped = unwrapped.ofType;
  }
  return unwrapped.toString();
}

/** Unwrap NonNull/List wrappers and return the named object type's field names.
 *  Object-type fields are suffixed with ` { ... }` so the agent knows subfield selection is needed. */
export function getScalarFieldNames(type: GraphQLOutputType): string[] | undefined {
  let unwrapped: GraphQLOutputType = type;
  while (isNonNullType(unwrapped) || isListType(unwrapped)) {
    unwrapped = unwrapped.ofType;
  }
  if (!isObjectType(unwrapped)) return undefined;
  const fields = unwrapped.getFields();
  return Object.entries(fields).map(([name, f]) => {
    let t: GraphQLOutputType = f.type;
    while (isNonNullType(t) || isListType(t)) t = t.ofType;
    return isObjectType(t) ? `${name} { ... }` : name;
  });
}

export interface InputFieldInfo {
  name: string;
  type: string;
  description?: string;
  inputFields?: InputFieldInfo[];
}

/** Unwrap NonNull/List wrappers and return InputObjectType fields.
 *  Recurses up to `depth` levels into nested input types so the agent
 *  sees required fields on types like InboxActionInput. */
export function getInputTypeFields(
  type: GraphQLInputType,
  depth = 2,
): InputFieldInfo[] | undefined {
  let unwrapped: GraphQLInputType = type;
  while (isNonNullType(unwrapped) || isListType(unwrapped)) {
    unwrapped = unwrapped.ofType;
  }
  if (!isInputObjectType(unwrapped)) return undefined;
  return Object.values(unwrapped.getFields()).map((f) => {
    const field: InputFieldInfo = {
      name: f.name,
      type: f.type.toString(),
      description: f.description ?? undefined,
    };
    if (depth > 1) {
      const nested = getInputTypeFields(f.type, depth - 1);
      if (nested) field.inputFields = nested;
    }
    return field;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Operation Summary Building
// ─────────────────────────────────────────────────────────────────────────────

export interface OperationSummary {
  kind: 'query' | 'mutation';
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

/** Build an OperationSummary from a GraphQL field */
export function buildOperationSummary(
  kind: 'query' | 'mutation',
  name: string,
  field: GraphQLField<unknown, unknown>,
): OperationSummary {
  return {
    kind,
    name,
    description: field.description ?? '',
    args: field.args.map((a) => ({
      name: a.name,
      type: a.type.toString(),
      description: a.description ?? undefined,
      inputFields: getInputTypeFields(a.type),
    })),
    returnType: field.type.toString(),
    returnFields: getScalarFieldNames(field.type),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Operation Resolution (by exact name)
// ─────────────────────────────────────────────────────────────────────────────

/** Look up operations by exact name in the schema. Returns full summaries. */
export function resolveOperationSpecs(names: string[]): OperationSummary[] {
  const schema = getSchema();
  const results: OperationSummary[] = [];
  const nameSet = new Set(names.map((n) => n.toLowerCase()));

  const typePairs: Array<['query' | 'mutation', ReturnType<typeof schema.getQueryType>]> = [
    ['query', schema.getQueryType()],
    ['mutation', schema.getMutationType()],
  ];

  for (const [kind, type] of typePairs) {
    if (!type) continue;
    const fields = type.getFields();
    for (const [fieldName, field] of Object.entries(fields)) {
      if (nameSet.has(fieldName.toLowerCase())) {
        results.push(buildOperationSummary(kind, fieldName, field));
      }
    }
  }

  return results;
}

/**
 * Parse the first mutation field name from a GraphQL query string.
 * Returns null for queries or unparseable strings.
 *
 * NOTE: This uses a simple regex and won't handle aliases (e.g.
 * `mutation { myAlias: actualMutation(...) }` extracts "myAlias")
 * or comments before the first field. Since this is used on the
 * permission check path, consider using graphql's parse() if edge
 * cases become a problem.
 */
export function parseMutationName(query: unknown): string | null {
  if (typeof query !== 'string') return null;
  const trimmed = query.trimStart();
  if (!trimmed.startsWith('mutation')) return null;
  const match = trimmed.match(/\{\s*(\w+)/);
  return match?.[1] ?? null;
}

/** Build a compact catalog of ALL operations (for intent classification context) */
export function buildCompactCatalog(): string {
  const schema = getSchema();
  const lines: string[] = [];

  const typePairs: Array<['query' | 'mutation', ReturnType<typeof schema.getQueryType>]> = [
    ['query', schema.getQueryType()],
    ['mutation', schema.getMutationType()],
  ];

  for (const [kind, type] of typePairs) {
    if (!type) continue;
    const fields = type.getFields();
    for (const [name, field] of Object.entries(fields)) {
      if (name.startsWith('__')) continue;
      const argHint = field.args.length > 0
        ? `(${field.args.map((a) => a.name).join(', ')})`
        : '';
      const desc = field.description ? ` — ${field.description}` : '';
      lines.push(`${kind} ${name}${argHint}${desc}`);
    }
  }

  return lines.join('\n');
}
