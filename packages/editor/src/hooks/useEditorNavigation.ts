/**
 * useEditorNavigation — Cross-file go-to-definition handling.
 *
 * Registers a Monaco editor opener to intercept cross-file navigations
 * (e.g. Cmd+click on imports) and delegates them to a callback.
 * Same-file navigations are left to Monaco's default behavior.
 *
 * @module editor/hooks/useEditorNavigation
 */

import { useEffect } from 'react';
import type * as Monaco from 'monaco-editor';

export interface UseEditorNavigationOptions {
  /** The Monaco namespace. */
  monaco: typeof Monaco | null;
  /** The current file path (used to detect same-file navigations). */
  filePath: string;
  /** Called when the user navigates to a different file. */
  onNavigateToFile?: (filePath: string, line: number, column: number) => void;
  /** Whether navigation is enabled. */
  enabled: boolean;
}

export function useEditorNavigation(options: UseEditorNavigationOptions): void {
  const { monaco, filePath, onNavigateToFile, enabled } = options;

  useEffect(() => {
    if (!monaco || !onNavigateToFile || !enabled) return;

    const disposable = monaco.editor.registerEditorOpener({
      openCodeEditor(_source, resource, selectionOrPosition) {
        const targetPath = resource.path;

        // Same-file navigation: let Monaco handle it (scroll to position).
        // Without this guard, onNavigateToFile fires for the current file,
        // which can cause the tab to close if it's the only one open.
        if (targetPath === filePath) {
          return false;
        }

        let line = 1;
        let column = 1;

        if (selectionOrPosition) {
          if ('startLineNumber' in selectionOrPosition) {
            // IRange
            line = (selectionOrPosition as Monaco.IRange).startLineNumber;
            column = (selectionOrPosition as Monaco.IRange).startColumn;
          } else if ('lineNumber' in selectionOrPosition) {
            // IPosition
            line = (selectionOrPosition as Monaco.IPosition).lineNumber;
            column = (selectionOrPosition as Monaco.IPosition).column;
          }
        }

        onNavigateToFile(targetPath, line, column);
        return true;
      },
    });

    return () => {
      disposable.dispose();
    };
  }, [monaco, filePath, onNavigateToFile, enabled]);
}
