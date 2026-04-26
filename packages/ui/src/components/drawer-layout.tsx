/**
 * Drawer layout primitives for composing drawer/panel content without custom CSS.
 *
 * @ai-context
 * - DrawerPanel: outer container (border, bg, flex column layout)
 * - DrawerPanelHeader: title bar with optional action slot
 * - DrawerPanelContent: scrollable content area
 * - DrawerBody: wraps children with ContentProvider for density control
 * - DrawerPanelFooter: bordered footer region
 * - data-slot values: "drawer-panel", "drawer-panel-header", "drawer-panel-content",
 *   "drawer-body", "drawer-panel-footer"
 *
 * @example
 * <DrawerPanel>
 *   <DrawerPanelHeader title="Settings">
 *     <Button variant="ghost" size="sm">Edit</Button>
 *   </DrawerPanelHeader>
 *   <DrawerPanelContent>
 *     <DrawerBody>content</DrawerBody>
 *   </DrawerPanelContent>
 *   <DrawerPanelFooter>actions</DrawerPanelFooter>
 * </DrawerPanel>
 */
import * as React from 'react';
import { cn } from '../utils/cn';
import { ContentProvider, type ContentDensity } from './content-provider';

// ═══════════════════════════════════════════════════════════════════════════
// DrawerPanel
// ═══════════════════════════════════════════════════════════════════════════

type DrawerPanelProps = React.ComponentProps<'div'>;

function DrawerPanel({ className, ...props }: DrawerPanelProps) {
  return (
    <div
      data-slot="drawer-panel"
      className={cn(
        'border border-border rounded-lg overflow-hidden bg-background flex flex-col',
        className,
      )}
      {...props}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DrawerPanelHeader
// ═══════════════════════════════════════════════════════════════════════════

interface DrawerPanelHeaderProps extends React.ComponentProps<'div'> {
  title?: string;
}

function DrawerPanelHeader({
  title,
  children,
  className,
  ...props
}: DrawerPanelHeaderProps) {
  return (
    <div
      data-slot="drawer-panel-header"
      className={cn(
        'flex items-center justify-between px-4 py-3 border-b border-border shrink-0',
        className,
      )}
      {...props}
    >
      {title && <span className="text-sm font-medium">{title}</span>}
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DrawerPanelContent
// ═══════════════════════════════════════════════════════════════════════════

type DrawerPanelContentProps = React.ComponentProps<'div'>;

function DrawerPanelContent({ className, ...props }: DrawerPanelContentProps) {
  return (
    <div
      data-slot="drawer-panel-content"
      className={cn('flex-1 overflow-y-auto', className)}
      {...props}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DrawerBody
// ═══════════════════════════════════════════════════════════════════════════

interface DrawerBodyProps extends React.ComponentProps<'div'> {
  density?: ContentDensity;
}

function DrawerBody({
  children,
  className,
  density = 'compact',
  ...props
}: DrawerBodyProps) {
  return (
    <ContentProvider density={density}>
      <div data-slot="drawer-body" data-density={density} className={cn('p-4', className)} {...props}>
        {children}
      </div>
    </ContentProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DrawerPanelFooter
// ═══════════════════════════════════════════════════════════════════════════

type DrawerPanelFooterProps = React.ComponentProps<'div'>;

function DrawerPanelFooter({ className, ...props }: DrawerPanelFooterProps) {
  return (
    <div
      data-slot="drawer-panel-footer"
      className={cn('border-t border-border px-4 py-4', className)}
      {...props}
    />
  );
}

export {
  DrawerPanel,
  DrawerPanelHeader,
  DrawerPanelContent,
  DrawerBody,
  DrawerPanelFooter,
};
export type {
  DrawerPanelProps,
  DrawerPanelHeaderProps,
  DrawerPanelContentProps,
  DrawerBodyProps,
  DrawerPanelFooterProps,
};
