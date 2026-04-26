/**
 * Timeline — Vertical timeline with connecting line and dot variants
 *
 * @ai-context
 * - Density-aware via useContentDensity context
 * - Vertical timeline with connecting line between items
 * - Dot variants: default (muted), active (primary), success, destructive
 * - Optional icon override for dots
 * - 8pt grid fix: [&>svg]:size-3.5 → [&>svg]:size-4
 * - data-slot="timeline", data-slot="timeline-item", data-slot="timeline-dot"
 *
 * @example
 * <Timeline
 *   items={[
 *     { title: 'Created', description: 'Issue was created', timestamp: '2 hours ago' },
 *     { title: 'In Progress', description: 'Work started', variant: 'active' },
 *     { title: 'Resolved', description: 'Issue fixed', variant: 'success' },
 *   ]}
 * />
 */
import * as React from 'react';
import { cn } from '../utils/cn';
import { useContentDensity, timelineSpacing } from './content-provider';

type TimelineDotVariant = 'default' | 'active' | 'success' | 'destructive';

interface TimelineItem {
  title: React.ReactNode;
  description?: React.ReactNode;
  timestamp?: React.ReactNode;
  variant?: TimelineDotVariant;
  icon?: React.ReactNode;
}

interface TimelineProps extends React.ComponentProps<'div'> {
  items: TimelineItem[];
}

const dotVariants: Record<TimelineDotVariant, string> = {
  default: 'bg-muted-foreground/40',
  active: 'bg-primary',
  success: 'bg-emerald-500',
  destructive: 'bg-destructive',
};

function Timeline({ items, className, ...props }: TimelineProps) {
  const density = useContentDensity();

  return (
    <div
      data-slot="timeline"
      data-density={density}
      className={cn('relative flex flex-col', timelineSpacing({ density }), className)}
      {...props}
    >
      {/* Connecting line */}
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

      {items.map((item, index) => (
        <div key={index} data-slot="timeline-item" className="relative flex gap-3">
          {/* Dot */}
          <div
            data-slot="timeline-dot"
            data-variant={item.variant ?? 'default'}
            className={cn(
              'relative z-10 mt-1 flex size-4 shrink-0 items-center justify-center rounded-full [&>svg]:size-4',
              item.icon
                ? 'bg-background text-muted-foreground'
                : dotVariants[item.variant ?? 'default'],
              !item.icon && 'size-2 ml-1 mr-1'
            )}
          >
            {item.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-foreground truncate">{item.title}</span>
              {item.timestamp && (
                <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                  {item.timestamp}
                </span>
              )}
            </div>
            {item.description && (
              <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export { Timeline };
export type { TimelineItem, TimelineProps, TimelineDotVariant };
