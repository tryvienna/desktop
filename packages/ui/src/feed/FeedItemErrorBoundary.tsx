/**
 * FeedItemErrorBoundary — Per-item error boundary for feed cards.
 *
 * Catches React render errors from individual feed items so that a single
 * broken card never crashes the entire feed. Shows a compact fallback with
 * retry, expandable error details, and a copy button.
 *
 * Accepts an optional `renderActions` prop for context-specific actions
 * (e.g., "Ask Vienna to fix" for locally-loaded plugins).
 */

import { Component, useState, useCallback } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Called when the boundary catches a render error. */
  onError?: (error: Error) => void;
  /** Render additional action buttons in the error fallback. */
  renderActions?: (error: Error) => ReactNode;
}

interface State {
  error: Error | null;
}

export class FeedItemErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    this.props.onError?.(error);
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <FeedItemErrorFallback
          error={this.state.error}
          onRetry={this.handleRetry}
          renderActions={this.props.renderActions}
        />
      );
    }
    return this.props.children;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback UI (functional component for hooks)
// ─────────────────────────────────────────────────────────────────────────────

function FeedItemErrorFallback({
  error,
  onRetry,
  renderActions,
}: {
  error: Error;
  onRetry: () => void;
  renderActions?: (error: Error) => ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const errorText = `${error.name}: ${error.message}${error.stack ? `\n\n${error.stack}` : ''}`;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(errorText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [errorText]);

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <svg
            className="h-4 w-4 shrink-0 text-destructive/70"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="8" cy="8" r="6.5" />
            <path d="M8 5.5v3" />
            <circle cx="8" cy="11" r="0.5" fill="currentColor" stroke="none" />
          </svg>
          <span>This card couldn&apos;t load</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {expanded ? 'Hide details' : 'Details'}
          </button>
          <button
            onClick={onRetry}
            className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Retry
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2">
          <pre className="max-h-48 overflow-auto rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            {errorText}
          </pre>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopy}
              className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {copied ? 'Copied!' : 'Copy error'}
            </button>
            {renderActions?.(error)}
          </div>
        </div>
      )}
    </div>
  );
}
