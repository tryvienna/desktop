/**
 * workstream_send_message — Send a message to a workstream agent.
 *
 * Auto-starts the agent if not already running. The message is delivered
 * as if the user typed it in the chat UI.
 */

import type { WorkstreamSendMessageInput } from '../schemas';
import type { ToolContext, ToolResult } from '../types';
import { textResult } from '../types';
import { formatWorkstreamSendMessageResult } from '../format';

export async function handleWorkstreamSendMessage(
  input: WorkstreamSendMessageInput,
  ctx: ToolContext
): Promise<ToolResult> {
  const result = await ctx.sendWorkstreamMessage(input.workstreamId, input.text);
  return textResult(formatWorkstreamSendMessageResult(result));
}
