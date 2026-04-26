/**
 * useDrawerKeyboard — Keyboard shortcut handler for drawer operations.
 *
 * @ai-context
 * - Cmd+W: close active tab (tabbed mode only, prevents default)
 * - Cmd+Shift+[/]: cycle to previous/next tab (wraps around)
 * - Cmd+Alt+ArrowLeft/Right: alternate tab cycling
 * - Escape: close drawer (yields to open dialogs and in-drawer input focus)
 * - Tab-switching skipped when focused on input/textarea/select/contentEditable
 * - Cmd+W always works even in inputs (browser-standard close gesture)
 * - Uses useDrawerStateOptional/useDrawerActionsOptional for safety outside provider
 */

import { useEffect } from 'react';
import { useDrawerStateOptional } from './DrawerStateContext';
import { useDrawerActionsOptional } from './DrawerActionsContext';
import {
  DEFAULT_CLOSE_TAB_KEY,
  PREV_TAB_KEY,
  NEXT_TAB_KEY,
  PREV_TAB_ARROW_KEY,
  NEXT_TAB_ARROW_KEY,
} from './constants';

export interface UseDrawerKeyboardOptions {
  enabled?: boolean;
  closeKey?: string;
  escToClose?: boolean;
}

export function useDrawerKeyboard({
  enabled = true,
  closeKey = DEFAULT_CLOSE_TAB_KEY,
  escToClose = true,
}: UseDrawerKeyboardOptions = {}) {
  const drawerState = useDrawerStateOptional();
  const drawerActions = useDrawerActionsOptional();

  useEffect(() => {
    if (!enabled || !drawerState || !drawerActions) return;

    function isInputFocused(): boolean {
      const el = document.activeElement;
      if (!el) return false;
      const tagName = el.tagName.toLowerCase();
      return (
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        (el as HTMLElement).isContentEditable
      );
    }

    function hasOpenDialog(): boolean {
      return (
        document.querySelector('[role="dialog"][data-state="open"]') !== null ||
        document.querySelector('[role="alertdialog"][data-state="open"]') !== null
      );
    }

    function handleKeyDown(e: KeyboardEvent) {
      const metaKey = e.metaKey || e.ctrlKey;

      // Cmd+W: close active tab
      if (metaKey && !e.shiftKey && !e.altKey && e.key === closeKey) {
        if (drawerState!.isTabbed && drawerState!.activeTab) {
          e.preventDefault();
          drawerActions!.closeTab(drawerState!.activeTab.id);
        }
        return;
      }

      // Tab switching — skip when in inputs
      if (isInputFocused()) return;

      // Cmd+Shift+[ — previous tab
      if (metaKey && e.shiftKey && e.key === PREV_TAB_KEY) {
        cycleTab(-1);
        return;
      }

      // Cmd+Shift+] — next tab
      if (metaKey && e.shiftKey && e.key === NEXT_TAB_KEY) {
        cycleTab(1);
        return;
      }

      // Cmd+Alt+ArrowLeft — previous tab
      if (metaKey && e.altKey && e.key === PREV_TAB_ARROW_KEY) {
        cycleTab(-1);
        return;
      }

      // Cmd+Alt+ArrowRight — next tab
      if (metaKey && e.altKey && e.key === NEXT_TAB_ARROW_KEY) {
        cycleTab(1);
        return;
      }

      // Escape — close drawer
      if (e.key === 'Escape' && escToClose) {
        if (hasOpenDialog()) return;

        // Yield to inputs inside the drawer
        const shell = document.querySelector('[data-drawer-shell]');
        if (shell?.contains(document.activeElement) && isInputFocused()) return;

        if (drawerState!.isOpen) {
          drawerActions!.close();
        }
      }
    }

    function cycleTab(direction: 1 | -1) {
      if (!drawerState!.isTabbed) return;
      const { tabs } = drawerState!.state;
      if (tabs.length <= 1) return;

      const currentIndex = tabs.findIndex((t) => t.id === drawerState!.activeTab?.id);
      if (currentIndex === -1) return;

      const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
      drawerActions!.setActiveTab(tabs[nextIndex]!.id);
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, closeKey, escToClose, drawerState, drawerActions]);
}
