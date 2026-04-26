/**
 * DrawerContentRenderer — Bridge between drawer state and the content registry.
 *
 * @ai-context
 * - Reads current mode from DrawerStateContext
 * - In full mode: reads content from mode descriptor, resolves via registry
 * - In tabbed mode: reads active tab's top stack item, wraps in DrawerNavigationProvider
 * - Stack animation: push slides from right, pop slides from left (180ms ease-out)
 * - Fallback: renders "No renderer registered" for unknown content
 * - Uses useDrawerRegistrySnapshot to re-render when registrations change
 */

import { useRef, useEffect, useState, type ReactNode } from 'react';
import { useDrawerState } from './DrawerStateContext';
import { useDrawerRegistrySnapshot } from './DrawerRegistryContext';
import { DrawerNavigationProvider } from './DrawerNavigationContext';
import { DrawerContainer } from './DrawerContainer';
import { STACK_ANIMATION_DURATION } from './constants';
import { cn } from '@tryvienna/ui';

export function DrawerContentRenderer() {
  const { isOpen, isFull, isTabbed, activeTab, state } = useDrawerState();
  const registry = useDrawerRegistrySnapshot();

  if (!isOpen) return null;

  if (isFull && state.mode.type === 'full') {
    const content = state.mode.content;
    const rendered = registry.render(content);

    if (rendered) return <>{rendered}</>;

    return (
      <DrawerContainer id="unknown" title="Unknown Content">
        <div className="p-4 text-sm text-muted-foreground">
          No renderer registered for content: {content.contentId}
        </div>
      </DrawerContainer>
    );
  }

  if (isTabbed && activeTab) {
    const stackLength = activeTab.stack.length;
    const topItem = stackLength > 0 ? activeTab.stack[stackLength - 1] : null;

    if (!topItem) {
      return (
        <DrawerNavigationProvider tabId={activeTab.id}>
          <DrawerContainer id={`tab-${activeTab.id}-empty`} title={activeTab.label}>
            <div className="p-4 text-sm text-muted-foreground">No content</div>
          </DrawerContainer>
        </DrawerNavigationProvider>
      );
    }

    const rendered = registry.render(topItem.content);

    return (
      <DrawerNavigationProvider tabId={activeTab.id}>
        <StackAnimationWrapper
          contentId={`${topItem.content.contentId}-${activeTab.id}`}
          stackLength={stackLength}
        >
          {rendered ?? (
            <DrawerContainer id={`tab-${activeTab.id}-unknown`} title={topItem.title}>
              <div className="p-4 text-sm text-muted-foreground">
                No renderer registered for content: {topItem.content.contentId}
              </div>
            </DrawerContainer>
          )}
        </StackAnimationWrapper>
      </DrawerNavigationProvider>
    );
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Stack Animation Wrapper
// ═══════════════════════════════════════════════════════════════════════════

interface StackAnimationWrapperProps {
  contentId: string;
  stackLength: number;
  children: ReactNode;
}

function StackAnimationWrapper({
  contentId,
  stackLength,
  children,
}: StackAnimationWrapperProps) {
  const prevStackLength = useRef(stackLength);
  const [animationClass, setAnimationClass] = useState('');

  useEffect(() => {
    if (stackLength > prevStackLength.current) {
      setAnimationClass('drawer-stack-push');
    } else if (stackLength < prevStackLength.current) {
      setAnimationClass('drawer-stack-pop');
    }
    prevStackLength.current = stackLength;

    const timer = setTimeout(() => setAnimationClass(''), STACK_ANIMATION_DURATION);
    return () => clearTimeout(timer);
  }, [stackLength]);

  return (
    <div
      key={contentId}
      className={cn('h-full', animationClass)}
      style={{
        // Inline animation styles
        ...(animationClass === 'drawer-stack-push'
          ? {
              animation: `drawerSlideInRight ${STACK_ANIMATION_DURATION}ms ease-out`,
            }
          : animationClass === 'drawer-stack-pop'
            ? {
                animation: `drawerSlideInLeft ${STACK_ANIMATION_DURATION}ms ease-out`,
              }
            : {}),
      }}
    >
      {children}
    </div>
  );
}
