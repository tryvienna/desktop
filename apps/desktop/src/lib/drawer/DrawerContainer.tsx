/**
 * DrawerContainer — Per-panel wrapper component with header, scrollable content, and footer.
 *
 * @ai-context
 * - Auto-detects back button from DrawerNavigationContext (shows if canGoBack is true)
 * - Auto-detects close behavior: hidden in tabbed mode, shown in full mode
 * - Title priority: navigation context current?.title > prop title
 * - Uses useFocusTrap for keyboard Tab cycling within the drawer
 * - Footer pinned at bottom via footer prop, content scrollable in center
 * - data-slot="drawer-container" on outer div
 */

import type { ReactNode } from 'react';
import { ContainerHeader } from './ContainerHeader';
import { ContentContainer } from './primitives';
import { useFocusTrap } from './useFocusTrap';
import { useDrawerStateOptional } from './DrawerStateContext';
import { useDrawerActionsOptional } from './DrawerActionsContext';
import { useDrawerNavigationOptional } from './DrawerNavigationContext';
import { cn } from '@tryvienna/ui';
import { SelectionCaptureWrapper } from '@vienna/chat-ui';

export interface DrawerContainerProps {
  id?: string;
  title?: ReactNode;
  titleLoading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
  onClose?: () => void;
  isSaving?: boolean;
  headerActions?: ReactNode;
  hideRefresh?: boolean;
  hideClose?: boolean;
  className?: string;
  contentClassName?: string;
  trapFocus?: boolean;
  footer?: ReactNode;
  /** Rendered between the header and the scrollable content area (outside scroll). */
  subheader?: ReactNode;
  /** Disable the "Ask Vienna" selection popover in this drawer */
  disableAutoSelection?: boolean;
}

export function DrawerContainer({
  id,
  title: titleProp,
  titleLoading,
  icon,
  children,
  showBackButton: showBackButtonProp,
  onBack: onBackProp,
  onClose: onCloseProp,
  isSaving,
  headerActions,
  hideRefresh,
  hideClose: hideCloseProp,
  className,
  contentClassName,
  trapFocus = true,
  footer,
  subheader,
  disableAutoSelection,
}: DrawerContainerProps) {
  const drawerState = useDrawerStateOptional();
  const drawerActions = useDrawerActionsOptional();
  const navigation = useDrawerNavigationOptional();

  // Auto-detect back button
  const showBackButton = showBackButtonProp ?? navigation?.canGoBack ?? false;
  const onBack = onBackProp ?? (() => navigation?.pop());

  // Auto-detect close: hidden in tabbed (tab bar has close), shown in full
  const hideClose = hideCloseProp ?? (drawerState?.isTabbed ? true : false);
  const onClose = onCloseProp ?? (() => drawerActions?.close());

  // Title priority: nav context > prop
  const title = navigation?.current?.title ?? titleProp;

  // Refresh from navigation
  const onRefresh = navigation?.refresh;
  const isRefreshing = navigation?.isRefreshing;

  const focusTrapRef = useFocusTrap({
    active: trapFocus && (drawerState?.isOpen ?? false),
    onEscape: onClose,
  });

  return (
    <div
      ref={focusTrapRef}
      data-slot="drawer-container"
      data-drawer-id={id}
      className={cn('flex h-full flex-col', className)}
    >
      <ContainerHeader
        title={title}
        titleLoading={titleLoading}
        icon={icon}
        showBackButton={showBackButton}
        onBack={onBack}
        onClose={onClose}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
        isSaving={isSaving}
        actions={headerActions}
        hideRefresh={hideRefresh}
        hideClose={hideClose}
      />

      {subheader}

      <ContentContainer className={contentClassName}>
        <SelectionCaptureWrapper
          drawerId={id ?? 'drawer'}
          drawerTitle={typeof title === 'string' ? title : undefined}
          disabled={disableAutoSelection}
        >
          {children}
        </SelectionCaptureWrapper>
      </ContentContainer>

      {footer}
    </div>
  );
}
