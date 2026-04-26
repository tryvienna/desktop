/**
 * MCPTool — Generic fallback renderer for MCP tools
 *
 * @ai-context
 * - Catches mcp__-prefixed tools at low priority
 * - Server badge, collapsible parameters, result display
 * - Known labels for vienna-entities methods
 * - data-slot="mcp-tool-content"
 */

import { ToolOutput } from '../tool-output';
import type { ToolRendererProps } from '../registry';

function MCPIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="4" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="10" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.25" />
      <path d="M5.5 7H8.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

const ENTITY_TOOL_LABELS: Record<string, string> = {
  entity_get: 'Get Entity Details',
  entity_list: 'List Entities',
  entity_search: 'Search Entities',
  entity_types: 'Discover Entity Types',
  graphql_operations: 'Discover GraphQL Operations',
  graphql_execute: 'Execute GraphQL',
  update_feed: 'Update Feed',
};

function extractServer(toolName: string): string | null {
  const match = toolName.match(/^mcp__([^_]+)__/);
  return match ? match[1] : null;
}

function formatMethod(toolName: string): string {
  const match = toolName.match(/^mcp__[^_]+__(.+)$/);
  const method = match ? match[1] : toolName;
  // Check for known vienna-entities labels
  if (ENTITY_TOOL_LABELS[method]) return ENTITY_TOOL_LABELS[method];
  return method.replace(/_/g, ' ');
}

export function MCPTool({ toolUse, messageId, onApprove, onDeny, onRevoke, isFromHistory }: ToolRendererProps) {
  const server = extractServer(toolUse.name);
  const method = formatMethod(toolUse.name);
  const output = toolUse.result?.output ?? '';
  const error = toolUse.result?.error;
  const input = toolUse.input;
  const duration = toolUse.result?.durationMs as number | undefined;

  const hasParams = Object.keys(input).length > 0;
  const badgeColor = 'var(--text-ai)';

  return (
    <ToolOutput
      id={toolUse.id}
      toolName={server ?? 'MCP'}
      description={method}
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
          <MCPIcon />
        </span>
      }
      actions={
        <>
          {server && (
            <span
              className="flex-shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium"
              style={{
                color: badgeColor,
                backgroundColor: `color-mix(in srgb, ${badgeColor} 15%, transparent)`,
              }}
            >
              {server}
            </span>
          )}
          {duration && (
            <span className="flex-shrink-0 text-[9px] text-muted-foreground">
              {duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(1)}s`}
            </span>
          )}
        </>
      }
    >
      <div data-slot="mcp-tool-content" data-testid={`mcp-tool-${messageId}`}>
        {/* Server + method header */}
        <div className="flex items-center gap-2 border-b border-border-muted bg-surface-sunken px-3 py-1.5 text-[10px]">
          <span className="text-muted-foreground">{method}</span>
        </div>

        {/* Collapsible parameters */}
        {hasParams && (
          <details className="border-b border-border-muted">
            <summary className="flex cursor-pointer select-none items-center gap-1 px-3 py-1.5 text-[10px] text-muted-foreground hover:text-foreground-secondary">
              Parameters
            </summary>
            <pre className="m-0 max-h-[150px] overflow-auto rounded bg-surface-sunken px-3 pb-3 font-mono text-[10px] leading-relaxed text-foreground-secondary">
              {JSON.stringify(input, null, 2)}
            </pre>
          </details>
        )}

        {/* Result */}
        {output && (
          <div className="p-3">
            <div className="mb-1.5 text-[10px] text-muted-foreground">Result:</div>
            <pre className="max-h-[300px] overflow-auto rounded bg-surface-sunken p-2 font-mono text-xs text-foreground">
              {output}
            </pre>
          </div>
        )}

        {/* Running state */}
        {toolUse.status === 'running' && !output && (
          <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
            Executing...
          </div>
        )}
      </div>
    </ToolOutput>
  );
}
