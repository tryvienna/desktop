/**
 * TagChip — Colored badge showing a tag with optional execution status.
 *
 * @ai-context
 * - Uses tag's color for the badge background at low opacity
 * - Status icons use semantic color tokens (text-success, text-warning, text-error)
 * - Optional onRemove callback shows an X button
 * - data-slot="tag-chip"
 */

import { X } from 'lucide-react';
import { cn } from '@tryvienna/ui';

export type TagStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

const HEX_COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;

/** Sanitize a color string to prevent CSS injection via inline styles. */
function safeColor(color: string): string {
  return HEX_COLOR_RE.test(color) ? color : '#3B82F6';
}

export interface TagChipProps {
  name: string;
  color: string;
  status?: TagStatus | null;
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
}

function StatusIndicator({ status }: { status: TagStatus }) {
  switch (status) {
    case 'pending':
      return <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />;
    case 'running':
      return <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />;
    case 'completed':
      return (
        <svg width={10} height={10} viewBox="0 0 24 24" fill="none" className="text-success" aria-hidden="true">
          <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'failed':
      return (
        <svg width={10} height={10} viewBox="0 0 24 24" fill="none" className="text-error" aria-hidden="true">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
        </svg>
      );
    case 'skipped':
      return (
        <svg width={10} height={10} viewBox="0 0 24 24" fill="none" className="text-muted-foreground" aria-hidden="true">
          <path d="M5 12h14" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

export function TagChip({ name, color: rawColor, status, onRemove, onClick, className }: TagChipProps) {
  const color = safeColor(rawColor);
  return (
    <span
      data-slot="tag-chip"
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-tight',
        'border',
        onClick && 'cursor-pointer hover:opacity-80',
        className,
      )}
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
        color,
        borderColor: `color-mix(in srgb, ${color} 25%, transparent)`,
      }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      aria-label={onClick ? `${name} tag` : undefined}
    >
      {status && <StatusIndicator status={status} />}
      {name}
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${name}`}
          className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
}
