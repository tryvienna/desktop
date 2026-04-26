/**
 * ShellExecutionWidget — Terminal-style display for user-initiated shell commands (bash mode).
 *
 * @ai-context
 * - Renders command with $ prefix, output in scrollable pre
 * - Shows duration badge and exit code (if non-zero)
 * - Truncates output >10KB with a "Show all" expander to avoid rendering lag
 * - Used in user messages when the user prefixes input with !
 * - data-slot="shell-execution"
 */

import { memo, useState, useCallback } from 'react';

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

const TRUNCATE_THRESHOLD = 10 * 1024; // 10 KB

export interface ShellExecutionWidgetProps {
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
}

export const ShellExecutionWidget = memo(function ShellExecutionWidget({
  command,
  stdout,
  stderr,
  exitCode,
  durationMs,
}: ShellExecutionWidgetProps) {
  const hasError = exitCode !== null && exitCode !== 0;
  const output = stderr && !stdout ? stderr : stdout;
  const hasOutput = output.trim().length > 0;
  const isTruncated = output.length > TRUNCATE_THRESHOLD;
  const [showFull, setShowFull] = useState(false);
  const toggleFull = useCallback(() => setShowFull((v) => !v), []);
  const displayOutput = isTruncated && !showFull ? output.slice(0, TRUNCATE_THRESHOLD) : output;

  return (
    <div
      data-slot="shell-execution"
      className="w-full overflow-hidden rounded-lg border border-border-muted bg-surface-sunken"
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border-muted px-3 py-2">
        <span className="flex-shrink-0 text-muted-foreground">
          <TerminalIcon />
        </span>
        <span className="flex-1 truncate font-mono text-xs text-muted-foreground">
          Shell
        </span>
        {hasError && (
          <span className="flex-shrink-0 rounded bg-error/10 px-1.5 py-0.5 text-[9px] font-medium text-error">
            exit {exitCode}
          </span>
        )}
        <span className="flex-shrink-0 text-[9px] text-muted-foreground">
          {formatDuration(durationMs)}
        </span>
      </div>

      {/* Command */}
      <div className="border-b border-border-muted px-3 py-2 font-mono text-xs">
        <span className="text-muted-foreground">$ </span>
        <span className="text-foreground">{command}</span>
      </div>

      {/* Output */}
      {hasOutput && (
        <div>
          <pre className="max-h-[300px] overflow-auto px-3 py-2 font-mono text-xs text-foreground-secondary">
            {displayOutput}
            {isTruncated && !showFull && '\n…'}
          </pre>
          {isTruncated && (
            <button
              type="button"
              onClick={toggleFull}
              className="w-full border-t border-border-muted px-3 py-1.5 text-left text-[10px] font-medium text-accent hover:bg-surface-hover"
            >
              {showFull ? 'Show less' : `Show all (${(output.length / 1024).toFixed(0)}KB)`}
            </button>
          )}
        </div>
      )}

      {/* stderr shown separately when stdout also exists */}
      {stderr && stdout && stderr.trim().length > 0 && (
        <pre className="max-h-[150px] overflow-auto border-t border-border-muted px-3 py-2 font-mono text-xs text-error/80">
          {stderr}
        </pre>
      )}

      {/* Timeout indicator */}
      {exitCode === null && (
        <div className="border-t border-border-muted px-3 py-2 text-xs italic text-warning">
          Command timed out
        </div>
      )}
    </div>
  );
});
