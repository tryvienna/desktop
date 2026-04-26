/**
 * FileChangeActionBar — Approval bar for pending Edit/Write file changes
 *
 * @ai-context
 * - Replaces the chat input area when Edit/Write tools need approval
 * - Takes priority over PermissionActionBar when file changes are pending
 * - Buttons: Approve (current), Approve All, All in Session, Deny, Review
 * - "Review" opens the diff panel in the drawer for comprehensive review
 * - No "Approve Permanently" — file changes are too sensitive for blanket permanent
 * - Keyboard shortcuts: a=Approve, A=Approve All, s=Session, n=Deny, r=Review
 * - Same container shape as ChatInput for seamless AnimatePresence morph
 * - data-slot="file-change-action-bar"
 *
 * @example
 * <FileChangeActionBar
 *   pendingCount={3}
 *   currentFilePath="/src/app.tsx"
 *   onApprove={fn}
 *   onApproveAll={fn}
 *   onApproveAllForSession={fn}
 *   onDeny={fn}
 *   onReview={fn}
 * />
 */

import React, { memo, useEffect, useMemo } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@tryvienna/ui';
import { createRendererLogger } from '@vienna/logger/renderer';
import { SPRINGS } from '../../tokens';

const logger = createRendererLogger().child({ service: 'FileChangeActionBar' });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FileChangeActionBarProps {
  /** Number of pending (unapproved) file changes */
  pendingCount: number;
  /** File path of the first pending change (shown as context) */
  currentFilePath?: string;
  /** Request ID of the first pending file change */
  currentRequestId?: string;
  /** Approve the first pending file change */
  onApprove: () => void;
  /** Approve all pending file changes at once */
  onApproveAll: () => void;
  /** Approve all pending + auto-approve future Edit/Write for this session */
  onApproveAllForSession: () => void;
  /** Deny the first pending file change */
  onDeny: () => void;
  /** Open the diff review panel in the drawer */
  onReview: () => void;
}

// ---------------------------------------------------------------------------
// File icon
// ---------------------------------------------------------------------------

