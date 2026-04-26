/**
 * ExplorationPanel — Groups consecutive read-only tool calls into a collapsible panel
 *
 * @ai-context
 * - Aggregates consecutive Read/Glob/Grep/safe-Bash tools
 * - Auto-collapses when all items complete
 * - Summary text and item count badge in header
 * - data-slot="exploration-panel"
 *
 * @example
 * <ExplorationPanel tools={toolUses} />
 */

import { memo, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { cn } from '@tryvienna/ui';

import { SPRINGS } from '../../../tokens';
import { ExplorationItemRow } from './exploration-item-row';
import { toExplorationItem } from './to-exploration-item';
import { buildExplorationSummary } from './exploration-utils';
import type { ToolUse, ToolStatus } from '../../../types/messages';
import type { ExplorationItem } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────────────────────

function ExploreIcon() {
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
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
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

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derive aggregate status from all items.
 */
function aggregateStatus(items: ExplorationItem[]): ToolStatus {
  let hasRunning = false;
  let hasError = false;
  let hasPending = false;

  for (const item of items) {
    if (item.status === 'running') hasRunning = true;
    else if (item.status === 'error') hasError = true;
    else if (item.status === 'pending' || item.status === 'pending_permission') hasPending = true;
  }

  if (hasRunning) return 'running';
  if (hasError) return 'error';
  if (hasPending) return 'pending';
  return 'complete';
}

const STATUS_HEADER_COLORS: Record<ToolStatus, string> = {
  pending: 'text-ai',
  pending_permission: 'text-ai',
  running: 'text-info',
  complete: 'text-success',
  error: 'text-error',
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export interface ExplorationPanelProps {
  /** Raw ToolUse objects to display */
  tools: ToolUse[];
}

export const ExplorationPanel = memo(function ExplorationPanel({ tools }: ExplorationPanelProps) {
  const items = useMemo(() => tools.map(toExplorationItem), [tools]);
  const status = useMemo(() => aggregateStatus(items), [items]);
  const summary = useMemo(() => buildExplorationSummary(items), [items]);

  // Auto-collapse when all items finish, but respect user's manual toggle
  const [collapsed, setCollapsed] = useState(false);
  const userToggledRef = useRef(false);
  const prevStatusRef = useRef(status);
  useEffect(() => {
    if (prevStatusRef.current !== 'complete' && status === 'complete' && !userToggledRef.current) {
      setCollapsed(true);
    }
    prevStatusRef.current = status;
  }, [status]);

  const handleToggle = useCallback(() => {
    userToggledRef.current = true;
    setCollapsed((prev) => !prev);
  }, []);

  if (items.length === 0) return null;

  return (
    <motion.div
      data-slot="exploration-panel"
      data-testid="exploration-panel"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="rounded-md border border-border-muted/60 bg-surface-page"
    >
      {/* Header */}
      <div
        data-testid="exploration-panel-header"
        className={cn(
          'flex items-center gap-2 px-3 py-2',
          'cursor-pointer hover:bg-surface-hover/30',
          'transition-colors duration-100'
        )}
        onClick={handleToggle}
      >
        <span className={STATUS_HEADER_COLORS[status]}>
          <ExploreIcon />
        </span>

        <span className="flex-1 text-xs text-foreground-secondary">Explored {summary}</span>

        <span className="text-[10px] text-muted-foreground tabular-nums">{items.length}</span>

        <span className="text-muted-foreground">
          <CollapseIcon collapsed={collapsed} />
        </span>
      </div>

      {/* Content */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-border-muted/40 max-h-[320px] overflow-auto">
              {items.map((item) => (
                <ExplorationItemRow key={item.id} item={item} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
