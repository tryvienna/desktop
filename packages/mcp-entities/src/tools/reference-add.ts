/**
 * reference_add — Add an entity reference to the current workstream.
 *
 * Used by the agent after creating or mentioning a trackable entity
 * (PR, issue, doc, etc.) so it appears in the workstream's References section.
 */

import type { ReferenceAddInput } from '../schemas';
import type { ToolContext, ToolResult } from '../types';
import { textResult } from '../types';

export async function handleReferenceAdd(
  input: ReferenceAddInput,
  ctx: ToolContext,
): Promise<ToolResult> {
  const result = await ctx.addReference({
    entityUri: input.entityUri,
    entityType: input.entityType,
    entityTitle: input.entityTitle,
  });

  return textResult(
    `Reference added: ${input.entityTitle ?? input.entityUri}\n` +
    `URI: ${result.entityUri}\n` +
    `Type: ${input.entityType}`,
  );
}
