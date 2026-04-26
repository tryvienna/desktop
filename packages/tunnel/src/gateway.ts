/**
 * TunnelGateway — permission-aware GraphQL query filter.
 *
 * Sits between the relay tunnel and the local executeGraphQL function.
 * Parses incoming queries, checks the configured access level, and
 * blocks operations that exceed the user's chosen permission tier.
 *
 * Access levels:
 *   - 'view-only'   — read queries only (no mutations, no introspection)
 *   - 'interactive'  — view-only + a curated set of safe mutations
 *   - 'full'         — unrestricted access (user explicitly opts in)
 */

import { parse, Kind, type DocumentNode, type OperationDefinitionNode, type FieldNode, type SelectionSetNode } from 'graphql';
import type { GraphQLExecuteFn } from './index';

// ---------------------------------------------------------------------------
// Access level type
// ---------------------------------------------------------------------------

export const TUNNEL_ACCESS_LEVELS = ['view-only', 'interactive', 'full'] as const;
export type TunnelAccessLevel = (typeof TUNNEL_ACCESS_LEVELS)[number];

// ---------------------------------------------------------------------------
// Mutation allowlists per access level
// ---------------------------------------------------------------------------

/**
 * Mutations allowed at the 'interactive' tier.
 * These let the mobile user chat with agents and do light management,
 * but block destructive, security-sensitive, or administrative operations.
 */
const INTERACTIVE_MUTATIONS = new Set([
  // Chat with agents
  'sendWorkstreamMessage',
  'stopWorkstreamAgent',
  'restartWorkstreamAgent',
  'interruptWorkstreamAgent',

  // Light workstream management
  'createWorkstream',
  'updateWorkstream',
  'archiveWorkstream',
  'unarchiveWorkstream',
  'pinWorkstream',
  'unpinWorkstream',
  'setWorkstreamInFocus',
  'switchWorkstreamModel',
  'compactWorkstreamConversation',
  'clearWorkstreamConversation',

  // Safe appearance/AI settings (no permissions or advanced)
  'updateAppearanceSettings',
  'updateAiSettings',
]);

// ---------------------------------------------------------------------------
// AST-based GraphQL operation parser
// ---------------------------------------------------------------------------

interface ParsedOperation {
  type: 'query' | 'mutation' | 'subscription';
  /** Top-level field names (actual names, not aliases) in the selection set */
  fields: string[];
}

/**
 * Parse a GraphQL query string into an AST and extract operation types
 * and top-level field names. Uses graphql-js `parse` to correctly handle
 * aliases, fragments, block strings, and other edge cases that regex
 * parsers cannot reliably handle.
 */
function parseOperations(query: string): ParsedOperation[] {
  let doc: DocumentNode;
  try {
    doc = parse(query);
  } catch {
    // If the query is unparseable, return empty — the executor will
    // produce a proper GraphQL error downstream.
    return [];
  }

  const operations: ParsedOperation[] = [];

  for (const def of doc.definitions) {
    if (def.kind !== Kind.OPERATION_DEFINITION) continue;

    const opDef = def as OperationDefinitionNode;
    const type = opDef.operation; // 'query' | 'mutation' | 'subscription'
    const fields = extractTopLevelFields(opDef.selectionSet, doc);
    operations.push({ type, fields });
  }

  return operations;
}

/**
 * Extract actual field names (not aliases) from a selection set.
 * Follows fragment spreads to resolve their field names.
 */
function extractTopLevelFields(
  selectionSet: SelectionSetNode,
  doc: DocumentNode,
  visited = new Set<string>(),
): string[] {
  const fields: string[] = [];

  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      // Use the actual field name, not the alias
      fields.push((selection as FieldNode).name.value);
    } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
      // Resolve named fragment spreads (with cycle detection)
      const fragName = selection.name.value;
      if (visited.has(fragName)) continue;
      visited.add(fragName);
      const fragDef = doc.definitions.find(
        (d) => d.kind === Kind.FRAGMENT_DEFINITION && d.name.value === fragName,
      );
      if (fragDef && fragDef.kind === Kind.FRAGMENT_DEFINITION) {
        fields.push(...extractTopLevelFields(fragDef.selectionSet, doc, visited));
      }
    } else if (selection.kind === Kind.INLINE_FRAGMENT) {
      // Resolve inline fragments
      fields.push(...extractTopLevelFields(selection.selectionSet, doc, visited));
    }
  }

  return [...new Set(fields)];
}

// ---------------------------------------------------------------------------
// Introspection detection
// ---------------------------------------------------------------------------

function containsIntrospection(fields: string[]): boolean {
  return fields.some((f) => f === '__schema' || f === '__type');
}

// ---------------------------------------------------------------------------
// Gateway
// ---------------------------------------------------------------------------

export interface TunnelGatewayOptions {
  /** The underlying executeGraphQL function */
  execute: GraphQLExecuteFn;
  /** Returns the current access level from settings */
  getAccessLevel: () => TunnelAccessLevel;
}

/**
 * Create a permission-filtered GraphQL execute function.
 *
 * Returns a new GraphQLExecuteFn that enforces the configured access level
 * before delegating to the real executor.
 */
export function createTunnelGateway(options: TunnelGatewayOptions): GraphQLExecuteFn {
  const { execute, getAccessLevel } = options;

  return async (query, variables, operationName) => {
    const level = getAccessLevel();

    // Full access — pass through with no filtering
    if (level === 'full') {
      return execute(query, variables, operationName);
    }

    const operations = parseOperations(query);

    // If parse returned nothing but the query is non-empty, it's a parse failure.
    // Fail-closed: reject rather than letting unchecked queries through.
    if (operations.length === 0 && query.trim().length > 0) {
      return {
        errors: [{ message: 'Failed to parse GraphQL query' }],
      };
    }

    // Block introspection for view-only and interactive
    const allFields = operations.flatMap((op) => op.fields);
    if (containsIntrospection(allFields)) {
      return {
        errors: [{
          message: 'Schema introspection is disabled for mobile access. '
            + 'Change the access level to "Full Access" in desktop settings to enable it.',
        }],
      };
    }

    for (const op of operations) {
      if (op.type === 'subscription') {
        return {
          errors: [{ message: 'Subscriptions are not supported over the relay tunnel.' }],
        };
      }

      if (op.type === 'mutation') {
        if (level === 'view-only') {
          return {
            errors: [{
              message: 'Mutations are disabled. Mobile access is set to "View Only". '
                + 'Change to "Interactive" or "Full Access" in desktop settings.',
            }],
          };
        }

        // Interactive — check each mutation field against the allowlist
        if (level === 'interactive') {
          const blocked = op.fields.filter((f) => !INTERACTIVE_MUTATIONS.has(f));
          if (blocked.length > 0) {
            return {
              errors: [{
                message: `Operation not permitted at "Interactive" access level: ${blocked.join(', ')}. `
                  + 'Change to "Full Access" in desktop settings to use this operation.',
              }],
            };
          }
        }
      }
    }

    // Passed all checks — execute
    return execute(query, variables, operationName);
  };
}
