/**
 * ResolvedThemeContext — Provides the resolved theme ('dark' | 'light') to the
 * component tree. Resolves 'system' by listening to OS preference changes.
 *
 * Used by PluginDataProvider sites to pass the resolved theme to plugins.
 */

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@vienna/graphql/client';
import { GET_SETTINGS } from '@vienna/graphql/client';
import type { ResolvedTheme } from '@tryvienna/sdk';

const ResolvedThemeContext = createContext<ResolvedTheme>('light');

export function ResolvedThemeProvider({ children }: { children: ReactNode }) {
  const { data } = useQuery(GET_SETTINGS);
  const theme = data?.settings?.appearance?.theme ?? 'system';

  const [osDark, setOsDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setOsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const resolvedTheme: ResolvedTheme = theme === 'system' ? (osDark ? 'dark' : 'light') : (theme as ResolvedTheme);

  return (
    <ResolvedThemeContext.Provider value={resolvedTheme}>
      {children}
    </ResolvedThemeContext.Provider>
  );
}

export function useResolvedTheme(): ResolvedTheme {
  return useContext(ResolvedThemeContext);
}
