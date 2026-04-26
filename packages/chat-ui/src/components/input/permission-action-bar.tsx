/**
 * PermissionActionBar — Tool approval bar replacing chat input
 *
 * @ai-context
 * - Replaces the text input when a tool needs user permission
 * - Same container shape as ChatInput for seamless AnimatePresence morph
 * - Keyboard shortcuts: a=Allow, s=Session, p=Permanent, n=Deny
 * - Escape is NOT handled (reserved for drawer close)
 * - Queue slide animation when cycling through multiple pending approvals
 * - Shield icon with breathing animation
 * - data-slot="permission-action-bar"
 *
 * @example
 * <PermissionActionBar current={approval} currentPosition={1} totalCount={3} onApprove={fn} onDeny={fn} />
 */

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import { cn, ConfirmDialog } from '@tryvienna/ui';
import { SPRINGS } from '../../tokens';
import type { PendingApproval } from '../../hooks/use-all-pending-approvals';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PermissionActionBarProps {
  current: PendingApproval;
  currentPosition: number;
  totalCount: number;
  onApprove: (requestId: string, policy: 'once' | 'session' | 'permanent') => void;
  onDeny: (requestId: string) => void;
  onOpenPlanReview?: (toolUseId: string, requestId: string) => void;
}

// ---------------------------------------------------------------------------
// Shield icon -- small version of ToolStatusIcon's ShieldIcon
// ---------------------------------------------------------------------------

function ShieldIcon() {
  return (
    <motion.svg width={13} height={13} viewBox="0 0 24 24" fill="none" className="shrink-0">
      <motion.path
        d="M12 2L4 5.5v5.5c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5.5L12 2z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        animate={{ strokeOpacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.path
        d="M12 8v4M12 15v.5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />
    </motion.svg>
  );
}

// ---------------------------------------------------------------------------
// Queue slide animation
// ---------------------------------------------------------------------------

const slideVariants = {
  enter: { x: 10, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -10, opacity: 0 },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const PermissionActionBar = memo(function PermissionActionBar({
  current,
  currentPosition,
  totalCount,
  onApprove,
  onDeny,
  onOpenPlanReview,
}: PermissionActionBarProps) {
  const lastActedRef = useRef<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleAllow = useCallback(() => {
    if (lastActedRef.current === current.requestId) return;
    lastActedRef.current = current.requestId;
    onApprove(current.requestId, 'once');
  }, [current.requestId, onApprove]);

  const handleSession = useCallback(() => {
    if (lastActedRef.current === current.requestId) return;
    lastActedRef.current = current.requestId;
    onApprove(current.requestId, 'session');
  }, [current.requestId, onApprove]);

  const requestPermanent = useCallback(() => {
    setConfirmOpen(true);
  }, []);

  const confirmPermanent = useCallback(() => {
    if (lastActedRef.current === current.requestId) return;
    lastActedRef.current = current.requestId;
    onApprove(current.requestId, 'permanent');
    setConfirmOpen(false);
  }, [current.requestId, onApprove]);

  const handleDeny = useCallback(() => {
    if (lastActedRef.current === current.requestId) return;
    lastActedRef.current = current.requestId;
    onDeny(current.requestId);
  }, [current.requestId, onDeny]);

  const isPlan = current.toolName === 'ExitPlanMode';
  const handleReview = useCallback(() => {
    if (!onOpenPlanReview) return;
    onOpenPlanReview(current.toolId, current.requestId);
  }, [current.toolId, current.requestId, onOpenPlanReview]);

  useEffect(() => {
    lastActedRef.current = null;
  }, [current.requestId]);

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

      switch (e.key) {
        case 'a':
        case 'Enter':
          e.preventDefault();
          handleAllow();
          break;
        // Note: Escape is intentionally excluded -- it's handled by the drawer keyboard
        // handler to close the drawer, and should not also deny the permission request.
        case 'n':
          e.preventDefault();
          handleDeny();
          break;
        case 's':
          e.preventDefault();
          handleSession();
          break;
        case 'p':
          e.preventDefault();
          requestPermanent();
          break;
        case 'r':
          if (isPlan && onOpenPlanReview) {
            e.preventDefault();
            handleReview();
          }
          break;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleAllow, handleDeny, handleSession, requestPermanent, isPlan, onOpenPlanReview, handleReview]);

  const hasDescription =
    current.description &&
    current.description !== current.toolName &&
    current.description !== current.displayName;

  return (
    <div
      data-slot="permission-action-bar"
      className={cn(
        'flex flex-col justify-between',
        'p-3 border border-border-default rounded-xl bg-surface-page',
        'transition-[border-color] duration-150 ease-linear',
        'min-h-[92px] box-border'
      )}
    >
      {/* Top: Shield + tool info -- fills the text area space */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.requestId}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={SPRINGS.SNAPPY}
          className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden"
        >
          <span className="text-ai flex shrink-0">
            <ShieldIcon />
          </span>

          <span className="text-sm font-medium text-foreground whitespace-nowrap shrink-0">
            {current.displayName}
          </span>

          {hasDescription && (
            <span className="text-xs text-muted-foreground font-mono overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
              {current.description}
            </span>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bottom: Action buttons -- matches .bottom-controls height (32px) */}
      <div className="flex items-center gap-1 h-8 shrink-0">
        <Pill onClick={handleAllow} kind="allow">
          <Kbd light>a</Kbd>Allow
        </Pill>
        <Pill onClick={handleSession} kind="subtle">
          <Kbd>s</Kbd>Session
        </Pill>
        <Pill onClick={requestPermanent} kind="subtle">
          <Kbd>p</Kbd>Permanent
        </Pill>

        {isPlan && onOpenPlanReview && (
          <Pill onClick={handleReview} kind="subtle">
            <Kbd>r</Kbd>Review
          </Pill>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {totalCount > 1 && (
          <span className="text-[10px] font-mono text-disabled whitespace-nowrap">
            {currentPosition}/{totalCount}
          </span>
        )}

        <Pill onClick={handleDeny} kind="deny">
          <Kbd>n</Kbd>Deny
        </Pill>
      </div>

      {/* Confirmation modal for permanent scope */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Allow ${current.displayName} permanently?`}
        description={`This will auto-approve ${current.displayName} across all workstreams and sessions until you revoke it.`}
        confirmLabel="Allow permanently"
        onConfirm={confirmPermanent}
        size="sm"
      />
    </div>
  );
});

// ---------------------------------------------------------------------------
// Kbd -- matches KeyboardHint primitive
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
// Pill -- compact action buttons
// ---------------------------------------------------------------------------

type PillKind = 'allow' | 'subtle' | 'deny';

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
