/**
 * reference_remove — Remove an entity reference from the current workstream.
 *
 * Used to dismiss a reference that is no longer relevant.
 */

import type { ReferenceRemoveInput } from '../schemas';
import type { ToolContext, ToolResult } from '../types';
import { textResult } from '../types';

export async function handleReferenceRemove(
  input: ReferenceRemoveInput,
  ctx: ToolContext,
): Promise<ToolResult> {
  const result = await ctx.removeReference(input.entityUri);

  return textResult(
    result.success
      ? `Reference removed: ${result.entityUri}`
      : `Reference not found: ${input.entityUri}`,
  );
}
