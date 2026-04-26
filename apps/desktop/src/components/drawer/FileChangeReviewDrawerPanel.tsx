/**
 * FileChangeReviewDrawerPanel — Dedicated file change review view for the drawer.
 *
 * @ai-context
 * - NOT a wrapper around the inline FileChangeReviewPanel — this is a purpose-built
 *   drawer view that takes advantage of the larger space
 * - Scoped to the active group (last contiguous run of Edit/Write with pending changes)
 * - Each change expanded by default (room for diffs)
 * - Vim-style keyboard navigation via useKeyboardNavigation
 * - Uses DrawerContainer for header/close
 * - Bridges to the active chat store via ActiveChatStoreContext
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  ChatProvider,
  FileChangeReviewProvider,
  useFileChanges,
  useActiveFileChangeGroupToolIds,
  ChangeItem,
  useKeyboardNavigation,
  DiffModeToggle,
} from '@vienna/chat-ui';
import type { ChangeItemAction, PendingChange } from '@vienna/chat-ui';

import { DrawerContainer } from '../../lib/drawer/DrawerContainer';
import { useDrawerActions } from '../../lib/drawer';
import { useActiveChatStore, useActiveChatCallbacks } from '../../providers/ActiveChatStoreContext';
import { fileEditorTab } from './content';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupByDirectory(changes: PendingChange[]): { directory: string; changes: PendingChange[] }[] {
  const groups = new Map<string, PendingChange[]>();
  for (const change of changes) {
    const dir = change.directory;
    if (!groups.has(dir)) groups.set(dir, []);
    groups.get(dir)!.push(change);
  }
  return Array.from(groups.entries()).map(([directory, changes]) => ({
    directory,
    changes,
  }));
}

// ─── Inner component (needs ChatProvider) ─────────────────────────────────────

function FileChangeReviewDrawerContent() {
  const { changes: allChanges } = useFileChanges();
  const callbacks = useActiveChatCallbacks();
  const { openTab } = useDrawerActions();

  const handleOpenInEditor = useCallback(
    (filePath: string) => openTab(fileEditorTab(filePath)),
    [openTab],
  );

  // Find the active group (last group with pending changes) and scope to it
  const pendingToolIds = useMemo(
    () => new Set(allChanges.filter((c) => !c.status).map((c) => c.toolId)),
    [allChanges]
  );
  const activeGroupToolIds = useActiveFileChangeGroupToolIds(pendingToolIds);
  const changes = useMemo(
    () => (activeGroupToolIds ? allChanges.filter((c) => activeGroupToolIds.has(c.toolId)) : allChanges),
    [allChanges, activeGroupToolIds]
  );
  const pendingCount = useMemo(
    () => changes.filter((c) => !c.status).length,
    [changes]
  );
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const approve = callbacks?.approvePermission;
  const deny = callbacks?.denyPermission;

  // Optimistic action states
  const [actionStates, setActionStates] = useState<Map<string, ChangeItemAction>>(new Map());

  useEffect(() => {
    setActionStates((prev) => {
      let changed = false;
      const next = new Map(prev);
      for (const change of changes) {
        if (change.status && next.has(change.requestId)) {
          next.delete(change.requestId);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [changes]);

  const getAction = useCallback(
    (change: PendingChange): ChangeItemAction | undefined => {
      const status = change.status;
      if (status === 'approved' || status === 'denied') return status;
      return actionStates.get(change.requestId);
    },
    [actionStates]
  );

  const pendingChanges = useMemo(
    () => changes.filter((c) => !getAction(c)),
    [changes, getAction]
  );

  const handleApprove = useCallback(
    (requestId: string) => {
      setActionStates((prev) => new Map(prev).set(requestId, 'approved'));
      approve?.(requestId, 'once');
    },
    [approve]
  );

  const handleDeny = useCallback(
    (requestId: string) => {
      setActionStates((prev) => new Map(prev).set(requestId, 'denied'));
      deny?.(requestId);
    },
    [deny]
  );

  const handleApproveAll = useCallback(() => {
    setActionStates((prev) => {
      const next = new Map(prev);
      for (const c of pendingChanges) next.set(c.requestId, 'approved');
      return next;
    });
    for (const c of pendingChanges) {
      approve?.(c.requestId, 'once');
    }
  }, [pendingChanges, approve]);

  const handleDenyAll = useCallback(() => {
    setActionStates((prev) => {
      const next = new Map(prev);
      for (const c of pendingChanges) next.set(c.requestId, 'denied');
      return next;
    });
    for (const c of pendingChanges) {
      deny?.(c.requestId);
    }
  }, [pendingChanges, deny]);

  // Keyboard navigation — all changes start expanded in drawer (GitHub-style)
  // Override deny shortcut to exclude Escape (Escape closes the drawer instead)
  const { focusedId, expandedIds, setFocusedId, toggleExpanded } = useKeyboardNavigation({
    changes: pendingChanges,
    enabled: pendingCount > 0,
    onApprove: handleApprove,
    onDeny: handleDeny,
    onApproveAll: handleApproveAll,
    initialExpandAll: true,
    shortcuts: { deny: ['d'] },
  });

  // Focus the first pending change on mount
  const initialFocusDone = useRef(false);
  useEffect(() => {
    if (!initialFocusDone.current && pendingChanges.length > 0) {
      setFocusedId(pendingChanges[0]!.requestId);
      initialFocusDone.current = true;
    }
  }, [pendingChanges, setFocusedId]);

  // Track expanded state for actioned items separately
  const [actionedExpandedIds, setActionedExpandedIds] = useState<Set<string>>(new Set());
  const toggleActionedExpanded = useCallback((requestId: string) => {
    setActionedExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(requestId)) next.delete(requestId);
      else next.add(requestId);
      return next;
    });
  }, []);

  // Auto-scroll to focused item
  useEffect(() => {
    if (focusedId && scrollContainerRef.current) {
      const el = itemRefs.current.get(focusedId);
      if (el) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [focusedId]);

  const groups = useMemo(() => groupByDirectory(changes), [changes]);
  if (changes.length === 0) {
    return (
      <DrawerContainer title="File Changes" hideRefresh>
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          No file changes to review.
        </div>
      </DrawerContainer>
    );
  }

  const headerActions = (
    <div className="flex items-center gap-1">
      <DiffModeToggle />
      {pendingChanges.length > 0 && (
        <>
          <button
            type="button"
            onClick={handleDenyAll}
            className="px-2 py-1 text-[10px] font-medium rounded text-muted-foreground/70 hover:text-error hover:bg-surface-error/5 cursor-pointer transition-colors duration-100"
          >
            Reject All
          </button>
          <button
            type="button"
            onClick={handleApproveAll}
            className="px-2 py-1 text-[10px] font-medium rounded bg-surface-ai/80 text-ai hover:bg-surface-ai cursor-pointer transition-colors duration-100"
          >
            Approve All
          </button>
        </>
      )}
    </div>
  );

  return (
    <DrawerContainer
      title="File Changes"
      hideRefresh
      headerActions={headerActions}
      contentClassName="p-0"
    >
      <div ref={scrollContainerRef} className="h-full">
        {groups.map((group) => (
          <div key={group.directory}>
            {groups.length > 1 && (
              <div className="px-3 py-1.5 bg-surface-sunken/50 text-[10px] text-muted-foreground font-mono tracking-wide uppercase sticky top-0 z-10 border-b border-border-muted/30">
                {group.directory}
              </div>
            )}
            {group.changes.map((change) => {
              const action = getAction(change);
              const isPending = !action;
              const isExpanded = isPending
                ? expandedIds.has(change.requestId)
                : actionedExpandedIds.has(change.requestId);
              return (
                <ChangeItem
                  key={change.requestId}
                  change={change}
                  focused={isPending && focusedId === change.requestId}
                  expanded={isExpanded}
                  action={action}
                  onClick={() => isPending && setFocusedId(change.requestId)}
                  onToggleExpand={() =>
                    isPending
                      ? toggleExpanded(change.requestId)
                      : toggleActionedExpanded(change.requestId)
                  }
                  onApprove={() => handleApprove(change.requestId)}
                  onDeny={() => handleDeny(change.requestId)}
                  onOpenInEditor={handleOpenInEditor}
                  itemRef={(el) => {
                    if (el) itemRefs.current.set(change.requestId, el);
                    else itemRefs.current.delete(change.requestId);
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </DrawerContainer>
  );
}

// ─── Outer wrapper (provides ChatProvider bridge) ─────────────────────────────

export function FileChangeReviewDrawerPanel() {
  const store = useActiveChatStore();

  if (!store) {
    return (
      <DrawerContainer title="File Changes" hideRefresh>
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          No active workstream.
        </div>
      </DrawerContainer>
    );
  }

  return (
    <ChatProvider store={store}>
      <FileChangeReviewProvider>
        <FileChangeReviewDrawerContent />
      </FileChangeReviewProvider>
    </ChatProvider>
  );
}
