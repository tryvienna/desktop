/**
 * PaletteStates — Feedback states for palette components
 *
 * @ai-context
 * - EmptyState: "no results" with optional hint — data-slot="palette-empty-state"
 * - LoadingState: centered spinner with message — data-slot="palette-loading-state"
 * - ErrorState: alert icon with optional retry button — data-slot="palette-error-state"
 * - DisconnectedState: globe icon with optional connect button — data-slot="palette-disconnected-state"
 * - All states are centered, theme-aware, and self-contained (no @tryvienna/ui Button dep)
 *
 * @example
 * <EmptyState message="No results" hint="Try another term" />
 */

import { cn } from '@tryvienna/ui';

// =============================================================================
// INLINE SVG ICONS
// =============================================================================

/**
 * Inline SVG spinner. Avoids importing Spinner from @tryvienna/ui to keep the
 * dependency lightweight and avoid potential API mismatches.
 */
function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('animate-spin', className)}
      aria-hidden="true"
    >
      <circle cx={12} cy={12} r={9} stroke="currentColor" strokeWidth={2} strokeOpacity={0.25} />
      <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

/**
 * Inline AlertCircle SVG icon. Avoids importing from lucide-react to keep
 * this module self-contained.
 */
function AlertCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx={12} cy={12} r={10} />
      <line x1={12} y1={8} x2={12} y2={12} />
      <line x1={12} y1={16} x2={12.01} y2={16} />
    </svg>
  );
}

/**
 * Inline Globe SVG icon. Avoids importing from lucide-react to keep
 * this module self-contained.
 */
function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx={12} cy={12} r={10} />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

// =============================================================================
// EMPTY STATE
// =============================================================================

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Primary message displayed when no results are found */
  message: string;
  /** Optional secondary hint providing guidance (e.g., "Try a different search term") */
  hint?: string;
}

/**
 * EmptyState - Display when no results are found.
 *
 * Shows a centered message with optional hint text. Used in palettes when a
 * search returns no matches or when there are no items to display.
 *
 * @example
 * ```tsx
 * <EmptyState
 *   message="No commands found"
 *   hint="Try a different search term"
 * />
 * ```
 */
export function EmptyState({ message, hint, className, ...props }: EmptyStateProps) {
  return (
    <div
      data-slot="palette-empty-state"
      className={cn('flex flex-col items-center justify-center py-8 text-center', className)}
      {...props}
    >
      <p className="text-md text-muted-foreground">{message}</p>
      {hint && <p className="mt-1 text-sm text-muted-foreground/75">{hint}</p>}
    </div>
  );
}

// =============================================================================
// LOADING STATE
// =============================================================================

export interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional loading message (defaults to "Loading...") */
  message?: string;
}

/**
 * LoadingState - Display during async operations.
 *
 * Shows a centered spinner with a status message. Uses `role="status"` and
 * `aria-live="polite"` for screen reader accessibility.
 *
 * @example
 * ```tsx
 * <LoadingState message="Searching..." />
 * ```
 */
export function LoadingState({ message = 'Loading...', className, ...props }: LoadingStateProps) {
  return (
    <div
      data-slot="palette-loading-state"
      className={cn('flex flex-col items-center justify-center gap-2 py-8', className)}
      role="status"
      aria-live="polite"
      {...props}
    >
      <SpinnerIcon className="text-muted-foreground" />
      <p className="text-md text-muted-foreground">{message}</p>
    </div>
  );
}

// =============================================================================
// ERROR STATE
// =============================================================================

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Error message describing what went wrong */
  message: string;
  /** Optional retry callback; when provided, a retry button is shown */
  onRetry?: () => void;
  /** Optional retry button text (defaults to "Retry") */
  retryText?: string;
}

/**
 * ErrorState - Display when an error occurs.
 *
 * Shows a centered error icon with message and optional retry button. Uses
 * `role="alert"` for immediate screen reader announcement. The retry button
 * uses a native `<button>` element styled inline to avoid @tryvienna/ui Button
 * dependency.
 *
 * @example
 * ```tsx
 * <ErrorState
 *   message="Failed to load results"
 *   onRetry={() => refetch()}
 *   retryText="Try again"
 * />
 * ```
 */
export function ErrorState({
  message,
  onRetry,
  retryText = 'Retry',
  className,
  ...props
}: ErrorStateProps) {
  return (
    <div
      data-slot="palette-error-state"
      className={cn('flex flex-col items-center justify-center gap-3 py-8', className)}
      role="alert"
      {...props}
    >
      <AlertCircleIcon className="size-6 text-error" />
      <p className="text-md text-muted-foreground">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            'px-3 py-1.5 text-xs rounded-lg',
            'border border-border-muted bg-surface-interactive',
            'text-muted-foreground hover:text-foreground',
            'transition-colors duration-150'
          )}
        >
          {retryText}
        </button>
      )}
    </div>
  );
}

// =============================================================================
// DISCONNECTED STATE
// =============================================================================

export interface DisconnectedStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Name of the integration that is not connected (e.g., "Linear", "GitHub") */
  integrationName: string;
  /** Optional connect callback; when provided, a connect button is shown */
  onConnect?: () => void;
  /** Optional connect button text (defaults to "Connect") */
  connectText?: string;
}

/**
 * DisconnectedState - Display when an integration is not connected.
 *
 * Shows a centered globe icon with integration name and optional connect button.
 * Used in entity palettes when a data source requires authentication or setup.
 * The connect button uses a native `<button>` element styled inline to avoid
 * @tryvienna/ui Button dependency.
 *
 * @example
 * ```tsx
 * <DisconnectedState
 *   integrationName="Linear"
 *   onConnect={() => openLinearAuth()}
 *   connectText="Connect Linear"
 * />
 * ```
 */
export function DisconnectedState({
  integrationName,
  onConnect,
  connectText = 'Connect',
  className,
  ...props
}: DisconnectedStateProps) {
  return (
    <div
      data-slot="palette-disconnected-state"
      className={cn('flex flex-col items-center justify-center gap-3 py-8', className)}
      {...props}
    >
      <GlobeIcon className="size-6 text-muted-foreground" />
      <p className="text-md text-muted-foreground">{integrationName} is not connected</p>
      {onConnect && (
        <button
          type="button"
          onClick={onConnect}
          className={cn(
            'px-3 py-1.5 text-xs rounded-lg',
            'bg-brand text-white',
            'hover:bg-brand/90',
            'transition-colors duration-150'
          )}
        >
          {connectText}
        </button>
      )}
    </div>
  );
}
