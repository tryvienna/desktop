/**
 * ChatErrorBoundary — Catches React render errors from the chat/tool rendering
 * path so that a crash in any tool renderer (or the chat UI itself) never brings
 * down the entire application.
 *
 * Reset strategy: uses the active workstreamId as resetKey. Switching workstreams
 * automatically clears the error and retries rendering.
 */

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { createRendererLogger } from '@vienna/logger/renderer';

const logger = createRendererLogger('ChatErrorBoundary');

interface Props {
  /** When this value changes, the boundary resets and retries rendering. */
  resetKey?: string | null;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  resetKey?: string | null;
}

export class ChatErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (state.hasError && state.resetKey !== undefined && props.resetKey !== state.resetKey) {
      return { hasError: false, error: null, resetKey: undefined };
    }
    return null;
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ resetKey: this.props.resetKey });
    logger.error('Uncaught error in chat view', {
      error: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="text-sm font-medium text-foreground">Something went wrong</div>
          <p className="max-w-md text-xs text-muted-foreground">
            An error occurred while rendering this workstream. You can retry or switch to another workstream.
          </p>
          {this.state.error && (
            <pre className="mt-2 max-w-lg overflow-auto rounded bg-surface-sunken px-3 py-2 text-[11px] text-muted-foreground">
              {this.state.error.message}
            </pre>
          )}
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-2 rounded-md bg-surface-hover px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-active"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
