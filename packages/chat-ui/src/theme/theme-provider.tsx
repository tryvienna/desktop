/**
 * ThemeProvider — Runtime light/dark mode switching with system detection
 *
 * @ai-context
 * - Three modes: 'light' | 'dark' | 'system'
 * - Syncs .dark class on document.documentElement for dark mode
 * - Persists choice to localStorage (configurable key)
 * - forcedMode overrides everything (Storybook/tests)
 * - useTheme() returns { mode, resolved, setMode, toggle }
 * - data-slot="theme-provider"
 *
 * @example
 * <ThemeProvider defaultMode="system">
 *   <App />
 * </ThemeProvider>
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const STORAGE_KEY = 'vienna-theme';

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') return getSystemTheme();
  return mode;
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultMode?: ThemeMode;
  forcedMode?: ResolvedTheme;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultMode = 'system',
  forcedMode,
  storageKey = STORAGE_KEY,
}: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (forcedMode) return forcedMode;
    if (typeof window === 'undefined') return defaultMode;
    return (localStorage.getItem(storageKey) as ThemeMode) ?? defaultMode;
  });

  const resolved = forcedMode ?? resolveTheme(mode);

  const setMode = useCallback(
    (newMode: ThemeMode) => {
      if (forcedMode) return;
      setModeState(newMode);
      localStorage.setItem(storageKey, newMode);
    },
    [forcedMode, storageKey]
  );

  const toggle = useCallback(() => {
    setMode(resolved === 'dark' ? 'light' : 'dark');
  }, [resolved, setMode]);

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (forcedMode || mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setModeState('system'); // force re-render
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode, forcedMode]);

  // Sync .dark class on <html> so @tryvienna/ui CSS selectors work
  useEffect(() => {
    const root = document.documentElement;
    if (resolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [resolved]);

  const value = useMemo(
    () => ({ mode, resolved, setMode, toggle }),
    [mode, resolved, setMode, toggle]
  );

  return (
    <ThemeContext.Provider value={value}>
      <div data-slot="theme-provider">{children}</div>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
