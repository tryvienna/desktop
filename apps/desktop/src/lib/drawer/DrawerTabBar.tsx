/**
 * DrawerTabBar — Tab bar using Radix primitives with drawer-specific styling.
 *
 * @ai-context
 * - Uses @radix-ui/react-tabs directly (not the design system pill-style Tabs)
 *   to avoid fighting base styles and layout issues
 * - Drawer-specific styling: subtle bg-surface-interactive/30 container, rounded-md triggers
 * - Auto-scrolls active tab into view when it changes
 * - Shows icon + label (or skeleton when labelLoading) + close button per tab
 * - Close button visible only on hover/focus-within (opacity transition)
 * - Hidden automatically when not in tabbed mode (returns null)
 * - Drawer-level close button at the right end of the bar
 * - data-slot="drawer-tab-bar" on outer container
 */

import { useRef, useEffect, useCallback } from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { XIcon } from 'lucide-react';
import { Skeleton, cn } from '@tryvienna/ui';
import { useDrawerState } from './DrawerStateContext';
import { useDrawerActions } from './DrawerActionsContext';
import { TabBarContainer, TabCloseButton, IconButton } from './primitives';

export interface DrawerTabBarProps {
  className?: string;
}

export function DrawerTabBar({ className }: DrawerTabBarProps) {
  const { isTabbed, activeTab, state } = useDrawerState();
  const { setActiveTab, closeTab, close } = useDrawerActions();
  const tabsListRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active tab into view
  useEffect(() => {
    if (!isTabbed || !activeTab || !tabsListRef.current) return;

    const activeElement = tabsListRef.current.querySelector(
      `[data-state="active"]`
    );
    if (activeElement) {
      activeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [isTabbed, activeTab?.id]);

  const handleCloseTab = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      e.stopPropagation();
      closeTab(tabId);
    },
    [closeTab]
  );

  if (!isTabbed) return null;

  return (
    <TabsPrimitive.Root
      value={state.activeTabId ?? undefined}
      onValueChange={setActiveTab}
    >
      <TabBarContainer className={className}>
        <TabsPrimitive.List
          ref={tabsListRef}
          data-slot="drawer-tabs-list"
          className="flex flex-1 items-center gap-0.5 overflow-x-auto scrollbar-hide min-w-0"
        >
          {state.tabs.map((tab) => (
            <TabsPrimitive.Trigger
              key={tab.id}
              value={tab.id}
              data-slot="drawer-tab-trigger"
              className={cn(
                'group relative inline-flex items-center gap-1.5 px-3 py-1.5',
                'text-sm font-medium text-muted-foreground',
                'rounded-md transition-colors',
                'hover:text-foreground hover:bg-surface-interactive/50',
                'data-[state=active]:text-foreground data-[state=active]:bg-surface-interactive',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'whitespace-nowrap max-w-[180px]',
                '[&_svg:not([class*="size-"])]:size-4'
              )}
            >
              {tab.icon && (
                <span className="shrink-0 text-muted-foreground group-data-[state=active]:text-foreground">
                  {tab.icon}
                </span>
              )}

              {tab.labelLoading ? (
                <Skeleton className="h-4 w-16" />
              ) : (
                <>
                  <span className="truncate">{tab.label}</span>
                  {tab.isDirty && (
                    <span className="shrink-0 text-muted-foreground text-[8px]">{'\u25CF'}</span>
                  )}
                </>
              )}

              {tab.closable !== false && (
                <TabCloseButton
                  onClick={(e) => handleCloseTab(e, tab.id)}
                  aria-label={`Close ${tab.label}`}
                >
                  <XIcon />
                </TabCloseButton>
              )}
            </TabsPrimitive.Trigger>
          ))}
        </TabsPrimitive.List>

        <IconButton
          onClick={close}
          aria-label="Close drawer"
          className="shrink-0"
        >
          <XIcon />
        </IconButton>
      </TabBarContainer>
    </TabsPrimitive.Root>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DrawerTabContent — renders children only when active tab exists
// ═══════════════════════════════════════════════════════════════════════════

export interface DrawerTabContentProps {
  children: React.ReactNode;
  className?: string;
}

export function DrawerTabContent({ children, className }: DrawerTabContentProps) {
  const { isTabbed, activeTab } = useDrawerState();

  // In tabbed mode, only render if there is an active tab
  if (isTabbed && !activeTab) return null;

  return (
    <div data-slot="drawer-tab-content" className={cn('flex-1 min-h-0', className)}>
      {children}
    </div>
  );
}
