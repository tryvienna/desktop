/**
 * workstream_create — Create a workstream with full directory/worktree inheritance.
 *
 * Routes through the GraphQL createWorkstream mutation (via socket),
 * getting project directory inheritance, group inheritance, and optional
 * automatic worktree creation. Group name resolution is handled server-side.
 */

import type { WorkstreamCreateInput } from '../schemas';
import type { ToolContext, ToolResult } from '../types';
import { textResult } from '../types';
import { formatWorkstreamCreateResult } from '../format';

export async function handleWorkstreamCreate(
  input: WorkstreamCreateInput,
  ctx: ToolContext
): Promise<ToolResult> {
  const result = await ctx.createWorkstream({
    projectId: input.projectId,
    title: input.title,
    model: input.model,
    groupName: input.groupName,
    createWorktrees: input.createWorktrees,
    branchName: input.branchName,
    baseBranch: input.baseBranch,
  });

  return textResult(formatWorkstreamCreateResult(result));
}
