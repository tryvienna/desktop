/**
 * TabbedDrawer — Outer shell component with resize handle and glass pill toggle.
 *
 * @ai-context
 * - Two display modes: overlay (fixed, slides over) and inline (flex child, pushes content)
 * - Reads drawer state from DrawerStateContext for width/open status
 * - Writes width changes via DrawerActionsContext.setWidth
 * - Resize via mousedown/move/up on ResizeHandle, direction-aware for left/right
 * - During resize: disables user-select and sets col-resize cursor on body
 * - Renders DrawerPill glass toggle button with keyboard shortcut hints
 * - data-slot="drawer-shell" on ShellContainer
 */

import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react';
import { ShellContainer, ResizeHandle, DrawerPill } from './primitives';
import { useDrawerState } from './DrawerStateContext';
import { useDrawerActions } from './DrawerActionsContext';
import { DRAWER_WIDTH_MIN, DRAWER_WIDTH_MAX } from './constants';
import type { DrawerDisplayMode } from './types';
import { cn } from '@tryvienna/ui';

export interface TabbedDrawerProps {
  children: ReactNode;
  position?: 'left' | 'right';
  mode?: DrawerDisplayMode;
  toggleShortcutKeys?: string[];
  className?: string;
  onToggle?: () => void;
}

export function TabbedDrawer({
  children,
  position = 'right',
  mode = 'overlay',
  toggleShortcutKeys,
  className,
  onToggle,
}: TabbedDrawerProps) {
  const { isOpen, state } = useDrawerState();
  const { setWidth, close } = useDrawerActions();
  const [isResizing, setIsResizing] = useState(false);

  const resizeRef = useRef<{
    startX: number;
    startWidth: number;
  } | null>(null);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      resizeRef.current = {
        startX: e.clientX,
        startWidth: state.width,
      };
      setIsResizing(true);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    },
    [state.width]
  );

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!resizeRef.current) return;
      const delta = position === 'right'
        ? resizeRef.current.startX - e.clientX
        : e.clientX - resizeRef.current.startX;
      const newWidth = Math.min(
        Math.max(resizeRef.current.startWidth + delta, DRAWER_WIDTH_MIN),
        DRAWER_WIDTH_MAX
      );
      setWidth(newWidth);
    }

    function handleMouseUp() {
      if (!resizeRef.current) return;
      resizeRef.current = null;
      setIsResizing(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [position, setWidth]);

  const handleToggle = useCallback(() => {
    if (onToggle) {
      onToggle();
    } else if (isOpen) {
      close();
    }
  }, [onToggle, isOpen, close]);

  return (
    <>
      <DrawerPill
        open={isOpen}
        drawerWidth={state.width}
        onClick={handleToggle}
        shortcutKeys={toggleShortcutKeys}
        isResizing={isResizing}
      />
      <ShellContainer
        position={position}
        open={isOpen}
        width={state.width}
        mode={mode}
        isResizing={isResizing}
        className={cn(isOpen ? '' : 'border-0', className)}
      >
        <ResizeHandle
          position={position}
          onMouseDown={handleResizeStart}
        />
        {children}
      </ShellContainer>
    </>
  );
}
