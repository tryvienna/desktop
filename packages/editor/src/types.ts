/**
 * Editor Types — Renderer-safe LSP subset types.
 *
 * Lean type definitions used by hooks and components.
 * These mirror the LSP 3.17 spec but only include what the
 * editor actually needs — no server-side initialization types.
 *
 * @module editor/types
 */

// ---------------------------------------------------------------------------
// Position & Range (LSP uses 0-based, Monaco uses 1-based)
// ---------------------------------------------------------------------------

/** Zero-based position in a text document (LSP convention). */
export interface LspPosition {
  readonly line: number;
  readonly character: number;
}

/** Zero-based range in a text document (LSP convention). */
export interface LspRange {
  readonly start: LspPosition;
  readonly end: LspPosition;
}

/** A location in a document identified by URI + range. */
export interface LspLocation {
  readonly uri: string;
  readonly range: LspRange;
}

/** A link to a target location (used by definition provider). */
export interface LspLocationLink {
  readonly originSelectionRange?: LspRange;
  readonly targetUri: string;
  readonly targetRange: LspRange;
  readonly targetSelectionRange: LspRange;
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

/** LSP diagnostic severity levels. */
export const DiagnosticSeverity = {
  Error: 1,
  Warning: 2,
  Information: 3,
  Hint: 4,
} as const;

export type DiagnosticSeverity = (typeof DiagnosticSeverity)[keyof typeof DiagnosticSeverity];

/** A diagnostic message from the language server. */
export interface LspDiagnostic {
  readonly range: LspRange;
  readonly severity?: DiagnosticSeverity;
  readonly code?: number | string;
  readonly source?: string;
  readonly message: string;
}

/** Processed diagnostic item for UI display (ProblemsPanel). */
export interface DiagnosticItem {
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly source?: string;
  readonly code?: number | string;
  readonly line: number;
  readonly character: number;
}

// ---------------------------------------------------------------------------
// Text Edits
// ---------------------------------------------------------------------------

/** A text edit to apply to a document. */
export interface LspTextEdit {
  readonly range: LspRange;
  readonly newText: string;
}

/** A set of edits across one or more documents. */
export interface LspWorkspaceEdit {
  readonly changes?: Record<string, LspTextEdit[]>;
  readonly documentChanges?: Array<{
    readonly textDocument: { readonly uri: string; readonly version?: number | null };
    readonly edits: LspTextEdit[];
  }>;
}

// ---------------------------------------------------------------------------
// Completion
// ---------------------------------------------------------------------------

/** Completion item kind (LSP spec values). */
export const CompletionItemKind = {
  Text: 1,
  Method: 2,
  Function: 3,
  Constructor: 4,
  Field: 5,
  Variable: 6,
  Class: 7,
  Interface: 8,
  Module: 9,
  Property: 10,
  Unit: 11,
  Value: 12,
  Enum: 13,
  Keyword: 14,
  Snippet: 15,
  Color: 16,
  File: 17,
  Reference: 18,
  Folder: 19,
  EnumMember: 20,
  Constant: 21,
  Struct: 22,
  Event: 23,
  Operator: 24,
  TypeParameter: 25,
} as const;

export type CompletionItemKind = (typeof CompletionItemKind)[keyof typeof CompletionItemKind];

// ---------------------------------------------------------------------------
// Language Mapping (re-exported from shared @vienna/file-search)
// ---------------------------------------------------------------------------

export { LANGUAGE_MAP, LSP_SUPPORTED_LANGUAGES } from '@vienna/file-search';

// ---------------------------------------------------------------------------
// LSP Client Interface (what hooks expect from IPC)
// ---------------------------------------------------------------------------

/** Typed subset of IPC methods used by editor hooks. */
export interface LspClient {
  openDocument(input: { uri: string; languageId: string; text: string }): Promise<{ opened: boolean }>;
  closeDocument(input: { uri: string }): Promise<{ success: boolean }>;
  changeDocument(input: { uri: string; text: string }): Promise<{ success: boolean }>;
  saveDocument(input: { uri: string; text?: string }): Promise<{ success: boolean }>;
  getHover(input: { uri: string; line: number; character: number }): Promise<unknown>;
  getDefinition(input: { uri: string; line: number; character: number }): Promise<unknown>;
  getReferences(input: { uri: string; line: number; character: number }): Promise<LspLocation[] | null>;
  getCompletions(input: { uri: string; line: number; character: number }): Promise<unknown>;
  getSignatureHelp(input: { uri: string; line: number; character: number }): Promise<unknown>;
  getCodeActions(input: { uri: string; range: LspRange; context: { diagnostics: LspDiagnostic[] } }): Promise<unknown>;
  prepareRename(input: { uri: string; line: number; character: number }): Promise<unknown>;
  rename(input: { uri: string; line: number; character: number; newName: string }): Promise<LspWorkspaceEdit | null>;
}

/** Typed subset of IPC events used by editor hooks. */
export interface LspEventSubscriptions {
  onDiagnostics(callback: (payload: { uri: string; diagnostics: LspDiagnostic[] }) => void): () => void;
  onServerReady(callback: (payload: { projectRoot: string }) => void): () => void;
  onServerStopped(callback: (payload: { projectRoot: string; reason?: string }) => void): () => void;
}

/** Typed subset of file IPC methods used by editor hooks. */
export interface FileClient {
  read(input: { path: string }): Promise<{ content: string; language: string }>;
  write(input: { path: string; content: string }): Promise<{ success: boolean }>;
  watch(input: { path: string }): Promise<{ watching: boolean }>;
  unwatch(input: { path: string }): Promise<{ success: boolean }>;
}

/** Typed subset of file IPC events used by editor hooks. */
export interface FileEventSubscriptions {
  onChanged(callback: (payload: { path: string }) => void): () => void;
}
