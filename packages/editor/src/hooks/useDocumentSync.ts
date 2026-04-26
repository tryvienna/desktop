/**
 * useDocumentSync — LSP document lifecycle management.
 *
 * Opens the document with the LSP server on mount, syncs content
 * changes with a 100ms debounce, and closes the document on unmount.
 *
 * @module editor/hooks/useDocumentSync
 */

import { useEffect, useRef, useState } from 'react';
import type * as Monaco from 'monaco-editor';
import type { LspClient } from '../types';
import { isLspSupportedLanguage, pathToUri } from '../utils';

export interface UseDocumentSyncOptions {
  /** Typed IPC client for LSP methods. */
  lspClient: LspClient;
  /** The file path (used to derive the URI). */
  filePath: string;
  /** The LSP language ID (e.g. 'typescript', 'typescriptreact'). */
  languageId: string;
  /** The Monaco text model to sync. */
  model: Monaco.editor.ITextModel | null;
}

export interface UseDocumentSyncResult {
  /** Whether the document is open in the LSP server. */
  isDocumentOpen: boolean;
  /** The file:// URI for this document. */
  uri: string;
}

const CHANGE_DEBOUNCE_MS = 100;

export function useDocumentSync(options: UseDocumentSyncOptions): UseDocumentSyncResult {
  const { lspClient, filePath, languageId, model } = options;
  const [isDocumentOpen, setIsDocumentOpen] = useState(false);
  const isOpenRef = useRef(false);
  const uri = pathToUri(filePath);
  const enabled = isLspSupportedLanguage(languageId);

  // Open document on mount, close on unmount.
  // openDocument is async (may wait for LSP server to start), so if the
  // component unmounts before it resolves, we still need to close it.
  useEffect(() => {
    if (!model || !enabled) return;

    let mounted = true;
    let openedSuccessfully = false;

    async function open() {
      try {
        const content = model!.getValue();
        const result = await lspClient.openDocument({ uri, languageId, text: content });
        openedSuccessfully = result.opened;

        if (!mounted) {
          // Component unmounted while openDocument was in-flight — close immediately
          if (openedSuccessfully) {
            void lspClient.closeDocument({ uri });
          }
          return;
        }

        if (result.opened) {
          isOpenRef.current = true;
          setIsDocumentOpen(true);
        }
      } catch {
        // LSP not available — degrade gracefully
      }
    }

    void open();

    return () => {
      mounted = false;
      if (isOpenRef.current) {
        void lspClient.closeDocument({ uri });
        isOpenRef.current = false;
      }
      setIsDocumentOpen(false);
    };
  }, [lspClient, model, filePath, languageId, uri, enabled]);

  // Sync content changes with debounce
  useEffect(() => {
    if (!model || !isDocumentOpen) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const disposable = model.onDidChangeContent(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const content = model.getValue();
        void lspClient.changeDocument({ uri, text: content });
        debounceTimer = null;
      }, CHANGE_DEBOUNCE_MS);
    });

    return () => {
      disposable.dispose();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [lspClient, model, uri, isDocumentOpen]);

  return { isDocumentOpen, uri };
}
