/**
 * ToolSearchTool — Renderer for deferred tool discovery
 *
 * @ai-context
 * - ToolSearch loads deferred tools by keyword or exact name
 * - Input: { query, max_results? }
 * - Output is typically empty (tools are loaded as a side effect)
 * - Compact display: shows the query, "Searching..." while running
 * - data-slot="tool-search-tool-content"
 */

import { ToolOutput } from '../tool-output';
import type { ToolRendererProps } from '../registry';

function PlugIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M5 1.5V4M9 1.5V4M3.5 6.5H10.5M4 4H10C10.5523 4 11 4.44772 11 5V6.5C11 9.26142 8.76142 11.5 6 11.5H8C5.23858 11.5 3 9.26142 3 6.5V5C3 4.44772 3.44772 4 4 4Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M7 11.5V13" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

export function ToolSearchTool({ toolUse, messageId, onApprove, onDeny, onRevoke, isFromHistory }: ToolRendererProps) {
  const query = (toolUse.input.query as string) ?? '';
  const error = toolUse.result?.error;
  const isRunning = toolUse.status === 'running';

  // Parse the query to show a human-friendly description
  const isSelect = query.startsWith('select:');
  const description = isSelect
    ? query.replace('select:', '').split(',').join(', ')
    : query;

  return (
    <ToolOutput
      id={toolUse.id}
      toolName="ToolSearch"
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
          <PlugIcon />
        </span>
      }
    >
      <div data-slot="tool-search-tool-content" data-testid={`tool-search-tool-${messageId}`}>
        <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground">
          {isRunning ? (
            <span>Searching for tools...</span>
          ) : (
            <span className="font-mono text-[10px]">{query}</span>
          )}
        </div>
      </div>
    </ToolOutput>
  );
}
