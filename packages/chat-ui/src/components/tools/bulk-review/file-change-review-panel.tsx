/**
 * FileChangeReviewPanel — Bulk review panel for file changes awaiting approval
 *
 * @ai-context
 * - Receives ALL Edit/Write changes (pending + reviewed) via `changes` prop
 * - `changes[].status` is the store-provided source of truth ('approved' | 'denied' | undefined)
 * - `actionStates` Map provides optimistic UI during the brief click→store delay;
 *   it is cleared once the store catches up (change.status becomes set)
 * - Keyboard navigation (vim-style j/k), multi-select, bulk actions
 * - Allow All split button with session/permanent dropdown
 * - Groups changes by directory
 * - Auto-scrolls to focused item
 * - data-slot="file-change-review-panel"
 *
 * @example
 * <FileChangeReviewPanel changes={changes} onApprove={fn} onApproveAll={fn} onDeny={fn} onDenyAll={fn} />
 */

import { memo, useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

import { cn } from '@tryvienna/ui';
import { createRendererLogger } from '@vienna/logger/renderer';

import { SPRINGS } from '../../../tokens';
import { ChangeItem, type ChangeItemAction } from './change-item';
import { useKeyboardNavigation } from './use-keyboard-navigation';
import { DiffModeToggle } from './diff-view';
import type { FileChangeReviewPanelProps, ChangeGroup, PendingChange } from './types';

const logger = createRendererLogger().child({ service: 'FileChangeReviewPanel' });

// ─── Icons ────────────────────────────────────────────────────────────────────

function ShieldIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <motion.svg
      animate={{ rotate: collapsed ? 0 : 180 }}
      transition={SPRINGS.SNAPPY}
      width={12}
      height={12}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6l4 4 4-4" />
    </motion.svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      width={8}
      height={8}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

function SmallShieldIcon() {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 1.5L2.5 3.5v4c0 4 5.5 7 5.5 7s5.5-3 5.5-7v-4L8 1.5z" />
    </svg>
  );
}

function SmallCheckIcon() {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8l4 4 6-8" />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupByDirectory(changes: PendingChange[]): ChangeGroup[] {
  const groups = new Map<string, PendingChange[]>();
  for (const change of changes) {
    const dir = change.directory;
    if (!groups.has(dir)) groups.set(dir, []);
    groups.get(dir)!.push(change);
  }
  return Array.from(groups.entries()).map(([directory, changes]) => ({
    directory,
    changes,
    allSelected: false,
  }));
}

// ─── Component ────────────────────────────────────────────────────────────────

