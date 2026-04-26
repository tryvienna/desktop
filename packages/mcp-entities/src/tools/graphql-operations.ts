/**
 * graphql_operations — Discover available GraphQL operations.
 *
 * Returns compact operation summaries (name, args, return type) filtered
 * by keyword search. Token-efficient alternative to full introspection.
 */

import type { GraphqlOperationsInput } from '../schemas';
import type { ToolContext, ToolResult } from '../types';
import { textResult } from '../types';
import { formatGraphqlOperations } from '../format';

export async function handleGraphqlOperations(
  input: GraphqlOperationsInput,
  ctx: ToolContext
): Promise<ToolResult> {
  const operations = await ctx.getGraphqlOperations(input.query, input.kind);

  if (operations.length === 0) {
    const suffix = input.query ? ` matching "${input.query}"` : '';
    return textResult(`No GraphQL operations found${suffix}.`);
  }

  return textResult(formatGraphqlOperations(operations, input.query));
}
