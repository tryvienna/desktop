/**
 * TaskStopTool — Renderer for stopping background tasks
 *
 * @ai-context
 * - TaskStop terminates a running background agent task
 * - Input: { task_id }
 * - Compact display showing the task being stopped
 * - data-slot="task-stop-tool-content"
 */

import { ToolOutput } from '../tool-output';
import type { ToolRendererProps } from '../registry';

function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

export function TaskStopTool({ toolUse, messageId, onApprove, onDeny, onRevoke, isFromHistory }: ToolRendererProps) {
  const taskId = (toolUse.input.task_id as string) ?? '';
  const error = toolUse.result?.error;
  const isRunning = toolUse.status === 'running';

  const shortId = taskId.length > 12 ? `${taskId.slice(0, 12)}...` : taskId;

  return (
    <ToolOutput
      id={toolUse.id}
      toolName="TaskStop"
      description={shortId ? `Task ${shortId}` : 'Stopping task'}
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
          <StopIcon />
        </span>
      }
    >
      <div data-slot="task-stop-tool-content" data-testid={`task-stop-tool-${messageId}`}>
        {isRunning ? (
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground">
            Stopping task...
          </div>
        ) : taskId ? (
          <div className="flex items-center gap-2 px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
            {taskId}
          </div>
        ) : null}
      </div>
    </ToolOutput>
  );
}
