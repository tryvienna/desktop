/**
 * Carousel — Scrollable content carousel built on Embla Carousel
 *
 * @ai-context
 * - Uses Embla Carousel under the hood (embla-carousel-react)
 * - Arrow key navigation built-in (Left/Right for horizontal)
 * - role="region" with aria-roledescription="carousel"
 * - CarouselContent wraps the scrollable viewport
 * - CarouselItem wraps each slide with role="group" aria-roledescription="slide"
 * - CarouselPrevious/CarouselNext are absolutely positioned nav buttons
 * - Context provides canScrollPrev/canScrollNext for conditional rendering
 * - Nav buttons are size-8 (32px) — on 8pt grid
 *
 * @props
 * - `orientation` — "horizontal" | "vertical" (default: "horizontal")
 * - `opts` — Embla Carousel options (align, loop, dragFree, etc.)
 * - `plugins` — Embla Carousel plugins (autoplay, autoHeight, etc.)
 * - `setApi` — Callback to receive the Embla API instance
 *
 * @example
 * ```tsx
 * <Carousel opts={{ align: "start", loop: true }}>
 *   <CarouselContent>
 *     <CarouselItem>Slide 1</CarouselItem>
 *     <CarouselItem>Slide 2</CarouselItem>
 *   </CarouselContent>
 *   <CarouselPrevious />
 *   <CarouselNext />
 * </Carousel>
 * ```
 */
import * as React from 'react';
import useEmblaCarousel, { type UseEmblaCarouselType } from 'embla-carousel-react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import { cn } from '../utils/cn';
import { Button } from './button';

type CarouselApi = UseEmblaCarouselType[1];
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;
type CarouselOptions = UseCarouselParameters[0];
type CarouselPlugin = UseCarouselParameters[1];

type CarouselProps = {
  opts?: CarouselOptions;
  plugins?: CarouselPlugin;
  orientation?: 'horizontal' | 'vertical';
  setApi?: (api: CarouselApi) => void;
};

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0];
  api: ReturnType<typeof useEmblaCarousel>[1];
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
} & CarouselProps;

const CarouselContext = React.createContext<CarouselContextProps | null>(null);

/**
 * useCarousel — Access carousel context (scroll state, API, orientation).
 * Must be used within a `<Carousel>` component.
 *
 * @ai-context
 * - Throws if used outside Carousel
 * - `api` is the Embla Carousel API for advanced control
 *
 * @returns CarouselContextProps with scrollPrev, scrollNext, canScrollPrev, canScrollNext, api, orientation
 */
function useCarousel() {
  const context = React.useContext(CarouselContext);

  if (!context) {
    throw new Error('useCarousel must be used within a <Carousel />');
  }

  return context;
}

function Carousel({
  orientation = 'horizontal',
  opts,
  setApi,
  plugins,
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & CarouselProps) {
  const [carouselRef, api] = useEmblaCarousel(
    {
      ...opts,
      axis: orientation === 'horizontal' ? 'x' : 'y',
    },
    plugins
  );
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(false);

  const onSelect = React.useCallback((api: CarouselApi) => {
    if (!api) return;
    setCanScrollPrev(api.canScrollPrev());
    setCanScrollNext(api.canScrollNext());
  }, []);

  const scrollPrev = React.useCallback(() => {
    api?.scrollPrev();
  }, [api]);

  const scrollNext = React.useCallback(() => {
    api?.scrollNext();
  }, [api]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        scrollPrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        scrollNext();
      }
    },
    [scrollPrev, scrollNext]
  );

  React.useEffect(() => {
    if (!api || !setApi) return;
    setApi(api);
  }, [api, setApi]);

  React.useEffect(() => {
    if (!api) return;
    onSelect(api);
    api.on('reInit', onSelect);
    api.on('select', onSelect);

    return () => {
      api?.off('select', onSelect);
    };
  }, [api, onSelect]);

  return (
    <CarouselContext.Provider
      value={{
        carouselRef,
        api: api,
        opts,
        orientation: orientation || (opts?.axis === 'y' ? 'vertical' : 'horizontal'),
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
      }}
    >
      <div
        onKeyDownCapture={handleKeyDown}
        className={cn('relative', className)}
        role="region"
        aria-roledescription="carousel"
        data-slot="carousel"
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  );
}

/**
 * CarouselContent — Scrollable viewport container for carousel slides.
 * Must be a direct child of `<Carousel>`.
 *
 * @ai-context
 * - Applies overflow-hidden on the viewport
 * - Uses negative margin + padding pattern for slide spacing
 * - Switches between -ml-4/pl-4 (horizontal) and -mt-4/pt-4 (vertical)
 */
function CarouselContent({ className, ...props }: React.ComponentProps<'div'>) {
  const { carouselRef, orientation } = useCarousel();

  return (
    <div ref={carouselRef} className="overflow-hidden" data-slot="carousel-content">
      <div
        className={cn('flex', orientation === 'horizontal' ? '-ml-4' : '-mt-4 flex-col', className)}
        {...props}
      />
    </div>
  );
}

/**
 * CarouselItem — Individual slide within CarouselContent.
 *
 * @ai-context
 * - basis-full by default (one slide visible at a time)
 * - Override with basis-1/2, basis-1/3, etc. for multi-slide views
 * - role="group" with aria-roledescription="slide" for accessibility
 */
function CarouselItem({ className, ...props }: React.ComponentProps<'div'>) {
  const { orientation } = useCarousel();

  return (
    <div
      role="group"
      aria-roledescription="slide"
      data-slot="carousel-item"
      className={cn(
        'min-w-0 shrink-0 grow-0 basis-full',
        orientation === 'horizontal' ? 'pl-4' : 'pt-4',
        className
      )}
      {...props}
    />
  );
}

/**
 * CarouselPrevious — Previous slide navigation button. Absolutely positioned.
 *
 * @ai-context
 * - Auto-disabled when at first slide (unless loop enabled)
 * - Position: -left-12 (horizontal) or -top-12 (vertical)
 * - Inherits Button props (variant, size, etc.)
 */
function CarouselPrevious({
  className,
  variant = 'outline',
  size = 'icon',
  ...props
}: React.ComponentProps<typeof Button>) {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel();

  return (
    <Button
      data-slot="carousel-previous"
      variant={variant}
      size={size}
      className={cn(
        'absolute size-8 rounded-full',
        orientation === 'horizontal'
          ? 'top-1/2 -left-12 -translate-y-1/2'
          : '-top-12 left-1/2 -translate-x-1/2 rotate-90',
        className
      )}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <ArrowLeft />
      <span className="sr-only">Previous slide</span>
    </Button>
  );
}

/**
 * CarouselNext — Next slide navigation button. Absolutely positioned.
 *
 * @ai-context
 * - Auto-disabled when at last slide (unless loop enabled)
 * - Position: -right-12 (horizontal) or -bottom-12 (vertical)
 * - Inherits Button props (variant, size, etc.)
 */
function CarouselNext({
  className,
  variant = 'outline',
  size = 'icon',
  ...props
}: React.ComponentProps<typeof Button>) {
  const { orientation, scrollNext, canScrollNext } = useCarousel();

  return (
    <Button
      data-slot="carousel-next"
      variant={variant}
      size={size}
      className={cn(
        'absolute size-8 rounded-full',
        orientation === 'horizontal'
          ? 'top-1/2 -right-12 -translate-y-1/2'
          : '-bottom-12 left-1/2 -translate-x-1/2 rotate-90',
        className
      )}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <ArrowRight />
      <span className="sr-only">Next slide</span>
    </Button>
  );
}

export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
};
