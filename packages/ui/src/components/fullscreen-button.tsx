/**
 * FullscreenButton — Toggle button for entering/exiting fullscreen presentation mode
 *
 * @ai-context
 * - Renders a compact icon button that toggles between "present" and "collapse" icons
 * - Controlled via isFullscreen prop; fires onClick to toggle state
 * - Inline SVG icons (PresentIcon, CollapseIcon) — no external icon dependency
 * - data-slot="fullscreen-button"
 *
 * @example
 * <FullscreenButton isFullscreen={false} onClick={toggleFullscreen} />
 */
import { cn } from '../utils/cn';

export interface FullscreenButtonProps {
  onClick?: () => void;
  isFullscreen?: boolean;
  className?: string;
}

function PresentIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 14h6v6" />
      <path d="M20 10h-6V4" />
      <path d="M14 10l7-7" />
      <path d="M3 21l7-7" />
    </svg>
  );
}

export function FullscreenButton({
  onClick,
  isFullscreen = false,
  className,
}: FullscreenButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'p-1 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-muted',
        className
      )}
      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      title={isFullscreen ? 'Exit fullscreen' : 'Present fullscreen'}
      data-slot="fullscreen-button"
    >
      {isFullscreen ? <CollapseIcon /> : <PresentIcon />}
    </button>
  );
}
