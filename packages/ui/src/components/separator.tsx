/**
 * Separator — Visual divider via Radix UI
 *
 * @ai-context
 * - 1px line, no spacing issues
 * - Horizontal is full-width, vertical needs explicit height
 * - Set decorative=false if separator conveys meaning
 * - data-slot="separator"
 *
 * @example
 * <Separator />
 * <Separator orientation="vertical" className="h-4" />
 */
import * as React from 'react';
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { cn } from '../utils/cn';

function Separator({
  className,
  orientation = 'horizontal',
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        'bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px',
        className
      )}
      {...props}
    />
  );
}

export { Separator };
