/**
 * TrustBadge — Shows how a tool was auto-approved
 *
 * @ai-context
 * - Color-coded badge per ApprovalMethod
 * - Shield icon with entrance animation
 * - Hover tooltip (portal) with description + revoke button
 * - data-slot="trust-badge"
 *
 * @example
 * <TrustBadge method="session_rule" toolName="Bash" onRevoke={fn} />
 */

import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

import { SPRINGS } from '../../../tokens';
import type { ApprovalMethod } from './types';

export interface TrustBadgeProps {
  method: ApprovalMethod;
  toolName?: string;
  scope?: string;
  animate?: boolean;
  onRevoke?: () => void;
}

const BADGE_STYLES: Record<
  ApprovalMethod,
  { color: string; bg: string; label: string; description: string }
> = {
  manual: {
    color: 'var(--text-success)',
    bg: 'var(--surface-success)',
    label: 'approved',
    description: 'Manually approved by user',
  },
  session_rule: {
    color: 'var(--text-info)',
    bg: 'var(--surface-info)',
    label: 'session',
    description: 'Allowed for this session',
  },
  persistent_rule: {
    color: 'var(--text-ai)',
    bg: 'var(--surface-ai)',
    label: 'always',
    description: 'Permanently allowed',
  },
  trusted_tool: {
    color: 'var(--text-muted)',
    bg: 'var(--surface-sunken)',
    label: 'trusted',
    description: 'Tool is in the trusted tools list',
  },
  auto_policy: {
    color: 'var(--text-info)',
    bg: 'var(--surface-info)',
    label: 'policy',
    description: 'Allowed by permission settings',
  },
};

export function TrustBadge({
  method,
  toolName,
  scope,
  animate: shouldAnimate = true,
  onRevoke,
}: TrustBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [revokeState, setRevokeState] = useState<'idle' | 'success'>('idle');
  const badgeRef = useRef<HTMLSpanElement>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout>>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });

  const style = BADGE_STYLES[method] ?? BADGE_STYLES.manual;

  const handleMouseEnter = useCallback(() => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = null;
    }
    const rect = badgeRef.current?.getBoundingClientRect();
    if (rect) {
      setTooltipPos({
        top: rect.bottom + 6,
        left: Math.max(8, rect.left + rect.width / 2 - 120),
      });
    }
    setShowTooltip(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hideTimeout.current = setTimeout(() => setShowTooltip(false), 150);
  }, []);

  const handleRevoke = useCallback(() => {
    onRevoke?.();
    setRevokeState('success');
    setTimeout(() => setRevokeState('idle'), 1500);
  }, [onRevoke]);

  return (
    <span
      data-slot="trust-badge"
      className="relative"
      data-testid="trust-badge"
      data-approval-method={method}
    >
      <motion.span
        ref={badgeRef}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium cursor-default transition-colors duration-100"
        style={{ color: style.color, backgroundColor: style.bg }}
        initial={shouldAnimate ? { opacity: 0, scale: 0.8 } : false}
        animate={{ opacity: 1, scale: 1 }}
        transition={SPRINGS.SNAPPY}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Shield icon */}
        <motion.span
          className="inline-flex"
          initial={shouldAnimate ? { scale: 0, rotate: -90 } : false}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...SPRINGS.SNAPPY, delay: 0.1 }}
        >
          <ShieldSvg size={10} />
        </motion.span>
        {style.label}
      </motion.span>

      {/* Tooltip (portal) */}
      {showTooltip &&
        createPortal(
          <AnimatePresence>
            <motion.div
              className="pointer-events-auto fixed z-[9999] min-w-[200px] max-w-[280px] rounded-lg border border-border-muted bg-surface-elevated p-2 shadow-lg"
              style={{
                top: tooltipPos.top,
                left: tooltipPos.left,
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={SPRINGS.SNAPPY}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <div className="mb-1 text-xs text-foreground">{style.description}</div>
              {(toolName || scope) && (
                <div className="mb-2 truncate font-mono text-[10px] text-muted-foreground">
                  {toolName}
                  {scope ? ` (${scope})` : ''}
                </div>
              )}
              {method === 'auto_policy' ? (
                <div className="border-t border-border-muted pt-1">
                  <span className="text-[10px] text-muted-foreground">
                    Open permission settings to update this rule
                  </span>
                </div>
              ) : onRevoke && (
                <div className="border-t border-border-muted pt-1">
                  <AnimatePresence mode="wait">
                    {revokeState === 'idle' ? (
                      <button
                        key="revoke"
                        className="border-none bg-transparent p-0 text-[10px] text-error cursor-pointer hover:underline"
                        onClick={handleRevoke}
                      >
                        Revoke this rule
                      </button>
                    ) : (
                      <motion.span
                        key="success"
                        className="flex items-center gap-1 text-[10px] text-success"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        Revoked
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
    </span>
  );
}

function ShieldSvg({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path
        d="M7 1.5L2.5 3.5V6.5C2.5 9.5 7 12.5 7 12.5C7 12.5 11.5 9.5 11.5 6.5V3.5L7 1.5Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}
