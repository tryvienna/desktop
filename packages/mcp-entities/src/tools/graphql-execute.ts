/**
 * graphql_execute — Execute arbitrary GraphQL queries and mutations.
 */

import type { GraphqlExecuteInput } from '../schemas';
import type { ToolContext, ToolResult } from '../types';
import { textResult } from '../types';
import { formatGraphqlResult } from '../format';

export async function handleGraphqlExecute(
  input: GraphqlExecuteInput,
  ctx: ToolContext
): Promise<ToolResult> {
  const result = await ctx.executeGraphql(input.query, input.variables);
  return textResult(formatGraphqlResult(result));
}
