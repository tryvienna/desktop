/**
 * TaskOutputTool — Renders TaskOutput tool for background task results
 *
 * @ai-context
 * - Parses XML-tagged output (retrieval_status, task_type, status, output)
 * - Metadata row with task ID, mode, timeout, type, status
 * - StreamingContent for output display
 * - data-slot="task-output-tool-content"
 */

import { useMemo } from 'react';

import { ToolOutput } from '../tool-output';
import { StreamingContent } from '../streaming-content';
import type { ToolRendererProps } from '../registry';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseTaskOutput(raw: string | undefined): {
  retrievalStatus?: string;
  taskType?: string;
  taskStatus?: string;
  taskOutput?: string;
} {
  if (!raw) return {};
  const extract = (tag: string): string | undefined => {
    const m = raw.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
    return m ? m[1].trim() : undefined;
  };
  return {
    retrievalStatus: extract('retrieval_status'),
    taskType: extract('task_type'),
    taskStatus: extract('status'),
    taskOutput: extract('output'),
  };
}

function formatTimeout(ms: number): string {
  return ms >= 1000 ? `${ms / 1000}s` : `${ms}ms`;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function TaskOutputIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskOutputTool({ toolUse, onApprove, onDeny, onRevoke, isFromHistory }: ToolRendererProps) {
  const input = toolUse.input || {};
  const taskId = (input.task_id as string) || '';
  const block = input.block as boolean | undefined;
  const timeout = input.timeout as number | undefined;
  const output = toolUse.result?.output;
  const isStreaming = toolUse.isStreaming ?? false;

  const parsed = useMemo(() => parseTaskOutput(output), [output]);

  const description = taskId ? `task ${taskId}` : 'task output';
  const modeLabel = block ? 'blocking' : 'non-blocking';
  const taskTypeLabel = parsed.taskType?.replace('local_', '') ?? null;

  return (
    <ToolOutput
      id={toolUse.id}
      toolName="TaskOutput"
      description={description}
      status={toolUse.status}
      error={toolUse.result?.error}
      requestId={toolUse.requestId}
      approvalMethod={toolUse.approvalMethod}
      onApprove={onApprove}
      onDeny={onDeny}
      onRevoke={onRevoke}
      images={toolUse.result?.images}
      isFromHistory={isFromHistory}
      icon={
        <span className="flex-shrink-0 text-muted-foreground">
          <TaskOutputIcon />
        </span>
      }
    >
      <div data-slot="task-output-tool-content" className="relative">
        {/* Metadata row */}
        <div className="flex items-center gap-2 px-3 py-2 bg-surface-sunken border-b border-border-muted">
          <span className="text-[10px] font-mono text-foreground-secondary shrink-0">
            {taskId || '\u2014'}
          </span>
          <span className="text-[10px] text-muted-foreground">&middot;</span>
          <span className="text-[10px] text-muted-foreground">{modeLabel}</span>
          {timeout !== undefined && (
            <>
              <span className="text-[10px] text-muted-foreground">&middot;</span>
              <span className="text-[10px] text-muted-foreground">{formatTimeout(timeout)}</span>
            </>
          )}
          {taskTypeLabel && (
            <>
              <span className="text-[10px] text-muted-foreground">&middot;</span>
              <span className="text-[10px] text-muted-foreground">{taskTypeLabel}</span>
            </>
          )}
          {parsed.taskStatus && (
            <>
              <span className="text-[10px] text-muted-foreground">&middot;</span>
              <span className="text-[10px] text-muted-foreground">{parsed.taskStatus}</span>
            </>
          )}
        </div>

        {/* Output content */}
        {(parsed.taskOutput || output || isStreaming) && (
          <div className="p-3">
            <div className="p-2 overflow-auto rounded bg-surface-sunken max-h-[200px]">
              <StreamingContent
                content={parsed.taskOutput ?? output ?? ''}
                isStreaming={isStreaming}
                isCode
                className="text-foreground"
              />
            </div>
          </div>
        )}
      </div>
    </ToolOutput>
  );
}
