/**
 * Shared TODO primitives — icons, colors, and maps used by both
 * TodoWriteTool (in-message renderer) and TodoPanel (above-input panel).
 *
 * @ai-context
 * - SVG icons at 14×14 for crisp rendering at small sizes
 * - STATUS_ICONS and STATUS_COLORS keyed by TodoItem.status
 * - ChecklistIcon for headers/indicators
 */

import type React from 'react';

// ─── Icons ───────────────────────────────────────────────────────────────────

export function ChecklistIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className}>
      <rect x="2" y="1" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M5 5L6.5 6.5L9 4"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M5 8H9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M5 10H8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

export function CompletedIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5" fill="currentColor" opacity="0.15" />
      <path
        d="M4.5 7L6 8.5L9.5 5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function InProgressIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="7" cy="7" r="2.5" fill="currentColor" />
    </svg>
  );
}

export function PendingIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

// ─── Maps ────────────────────────────────────────────────────────────────────

export const STATUS_ICONS: Record<string, () => React.ReactNode> = {
  completed: () => <CompletedIcon />,
  in_progress: () => <InProgressIcon />,
  pending: () => <PendingIcon />,
};

export const STATUS_COLORS: Record<string, string> = {
  completed: 'var(--text-success)',
  in_progress: 'var(--text-info)',
  pending: 'var(--text-muted)',
};
