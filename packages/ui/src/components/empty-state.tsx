/**
 * EmptyState — Placeholder for empty content areas with icon, title, description, and action
 *
 * @ai-context
 * - Centered layout with icon, title, description, and optional action button
 * - All spacing on 8pt grid: gap-4 (16px), p-8 (32px), icon size-12 (48px)
 * - No grid fixes needed — already aligned
 * - data-slot="empty-state"
 *
 * @example
 * <EmptyState
 *   icon={<InboxIcon />}
 *   title="No messages"
 *   description="You don't have any messages yet."
 *   action={<Button>Compose</Button>}
 * />
 */
import * as React from 'react';
import { cn } from '../utils/cn';

interface EmptyStateProps extends React.ComponentProps<'div'> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  children,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn('flex flex-col items-center justify-center gap-4 p-8 text-center', className)}
      {...props}
    >
      {icon && (
        <div className="flex items-center justify-center size-12 rounded-full bg-muted text-muted-foreground [&>svg]:size-6">
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-2">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description && <p className="text-sm text-muted-foreground max-w-sm">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
      {children}
    </div>
  );
}

export { EmptyState };
export type { EmptyStateProps };
