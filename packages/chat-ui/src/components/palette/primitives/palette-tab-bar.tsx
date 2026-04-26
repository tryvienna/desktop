/**
 * PaletteTabBar - Horizontal tabs with animated indicator
 *
 * Provides tab navigation for palette components with a smooth animated
 * underline indicator, result count badges, and hidden scrollbar for
 * overflow on narrow viewports.
 *
 * @module PaletteTabBar
 *
 * Token mapping (aligned with @tryvienna/ui):
 * - `text-foreground` — primary text color
 * - `text-muted-foreground` — muted text color
 * - `bg-surface-hover` — interactive hover background
 *
 * @ai-context
 * - Uses a `Map<string, HTMLButtonElement>` ref to track tab elements for
 *   computing the animated indicator's offsetLeft/offsetWidth.
 * - The indicator lives inside the scroll container so it scrolls with tabs.
 * - Badge colors switch between brand (active) and surface-hover (inactive).
 * - The scrollbar is completely hidden across all browsers using vendor-specific
 *   CSS properties.
 */

import { useRef, useEffect } from 'react';

import { cn } from '@tryvienna/ui';

import type { PaletteTab } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface PaletteTabBarProps {
  /** Tab configuration array defining available tabs */
  tabs: PaletteTab[];
  /** Currently active tab ID */
  activeTab: string;
  /** Called when user clicks a different tab */
  onTabChange: (tabId: string) => void;
  /** Optional map of tab ID to result count, displayed as badges */
  resultCounts?: Record<string, number>;
  /** Additional className for the outer wrapper */
  className?: string;
}

/**
 * PaletteTabBar - Horizontal tab navigation with animated indicator.
 *
 * Design features:
 * - Fixed height (32px) to prevent layout shift
 * - Animated underline indicator (brand color)
 * - Result count badges with theme-aware colors
 * - Hover states with smooth transitions
 * - Hidden scrollbar for horizontal overflow
 *
 * @example
 * ```tsx
 * <PaletteTabBar
 *   tabs={[
 *     { id: 'all', label: 'All', shortLabel: 'All' },
 *     { id: 'files', label: 'Files', shortLabel: 'Files' },
 *     { id: 'linear', label: 'Linear', shortLabel: 'Linear' },
 *   ]}
 *   activeTab="all"
 *   onTabChange={setActiveTab}
 *   resultCounts={{ all: 42, files: 12, linear: 8 }}
 * />
 * ```
 */
export function PaletteTabBar({
  tabs,
  activeTab,
  onTabChange,
  resultCounts,
  className,
}: PaletteTabBarProps) {
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const indicatorRef = useRef<HTMLDivElement>(null);

  // Update indicator position and scroll active tab into view when active tab changes
  useEffect(() => {
    const activeTabElement = tabRefs.current.get(activeTab);
    const indicator = indicatorRef.current;

    if (activeTabElement && indicator) {
      const { offsetLeft, offsetWidth } = activeTabElement;
      indicator.style.transform = `translateX(${offsetLeft}px)`;
      indicator.style.width = `${offsetWidth}px`;

      // Scroll active tab into view (horizontal)
      activeTabElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center', // Center horizontally in the scrollable container
      });
    }
  }, [activeTab, tabs]);

  return (
    <div data-slot="palette-tab-bar" className={cn('border-b border-border-default', className)}>
      <div className="relative flex overflow-x-auto px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {/* Horizontal scroll with padding, hidden scrollbar */}
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const count = resultCounts?.[tab.id];

          return (
            <button
              key={tab.id}
              ref={(el) => {
                if (el) tabRefs.current.set(tab.id, el);
              }}
              onClick={() => onTabChange(tab.id)}
              data-slot="palette-tab"
              data-tab-id={tab.id}
              data-active={isActive}
              className={cn(
                // Layout
                'relative flex h-8 items-center px-3 flex-shrink-0',
                // Typography
                'text-sm font-medium',
                // Colors (Vienna tokens)
                isActive ? 'text-foreground' : 'text-muted-foreground',
                // Transitions
                'transition-colors duration-150',
                // Hover (only when not active)
                !isActive && 'hover:text-foreground',
                // Focus
                'outline-none focus-visible:text-foreground'
              )}
            >
              <span className="flex h-4 items-center gap-1.5">
                <span>{tab.shortLabel || tab.label}</span>
                {count !== undefined && count > 0 && (
                  <span
                    data-slot="palette-tab-badge"
                    className={cn(
                      // Layout
                      'inline-flex min-w-4 items-center justify-center',
                      'h-4 rounded-full px-1.5',
                      // Typography
                      'text-xs font-semibold leading-none',
                      // Colors (Vienna tokens)
                      isActive ? 'bg-brand/20 text-brand' : 'bg-surface-hover text-muted-foreground'
                    )}
                  >
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </span>
            </button>
          );
        })}

        {/* Animated underline indicator - inside scroll container so it moves with tabs */}
        <div
          ref={indicatorRef}
          data-slot="palette-tab-indicator"
          className={cn(
            'absolute bottom-0 h-0.5 w-0',
            'bg-brand',
            'transition-all duration-200 ease-out'
          )}
        />
      </div>
    </div>
  );
}
