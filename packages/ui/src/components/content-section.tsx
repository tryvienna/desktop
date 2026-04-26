/**
 * ContentSection — Section wrapper with optional title, actions, and collapsible state
 *
 * @ai-context
 * - Density-aware via useContentDensity context
 * - Optional title with trailing action slot
 * - Collapsible with animated chevron icon
 * - Loading state renders Skeleton placeholders
 * - 8pt grid fix: collapsible button gap-1.5 → gap-2
 * - data-slot="content-section"
 *
 * @example
 * <ContentSection title="Details" titleAction={<Button size="xs">Edit</Button>}>
 *   <p>Section content</p>
 * </ContentSection>
 *
 * <ContentSection title="History" collapsible defaultCollapsed>
 *   <Timeline items={items} />
 * </ContentSection>
 */
import * as React from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { cn } from '../utils/cn';
import { Skeleton } from './skeleton';
import { useContentDensity, sectionSpacing } from './content-provider';

interface ContentSectionProps extends React.ComponentProps<'section'> {
  title?: string;
  titleIcon?: React.ReactNode;
  titleAction?: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  loading?: boolean;
  skeletonCount?: number;
}

function ContentSection({
  title,
  titleIcon,
  titleAction,
  collapsible = false,
  defaultCollapsed = false,
  loading = false,
  skeletonCount = 3,
  className,
  children,
  ...props
}: ContentSectionProps) {
  const density = useContentDensity();
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);

  return (
    <section
      data-slot="content-section"
      data-density={density}
      data-collapsed={collapsed}
      className={cn(sectionSpacing({ density }), className)}
      {...props}
    >
      {title && (
        <div className="flex items-center justify-between">
          {collapsible ? (
            <button
              type="button"
              onClick={() => setCollapsed((prev) => !prev)}
              className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-foreground/80 transition-colors"
            >
              <ChevronDownIcon
                className={cn(
                  'size-4 shrink-0 transition-transform duration-200',
                  collapsed && '-rotate-90'
                )}
              />
              {titleIcon}
              {title}
            </button>
          ) : (
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              {titleIcon}
              {title}
            </h3>
          )}
          {titleAction && <div className="flex items-center gap-2">{titleAction}</div>}
        </div>
      )}
      {!collapsed &&
        (loading ? (
          <div className="space-y-2">
            {Array.from({ length: skeletonCount }, (_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        ) : (
          children
        ))}
    </section>
  );
}

export { ContentSection };
export type { ContentSectionProps };
