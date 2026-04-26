/**
 * VerificationActionBar — Manual verification bar replacing chat input
 *
 * @ai-context
 * - Replaces the text input when workstream needs manual verification
 * - Same container shape as ChatInput for seamless AnimatePresence morph
 * - Two-step flow: Step 1 (Mark as Verified) -> Step 2 (custom actions or archive)
 * - Keyboard: Escape=back, Enter=verify, number keys=action shortcuts
 * - Shield alert/check icons with breathing animation
 * - Supports customActions array and onOpenCustomize callback
 * - data-slot="verification-action-bar"
 *
 * @example
 * <VerificationActionBar onBackToWorkstream={fn} onArchive={fn} customActions={actions} />
 */

import React, { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { motion } from 'framer-motion';
import { cn } from '@tryvienna/ui';
import { SPRINGS } from '../../tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResolvedVerificationAction {
  id: string;
  label: string;
  onExecute: () => void;
}

export interface VerificationActionBarProps {
  onBackToWorkstream: () => void;
  onArchive: () => void;
  customActions?: ResolvedVerificationAction[];
  onOpenCustomize?: () => void;
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function ShieldAlertIcon() {
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

function ShieldCheckIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" className="shrink-0">
      <path
        d="M12 2L4 5.5v5.5c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5.5L12 2z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <polyline
        points="9 12 11.5 14.5 15 10"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const VerificationActionBar = memo(function VerificationActionBar({
  onBackToWorkstream,
  onArchive,
  customActions,
  onOpenCustomize,
}: VerificationActionBarProps) {
  const [verified, setVerified] = useState(false);

  const handleMarkVerified = useCallback(() => {
    setVerified(true);
  }, []);

  const handleBack = useCallback(() => {
    onBackToWorkstream();
  }, [onBackToWorkstream]);

  const handleArchive = useCallback(() => {
    onArchive();
  }, [onArchive]);

  // Resolved actions for the verified step: custom actions or fallback to archive
  const verifiedActions: ResolvedVerificationAction[] =
    customActions && customActions.length > 0
      ? customActions
      : [{ id: 'default-archive', label: 'Archive Workstream', onExecute: handleArchive }];

  // Detect overflow: switch to one-per-line when buttons wrap past one row
  const buttonsRef = useRef<HTMLDivElement>(null);
  const [isStacked, setIsStacked] = useState(false);

  useLayoutEffect(() => {
    const el = buttonsRef.current;
    if (!el) return;

    const check = () => {
      // When stacked, temporarily go back to row+wrap to re-measure
      if (el.dataset.stacked === 'true') {
        el.style.flexDirection = 'row';
        el.style.flexWrap = 'wrap';
      }

      const children = Array.from(el.children) as HTMLElement[];
      if (children.length < 2) {
        setIsStacked(false);
        el.style.flexDirection = '';
        el.style.flexWrap = '';
        return;
      }

      // Check if any child wraps to a different row than the first
      const firstTop = children[0]!.offsetTop;
      const wraps = children.some((c) => c.offsetTop !== firstTop);

      // Restore inline styles
      el.style.flexDirection = '';
      el.style.flexWrap = '';

      setIsStacked(wraps);
    };

    // rAF to let flex layout settle before measuring
    const id = requestAnimationFrame(check);

    const observer = new ResizeObserver(() => requestAnimationFrame(check));
    observer.observe(el);
    return () => {
      cancelAnimationFrame(id);
      observer.disconnect();
    };
  }, [verified, verifiedActions.length]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (!verified) {
        switch (e.key) {
          case 'Escape':
            e.preventDefault();
            handleBack();
            break;
          case 'Enter':
            e.preventDefault();
            handleMarkVerified();
            break;
        }
        return;
      }

      // Verified step: Escape -> back, number keys 1-5 -> trigger action
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          handleBack();
          break;
        default: {
          const n = parseInt(e.key, 10);
          if (n >= 1 && n <= 5) {
            const action = verifiedActions[n - 1];
            if (action) {
              e.preventDefault();
              action.onExecute();
            }
          }
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleBack, handleMarkVerified, verified, verifiedActions]);

  return (
    <div
      data-slot="verification-action-bar"
      className={cn(
        'flex flex-col justify-between',
        'p-3 border border-border-default rounded-xl bg-surface-page',
        'transition-[border-color] duration-150 ease-linear',
        'box-border'
      )}
    >
      {/* Top: Icon + description */}
      <motion.div
        key={verified ? 'verified' : 'awaiting'}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRINGS.SNAPPY}
        className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden"
      >
        <span className={cn('flex shrink-0', verified ? 'text-success' : 'text-orange-500')}>
          {verified ? <ShieldCheckIcon /> : <ShieldAlertIcon />}
        </span>

        <span className="text-sm font-medium text-foreground whitespace-nowrap shrink-0">
          {verified ? 'Work Verified' : 'Awaiting Verification'}
        </span>

        <span className="text-xs text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
          {verified
            ? 'What would you like to do next?'
            : 'This workstream has completed its work and is awaiting your review.'}
        </span>
      </motion.div>

      {/* Bottom: Action buttons */}
      <div
        ref={buttonsRef}
        data-stacked={isStacked}
        className={cn(
          'flex gap-1 shrink-0',
          isStacked ? 'flex-col items-stretch' : 'flex-row flex-wrap items-center',
        )}
      >
        <Pill onClick={handleBack} kind="subtle">
          <Kbd>&#x238B;</Kbd>Back to Workstream
        </Pill>

        {verified ? (
          <>
            {verifiedActions.slice(0, 5).map((action, i) => (
              <Pill key={action.id} onClick={action.onExecute} kind="action">
                <Kbd light>{i + 1}</Kbd>
                <span className="truncate">{action.label}</span>
              </Pill>
            ))}
            <Pill onClick={onOpenCustomize ?? (() => undefined)} kind="customize">
              Customize&hellip;
            </Pill>
          </>
        ) : (
          <Pill onClick={handleMarkVerified} kind="verify">
            <Kbd light>&#x21B5;</Kbd>Mark as Verified
          </Pill>
        )}
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Pill -- compact action buttons
// ---------------------------------------------------------------------------

type PillKind = 'verify' | 'subtle' | 'archive' | 'action' | 'customize';

const pillStyles: Record<PillKind, { base: string; hover: string }> = {
  verify: {
    base: 'bg-orange-500/15 text-orange-500 border border-orange-500/30',
    hover: 'hover:bg-orange-500/25',
  },
  subtle: {
    base: 'bg-transparent text-foreground-secondary border border-border-muted',
    hover: 'hover:bg-surface-hover',
  },
  archive: {
    base: 'bg-surface-interactive text-foreground-secondary border border-border-muted',
    hover: 'hover:bg-surface-hover',
  },
  action: {
    base: 'bg-surface-interactive text-foreground-secondary border border-border-muted',
    hover: 'hover:bg-surface-hover',
  },
  customize: {
    base: 'bg-transparent text-muted-foreground border border-dashed border-border-muted',
    hover: 'hover:bg-surface-hover',
  },
};

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
        'inline-flex items-center gap-1 min-w-0 max-w-full',
        'px-2 py-0.5 h-7',
        'text-xs font-medium font-inherit',
        'rounded-md cursor-pointer leading-none',
        'transition-colors duration-100 ease-linear',
        s.base,
        s.hover
      )}
    >
      {children}
    </motion.button>
  );
}
