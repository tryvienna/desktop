/**
 * WriteTool — Renderer for file write/edit operations
 *
 * @ai-context
 * - Handles both Write (full file content) and Edit (old_string → new_string diff)
 * - Edit operations show an inline diff via DiffView (LCS-based, syntax highlighted)
 * - Write operations show the new file content in a scrollable code block
 * - File path displayed in sunken mono header
 * - Shows permission UI via ToolOutput when pending approval, with
 *   showContentWhilePendingPermission so users can review the change before approving
 * - data-slot="write-tool-content"
 */

import { ToolOutput } from '../tool-output';
import { DiffView } from '../bulk-review/diff-view';
import type { ToolRendererProps } from '../registry';

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M10 1.5L12.5 4L4.5 12H2V9.5L10 1.5Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8.5 3L11 5.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

export function WriteTool({ toolUse, messageId, onApprove, onDeny, onRevoke }: ToolRendererProps) {
  const filePath = (toolUse.input.file_path as string) ?? '';
  const error = toolUse.result?.error;
  const isEdit = toolUse.name === 'Edit';
  const oldString = typeof toolUse.input.old_string === 'string' ? toolUse.input.old_string : '';
  const newString = typeof toolUse.input.new_string === 'string' ? toolUse.input.new_string : '';
  const content = typeof toolUse.input.content === 'string' ? toolUse.input.content : '';
  const hasDiff = isEdit && (oldString || newString);
  const hasContent = !isEdit && content;

  return (
    <ToolOutput
      id={toolUse.id}
      toolName={toolUse.name}
      description={filePath}
      status={toolUse.status}
      error={error}
      requestId={toolUse.requestId}
      approvalMethod={toolUse.approvalMethod}
      onApprove={onApprove}
      onDeny={onDeny}
      onRevoke={onRevoke}
      showContentWhilePendingPermission
      icon={
        <span className="flex-shrink-0 text-muted-foreground">
          <EditIcon />
        </span>
      }
    >
      <div data-slot="write-tool-content" data-testid={`write-tool-${messageId}`}>
        {hasDiff ? (
          <DiffView
            oldContent={oldString}
            newContent={newString}
            filePath={filePath}
            maxHeight={400}
          />
        ) : hasContent ? (
          <pre className="max-h-[400px] overflow-auto bg-surface-sunken p-3 font-mono text-xs text-foreground-secondary">
            {content}
          </pre>
        ) : (
          <div className="bg-surface-sunken px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
            {filePath}
          </div>
        )}
      </div>
    </ToolOutput>
  );
}
