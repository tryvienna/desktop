/**
 * AspectRatio — Maintains width-to-height ratio via Radix UI
 *
 * @ai-context
 * - Wraps media to prevent layout shift
 * - Common ratios: 1 (square), 4/3 (classic), 16/9 (widescreen)
 * - data-slot="aspect-ratio"
 *
 * @example
 * <AspectRatio ratio={16 / 9}>
 *   <img src="/image.jpg" className="object-cover w-full h-full" />
 * </AspectRatio>
 */
import * as React from 'react';
import * as AspectRatioPrimitive from '@radix-ui/react-aspect-ratio';

function AspectRatio({ ...props }: React.ComponentProps<typeof AspectRatioPrimitive.Root>) {
  return <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...props} />;
}

export { AspectRatio };
