/**
 * ToolStatusIcon — Animated SVG status indicator for tool execution states
 *
 * @ai-context
 * - Pending: 3 dots with sequential fade animation
 * - PendingPermission: Shield icon with pulsing stroke
 * - Running: Continuous spinner (arc rotating 360 degrees)
 * - Success: Checkmark draw + sparkle burst (6 particles)
 * - Error: X draw + shake animation
 * - isFromHistory: skip all entrance animations (instant render)
 * - data-slot="tool-status-icon"
 *
 * @example
 * <ToolStatusIcon status="running" size={18} />
 */

import { motion, AnimatePresence } from 'framer-motion';

import { SPRINGS } from '../../tokens';
import type { ToolStatus } from '../../types/messages';

interface ToolStatusIconProps {
  status: ToolStatus;
  size?: number;
  isFromHistory?: boolean;
}

const COLOR_MAP: Record<ToolStatus, string> = {
  pending: 'var(--text-ai)',
  pending_permission: 'var(--text-ai)',
  running: 'var(--text-info)',
  complete: 'var(--text-success)',
  error: 'var(--text-error)',
};

export function ToolStatusIcon({ status, size = 18, isFromHistory }: ToolStatusIconProps) {
  const color = COLOR_MAP[status];

  return (
    <div
      data-slot="tool-status-icon"
      className="flex flex-shrink-0 items-center justify-center"
      style={{ width: size, height: size, color }}
    >
      <AnimatePresence mode="wait">
        {status === 'pending' && <PendingIcon key="pending" size={size} skipAnimation={isFromHistory} />}
        {status === 'pending_permission' && <ShieldIcon key="shield" size={size} skipAnimation={isFromHistory} />}
        {status === 'running' && <RunningIcon key="running" size={size} skipAnimation={isFromHistory} />}
        {status === 'complete' && <SuccessIcon key="success" size={size} skipAnimation={isFromHistory} />}
        {status === 'error' && <ErrorIcon key="error" size={size} skipAnimation={isFromHistory} />}
      </AnimatePresence>
    </div>
  );
}

// ── Pending: 3 dots with sequential fade ──────────────────────────────

function PendingIcon({ size, skipAnimation }: { size: number; skipAnimation?: boolean }) {
  const r = size * 0.08;
  const cx = size / 2;
  const cy = size / 2;
  const gap = size * 0.22;

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      initial={skipAnimation ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          cx={cx + (i - 1) * gap}
          cy={cy}
          r={r}
          fill="currentColor"
          animate={skipAnimation ? { opacity: 1 } : { opacity: [0.3, 1, 0.3] }}
          transition={
            skipAnimation
              ? undefined
              : {
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.3,
                }
          }
        />
      ))}
    </motion.svg>
  );
}

// ── Pending Permission: Shield with pulsing stroke ────────────────────

function ShieldIcon({ size, skipAnimation }: { size: number; skipAnimation?: boolean }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      initial={skipAnimation ? false : { opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={skipAnimation ? undefined : SPRINGS.SNAPPY}
    >
      <motion.path
        d="M9 2L3 5v4c0 3.5 2.5 6.5 6 7.5 3.5-1 6-4 6-7.5V5L9 2z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        animate={skipAnimation ? { strokeOpacity: 1 } : { strokeOpacity: [0.6, 1, 0.6] }}
        transition={
          skipAnimation
            ? undefined
            : { duration: 2, repeat: Infinity, ease: 'easeInOut' }
        }
      />
      <motion.g
        animate={skipAnimation ? { opacity: 1 } : { opacity: [0.5, 1, 0.5] }}
        transition={
          skipAnimation
            ? undefined
            : { duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }
        }
      >
        <line
          x1="9"
          y1="7"
          x2="9"
          y2="10"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <circle cx="9" cy="12" r="0.5" fill="currentColor" />
      </motion.g>
    </motion.svg>
  );
}

// ── Running: Continuous spinner ───────────────────────────────────────

function RunningIcon({ size, skipAnimation }: { size: number; skipAnimation?: boolean }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      initial={skipAnimation ? false : { scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, rotate: skipAnimation ? 0 : 360 }}
      exit={{ scale: 0.5, opacity: 0 }}
      transition={
        skipAnimation
          ? undefined
          : {
              scale: SPRINGS.SNAPPY,
              opacity: SPRINGS.SNAPPY,
              rotate: { duration: 1, repeat: Infinity, ease: 'linear' },
            }
      }
    >
      <circle
        cx="9"
        cy="9"
        r="6"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.25}
      />
      <path d="M9 3a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </motion.svg>
  );
}

// ── Success: Checkmark draw + sparkle burst ───────────────────────────

function SuccessIcon({ size, skipAnimation }: { size: number; skipAnimation?: boolean }) {
  if (skipAnimation) {
    // Static checkmark — no animation
    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="9" r="7" fill="currentColor" opacity={0.15} />
          <path
            d="M5.5 9.5L7.5 11.5L12.5 6.5"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  const sparkleCount = 6;
  const sparkleDistance = size * 0.78;

  return (
    <motion.div
      className="relative"
      style={{ width: size, height: size }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={SPRINGS.BOUNCY}
    >
      <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
        {/* Circle background */}
        <motion.circle
          cx="9"
          cy="9"
          r="7"
          fill="currentColor"
          opacity={0.15}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ ...SPRINGS.BOUNCY, delay: 0.1 }}
        />
        {/* Checkmark */}
        <motion.path
          d="M5.5 9.5L7.5 11.5L12.5 6.5"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 0.15, ease: 'easeOut' }}
        />
      </svg>

      {/* Sparkle particles */}
      {Array.from({ length: sparkleCount }).map((_, i) => {
        const angle = (i / sparkleCount) * Math.PI * 2;
        const x = Math.cos(angle) * sparkleDistance;
        const y = Math.sin(angle) * sparkleDistance;
        return (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-current"
            initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
            animate={{
              opacity: [0, 1, 0],
              x: [0, x],
              y: [0, y],
              scale: [0, 1, 0],
            }}
            transition={{ duration: 0.5, delay: i * 0.05, ease: 'easeOut' }}
          />
        );
      })}
    </motion.div>
  );
}

// ── Error: X draw + shake ─────────────────────────────────────────────

function ErrorIcon({ size, skipAnimation }: { size: number; skipAnimation?: boolean }) {
  if (skipAnimation) {
    return (
      <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="7" fill="currentColor" opacity={0.15} />
        <path d="M6.5 6.5L11.5 11.5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        <path d="M11.5 6.5L6.5 11.5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, x: [0, -2, 2, -2, 2, 0] }}
      exit={{ scale: 0.5, opacity: 0 }}
      transition={{
        scale: SPRINGS.SNAPPY,
        opacity: SPRINGS.SNAPPY,
        x: { duration: 0.4, ease: 'easeInOut', delay: 0.1 },
      }}
    >
      {/* Circle background */}
      <circle cx="9" cy="9" r="7" fill="currentColor" opacity={0.15} />
      {/* X paths */}
      <motion.path
        d="M6.5 6.5L11.5 11.5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.25, delay: 0.15, ease: 'easeOut' }}
      />
      <motion.path
        d="M11.5 6.5L6.5 11.5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.25, delay: 0.2, ease: 'easeOut' }}
      />
    </motion.svg>
  );
}
