/**
 * WebSearchTool — Renderer for web search results
 *
 * @ai-context
 * - Query header, result links with domain and snippets
 * - Result count badge, "Show N more" truncation
 * - Searching indicator while running
 * - data-slot="web-search-tool-content"
 */

import { useState } from 'react';

import { ToolOutput } from '../tool-output';
import type { ToolRendererProps } from '../registry';

const MAX_VISIBLE = 5;

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.25" />
      <path d="M9 9L12 12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

export function WebSearchTool({ toolUse, messageId, onApprove, onDeny, onRevoke, isFromHistory }: ToolRendererProps) {
  const query = (toolUse.input.query as string) ?? '';
  const output = toolUse.result?.output ?? '';
  const error = toolUse.result?.error;

  const lines = output ? output.split('\n').filter(Boolean) : [];
  const [showAll, setShowAll] = useState(false);
  const truncated = !showAll && lines.length > MAX_VISIBLE;
  const visible = truncated ? lines.slice(0, MAX_VISIBLE) : lines;

  return (
    <ToolOutput
      id={toolUse.id}
      toolName="WebSearch"
      description={query}
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
          <SearchIcon />
        </span>
      }
      actions={
        lines.length > 0 ? (
          <span className="flex-shrink-0 text-[9px] text-muted-foreground">
            {lines.length} result{lines.length !== 1 ? 's' : ''}
          </span>
        ) : undefined
      }
    >
      <div data-slot="web-search-tool-content" data-testid={`websearch-tool-${messageId}`}>
        {/* Query header */}
        <div className="flex items-center gap-2 border-b border-border-muted bg-surface-sunken px-3 py-1.5">
          <span className="text-[10px] text-muted-foreground">Query:</span>
          <span className="flex-1 truncate text-[10px] font-medium text-foreground">{query}</span>
        </div>

        {/* Results */}
        <div className="divide-y divide-border-muted">
          {visible.map((line, i) => (
            <div key={i} className="group px-3 py-2 transition-colors hover:bg-surface-hover">
              <div className="truncate text-xs font-medium text-info group-hover:underline">
                {line}
              </div>
            </div>
          ))}
        </div>

        {/* Show more */}
        {truncated && (
          <button
            className="w-full border-t border-border-muted px-3 py-2 text-center text-[10px] text-info transition-colors hover:bg-surface-hover hover:text-foreground"
            onClick={() => setShowAll(true)}
          >
            Show {lines.length - MAX_VISIBLE} more results
          </button>
        )}

        {/* Running state */}
        {toolUse.status === 'running' && lines.length === 0 && (
          <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
            Searching...
          </div>
        )}

        {/* No results */}
        {toolUse.status !== 'running' && lines.length === 0 && !error && (
          <div className="p-3 text-center text-xs text-muted-foreground">No results found</div>
        )}
      </div>
    </ToolOutput>
  );
}
