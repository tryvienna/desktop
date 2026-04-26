/**
 * FullscreenOverlay — Portal-based fullscreen overlay with Escape-to-close
 *
 * @ai-context
 * - Renders into document.body via createPortal when open=true
 * - Captures Escape key (stopImmediatePropagation) to close; locks body scroll while open
 * - Absolute-positioned close button in top-right corner
 * - z-index 200 to sit above all other UI
 * - data-slot="fullscreen-overlay"
 *
 * @example
 * <FullscreenOverlay open={isOpen} onClose={() => setIsOpen(false)}>
 *   <div>Fullscreen content</div>
 * </FullscreenOverlay>
 */
import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../utils/cn';

export interface FullscreenOverlayProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

function CloseIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

export function FullscreenOverlay({ open, onClose, children, className }: FullscreenOverlayProps) {
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [open, onClose]);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className={cn('fixed inset-0 z-[200] bg-background flex flex-col', className)}
      data-slot="fullscreen-overlay"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Exit fullscreen"
        data-slot="fullscreen-overlay-close"
      >
        <CloseIcon />
      </button>
      {children}
    </div>,
    document.body
  );
}