function FileEditIcon() {
  return (
    <motion.svg width={13} height={13} viewBox="0 0 24 24" fill="none" className="shrink-0">
      <motion.path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        animate={{ strokeOpacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.path
        d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />
    </motion.svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const FileChangeActionBar = memo(function FileChangeActionBar({
  pendingCount,
  currentFilePath,
  currentRequestId,
  onApprove,
  onApproveAll,
  onApproveAllForSession,
  onDeny,
  onReview,
}: FileChangeActionBarProps) {
  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      )
        return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      logger.debug('Key event', { key: e.key, shiftKey: e.shiftKey, code: e.code });

      switch (e.key) {
        case 'a':
          e.preventDefault();
          // Shift+a = approve all (event.key may be 'a' or 'A' depending on platform)
          if (e.shiftKey) {
            logger.info('Shift+A shortcut matched (via case a)', { key: e.key, shiftKey: e.shiftKey });
            onApproveAll();
          } else {
            logger.info('Approve single (a key)');
            onApprove();
          }
          break;
        case 'A':
          e.preventDefault();
          logger.info('Shift+A shortcut matched (via case A)', { key: e.key, shiftKey: e.shiftKey });
          onApproveAll();
          break;
        case 'Enter':
          e.preventDefault();
          onApprove();
          break;
        case 's':
          e.preventDefault();
          onApproveAllForSession();
          break;
        case 'n':
          e.preventDefault();
          onDeny();
          break;
        case 'r':
          e.preventDefault();
          onReview();
          break;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onApprove, onApproveAll, onApproveAllForSession, onDeny, onReview]);

  const fileName = currentFilePath ? currentFilePath.split('/').pop() : undefined;

  // Truncate the directory portion for display
  const displayPath = useMemo(() => {
    if (!currentFilePath) return undefined;
    const parts = currentFilePath.split('/');
    if (parts.length <= 3) return currentFilePath;
    return '.../' + parts.slice(-3).join('/');
  }, [currentFilePath]);

  return (
    <div
      data-slot="file-change-action-bar"
      className={cn(
        'flex flex-col justify-between',
        'p-3 border border-border-default rounded-xl bg-surface-page',
        'transition-[border-color] duration-150 ease-linear',
        'min-h-[92px] box-border'
      )}
    >
      {/* Top: File icon + summary + Review button */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentRequestId ?? 'pending'}
          variants={{
            enter: { x: 10, opacity: 0 },
            center: { x: 0, opacity: 1 },
            exit: { x: -10, opacity: 0 },
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={SPRINGS.SNAPPY}
          className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden"
        >
          <span className="text-ai flex shrink-0">
            <FileEditIcon />
          </span>

          <span className="text-sm font-medium text-foreground whitespace-nowrap shrink-0">
            {pendingCount === 1
              ? '1 file change'
              : `${pendingCount} file changes`}
          </span>

          {fileName && (
            <span
              className="text-xs text-muted-foreground font-mono overflow-hidden text-ellipsis whitespace-nowrap min-w-0"
              title={currentFilePath}
            >
              {displayPath}
            </span>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Review button — opens drawer */}
          <Pill onClick={onReview} kind="review">
            <Kbd>r</Kbd>Review
          </Pill>
        </motion.div>
      </AnimatePresence>

      {/* Bottom: Approve / Approve All / Session / Deny */}
      <div className="flex items-center gap-1 h-8 shrink-0">
        <Pill onClick={onApprove} kind="allow">
          <Kbd light>a</Kbd>Approve
        </Pill>
        {pendingCount > 1 && (
          <Pill onClick={onApproveAll} kind="subtle">
            <Kbd>A</Kbd>Approve All
          </Pill>
        )}
        <Pill onClick={onApproveAllForSession} kind="subtle">
          <Kbd>s</Kbd>Session
        </Pill>

        {/* Spacer */}
        <div className="flex-1" />

        {pendingCount > 1 && (
          <span className="text-[10px] font-mono text-disabled whitespace-nowrap">
            {pendingCount} pending
          </span>
        )}

        <Pill onClick={onDeny} kind="deny">
          <Kbd>n</Kbd>Deny
        </Pill>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Kbd
// ---------------------------------------------------------------------------

function Kbd({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center',
        'w-4 h-4 text-[10px] font-mono font-medium',
        'text-inherit leading-none rounded',
        light ? 'opacity-70 bg-white/25' : 'opacity-50 bg-surface-sunken'
      )}
    >
      {children}
    </kbd>
  );
}

// ---------------------------------------------------------------------------
// Pill
// ---------------------------------------------------------------------------

type PillKind = 'allow' | 'subtle' | 'deny' | 'review';

const pillStyles: Record<PillKind, { base: string; hover: string }> = {
  allow: {
    base: 'bg-ai text-white border-transparent',
    hover: 'hover:bg-ai-hover',
  },
  subtle: {
    base: 'bg-transparent text-foreground-secondary border border-border-muted',
    hover: 'hover:bg-surface-hover',
  },
  deny: {
    base: 'bg-surface-error text-error border-transparent',
    hover: 'hover:bg-danger hover:text-white',
  },
  review: {
    base: 'bg-transparent text-foreground-secondary border border-border-muted',
    hover: 'hover:bg-surface-hover hover:text-foreground',
  },
};

function Pill({
  children,
  onClick,
  kind,
}: {
  children: React.ReactNode;
  onClick: () => void;
  kind: PillKind;
}) {
  const s = pillStyles[kind];

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      transition={SPRINGS.SNAPPY}
      className={cn(
        'inline-flex items-center gap-1 shrink-0',
        'px-2 py-0.5 h-7',
        'text-xs font-medium font-inherit',
        'rounded-md cursor-pointer whitespace-nowrap leading-none',
        'transition-colors duration-100 ease-linear',
        s.base,
        s.hover
      )}
    >
      {children}
    </motion.button>
  );
}
