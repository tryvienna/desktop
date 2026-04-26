/**
 * ZoomIndicator — Bottom-center floating pill that shows the current zoom level.
 *
 * @ai-context
 * Appears when the user zooms in/out (Cmd+=/Cmd+-), updates in-place on
 * repeated presses, and auto-hides after a timeout. Shows a "Reset" button
 * when zoom ≠ 100%. Uses a CSS transition for enter/exit animation.
 */
import { useEffect, useRef, useCallback } from 'react';

const AUTO_HIDE_MS = 2000;

/** Convert Electron zoom level (0 = 100%) to a display percentage. */
function zoomLevelToPercent(level: number): number {
  return Math.round(Math.pow(1.2, level) * 100);
}

interface ZoomIndicatorProps {
  /** Electron zoom level (0 = 100%). Changes to this value reset the auto-hide timer. */
  zoomLevel: number | null;
  /** Called when the user clicks "Reset". */
  onReset: () => void;
  /** Called when the indicator auto-hides (so parent can clear the zoom level). */
  onDismiss: () => void;
}

export function ZoomIndicator({ zoomLevel, onReset, onDismiss }: ZoomIndicatorProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const visible = zoomLevel !== null;

  const scheduleHide = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onDismiss, AUTO_HIDE_MS);
  }, [onDismiss]);

  // Reset auto-hide timer whenever zoomLevel changes
  useEffect(() => {
    if (visible) {
      scheduleHide();
    }
    return () => clearTimeout(timerRef.current);
  }, [zoomLevel, visible, scheduleHide]);

  const percent = zoomLevel !== null ? zoomLevelToPercent(zoomLevel) : 100;
  const isDefault = percent === 100;

  return (
    <div
      data-slot="zoom-indicator"
      className={`
        fixed bottom-6 left-1/2 z-50 -translate-x-1/2
        flex items-center gap-2 rounded-full border border-border
        bg-background/95 px-4 py-2 shadow-lg backdrop-blur-sm
        text-sm font-medium text-foreground
        transition-all duration-200 ease-out
        ${visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'}
      `}
    >
      <span className="tabular-nums">{percent}%</span>
      {!isDefault && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReset();
          }}
          className="ml-0.5 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
        >
          Reset
        </button>
      )}
    </div>
  );
}
