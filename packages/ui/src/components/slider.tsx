/**
 * Slider — Range input via Radix UI
 *
 * @ai-context
 * - Supports single thumb and dual-thumb (range) modes
 * - Track h-2 (8px), thumb size-4 (16px) — on 4px sub-grid
 * - Arrow keys adjust value, supports min/max/step
 * - data-slot="slider", data-slot="slider-thumb"
 *
 * @example
 * <Slider defaultValue={[50]} max={100} step={1} />
 * <Slider defaultValue={[25, 75]} max={100} /> // Range
 */
import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '../utils/cn';

function Slider({
  className,
  defaultValue,
  value,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const _values = React.useMemo(() => value ?? defaultValue ?? [0], [value, defaultValue]);

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      className={cn(
        'relative flex w-full touch-none items-center select-none data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col data-[disabled]:opacity-50',
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="bg-muted relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-2 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-2"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="bg-primary absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className="border-primary bg-background focus-visible:ring-ring/50 block size-4 rounded-full border shadow-sm transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-hidden disabled:pointer-events-none"
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };
