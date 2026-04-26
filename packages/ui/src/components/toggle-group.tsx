/**
 * ToggleGroup — Group of toggle buttons via Radix UI
 *
 * @ai-context
 * - "single" = radio behavior, "multiple" = checkbox behavior
 * - Variant/size cascade from group to items via context
 * - gap-1(4px) between items — on 4px sub-grid
 * - data-slot="toggle-group"
 *
 * @example
 * <ToggleGroup type="single" defaultValue="center">
 *   <ToggleGroupItem value="left"><AlignLeftIcon /></ToggleGroupItem>
 *   <ToggleGroupItem value="center"><AlignCenterIcon /></ToggleGroupItem>
 * </ToggleGroup>
 */
import * as React from 'react';
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import { type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';
import { toggleVariants } from './toggle';

const ToggleGroupContext = React.createContext<VariantProps<typeof toggleVariants>>({
  size: 'default',
  variant: 'default',
});

function ToggleGroup({
  className,
  variant,
  size,
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> & VariantProps<typeof toggleVariants>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      className={cn('group/toggle-group flex items-center gap-1 rounded-md', className)}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> & VariantProps<typeof toggleVariants>) {
  const context = React.useContext(ToggleGroupContext);
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={variant || context.variant}
      data-size={size || context.size}
      className={cn(
        toggleVariants({
          variant: variant || context.variant,
          size: size || context.size,
        }),
        'min-w-0 flex-1 shrink-0 rounded-none shadow-none first:rounded-l-md last:rounded-r-md focus-visible:z-10 focus-within:z-10',
        className
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
}

export { ToggleGroup, ToggleGroupItem };
