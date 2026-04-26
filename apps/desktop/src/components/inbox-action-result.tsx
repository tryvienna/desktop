/**
 * InboxActionResult — Animated success/error result screen.
 *
 * Shows a large animated icon (checkmark or X), title, optional description,
 * and action buttons. Used as the terminal state of an inbox action handler.
 */

import { useEffect, useState } from 'react';
import { cn } from '@tryvienna/ui/utils';
import type { InboxActionResultSpec, InboxActionResultAction } from '../ipc/inbox-action/contract';

interface InboxActionResultProps {
  result: InboxActionResultSpec;
  onAction: (actionId: string) => void;
  onDismiss: () => void;
}

export function InboxActionResult({ result, onAction, onDismiss }: InboxActionResultProps) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // Trigger entrance animation after mount
    const timer = setTimeout(() => setAnimate(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Auto-dismiss after 5s if no action buttons
  useEffect(() => {
    if (!result.actions?.length) {
      const timer = setTimeout(onDismiss, 5000);
      return () => clearTimeout(timer);
    }
  }, [result.actions, onDismiss]);

  const isSuccess = result.status === 'success';

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-6 px-4">
      {/* Animated icon */}
      <div
        className={cn(
          'flex items-center justify-center w-16 h-16 rounded-full',
          'transition-all duration-500 ease-out',
          animate ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
          isSuccess ? 'bg-green-500/15' : 'bg-red-500/15',
        )}
      >
        {isSuccess ? (
          <svg
            className={cn(
              'w-8 h-8 text-green-500 transition-all duration-700 ease-out',
              animate ? 'scale-100 opacity-100' : 'scale-0 opacity-0',
            )}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path
              d="M5 13l4 4L19 7"
              className={animate ? 'animate-draw-check' : ''}
              style={{
                strokeDasharray: 24,
                strokeDashoffset: animate ? 0 : 24,
                transition: 'stroke-dashoffset 0.6s ease-out 0.3s',
              }}
            />
          </svg>
        ) : (
          <svg
            className={cn(
              'w-8 h-8 text-red-500 transition-all duration-700 ease-out',
              animate ? 'scale-100 opacity-100' : 'scale-0 opacity-0',
            )}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path
              d="M18 6L6 18"
              style={{
                strokeDasharray: 17,
                strokeDashoffset: animate ? 0 : 17,
                transition: 'stroke-dashoffset 0.4s ease-out 0.3s',
              }}
            />
            <path
              d="M6 6l12 12"
              style={{
                strokeDasharray: 17,
                strokeDashoffset: animate ? 0 : 17,
                transition: 'stroke-dashoffset 0.4s ease-out 0.5s',
              }}
            />
          </svg>
        )}
      </div>

      {/* Title */}
      <div
        className={cn(
          'text-center transition-all duration-500 ease-out delay-200',
          animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
        )}
      >
        <h3 className="text-sm font-semibold text-foreground">{result.title}</h3>
        {result.description && (
          <p className="mt-1 text-xs text-muted-foreground">{result.description}</p>
        )}
      </div>

      {/* Action buttons */}
      {result.actions && result.actions.length > 0 && (
        <div
          className={cn(
            'flex items-center gap-2 transition-all duration-500 ease-out delay-500',
            animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
          )}
        >
          {result.actions.map((action: InboxActionResultAction) => (
            <button
              key={action.id}
              onClick={() => onAction(action.id)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                action.variant === 'primary'
                  ? 'bg-foreground text-background hover:bg-foreground/90'
                  : action.variant === 'ghost'
                    ? 'text-muted-foreground hover:text-foreground'
                    : 'border border-border text-foreground hover:bg-muted/50',
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
