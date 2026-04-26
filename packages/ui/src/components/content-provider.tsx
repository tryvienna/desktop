/**
 * ContentProvider — Context-based density system for content layout
 *
 * @ai-context
 * - Three density levels: compact, default, relaxed
 * - Provides density context consumed by ContentSection, MetadataList, Timeline
 * - CVA helpers: sectionSpacing, metadataSpacing, timelineSpacing
 * - All spacing values on 4px sub-grid (no .5 values)
 * - 8pt grid fix: metadataSpacing compact gap-1.5 → gap-2
 *
 * @example
 * <ContentProvider density="compact">
 *   <ContentSection title="Details">
 *     <MetadataList items={items} />
 *   </ContentSection>
 * </ContentProvider>
 */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

type ContentDensity = 'compact' | 'default' | 'relaxed';

const ContentDensityContext = React.createContext<ContentDensity>('compact');

function useContentDensity(): ContentDensity {
  return React.useContext(ContentDensityContext);
}

interface ContentProviderProps {
  density?: ContentDensity;
  children: React.ReactNode;
}

function ContentProvider({ density = 'compact', children }: ContentProviderProps) {
  const value = React.useMemo(() => density, [density]);
  return <ContentDensityContext.Provider value={value}>{children}</ContentDensityContext.Provider>;
}

const sectionSpacing = cva('', {
  variants: {
    density: {
      compact: 'space-y-2 py-2',
      default: 'space-y-4 py-4',
      relaxed: 'space-y-6 py-6',
    },
  },
  defaultVariants: { density: 'compact' },
});

const metadataSpacing = cva('', {
  variants: {
    density: {
      compact: 'gap-2 text-sm',
      default: 'gap-2 text-sm',
      relaxed: 'gap-3 text-base',
    },
  },
  defaultVariants: { density: 'compact' },
});

const timelineSpacing = cva('', {
  variants: {
    density: {
      compact: 'gap-3 pl-6',
      default: 'gap-4 pl-8',
      relaxed: 'gap-6 pl-10',
    },
  },
  defaultVariants: { density: 'compact' },
});

export { ContentProvider, useContentDensity, sectionSpacing, metadataSpacing, timelineSpacing };
export type { ContentDensity, ContentProviderProps };
export type SectionSpacingProps = VariantProps<typeof sectionSpacing>;
export type MetadataSpacingProps = VariantProps<typeof metadataSpacing>;
export type TimelineSpacingProps = VariantProps<typeof timelineSpacing>;
