/**
 * PaletteSection — Section header for grouped palette results
 *
 * @ai-context
 * - Renders uppercase label dividers between result groups (e.g., "Recent", "Files")
 * - Optional inline spinner for streaming/progressive loading per section
 * - data-slot="palette-section"
 *
 * @example
 * <PaletteSection title="Recent" isLoading={false} />
 */

import { cn } from '@tryvienna/ui';

// =============================================================================
// SPINNER
// =============================================================================

/**
 * Inline SVG spinner used for section loading indicators.
 * Avoids importing Spinner from @tryvienna/ui to keep the dependency lightweight
 * and avoid potential API mismatches.
 */
function SectionSpinner() {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      className="text-muted-foreground animate-spin"
      aria-label="Loading section"
    >
      <circle cx={12} cy={12} r={9} stroke="currentColor" strokeWidth={2} strokeOpacity={0.25} />
      <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

// =============================================================================
// COMPONENT
// =============================================================================

export interface PaletteSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Section title displayed as an uppercase label */
  title: string;
  /** Whether this section is still loading results */
  isLoading?: boolean;
}

/**
 * PaletteSection - Group label for result sections.
 *
 * Renders a compact section header with uppercase small text and letter-spacing,
 * consistent with standard design system section labels. An optional loading
 * spinner is shown when the section is still streaming or fetching results.
 *
 * Design features:
 * - Uppercase small text with increased letter-spacing
 * - Muted color following the design system
 * - Optional animated loading spinner for streaming results
 * - Consistent with NavSectionLabel styling
 *
 * @example
 * ```tsx
 * <PaletteSection title="Recent" />
 * <PaletteSection title="Files" isLoading={isFilesLoading} />
 * ```
 */
export function PaletteSection({ title, isLoading, className, ...props }: PaletteSectionProps) {
  return (
    <div
      data-slot="palette-section"
      data-loading={isLoading}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5',
        'text-xs font-medium uppercase tracking-wider text-muted-foreground',
        className
      )}
      {...props}
    >
      {title}
      {isLoading && <SectionSpinner />}
    </div>
  );
}
