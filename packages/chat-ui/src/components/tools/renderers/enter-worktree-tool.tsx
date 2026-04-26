/**
 * EnterWorktreeTool — Renderer for git worktree isolation
 *
 * @ai-context
 * - EnterWorktree creates an isolated git worktree for safe changes
 * - Input: { name? } — optional worktree name
 * - Shows the worktree name/branch being created
 * - data-slot="enter-worktree-tool-content"
 */

import { ToolOutput } from '../tool-output';
import type { ToolRendererProps } from '../registry';

function GitBranchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="4" cy="3.5" r="1.5" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="4" cy="10.5" r="1.5" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="10" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.25" />
      <path d="M4 5V9" stroke="currentColor" strokeWidth="1.25" />
      <path d="M8.5 6H6C4.89543 6 4 6.89543 4 8" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

export function EnterWorktreeTool({ toolUse, messageId, onApprove, onDeny, onRevoke, isFromHistory }: ToolRendererProps) {
  const name = (toolUse.input.name as string) ?? '';
  const error = toolUse.result?.error;
  const isRunning = toolUse.status === 'running';

  const description = name || 'Creating worktree';

  return (
    <ToolOutput
      id={toolUse.id}
      toolName="EnterWorktree"
      description={description}
      status={toolUse.status}
      error={error}
      requestId={toolUse.requestId}
      approvalMethod={toolUse.approvalMethod}
      onApprove={onApprove}
      onDeny={onDeny}
      onRevoke={onRevoke}
      images={toolUse.result?.images}
      isFromHistory={isFromHistory}
      defaultCollapsed={true}
      icon={
        <span className="flex-shrink-0 text-muted-foreground">
          <GitBranchIcon />
        </span>
      }
    >
      <div data-slot="enter-worktree-tool-content" data-testid={`enter-worktree-tool-${messageId}`}>
        {isRunning ? (
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground">
            Creating worktree...
          </div>
        ) : toolUse.result?.output ? (
          <div className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground truncate">
            {toolUse.result.output}
          </div>
        ) : null}
      </div>
    </ToolOutput>
  );
}
