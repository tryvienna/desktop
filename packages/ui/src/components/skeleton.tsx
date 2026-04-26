/**
 * Skeleton — Loading placeholder with pulse animation
 *
 * @ai-context
 * - Set dimensions via className (h-4, w-full, etc.)
 * - Use rounded-full for avatar placeholders
 * - data-slot="skeleton"
 *
 * @example
 * <Skeleton className="h-4 w-[200px]" />
 * <Skeleton className="size-12 rounded-full" />
 */
import * as React from 'react';
import { cn } from '../utils/cn';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('bg-accent animate-pulse rounded-md', className)}
      {...props}
    />
  );
}

export { Skeleton };
