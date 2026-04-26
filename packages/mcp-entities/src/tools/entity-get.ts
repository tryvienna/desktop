/**
 * entity_get — Get details of a single entity by URI.
 */

import type { EntityGetInput } from '../schemas';
import type { ToolContext, ToolResult } from '../types';
import { textResult } from '../types';
import { formatEntityDetails } from '../format';

export async function handleEntityGet(
  input: EntityGetInput,
  ctx: ToolContext
): Promise<ToolResult> {
  const entity = await ctx.getEntity(input.uri);

  if (!entity) {
    return textResult(`Entity not found: ${input.uri}`);
  }

  return textResult(formatEntityDetails(entity));
}
