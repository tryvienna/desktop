/**
 * DiffModeContext — Shared preference for unified vs side-by-side diff view.
 *
 * @ai-context
 * - Persists to localStorage so preference survives across sessions
 * - Shared across all DiffView instances via context
 * - Falls back to 'unified' if no context provider (inline chat usage)
 */

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';

export type DiffMode = 'unified' | 'split';

const STORAGE_KEY = 'vienna-diff-mode';

interface DiffModeContextValue {
  mode: DiffMode;
  toggle: () => void;
}

const DiffModeCtx = createContext<DiffModeContextValue>({
  mode: 'unified',
  toggle: () => {},
});

function readStoredMode(): DiffMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'split') return 'split';
  } catch {}
  return 'unified';
}

export function DiffModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<DiffMode>(readStoredMode);

  const toggle = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'unified' ? 'split' : 'unified';
      try { localStorage.setItem(STORAGE_KEY, next); } catch {}
      return next;
    });
  }, []);

  const value = useMemo(() => ({ mode, toggle }), [mode, toggle]);

  return <DiffModeCtx.Provider value={value}>{children}</DiffModeCtx.Provider>;
}

export function useDiffMode() {
  return useContext(DiffModeCtx);
}
