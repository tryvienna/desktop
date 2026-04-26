/**
 * Textarea — Multi-line text input
 *
 * @ai-context
 * - Auto-resizes via field-sizing: content
 * - px-4(16px), py-2(8px) — 8pt grid
 * - Same focus/error styling as Input
 * - data-slot="textarea"
 *
 * @example
 * <Textarea placeholder="Write your message..." rows={4} />
 */
import * as React from 'react';
import { cn } from '../utils/cn';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-4 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
