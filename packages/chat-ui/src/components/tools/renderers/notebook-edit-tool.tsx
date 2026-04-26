/**
 * NotebookEditTool — Renderer for Jupyter notebook cell edits
 *
 * @ai-context
 * - NotebookEdit modifies cells in .ipynb notebooks
 * - Input: { notebook_path, cell_number, new_source, cell_type? }
 * - Shows file path, cell number, and a preview of the new source
 * - data-slot="notebook-edit-tool-content"
 */

import { ToolOutput } from '../tool-output';
import type { ToolRendererProps } from '../registry';

function NotebookIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="2" y="1" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
      <path d="M5 1V13" stroke="currentColor" strokeWidth="1.25" />
      <path d="M7 4H10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M7 6.5H10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M7 9H9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

export function NotebookEditTool({ toolUse, messageId, onApprove, onDeny, onRevoke, isFromHistory }: ToolRendererProps) {
  const notebookPath = (toolUse.input.notebook_path as string) ?? (toolUse.input.file_path as string) ?? '';
  const cellNumber = toolUse.input.cell_number as number | undefined;
  const newSource = (toolUse.input.new_source as string) ?? '';
  const cellType = (toolUse.input.cell_type as string) ?? 'code';
  const error = toolUse.result?.error;
  const isRunning = toolUse.status === 'running';

  const fileName = notebookPath.split('/').pop() ?? notebookPath;
  const cellLabel = cellNumber !== undefined ? `Cell ${cellNumber}` : '';
  const description = [fileName, cellLabel, cellType !== 'code' ? cellType : '']
    .filter(Boolean)
    .join(' · ');

  return (
    <ToolOutput
      id={toolUse.id}
      toolName="NotebookEdit"
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
      icon={
        <span className="flex-shrink-0 text-muted-foreground">
          <NotebookIcon />
        </span>
      }
    >
      <div data-slot="notebook-edit-tool-content" data-testid={`notebook-edit-tool-${messageId}`}>
        {/* File path header */}
        <div className="flex items-center gap-2 border-b border-border-muted bg-surface-sunken px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
          <span className="truncate">{notebookPath}</span>
          {cellNumber !== undefined && (
            <span className="flex-shrink-0 rounded bg-surface-info px-1.5 py-0.5 text-info">
              Cell {cellNumber}
            </span>
          )}
        </div>

        {/* Source preview */}
        {newSource && !isRunning && (
          <pre className="max-h-[200px] overflow-auto px-3 py-2 font-mono text-xs text-foreground-secondary whitespace-pre-wrap break-words">
            {newSource}
          </pre>
        )}

        {isRunning && (
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground">
            Editing notebook...
          </div>
        )}
      </div>
    </ToolOutput>
  );
}
