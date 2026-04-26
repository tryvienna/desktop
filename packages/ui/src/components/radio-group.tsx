/**
 * RadioGroup — Single-selection radio buttons via Radix UI
 *
 * @ai-context
 * - Single-select from 2-5 visible options; for more, use Select
 * - size-4 (16px) indicators — on 4px sub-grid
 * - Arrow keys navigate between items
 * - data-slot="radio-group", data-slot="radio-group-item"
 *
 * @example
 * <RadioGroup defaultValue="option1">
 *   <div className="flex items-center gap-2">
 *     <RadioGroupItem value="option1" id="opt1" />
 *     <Label htmlFor="opt1">Option 1</Label>
 *   </div>
 * </RadioGroup>
 */
import * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { CircleIcon } from 'lucide-react';
import { cn } from '../utils/cn';

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn('grid gap-3', className)}
      {...props}
    />
  );
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        'border-input text-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive aspect-square size-4 shrink-0 rounded-full border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="relative flex items-center justify-center"
      >
        <CircleIcon className="fill-primary size-2" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };
