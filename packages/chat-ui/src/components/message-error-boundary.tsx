/**
 * MessageErrorBoundary — Catches React render errors from individual messages
 * so that a crash in one message (e.g. a bad tool renderer input) never brings
 * down the entire chat view or application.
 *
 * Renders an inline error fallback in place of the broken message.
 */

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  messageId: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class MessageErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `[MessageErrorBoundary] Error rendering message ${this.props.messageId}:`,
      error,
      info.componentStack,
    );
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-border-error/30 bg-surface-sunken px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              Failed to render this message
            </span>
            <button
              type="button"
              onClick={this.handleRetry}
              className="rounded px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              Retry
            </button>
          </div>
          {this.state.error && (
            <pre className="mt-1 overflow-auto text-[10px] text-muted-foreground/70">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
