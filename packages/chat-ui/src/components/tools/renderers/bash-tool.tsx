/**
 * BashTool — Renderer for Bash command execution
 *
 * @ai-context
 * - Command display with $ prefix, output in sunken bg
 * - Duration badge, running indicator
 * - data-slot="bash-tool-content"
 */

import { ToolOutput } from '../tool-output';
import type { ToolRendererProps } from '../registry';

function TerminalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M3 4.5L6 7L3 9.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M7 10H11" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function BashTool({ toolUse, messageId, onApprove, onDeny, onRevoke, isFromHistory }: ToolRendererProps) {
  const command = (toolUse.input.command as string) ?? '';
  const description = (toolUse.input.description as string) ?? command.slice(0, 60);
  const output = toolUse.result?.output ?? '';
  const error = toolUse.result?.error;
  const duration = toolUse.result?.durationMs as number | undefined;
  const bgTask = toolUse.backgroundTask;

  return (
    <ToolOutput
      id={toolUse.id}
      toolName="Bash"
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
          <TerminalIcon />
        </span>
      }
      actions={
        <>
          {bgTask && <BackgroundTaskBadge status={bgTask.status} />}
          {duration ? (
            <span className="flex-shrink-0 text-[9px] text-muted-foreground">
              {formatDuration(duration)}
            </span>
          ) : null}
        </>
      }
    >
      <div
        data-slot="bash-tool-content"
        data-testid={`bash-tool-${messageId}`}
        className="relative"
      >
        {/* Command */}
        <div className="border-b border-border-muted bg-surface-sunken px-3 py-2 font-mono text-xs">
          <span className="text-muted-foreground">$ </span>
          <span className="text-foreground">{command}</span>
        </div>

        {/* Output */}
        {output && (
          <pre className="max-h-[300px] overflow-auto bg-surface-sunken p-3 text-xs text-foreground-secondary">
            {output}
          </pre>
        )}

        {/* Running indicator */}
        {toolUse.status === 'running' && !output && (
          <div className="p-3 text-xs italic text-muted-foreground">Running...</div>
        )}

        {/* Background task notification */}
        {bgTask?.summary && bgTask.status !== 'running' && (
          <div
            className={`flex items-center gap-2 border-t border-border-muted px-3 py-2 text-xs ${
              bgTask.status === 'failed' ? 'text-error' : bgTask.status === 'stopped' ? 'text-muted-foreground' : 'text-success'
            }`}
          >
            {bgTask.status === 'failed' ? (
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={2} />
                <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
              </svg>
            ) : bgTask.status === 'stopped' ? (
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                <rect x="6" y="6" width="12" height="12" rx="1" stroke="currentColor" strokeWidth={2} />
              </svg>
            ) : (
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <span className="font-medium">{bgTask.summary}</span>
          </div>
        )}
      </div>
    </ToolOutput>
  );
}

function BackgroundTaskBadge({ status }: { status: 'running' | 'completed' | 'failed' | 'stopped' }) {
  if (status === 'running') {
    return (
      <span className="flex-shrink-0 text-[9px] text-muted-foreground italic">
        bg task running
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="flex-shrink-0 text-[9px] text-error font-medium">
        bg task failed
      </span>
    );
  }
  if (status === 'stopped') {
    return (
      <span className="flex-shrink-0 text-[9px] text-muted-foreground font-medium">
        bg task stopped
      </span>
    );
  }
  return (
    <span className="flex-shrink-0 text-[9px] text-success font-medium">
      bg task done
    </span>
  );
}
