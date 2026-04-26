/**
 * Editor Utilities — Pure functions for coordinate conversion,
 * language detection, and path handling.
 *
 * Language detection, binary detection, and read-only detection are delegated
 * to @vienna/file-search. This module re-exports them and adds Monaco-specific
 * coordinate conversion and URI handling.
 *
 * @module editor/utils
 */

import type { LspPosition, LspRange } from './types';
import {
  LSP_SUPPORTED_LANGUAGES,
  detectLanguage as sharedDetectLanguage,
  isEditableFile as sharedIsEditableFile,
  isReadOnlyPath as sharedIsReadOnlyPath,
} from '@vienna/file-search';

// ---------------------------------------------------------------------------
// Coordinate Conversion (Monaco is 1-based, LSP is 0-based)
// ---------------------------------------------------------------------------

export function monacoToLspPosition(lineNumber: number, column: number): LspPosition {
  return { line: lineNumber - 1, character: column - 1 };
}

export function lspToMonacoPosition(position: LspPosition): { lineNumber: number; column: number } {
  return { lineNumber: position.line + 1, column: position.character + 1 };
}

export function lspToMonacoRange(range: LspRange): {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
} {
  return {
    startLineNumber: range.start.line + 1,
    startColumn: range.start.character + 1,
    endLineNumber: range.end.line + 1,
    endColumn: range.end.character + 1,
  };
}

// ---------------------------------------------------------------------------
// URI / Path Conversion
// ---------------------------------------------------------------------------

export function pathToUri(filePath: string): string {
  return `file://${filePath}`;
}

export function uriToPath(uri: string): string {
  return uri.replace(/^file:\/\//, '');
}

// ---------------------------------------------------------------------------
// Language Detection (delegated to @vienna/file-search)
// ---------------------------------------------------------------------------

export const detectLanguage = sharedDetectLanguage;

/**
 * Map an LSP language ID to the Monaco editor language ID.
 * Monaco doesn't have separate IDs for JSX variants — they alias to base languages.
 */
export function toMonacoLanguageId(languageId: string): string {
  switch (languageId) {
    case 'typescriptreact':
      return 'typescript';
    case 'javascriptreact':
      return 'javascript';
    default:
      return languageId;
  }
}

export function isLspSupportedLanguage(languageId: string): boolean {
  return LSP_SUPPORTED_LANGUAGES.has(languageId);
}

// ---------------------------------------------------------------------------
// Binary / Non-Editable / Read-Only Detection (delegated to @vienna/file-search)
// ---------------------------------------------------------------------------

export const isEditableFile = sharedIsEditableFile;
export const isReadOnlyPath = sharedIsReadOnlyPath;
