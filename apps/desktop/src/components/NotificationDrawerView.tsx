/**
 * NotificationDrawerView — Connected view for the floating notification drawer.
 *
 * Fetches unread inbox items via GraphQL, listens for IPC signals to refetch,
 * and renders floating notification cards.
 *
 * Action execution: opens the main Vienna window (where the form bar lives)
 * and delegates to the IPC action system there.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  useQuery,
  useMutation,
  MARK_INBOX_ITEM_READ,
  GET_INBOX_ITEMS,
} from '@vienna/graphql/client';
import { getApi } from '@vienna/ipc/renderer';
import { api } from '../ipc';
import type { InboxItem } from './inbox-utils';
import { getNotificationDrawerApi } from './inbox-utils';
import { NotificationDrawer } from './notification-drawer-presentational';

export function NotificationDrawerView() {
  const drawerApi = useMemo(() => getNotificationDrawerApi(), []);
  const ipc = useMemo(() => getApi(api), []);

  const { data, refetch } = useQuery(GET_INBOX_ITEMS, {
    variables: { includeRead: false, includeArchived: false, limit: 50 },
    fetchPolicy: 'cache-and-network',
    pollInterval: 10_000,
  });

  useEffect(() => {
    const cleanups: Array<() => void> = [];
    if (drawerApi) {
      cleanups.push(drawerApi.onShow(() => void refetch()));
      cleanups.push(drawerApi.onInboxChanged(() => void refetch()));
    }
    return () => cleanups.forEach((fn) => fn());
  }, [drawerApi, refetch]);

  const [markReadMut] = useMutation(MARK_INBOX_ITEM_READ);

  const allItems = useMemo<InboxItem[]>(() => {
    const raw = data?.inboxItems;
    if (!raw) return [];
    return raw
      .filter((item: unknown): item is NonNullable<typeof item> => item != null)
      .map((item: Record<string, unknown>) => ({
        ...item,
        actions: (item['actions'] as InboxItem['actions']) ?? [],
      }) as InboxItem);
  }, [data]);

  const dismissedRef = useRef<Set<string>>(new Set());

  const visibleItems = useMemo(
    () => allItems.filter((i) => !dismissedRef.current.has(i.id)),
    [allItems],
  );

  const prevHasContentRef = useRef(visibleItems.length > 0);
  useEffect(() => {
    const hasContent = visibleItems.length > 0;
    if (prevHasContentRef.current && !hasContent) {
      drawerApi?.notifyEmpty();
    }
    prevHasContentRef.current = hasContent;
  }, [visibleItems.length, drawerApi]);

  const handleDismiss = useCallback(
    (id: string) => {
      dismissedRef.current.add(id);
      void markReadMut({ variables: { id }, refetchQueries: 'active' });
    },
    [markReadMut],
  );

  const handleDismissAll = useCallback(() => {
    for (const item of visibleItems) {
      dismissedRef.current.add(item.id);
    }
    drawerApi?.dismissAll();
  }, [visibleItems, drawerApi]);

  const handleOpenVienna = useCallback(() => {
    drawerApi?.openVienna();
  }, [drawerApi]);

  const handleExecuteAction = useCallback(
    (actionId: string, payload: unknown) => {
      // Execute the action via IPC — the main process will show the form
      // in the main window (if visible) or in the floating form overlay
      void ipc.inboxAction.execute({ actionId, payload });
    },
    [ipc],
  );

  return (
    <div className="h-screen w-full overflow-y-auto select-none" style={{ backgroundColor: 'transparent' }}>
      <NotificationDrawer
        items={visibleItems}
        preExistingCount={0}
        onDismiss={handleDismiss}
        onDismissAll={handleDismissAll}
        onDismissSummary={() => {}}
        onOpenVienna={handleOpenVienna}
        onExecuteAction={handleExecuteAction}
      />
    </div>
  );
}
