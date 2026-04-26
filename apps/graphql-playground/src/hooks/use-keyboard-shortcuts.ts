/**
 * useKeyboardShortcuts — Global keyboard shortcut handler
 */

import { useEffect } from 'react';

interface ShortcutHandlers {
  onExecute: () => void;
  onPrettify: () => void;
  onNewTab: () => void;
  onCloseTab: () => void;
  onToggleShortcuts: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;

      // Cmd+Enter — Execute (handled by CodeMirror, but also globally)
      if (e.key === 'Enter') {
        e.preventDefault();
        handlers.onExecute();
        return;
      }

      // Cmd+Shift+P — Prettify
      if (e.shiftKey && e.key === 'p') {
        e.preventDefault();
        handlers.onPrettify();
        return;
      }

      // Cmd+T — New tab
      if (e.key === 't') {
        e.preventDefault();
        handlers.onNewTab();
        return;
      }

      // Cmd+W — Close tab
      if (e.key === 'w') {
        e.preventDefault();
        handlers.onCloseTab();
        return;
      }

      // Cmd+/ — Toggle shortcuts dialog
      if (e.key === '/') {
        e.preventDefault();
        handlers.onToggleShortcuts();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
