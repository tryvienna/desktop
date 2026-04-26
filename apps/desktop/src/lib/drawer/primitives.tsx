/**
 * Drawer Primitives — Low-level styled components for the drawer shell and header.
 *
 * @ai-context
 * - ShellContainer: CVA-styled outer div, overlay (fixed+transform) or inline (flex+width) modes
 * - ResizeHandle: Absolute-positioned drag handle with visual indicator
 * - TabBarContainer: Flex row with overflow scroll for tabs
 * - HeaderContainer: 48px height, bottom border, macOS drag opt-out
 * - HeaderTitle: RTL ellipsis trick for left-side truncation, loading skeleton
 * - ContentContainer: flex-1 scrollable area
 * - IconButton: CVA ghost/subtle variants, sm/md sizes
 * - TabCloseButton: Opacity-on-hover close button inside tab triggers
 * - SavingIndicator: Pulsing "Saving..." text
 * - DrawerPill: Glass pill toggle, memoized
 * - All components include data-slot attributes for CSS targeting
 */

import { memo, forwardRef, useState, type ComponentProps, type MouseEvent, type MouseEventHandler, type KeyboardEventHandler } from 'react';
import { cn, KeyboardHint } from '@tryvienna/ui';
import {
  DRAWER_HEADER_HEIGHT,
  DRAWER_TAB_BAR_HEIGHT,
  DRAWER_Z_INDEX,
  DRAWER_RESIZE_HANDLE_Z_INDEX,
  DRAWER_ANIMATION_DURATION,
  DRAWER_ANIMATION_EASING,
} from './constants';
import type { DrawerDisplayMode } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// ShellContainer
// ═══════════════════════════════════════════════════════════════════════════

export interface ShellContainerProps extends ComponentProps<'div'> {
  position?: 'left' | 'right';
  open?: boolean;
  width: number;
  mode?: DrawerDisplayMode;
  isResizing?: boolean;
}

