/**
 * ExplorationItemRow — Compact row for a single exploration item
 *
 * @ai-context
 * - Displays a single tool call within ExplorationPanel
 * - Status dot, tool icon, description, expandable content
 * - data-slot="exploration-item-row"
 *
 * @example
 * <ExplorationItemRow item={explorationItem} />
 */

import { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { cn } from '@tryvienna/ui';

import { SPRINGS, TRANSITIONS } from '../../../tokens';
import type { ExplorationItem } from './types';
import type { ToolStatus } from '../../../types/messages';

// ─────────────────────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────────────────────

function ReadIcon() {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function TerminalIcon() {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <motion.svg
      width={10}
      height={10}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      animate={{ rotate: expanded ? 180 : 0 }}
      transition={SPRINGS.SNAPPY}
    >
      <path d="M4 6l4 4 4-4" />
    </motion.svg>
  );
}

const TOOL_ICONS = {
  Read: ReadIcon,
  Glob: SearchIcon,
  Grep: SearchIcon,
  Bash: TerminalIcon,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Status dot
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<ToolStatus, string> = {
  pending: 'bg-ai',
  pending_permission: 'bg-ai',
  running: 'bg-info',
  complete: 'bg-success',
  error: 'bg-error',
};

function StatusDot({ status }: { status: ToolStatus }) {
  const isAnimating = status === 'running' || status === 'pending';
  return (
    <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
      {isAnimating && (
        <span
          className={cn(
            'absolute inline-flex h-full w-full rounded-full opacity-50 animate-ping',
            STATUS_COLORS[status]
          )}
        />
      )}
      <span
        className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', STATUS_COLORS[status])}
      />
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export interface ExplorationItemRowProps {
  item: ExplorationItem;
}

export const ExplorationItemRow = memo(function ExplorationItemRow({
  item,
}: ExplorationItemRowProps) {
  const [expanded, setExpanded] = useState(false);
  const hasContent = !!item.content;

  const handleToggle = useCallback(() => {
    if (hasContent) setExpanded((prev) => !prev);
  }, [hasContent]);

  const Icon = TOOL_ICONS[item.toolName];

  return (
    <div data-slot="exploration-item-row" data-testid="exploration-item-row">
      {/* Row header */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-1 min-h-7',
          'text-xs',
          hasContent && 'cursor-pointer hover:bg-surface-hover/30',
          'transition-colors duration-75'
        )}
        onClick={handleToggle}
      >
        <StatusDot status={item.status} />

        <span className="text-muted-foreground flex-shrink-0">
          <Icon />
        </span>

        <span className="flex-1 min-w-0 truncate text-foreground-secondary font-mono">
          {item.description}
        </span>

        {hasContent && (
          <span className="text-muted-foreground flex-shrink-0">
            <ChevronIcon expanded={expanded} />
          </span>
        )}
      </div>

      {/* Expandable content */}
      <AnimatePresence initial={false}>
        {expanded && hasContent && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: SPRINGS.GENTLE,
              opacity: TRANSITIONS.fade,
            }}
            className="overflow-hidden"
          >
            <pre
              className={cn(
                'mx-3 mb-2 px-2 py-2 rounded',
                'bg-surface-sunken text-[10px] text-foreground-secondary',
                'font-mono whitespace-pre-wrap break-all',
                'max-h-[200px] overflow-auto'
              )}
            >
              {item.content}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
