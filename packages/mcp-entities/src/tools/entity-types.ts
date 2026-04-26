/**
 * entity_types — Discover available entity types and their metadata.
 */

import type { ToolContext, ToolResult } from '../types';
import { textResult } from '../types';
import { formatEntityTypes } from '../format';

export async function handleEntityTypes(
  _input: unknown,
  ctx: ToolContext
): Promise<ToolResult> {
  const summaries = await ctx.getEntityTypes();

  if (summaries.length === 0) {
    return textResult('No entity types registered');
  }

  return textResult(formatEntityTypes(summaries));
}
