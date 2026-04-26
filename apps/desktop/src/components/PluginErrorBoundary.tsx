/**
 * PluginErrorBoundary — Catches React render errors from plugin components.
 *
 * Wraps plugin canvas rendering (nav sidebar, drawers, entity drawers)
 * so that a plugin crash never brings down the app.
 *
 * Reset strategy: uses a `resetKey` prop (defaults to pluginId). When the
 * key changes (e.g., bumped by the plugin system version after a hot-reload),
 * the boundary resets and retries rendering.
 */

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import type { PluginError } from '../renderer/contexts/PluginSystemContext';

interface Props {
  pluginId: string;
  /** When this value changes, the boundary resets and retries rendering. */
  resetKey?: string | number;
  /** Fallback UI to render when the plugin crashes. If omitted, renders nothing. */
  fallback?: ReactNode;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  /** The resetKey at the time the error occurred. */
  errorResetKey?: string | number;
}

export class PluginErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    // If the resetKey changed since the error, clear the error state
    if (state.hasError && state.errorResetKey !== undefined && props.resetKey !== state.errorResetKey) {
      return { hasError: false, errorResetKey: undefined };
    }
    return null;
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    const detail: PluginError = {
      pluginId: this.props.pluginId,
      error: error.message,
      phase: 'renderer',
      timestamp: Date.now(),
    };
    // Store the resetKey at error time so we know when it changes
    this.setState({ errorResetKey: this.props.resetKey });
    // eslint-disable-next-line no-restricted-properties
    window.dispatchEvent(new CustomEvent('plugin:error', { detail }));
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
