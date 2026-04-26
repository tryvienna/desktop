/**
 * LoadingState — Standardized loading indicator for panels, sections, and pages
 *
 * @ai-context
 * - Combines Spinner with optional label and description
 * - 3 variants: inline (horizontal), centered (fills container), fullscreen (fills viewport)
 * - Uses Spinner internally — configure spinner size/variant via spinnerSize/spinnerVariant
 * - All spacing on 8pt grid
 * - data-slot="loading-state"
 *
 * @example
 * <LoadingState />
 * <LoadingState label="Loading workstreams..." />
 * <LoadingState variant="centered" label="Loading" description="This may take a moment" />
 */
import * as React from 'react';
import { cn } from '../utils/cn';
import { Spinner, type SpinnerProps } from './spinner';

interface LoadingStateProps extends React.ComponentProps<'div'> {
  /** Layout variant */
  variant?: 'inline' | 'centered' | 'fullscreen';
  /** Primary label shown next to/below spinner */
  label?: string;
  /** Secondary description */
  description?: string;
  /** Spinner size (passed to Spinner component) */
  spinnerSize?: SpinnerProps['size'];
  /** Spinner color variant (passed to Spinner component) */
  spinnerVariant?: SpinnerProps['variant'];
}

function LoadingState({
  variant = 'centered',
  label,
  description,
  spinnerSize,
  spinnerVariant = 'muted',
  className,
  ...props
}: LoadingStateProps) {
  const defaultSize = variant === 'inline' ? 'sm' : 'md';
  const size = spinnerSize ?? defaultSize;

  if (variant === 'inline') {
    return (
      <div
        data-slot="loading-state"
        className={cn('flex items-center gap-2', className)}
        {...props}
      >
        <Spinner size={size} variant={spinnerVariant} />
        {label && <span className="text-sm text-muted-foreground">{label}</span>}
      </div>
    );
  }

  return (
    <div
      data-slot="loading-state"
      className={cn(
        'flex flex-col items-center justify-center gap-3',
        variant === 'centered' && 'flex-1 py-12',
        variant === 'fullscreen' && 'fixed inset-0 z-50 bg-background/80',
        className
      )}
      {...props}
    >
      <Spinner size={size} variant={spinnerVariant} />
      {(label || description) && (
        <div className="flex flex-col items-center gap-1 text-center">
          {label && <p className="text-sm font-medium text-muted-foreground">{label}</p>}
          {description && <p className="text-xs text-muted-foreground/70">{description}</p>}
        </div>
      )}
    </div>
  );
}

export { LoadingState };
export type { LoadingStateProps };
