/**
 * AgentTool — Renderer for Claude Code's Agent (subagent) tool
 *
 * @ai-context
 * - Agent type badge with color, description header
 * - Collapsible prompt, streamed result display
 * - Running indicator, auto-expand on result
 * - data-slot="agent-tool-content"
 */

import { useState, useEffect, useRef } from 'react';

import { ToolOutput } from '../tool-output';
import type { ToolRendererProps } from '../registry';

function AgentIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="5.5" cy="6" r="0.75" fill="currentColor" />
      <circle cx="8.5" cy="6" r="0.75" fill="currentColor" />
      <path
        d="M5.5 8.5C5.5 8.5 6.25 9.5 7 9.5C7.75 9.5 8.5 8.5 8.5 8.5"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

const AGENT_COLORS: Record<string, string> = {
  'general-purpose': 'var(--text-ai)',
  Explore: 'var(--text-info)',
  Plan: 'var(--text-warning)',
  'code-reviewer': 'var(--text-success)',
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function AgentTool({ toolUse, messageId, onApprove, onDeny, isFromHistory }: ToolRendererProps) {
  const description = (toolUse.input.description as string) ?? '';
  const prompt = (toolUse.input.prompt as string) ?? '';
  const subagentType = (toolUse.input.subagent_type as string) ?? '';
  const output = toolUse.result?.output ?? '';
  const error = toolUse.result?.error;
  const duration = toolUse.result?.durationMs as number | undefined;
  const isStreaming = toolUse.status === 'running' && !!output;

  const agentColor = AGENT_COLORS[subagentType] ?? 'var(--text-muted)';

  // Auto-expand when result first arrives
  const [collapsed, setCollapsed] = useState(true);
  const hadResult = useRef(false);
  useEffect(() => {
    if (output && !hadResult.current) {
      hadResult.current = true;
      setCollapsed(false);
    }
  }, [output]);

  return (
    <ToolOutput
      id={toolUse.id}
      toolName="Agent"
      description={description}
      status={toolUse.status}
      error={error}
      requestId={toolUse.requestId}
      approvalMethod={toolUse.approvalMethod}
      onApprove={onApprove}
      onDeny={onDeny}
      images={toolUse.result?.images}
      isFromHistory={isFromHistory}
      collapsed={collapsed}
      onCollapseChange={setCollapsed}
      icon={
        <span className="flex-shrink-0 text-muted-foreground">
          <AgentIcon />
        </span>
      }
      actions={
        <>
          {subagentType && (
            <span
              className="flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
              style={{
                color: agentColor,
                backgroundColor: `color-mix(in srgb, ${agentColor} 15%, transparent)`,
              }}
            >
              {subagentType}
            </span>
          )}
          {duration && (
            <span className="flex-shrink-0 text-[9px] text-muted-foreground">
              {formatDuration(duration)}
            </span>
          )}
        </>
      }
    >
      <div data-slot="agent-tool-content" data-testid={`agent-tool-${messageId}`}>
        {/* Description header */}
        <div className="flex items-center gap-2 border-b border-border-muted bg-surface-sunken px-3 py-1.5">
          <span className="flex-1 truncate text-[10px] text-muted-foreground">{description}</span>
        </div>

        {/* Collapsible prompt */}
        {prompt && toolUse.status !== 'running' && (
          <details className="border-b border-border-muted">
            <summary className="cursor-pointer select-none px-3 py-1.5 text-[10px] text-muted-foreground hover:text-foreground-secondary">
              Show prompt
            </summary>
            <pre className="m-0 max-h-[200px] overflow-auto px-3 pb-3 font-mono text-xs leading-relaxed text-foreground-secondary">
              {prompt}
            </pre>
          </details>
        )}

        {/* Result */}
        {output && (
          <div className="p-3">
            <div className="mb-1.5 text-[10px] text-muted-foreground">
              {isStreaming ? 'Streaming result...' : 'Result:'}
            </div>
            <pre className="max-h-[300px] overflow-auto rounded bg-surface-sunken p-2 text-xs text-foreground">
              {output}
            </pre>
          </div>
        )}

      </div>
    </ToolOutput>
  );
}
