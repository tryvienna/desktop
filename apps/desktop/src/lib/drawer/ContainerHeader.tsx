/**
 * ContainerHeader — Header bar for drawer panels with navigation and action buttons.
 *
 * @ai-context
 * - Layout order: [Back] [Icon] [Title] [Saving] [Actions] [Refresh] [Close]
 * - Uses HeaderContainer, HeaderTitle, IconButton, SavingIndicator from primitives
 * - Back button shown when showBackButton is true
 * - Close button hidden when hideClose is true (tabbed mode hides it, full mode shows it)
 * - Refresh button shows spinner when isRefreshing is true
 * - data-slot="drawer-header" on outer container
 */

import type { ReactNode } from 'react';
import { ChevronLeftIcon, RefreshCwIcon, XIcon } from 'lucide-react';
import { HeaderContainer, HeaderTitle, IconButton, SavingIndicator } from './primitives';

export interface ContainerHeaderProps {
  title?: ReactNode;
  titleLoading?: boolean;
  icon?: ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
  onClose?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  isSaving?: boolean;
  actions?: ReactNode;
  hideRefresh?: boolean;
  hideClose?: boolean;
  className?: string;
}

export function ContainerHeader({
  title,
  titleLoading,
  icon,
  showBackButton,
  onBack,
  onClose,
  onRefresh,
  isRefreshing,
  isSaving,
  actions,
  hideRefresh,
  hideClose,
  className,
}: ContainerHeaderProps) {
  return (
    <HeaderContainer className={className}>
      {showBackButton && (
        <IconButton
          onClick={onBack}
          aria-label="Go back"
          variant="subtle"
          data-slot="drawer-back-button"
        >
          <ChevronLeftIcon />
        </IconButton>
      )}

      {icon && (
        <span data-slot="drawer-header-icon" className="shrink-0 text-muted-foreground">
          {icon}
        </span>
      )}

      {title ? (
        <HeaderTitle loading={titleLoading}>{title}</HeaderTitle>
      ) : (
        <span className="flex-1" />
      )}

      {isSaving && <SavingIndicator />}

      {actions}

      {!hideRefresh && onRefresh && (
        <IconButton
          onClick={onRefresh}
          aria-label="Refresh"
          variant="subtle"
          className={isRefreshing ? 'animate-spin' : ''}
        >
          <RefreshCwIcon />
        </IconButton>
      )}

      {!hideClose && onClose && (
        <IconButton
          onClick={onClose}
          aria-label="Close drawer"
          variant="subtle"
          data-slot="drawer-close-button"
        >
          <XIcon />
        </IconButton>
      )}
    </HeaderContainer>
  );
}
