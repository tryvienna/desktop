/**
 * NotificationToast — Custom toast content rendered inside Sonner via toast.custom()
 *
 * @ai-context
 * - Pure presentation component, zero business logic
 * - 5 variants: success, error, warning, info, default
 * - Uses design system tokens: bg-surface-{status}, text-{status}, border-border-{status}
 * - Clickable body (onClick), action buttons, close button on hover
 * - CUSTOM_TOAST_CLASS neutralizes Sonner's default wrapper styles
 * - Renders inside Sonner portal — use toast.custom() to display
 * - data-slot="notification-toast"
 *
 * @example
 * ```tsx
 * import { toast } from './sonner';
 * import { NotificationToast, CUSTOM_TOAST_CLASS } from './notification-toast';
 *
 * toast.custom(
 *   (id) => (
 *     <NotificationToast
 *       id={id}
 *       variant="success"
 *       title="Workstream ready"
 *       description="Code review complete"
 *       onClick={() => navigate('/ws/123')}
 *     />
 *   ),
 *   { className: CUSTOM_TOAST_CLASS }
 * );
 * ```
 */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../utils/cn';

/**
 * Apply to toast.custom()'s options.className to neutralize Sonner's
 * default wrapper styles (bg, border, shadow) on the outer <li>.
 */
export const CUSTOM_TOAST_CLASS = '!bg-transparent !border-0 !shadow-none !p-0';

const notificationToastVariants = cva(
  'group relative flex w-[var(--width)] items-center gap-3 rounded-lg border p-4 text-sm shadow-lg',
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground border-border',
        success: 'bg-surface-success text-success border-border-success',
        error: 'bg-surface-error text-error border-border-error',
        warning: 'bg-surface-warning text-warning border-border-warning',
        info: 'bg-surface-info text-info border-border-info',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

type NotificationVariant = NonNullable<VariantProps<typeof notificationToastVariants>['variant']>;

const variantIcons: Record<NotificationVariant, React.ComponentType<{ className?: string }> | null> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  default: null,
};

export interface NotificationToastAction {
  label: string;
  onClick: () => void;
}

export interface NotificationToastProps {
  id: string | number;
  variant?: NotificationVariant;
  title: string;
  description?: string;
  /** Fires when the toast body is clicked. Auto-dismisses. */
  onClick?: () => void;
  /** Explicit action buttons rendered inside the toast. */
  actions?: NotificationToastAction[];
}

const NotificationToast = React.memo(function NotificationToast({
  id,
  variant = 'default',
  title,
  description,
  onClick,
  actions,
}: NotificationToastProps) {
  const Icon = variantIcons[variant];

  const handleBodyClick = React.useCallback(
    (e: React.MouseEvent) => {
      if (!onClick) return;
      const target = e.target as HTMLElement;
      if (target.closest('[data-slot="notification-toast-action"]') || target.closest('[data-slot="notification-toast-close"]')) {
        return;
      }
      onClick();
      toast.dismiss(id);
    },
    [onClick, id]
  );

  const handleClose = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      toast.dismiss(id);
    },
    [id]
  );

  const handleAction = React.useCallback(
    (e: React.MouseEvent, action: NotificationToastAction) => {
      e.stopPropagation();
      action.onClick();
      toast.dismiss(id);
    },
    [id]
  );

  return (
    <div
      data-slot="notification-toast"
      data-variant={variant}
      className={cn(
        notificationToastVariants({ variant }),
        onClick && 'cursor-pointer'
      )}
      onClick={handleBodyClick}
    >
      {/* Close button */}
      <button
        data-slot="notification-toast-close"
        onClick={handleClose}
        className="absolute -left-1.5 -top-1.5 z-10 flex size-5 items-center justify-center rounded-full border bg-card text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
      >
        <X className="size-3" />
      </button>

      {/* Icon */}
      {Icon && <Icon className="size-4 shrink-0" />}

      {/* Content */}
      <div data-slot="notification-toast-content" className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div data-slot="notification-toast-title" className="font-medium leading-snug">
          {title}
        </div>
        {description && (
          <div data-slot="notification-toast-description" className="leading-snug opacity-90">
            {description}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {actions && actions.length > 0 && (
        <div data-slot="notification-toast-actions" className="ml-auto flex shrink-0 gap-1.5">
          {actions.map((action, i) => (
            <button
              key={action.label}
              data-slot="notification-toast-action"
              onClick={(e) => handleAction(e, action)}
              className={cn(
                'flex h-6 shrink-0 items-center rounded px-2 text-xs font-medium transition-opacity hover:opacity-80',
                i === 0
                  ? 'bg-current/20 text-inherit'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

export { NotificationToast, notificationToastVariants };
