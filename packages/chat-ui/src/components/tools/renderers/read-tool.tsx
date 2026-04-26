/**
 * ReadTool — Renderer for file read operations
 *
 * @ai-context
 * - File path header, content in sunken bg
 * - Duration badge, line range display
 * - data-slot="read-tool-content"
 */

import { ToolOutput } from '../tool-output';
import type { ToolRendererProps } from '../registry';

function FileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M8 1.5H3.5C3.10218 1.5 2.72064 1.65804 2.43934 1.93934C2.15804 2.22064 2 2.60218 2 3V11C2 11.3978 2.15804 11.7794 2.43934 12.0607C2.72064 12.342 3.10218 12.5 3.5 12.5H10.5C10.8978 12.5 11.2794 12.342 11.5607 12.0607C11.842 11.7794 12 11.3978 12 11V5.5L8 1.5Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 1.5V5.5H12"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function ReadTool({ toolUse, messageId, onApprove, onDeny, onRevoke, isFromHistory }: ToolRendererProps) {
  const filePath = (toolUse.input.file_path as string) ?? '';
  const lineNumber = toolUse.input.offset as number | undefined;
  const limit = toolUse.input.limit as number | undefined;
  const output = toolUse.result?.output ?? '';
  const error = toolUse.result?.error;
  const duration = toolUse.result?.durationMs as number | undefined;

  const lineRange = lineNumber
    ? limit
      ? `L${lineNumber}-${lineNumber + limit}`
      : `L${lineNumber}`
    : '';

  const desc = lineRange ? `${filePath} ${lineRange}` : filePath;

  return (
    <ToolOutput
      id={toolUse.id}
      toolName="Read"
      description={desc}
      status={toolUse.status}
      error={error}
      requestId={toolUse.requestId}
      approvalMethod={toolUse.approvalMethod}
      onApprove={onApprove}
      onDeny={onDeny}
      onRevoke={onRevoke}
      images={toolUse.result?.images}
      isFromHistory={isFromHistory}
      icon={
        <span className="flex-shrink-0 text-muted-foreground">
          <FileIcon />
        </span>
      }
      actions={
        duration ? (
          <span className="flex-shrink-0 text-[9px] text-muted-foreground">
            {formatDuration(duration)}
          </span>
        ) : undefined
      }
    >
      <div data-slot="read-tool-content" data-testid={`read-tool-${messageId}`}>
        {/* File path header */}
        <div className="flex items-center gap-2 bg-surface-sunken px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
          <span className="truncate">{filePath}</span>
          {lineRange && <span>{lineRange}</span>}
        </div>

        {/* File content */}
        {output && (
          <pre className="max-h-[300px] overflow-auto bg-surface-sunken p-3 text-xs text-foreground-secondary">
            {output}
          </pre>
        )}
      </div>
    </ToolOutput>
  );
}
