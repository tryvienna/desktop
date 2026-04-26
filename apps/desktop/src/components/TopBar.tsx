/**
 * TopBar — macOS-style title bar with composable content slots.
 *
 * Provides the 40px drag region at the top of the content area.
 * Interactive elements in the center/trailing slots automatically
 * opt out of the drag region via WebkitAppRegion: 'no-drag'.
 *
 * @ai-context
 * - Slot-based composition: center (title/status), trailing (future branch picker)
 * - 40px height matches macOS traffic-light inset (pt-10 on side panels)
 * - The outer header is draggable; inner slots are no-drag so buttons work
 * - Semantic <header> for accessibility
 * - data-slot="top-bar" for CSS targeting
 */

import { memo, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@tryvienna/ui';

export interface TopBarProps {
  /** Content rendered in the center slot (e.g., WorkstreamTitle) */
  center?: ReactNode;
  /** Content rendered in the trailing slot (e.g., future BranchPicker) */
  trailing?: ReactNode;
  className?: string;
}

export const TopBar = memo(function TopBar({ center, trailing, className }: TopBarProps) {
  return (
    <header
      data-slot="top-bar"
      className={cn('relative flex flex-shrink-0 items-center justify-center', className)}
      style={
        {
          height: 40,
          WebkitAppRegion: 'drag',
        } as CSSProperties
      }
    >
      {center && (
        <div
          data-slot="top-bar-center"
          style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}
        >
          {center}
        </div>
      )}
      {trailing && (
        <div
          data-slot="top-bar-trailing"
          className="absolute right-2"
          style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}
        >
          {trailing}
        </div>
      )}
    </header>
  );
});
