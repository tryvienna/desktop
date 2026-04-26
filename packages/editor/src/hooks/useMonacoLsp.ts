/**
 * useMonacoLsp — Composing hook that orchestrates all LSP hooks.
 *
 * Thin coordinator that composes useDocumentSync, useDiagnostics,
 * useLspProviders, and useEditorNavigation into a single API.
 *
 * @module editor/hooks/useMonacoLsp
 */

import type * as Monaco from 'monaco-editor';
import type { LspClient, LspEventSubscriptions, DiagnosticItem } from '../types';
import { toMonacoLanguageId } from '../utils';
import { useDocumentSync } from './useDocumentSync';
import { useDiagnostics } from './useDiagnostics';
import { useLspProviders } from './useLspProviders';
import { useEditorNavigation } from './useEditorNavigation';

export interface UseMonacoLspOptions {
  /** The Monaco namespace. */
  monaco: typeof Monaco | null;
  /** The Monaco editor instance. */
  editor: Monaco.editor.IStandaloneCodeEditor | null;
  /** Typed IPC client for LSP methods. */
  lspClient: LspClient;
  /** Typed IPC event subscriptions. */
  lspEvents: LspEventSubscriptions;
  /** The absolute file path being edited. */
  filePath: string;
  /** The LSP language ID (e.g. 'typescriptreact'). */
  languageId: string;
  /** Called when the user navigates to a different file. */
  onNavigateToFile?: (filePath: string, line: number, column: number) => void;
}

export interface UseMonacoLspResult {
  /** Whether the LSP document is open and providers are active. */
  isReady: boolean;
  /** The file:// URI for this document. */
  uri: string;
  /** Number of error diagnostics. */
  errorCount: number;
  /** Number of warning diagnostics. */
  warningCount: number;
  /** Processed diagnostic items for ProblemsPanel. */
  diagnostics: DiagnosticItem[];
}

export function useMonacoLsp(options: UseMonacoLspOptions): UseMonacoLspResult {
  const {
    monaco,
    editor,
    lspClient,
    lspEvents,
    filePath,
    languageId,
    onNavigateToFile,
  } = options;

  const model = editor?.getModel() ?? null;
  const monacoLanguageId = toMonacoLanguageId(languageId);

  const { isDocumentOpen, uri } = useDocumentSync({
    lspClient,
    filePath,
    languageId,
    model,
  });

  const { errorCount, warningCount, diagnostics } = useDiagnostics({
    lspEvents,
    monaco,
    model,
    uri,
    enabled: isDocumentOpen,
  });

  useLspProviders({
    monaco,
    editor,
    lspClient,
    monacoLanguageId,
    lspLanguageId: languageId,
    uri,
    enabled: isDocumentOpen,
    onNavigateToFile,
  });

  useEditorNavigation({
    monaco,
    filePath,
    onNavigateToFile,
    enabled: isDocumentOpen,
  });

  return {
    isReady: isDocumentOpen,
    uri,
    errorCount,
    warningCount,
    diagnostics,
  };
}