export const ShellContainer = forwardRef<HTMLDivElement, ShellContainerProps>(
  function ShellContainer(
    { position = 'right', open = false, width, mode = 'overlay', isResizing, className, style, ...props },
    ref
  ) {
    const isInline = mode === 'inline';

    return (
      <div
        ref={ref}
        data-slot="drawer-shell"
        data-drawer-shell
        className={cn(
          'flex flex-col bg-background border-border',
          isInline
            ? 'relative shrink-0 overflow-x-hidden'
            : 'fixed inset-y-0',
          isInline
            ? open
              ? position === 'right' ? 'border-l' : 'border-r'
              : ''
            : position === 'right'
              ? 'right-0 border-l'
              : 'left-0 border-r',
          !isInline && !open && 'pointer-events-none',
          className
        )}
        style={{
          ...(isInline
            ? {
                width: open ? width : 0,
                transition: isResizing ? 'none' : `width ${DRAWER_ANIMATION_DURATION}ms ${DRAWER_ANIMATION_EASING}`,
              }
            : {
                width,
                zIndex: DRAWER_Z_INDEX,
                transform: open
                  ? 'translateX(0)'
                  : position === 'right'
                    ? 'translateX(100%)'
                    : 'translateX(-100%)',
                transition: isResizing ? 'none' : `transform ${DRAWER_ANIMATION_DURATION}ms ${DRAWER_ANIMATION_EASING}`,
              }),
          ...style,
        }}
        {...props}
      />
    );
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// ResizeHandle
// ═══════════════════════════════════════════════════════════════════════════

export interface ResizeHandleProps extends ComponentProps<'div'> {
  position?: 'left' | 'right';
}

export const ResizeHandle = forwardRef<HTMLDivElement, ResizeHandleProps>(
  function ResizeHandle({ position = 'right', className, ...props }, ref) {
    return (
      <div
        ref={ref}
        data-slot="drawer-resize-handle"
        className={cn(
          'absolute top-0 bottom-0 w-2 cursor-col-resize group',
          position === 'right' ? '-left-1' : '-right-1',
          className
        )}
        style={{ zIndex: DRAWER_RESIZE_HANDLE_Z_INDEX }}
        {...props}
      >
        <div
          className={cn(
            'absolute top-0 bottom-0 w-[3px] transition-opacity duration-150',
            'opacity-0 group-hover:opacity-100 group-active:opacity-100',
            'bg-border group-active:bg-brand-primary',
            position === 'right' ? 'left-[2px]' : 'right-[2px]'
          )}
        />
      </div>
    );
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// TabBarContainer
// ═══════════════════════════════════════════════════════════════════════════

export const TabBarContainer = forwardRef<HTMLDivElement, ComponentProps<'div'>>(
  function TabBarContainer({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        data-slot="drawer-tab-bar"
        className={cn(
          // NOTE: pl-3 pr-2 gap-2 must match HeaderContainer for button alignment
          'flex items-center gap-2 border-b border-border bg-surface-interactive/30 pl-3 pr-2 overflow-hidden',
          className
        )}
        style={{ height: DRAWER_TAB_BAR_HEIGHT }}
        {...props}
      />
    );
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// HeaderContainer
// ═══════════════════════════════════════════════════════════════════════════

export const HeaderContainer = forwardRef<HTMLDivElement, ComponentProps<'div'>>(
  function HeaderContainer({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        data-slot="drawer-header"
        className={cn(
          // NOTE: pl-3 pr-2 gap-2 must match TabBarContainer for button alignment
          'flex items-center gap-2 border-b border-border pl-3 pr-2 shrink-0',
          className
        )}
        style={{
          height: DRAWER_HEADER_HEIGHT,
          // @ts-expect-error -- webkit property for Electron macOS drag region
          WebkitAppRegion: 'no-drag',
        }}
        {...props}
      />
    );
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// HeaderTitle
// ═══════════════════════════════════════════════════════════════════════════

export interface HeaderTitleProps extends ComponentProps<'span'> {
  loading?: boolean;
}

export function HeaderTitle({ children, loading, className, ...props }: HeaderTitleProps) {
  if (loading) {
    return (
      <span
        data-slot="drawer-header-title"
        className={cn('flex-1 h-4 bg-muted animate-pulse rounded', className)}
        {...props}
      />
    );
  }

  return (
    <span
      data-slot="drawer-header-title"
      className={cn(
        'flex-1 truncate text-sm font-medium text-foreground min-w-0',
        // RTL trick for left-side ellipsis
        'direction-rtl text-left',
        className
      )}
      {...props}
    >
      <bdi>{children}</bdi>
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ContentContainer
// ═══════════════════════════════════════════════════════════════════════════

export const ContentContainer = forwardRef<HTMLDivElement, ComponentProps<'div'>>(
  function ContentContainer({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        data-slot="drawer-content"
        data-density="compact"
        className={cn('flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide', className)}
        {...props}
      />
    );
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// IconButton
// ═══════════════════════════════════════════════════════════════════════════

const ICON_BUTTON_BASE =
  'inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors';

const ICON_BUTTON_SIZES = {
  sm: 'h-7 w-7',
  md: 'h-8 w-8',
} as const;

const ICON_BUTTON_VARIANTS = {
  ghost: 'hover:bg-surface-interactive hover:text-foreground',
  subtle: 'hover:bg-surface-interactive/50 hover:text-foreground',
} as const;

export interface IconButtonProps extends ComponentProps<'button'> {
  size?: keyof typeof ICON_BUTTON_SIZES;
  variant?: keyof typeof ICON_BUTTON_VARIANTS;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ size = 'sm', variant = 'ghost', className, ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        data-slot="drawer-icon-button"
        className={cn(
          ICON_BUTTON_BASE,
          ICON_BUTTON_SIZES[size],
          ICON_BUTTON_VARIANTS[variant],
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          '[&_svg]:size-4 [&_svg]:shrink-0',
          className
        )}
        {...props}
      />
    );
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// TabCloseButton
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Close button inside tab triggers. Uses <div role="button"> instead of
 * <button> because Radix TabsTrigger renders as <button>, and nesting
 * <button> inside <button> is invalid HTML (causes hydration errors).
 */
export function TabCloseButton({
  className,
  onClick,
  onKeyDown,
  ...props
}: Omit<ComponentProps<'div'>, 'onClick' | 'onKeyDown'> & {
  onClick?: MouseEventHandler<HTMLDivElement>;
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      data-slot="drawer-tab-close"
      className={cn(
        'ml-1 -mr-1 rounded-sm p-0.5',
        'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
        'hover:bg-muted-foreground/20 hover:text-foreground',
        'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        'transition-opacity cursor-pointer',
        '[&_svg]:size-3',
        className
      )}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(e as unknown as MouseEvent<HTMLDivElement>);
        }
        onKeyDown?.(e);
      }}
      {...props}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SavingIndicator
// ═══════════════════════════════════════════════════════════════════════════

export function SavingIndicator() {
  return (
    <span data-slot="drawer-saving" className="text-xs text-muted-foreground animate-pulse">
      Saving...
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DrawerPill
// ═══════════════════════════════════════════════════════════════════════════

export interface DrawerPillProps {
  open: boolean;
  drawerWidth: number;
  onClick: () => void;
  shortcutKeys?: string[];
  isResizing?: boolean;
}

export const DrawerPill = memo(function DrawerPill({
  open,
  drawerWidth,
  onClick,
  shortcutKeys,
  isResizing,
}: DrawerPillProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      data-slot="drawer-pill"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed top-1/2 -translate-y-1/2 w-4 h-20 flex items-center justify-center cursor-pointer transition-[right] ease-out"
      style={{
        right: open ? drawerWidth + 8 : 8,
        zIndex: 48,
        transitionDuration: isResizing ? '0ms' : `${DRAWER_ANIMATION_DURATION}ms`,
      }}
      aria-label="Toggle drawer"
    >
      <div
        className="rounded-full transition-all ease-out pointer-events-none"
        style={{
          width: 3,
          height: isHovered ? 48 : 32,
          backgroundColor: isHovered ? 'var(--brand-primary)' : 'var(--border-default)',
          transitionDuration: '200ms',
        }}
      />

      {shortcutKeys && shortcutKeys.length > 0 && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: '50%',
            right: '100%',
            transform: `translateY(-50%) translateX(${isHovered ? '4px' : '0px'})`,
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 200ms ease-out, transform 200ms ease-out',
          }}
        >
          <KeyboardHint keys={shortcutKeys} />
        </div>
      )}
    </div>
  );
});