export const FileChangeReviewPanel = memo(function FileChangeReviewPanel({
  changes,
  collapsed = false,
  onCollapseChange,
  keyboardEnabled = true,
  onApprove,
  onApproveAll,
  onDeny,
  onDenyAll,
  onAllowAllForSession,
  onAllowAllPermanently,
  isFromHistory,
  onReviewClick,
  onRevokeRule,
  onOpenInEditor,
}: FileChangeReviewPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Optimistic action states — used only during the brief window between user click
  // and the store updating change.status. Cleared once store catches up.
  const [actionStates, setActionStates] = useState<Map<string, ChangeItemAction>>(new Map());
  const [isAllowDropdownOpen, setIsAllowDropdownOpen] = useState(false);
  const [allowDropdownPos, setAllowDropdownPos] = useState({ top: 0, right: 0 });
  const allowDropdownMenuRef = useRef<HTMLDivElement>(null);
  const [actionedExpandedIds, setActionedExpandedIds] = useState<Set<string>>(new Set());

  // Clear optimistic entries once the store has caught up (change.status is set)
  useEffect(() => {
    setActionStates((prev) => {
      let changed = false;
      const cleared: string[] = [];
      const next = new Map(prev);
      for (const change of changes) {
        if (change.status && next.has(change.requestId)) {
          next.delete(change.requestId);
          cleared.push(change.requestId);
          changed = true;
        }
      }
      if (changed) {
        logger.debug('Cleared optimistic states (store caught up)', {
          cleared,
          remainingOptimistic: Array.from(next.keys()),
        });
      }
      return changed ? next : prev;
    });
  }, [changes]);

  // A change is resolved if the store says so OR we have an optimistic action
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
      logger.info('Panel approve', { requestId });
      setActionStates((prev) => new Map(prev).set(requestId, 'approved'));
      // Collapse item after action with a slight delay for animation
      setTimeout(() => {
        setActionedExpandedIds((prev) => {
          const next = new Set(prev);
          next.delete(requestId);
          return next;
        });
      }, 300);
      onApprove(requestId);
    },
    [onApprove]
  );

  const handleDeny = useCallback(
    (requestId: string) => {
      logger.info('Panel deny', { requestId });
      setActionStates((prev) => new Map(prev).set(requestId, 'denied'));
      setTimeout(() => {
        setActionedExpandedIds((prev) => {
          const next = new Set(prev);
          next.delete(requestId);
          return next;
        });
      }, 300);
      onDeny(requestId);
    },
    [onDeny]
  );

  const handleApproveAll = useCallback(() => {
    pendingChanges.forEach((change, i) => {
      setTimeout(() => {
        setActionStates((prev) => new Map(prev).set(change.requestId, 'approved'));
      }, i * 30);
    });
    onApproveAll();
  }, [pendingChanges, onApproveAll]);

  const handleDenyAll = useCallback(() => {
    pendingChanges.forEach((change, i) => {
      setTimeout(() => {
        setActionStates((prev) => new Map(prev).set(change.requestId, 'denied'));
      }, i * 30);
    });
    onDenyAll?.();
  }, [pendingChanges, onDenyAll]);

  const handleAllowAllForSession = useCallback(() => {
    pendingChanges.forEach((change, i) => {
      setTimeout(() => {
        setActionStates((prev) => new Map(prev).set(change.requestId, 'approved'));
      }, i * 30);
    });
    onAllowAllForSession?.();
    setIsAllowDropdownOpen(false);
  }, [pendingChanges, onAllowAllForSession]);

  const handleAllowAllPermanently = useCallback(() => {
    pendingChanges.forEach((change, i) => {
      setTimeout(() => {
        setActionStates((prev) => new Map(prev).set(change.requestId, 'approved'));
      }, i * 30);
    });
    onAllowAllPermanently?.();
    setIsAllowDropdownOpen(false);
  }, [pendingChanges, onAllowAllPermanently]);

  // Close dropdown on outside click, scroll, or resize (portal position would be stale)
  useEffect(() => {
    if (!isAllowDropdownOpen) return;
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        (!allowDropdownMenuRef.current || !allowDropdownMenuRef.current.contains(target))
      ) {
        setIsAllowDropdownOpen(false);
      }
    }
    function handleDismiss() {
      setIsAllowDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleDismiss, true);
    window.addEventListener('resize', handleDismiss);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleDismiss, true);
      window.removeEventListener('resize', handleDismiss);
    };
  }, [isAllowDropdownOpen]);

  const { focusedId, expandedIds, setFocusedId, toggleExpanded } = useKeyboardNavigation({
    changes: pendingChanges,
    enabled: keyboardEnabled && !collapsed,
    onApprove: handleApprove,
    onDeny: handleDeny,
    onApproveAll: handleApproveAll,
  });

  // Auto-expand when there's exactly 1 pending change
  const initialAutoExpanded = useRef(false);
  useEffect(() => {
    if (!initialAutoExpanded.current && pendingChanges.length === 1 && pendingChanges[0]) {
      setFocusedId(pendingChanges[0].requestId);
      initialAutoExpanded.current = true;
    }
  }, [pendingChanges, setFocusedId]);

  const groups = useMemo(() => groupByDirectory(changes), [changes]);

  const handleToggleCollapse = () => onCollapseChange?.(!collapsed);

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
      const itemEl = itemRefs.current.get(focusedId);
      if (itemEl) {
        const container = scrollContainerRef.current;
        const containerRect = container.getBoundingClientRect();
        const itemRect = itemEl.getBoundingClientRect();
        if (itemRect.top < containerRect.top) {
          container.scrollTop -= containerRect.top - itemRect.top;
        } else if (itemRect.bottom > containerRect.bottom) {
          container.scrollTop += itemRect.bottom - containerRect.bottom;
        }
      }
    }
  }, [focusedId]);

  if (changes.length === 0) return null;

  return (
    <motion.div
      ref={panelRef}
      tabIndex={-1}
      data-slot="file-change-review-panel"
      data-testid="file-change-review-panel"
      initial={isFromHistory ? false : { opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="rounded-md border border-border-muted/60 bg-surface-page outline-none"
    >
      {/* Header */}
      <div
        data-testid="panel-header"
        className={cn(
          'flex items-center gap-2 px-3 min-h-9',
          'border-b border-border-muted',
          'cursor-pointer hover:bg-surface-hover/30',
          'transition-colors duration-100'
        )}
        onClick={handleToggleCollapse}
      >
        <span className="text-muted-foreground">
          <ShieldIcon />
        </span>

        <span className="flex-1 text-xs text-foreground-secondary">
          {pendingChanges.length > 0 ? (
            <>
              {pendingChanges.length} pending
              {changes.length > pendingChanges.length && (
                <span className="text-muted-foreground/60">
                  {' '}
                  &middot; {changes.length - pendingChanges.length} reviewed
                </span>
              )}
            </>
          ) : (
            <span className="text-success">All reviewed</span>
          )}
        </span>

        <DiffModeToggle />

        {/* Action buttons */}
        {pendingChanges.length > 0 && (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {onReviewClick && (
              <button
                type="button"
                onClick={onReviewClick}
                className="px-2 py-1 text-xs font-medium rounded text-foreground-secondary hover:bg-surface-hover transition-colors duration-100"
              >
                Review
              </button>
            )}

            <button
              type="button"
              onClick={handleDenyAll}
              className="px-2 py-1 text-xs font-medium rounded text-muted-foreground/70 hover:text-error hover:bg-surface-error/5 cursor-pointer transition-colors duration-100"
            >
              Deny All
            </button>

            {/* Allow All split button */}
            <div ref={dropdownRef} className="relative inline-flex">
              <button
                type="button"
                onClick={() => {
                  handleApproveAll();
                  setIsAllowDropdownOpen(false);
                }}
                className="px-2 py-1 text-xs font-medium rounded-l bg-surface-ai/80 text-ai hover:bg-surface-ai cursor-pointer transition-colors duration-100"
              >
                Allow All
              </button>

              {(onAllowAllForSession || onAllowAllPermanently) && (
                <button
                  type="button"
                  onClick={() => {
                    if (!isAllowDropdownOpen) {
                      const rect = dropdownRef.current?.getBoundingClientRect();
                      if (rect) {
                        setAllowDropdownPos({
                          top: rect.bottom + 4,
                          right: window.innerWidth - rect.right,
                        });
                      }
                    }
                    setIsAllowDropdownOpen(!isAllowDropdownOpen);
                  }}
                  className="px-1 py-1 text-xs font-medium rounded-r bg-surface-ai/80 text-ai hover:bg-surface-ai border-l border-l-ai/20 transition-colors duration-100"
                  aria-haspopup="true"
                  aria-expanded={isAllowDropdownOpen}
                >
                  <motion.span
                    animate={{ rotate: isAllowDropdownOpen ? 180 : 0 }}
                    transition={SPRINGS.SNAPPY}
                    className="flex items-center justify-center"
                  >
                    <ChevronDownIcon />
                  </motion.span>
                </button>
              )}

              {isAllowDropdownOpen &&
                createPortal(
                  <AnimatePresence>
                    <motion.div
                      ref={allowDropdownMenuRef}
                      initial={{ opacity: 0, y: -4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.95 }}
                      transition={SPRINGS.SNAPPY}
                      className="fixed z-50 min-w-[160px] bg-surface-elevated border border-border-muted rounded-lg shadow-lg overflow-hidden text-xs"
                      style={{
                        top: allowDropdownPos.top,
                        right: allowDropdownPos.right,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          handleApproveAll();
                          setIsAllowDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-foreground hover:bg-surface-hover transition-colors"
                      >
                        <span className="text-success">
                          <SmallCheckIcon />
                        </span>
                        <span>Allow All Once</span>
                      </button>
                      <div className="h-px bg-border-muted mx-2" />
                      {onAllowAllForSession && (
                        <button
                          type="button"
                          onClick={handleAllowAllForSession}
                          className="w-full flex items-center gap-2 px-3 py-2 text-foreground hover:bg-surface-hover transition-colors"
                        >
                          <span className="text-info">
                            <SmallShieldIcon />
                          </span>
                          <span>Allow All for Session</span>
                        </button>
                      )}
                      {onAllowAllPermanently && (
                        <button
                          type="button"
                          onClick={handleAllowAllPermanently}
                          className="w-full flex items-center gap-2 px-3 py-2 text-foreground hover:bg-surface-hover transition-colors"
                        >
                          <span className="text-ai">
                            <SmallShieldIcon />
                          </span>
                          <span>Allow All Permanently</span>
                        </button>
                      )}
                    </motion.div>
                  </AnimatePresence>,
                  document.body
                )}
            </div>
          </div>
        )}

        <span className="text-muted-foreground">
          <CollapseIcon collapsed={collapsed} />
        </span>
      </div>

      {/* Content */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={isFromHistory ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div ref={scrollContainerRef} className="max-h-[500px] overflow-auto">
              {groups.map((group) => (
                <div key={group.directory}>
                  {groups.length > 1 && (
                    <div className="px-3 py-1 bg-surface-sunken/50 text-[9px] text-muted-foreground font-mono tracking-wide uppercase">
                      {group.directory}
                    </div>
                  )}
                  <AnimatePresence>
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
                          isFromHistory={isFromHistory}
                          onClick={() => isPending && setFocusedId(change.requestId)}
                          onToggleExpand={() =>
                            isPending
                              ? toggleExpanded(change.requestId)
                              : toggleActionedExpanded(change.requestId)
                          }
                          onApprove={() => handleApprove(change.requestId)}
                          onDeny={() => handleDeny(change.requestId)}
                          onRevokeRule={onRevokeRule}
                          onOpenInEditor={onOpenInEditor}
                          itemRef={(el) => {
                            if (el) itemRefs.current.set(change.requestId, el);
                            else itemRefs.current.delete(change.requestId);
                          }}
                        />
                      );
                    })}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
