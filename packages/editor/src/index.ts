/**
 * @vienna/editor — Monaco editor with LSP integration.
 *
 * @example
 * ```tsx
 * import { MonacoEditor } from '@vienna/editor';
 * <MonacoEditor filePath="/src/app.ts" language="typescript" content={code} />
 * ```
 *
 * @packageDocumentation
 */

// Types
export type {
  LspPosition,
  LspRange,
  LspLocation,
  LspLocationLink,
  LspDiagnostic,
  LspTextEdit,
  LspWorkspaceEdit,
  DiagnosticItem,
  LspClient,
  LspEventSubscriptions,
  FileClient,
  FileEventSubscriptions,
} from './types';
export { DiagnosticSeverity, CompletionItemKind, LANGUAGE_MAP, LSP_SUPPORTED_LANGUAGES } from './types';

// Utilities
export {
  monacoToLspPosition,
  lspToMonacoPosition,
  lspToMonacoRange,
  pathToUri,
  uriToPath,
  detectLanguage,
  toMonacoLanguageId,
  isLspSupportedLanguage,
  isReadOnlyPath,
  isEditableFile,
} from './utils';

// Setup
export { initializeMonaco } from './setup/monaco-setup';
export { defineEditorThemes } from './setup/themes';

// Hooks
export { useDocumentSync, type UseDocumentSyncOptions, type UseDocumentSyncResult } from './hooks/useDocumentSync';
export { useDiagnostics, type UseDiagnosticsOptions, type UseDiagnosticsResult } from './hooks/useDiagnostics';
export { useLspProviders, type UseLspProvidersOptions } from './hooks/useLspProviders';
export { useEditorNavigation, type UseEditorNavigationOptions } from './hooks/useEditorNavigation';
export { useFileEditor, clearDirtyCache, type UseFileEditorOptions, type UseFileEditorResult } from './hooks/useFileEditor';
export { useMonacoLsp, type UseMonacoLspOptions, type UseMonacoLspResult } from './hooks/useMonacoLsp';

// Raw @monaco-editor/react re-export (for lightweight usage without LSP)
export { default as BaseMonacoEditor, type OnMount as MonacoOnMount } from '@monaco-editor/react';

// Components
export { MonacoEditor, type MonacoEditorProps, type MonacoEditorSelectionEvent } from './components/MonacoEditor';
export { ProblemsPanel, type ProblemsPanelProps } from './components/ProblemsPanel';
export { EditorFooter, type EditorFooterProps } from './components/EditorFooter';
