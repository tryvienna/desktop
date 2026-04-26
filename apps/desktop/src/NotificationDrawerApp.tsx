/**
 * NotificationDrawerApp — Lightweight React root for the floating notification drawer.
 *
 * Minimal provider tree: Apollo + theme. No router, no workstream context.
 * Rendered in a transparent, frameless Electron window on the right edge.
 */

import { useEffect, useMemo } from 'react';
import { getApi } from '@vienna/ipc/renderer';
import {
  ApolloProvider,
  createApolloClient,
  useQuery,
} from '@vienna/graphql/client';
import { GET_SETTINGS } from '@vienna/graphql/client';
import { api } from './ipc';
import { NotificationDrawerView } from './components/NotificationDrawerView';

function DrawerThemeShell({ children }: { children: React.ReactNode }) {
  const { data } = useQuery(GET_SETTINGS);
  const theme = data?.settings?.appearance?.theme ?? 'system';

  useEffect(() => {
    const resolved =
      theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme;

    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(resolved);
  }, [theme]);

  return <>{children}</>;
}

export function NotificationDrawerApp() {
  const ipc = useMemo(() => getApi(api), []);
  const client = useMemo(() => createApolloClient(ipc.graphql.execute), [ipc]);

  return (
    <ApolloProvider client={client}>
      <DrawerThemeShell>
        <NotificationDrawerView />
      </DrawerThemeShell>
    </ApolloProvider>
  );
}
