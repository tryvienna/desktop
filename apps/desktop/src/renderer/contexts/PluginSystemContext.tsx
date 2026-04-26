/**
 * PluginSystemContext — Unified context for plugin system in the renderer.
 *
 * Replaces the v1 split of PluginRegistryContext + PluginErrorContext.
 * Provides:
 * - PluginSystem instance (unified registry for plugins, integrations, entities)
 * - Version counter (bumps on plugin change to trigger re-renders)
 * - Plugin error tracking (from main process + renderer-side errors)
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { PluginSystem } from '@tryvienna/sdk';
import { getApi, getEvents } from '@vienna/ipc/renderer';
import { api, events } from '../../ipc';

// ─────────────────────────────────────────────────────────────────────────────
// Plugin Error
// ─────────────────────────────────────────────────────────────────────────────

export interface PluginError {
  pluginId: string;
  error: string;
  phase: 'bundle' | 'evaluate' | 'renderer' | 'dependencies' | 'register';
  timestamp: number;
  missingDependencies?: boolean;
  packageManager?: 'npm' | 'pnpm' | 'yarn' | 'bun';
  pluginDir?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

interface PluginSystemContextValue {
  system: PluginSystem;
  /** Monotonically increasing counter, bumped when any plugin changes. */
  version: number;
  /** Signal that a plugin has been dynamically replaced. */
  notifyPluginChanged: () => void;
  /** All current plugin errors, keyed by pluginId. */
  errors: Map<string, PluginError>;
  /** Dismiss an error (user acknowledged it). */
  dismissError: (pluginId: string) => void;
  /** Dismiss all errors. */
  dismissAllErrors: () => void;
}

const PluginSystemCtx = createContext<PluginSystemContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function PluginSystemProvider({
  system,
  children,
}: {
  system: PluginSystem;
  children: ReactNode;
}) {
  const [version, setVersion] = useState(0);
  const [errors, setErrors] = useState<Map<string, PluginError>>(new Map());

  const notifyPluginChanged = useCallback(() => setVersion((v) => v + 1), []);

  // Fetch startup errors from main process
  useEffect(() => {
    const ipc = getApi(api);
    ipc.plugin.getPluginErrors({}).then(({ errors: existingErrors }) => {
      if (existingErrors.length === 0) return;
      setErrors((prev) => {
        const next = new Map(prev);
        for (const err of existingErrors) {
          next.set(err.pluginId, err);
        }
        return next;
      });
    }).catch(() => {
      // Handler may not be configured
    });
  }, []);

  // Subscribe to main process plugin events
  useEffect(() => {
    const eventSubs = getEvents(events);

    const unsubError = eventSubs.plugin.onPluginError((payload) => {
      setErrors((prev) => {
        const next = new Map(prev);
        next.set(payload.pluginId, {
          pluginId: payload.pluginId,
          error: payload.error,
          phase: payload.phase,
          timestamp: payload.timestamp,
          missingDependencies: payload.missingDependencies,
          packageManager: payload.packageManager,
          pluginDir: payload.pluginDir,
        });
        return next;
      });
    });

    // Listen for renderer-side errors (from DOM events)
    const handleRendererError = (e: Event) => {
      const { pluginId, error, phase, timestamp } = (e as CustomEvent<PluginError>).detail;
      setErrors((prev) => {
        const next = new Map(prev);
        next.set(pluginId, { pluginId, error, phase, timestamp });
        return next;
      });
    };
    // eslint-disable-next-line no-restricted-properties
    window.addEventListener('plugin:error', handleRendererError);

    // Clear error when plugin successfully reloads/unloads
    const unsubChanged = eventSubs.plugin.onPluginChanged(({ pluginId, action }) => {
      if (action === 'loaded' || action === 'reloaded' || action === 'unloaded') {
        setErrors((prev) => {
          if (!prev.has(pluginId)) return prev;
          const next = new Map(prev);
          next.delete(pluginId);
          return next;
        });
      }
    });

    return () => {
      unsubError();
      unsubChanged();
      // eslint-disable-next-line no-restricted-properties
      window.removeEventListener('plugin:error', handleRendererError);
    };
  }, []);

  const dismissError = useCallback((pluginId: string) => {
    setErrors((prev) => {
      if (!prev.has(pluginId)) return prev;
      const next = new Map(prev);
      next.delete(pluginId);
      return next;
    });
  }, []);

  const dismissAllErrors = useCallback(() => {
    setErrors((prev) => (prev.size === 0 ? prev : new Map()));
  }, []);

  const value = useMemo<PluginSystemContextValue>(
    () => ({ system, version, notifyPluginChanged, errors, dismissError, dismissAllErrors }),
    [system, version, notifyPluginChanged, errors, dismissError, dismissAllErrors],
  );

  return (
    <PluginSystemCtx.Provider value={value}>
      {children}
    </PluginSystemCtx.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

/** Access the PluginSystem instance. */
export function usePluginSystem(): PluginSystem {
  const ctx = useContext(PluginSystemCtx);
  if (!ctx) throw new Error('usePluginSystem must be used within PluginSystemProvider');
  return ctx.system;
}

/** Plugin system version counter. Include in deps arrays to re-render on plugin changes. */
export function usePluginSystemVersion(): number {
  const ctx = useContext(PluginSystemCtx);
  if (!ctx) throw new Error('usePluginSystemVersion must be used within PluginSystemProvider');
  return ctx.version;
}

/** Callback that bumps the plugin system version, triggering re-renders. */
export function useNotifyPluginChanged(): () => void {
  const ctx = useContext(PluginSystemCtx);
  if (!ctx) throw new Error('useNotifyPluginChanged must be used within PluginSystemProvider');
  return ctx.notifyPluginChanged;
}

/** Access plugin errors and dismiss functions. */
export function usePluginErrors(): {
  errors: Map<string, PluginError>;
  dismissError: (pluginId: string) => void;
  dismissAllErrors: () => void;
} {
  const ctx = useContext(PluginSystemCtx);
  if (!ctx) throw new Error('usePluginErrors must be used within PluginSystemProvider');
  return { errors: ctx.errors, dismissError: ctx.dismissError, dismissAllErrors: ctx.dismissAllErrors };
}
