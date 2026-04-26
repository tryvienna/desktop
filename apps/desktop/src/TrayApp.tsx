/**
 * TrayApp — Lightweight React root for secondary inbox windows.
 *
 * Minimal provider tree: Apollo + theme. No router, no workstream context,
 * no drawer, no command palette. Renders either TrayInboxView (popover)
 * or InboxPanelView (detached panel) based on mode.
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
import { TrayInboxView } from './components/TrayInboxView';
import { InboxPanelView } from './components/InboxPanelView';

// ── Theme shell ────────────────────────────────────────────────────────────

function TrayThemeShell({ children }: { children: React.ReactNode }) {
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

// ── App ────────────────────────────────────────────────────────────────────

export function TrayApp({ mode = 'tray' }: { mode?: string }) {
  const ipc = useMemo(() => getApi(api), []);
  const client = useMemo(() => createApolloClient(ipc.graphql.execute), [ipc]);

  return (
    <ApolloProvider client={client}>
      <TrayThemeShell>
        {mode === 'inbox-panel' ? <InboxPanelView /> : <TrayInboxView />}
      </TrayThemeShell>
    </ApolloProvider>
  );
}
