/**
 * LSP Types — Main-process type definitions for Language Server Protocol.
 *
 * Based on LSP 3.17 specification. Only includes types actually used
 * by the server instance and manager — no unused spec types.
 *
 * @module main/lsp/LspTypes
 */

// ---------------------------------------------------------------------------
// JSON-RPC Base
// ---------------------------------------------------------------------------

/** A JSON-RPC 2.0 message (request, response, or notification). */
export interface LspMessage {
  readonly jsonrpc: '2.0';
  id?: number | string;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: LspError;
}

/** JSON-RPC error object. */
export interface LspError {
  readonly code: number;
  readonly message: string;
  readonly data?: unknown;
}

/** Standard LSP error codes. */
export const LspErrorCodes = {
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
  ServerNotInitialized: -32002,
  UnknownErrorCode: -32001,
  RequestCancelled: -32800,
  ContentModified: -32801,
} as const;

// ---------------------------------------------------------------------------
// Position & Range
// ---------------------------------------------------------------------------

export interface Position {
  readonly line: number;
  readonly character: number;
}

export interface Range {
  readonly start: Position;
  readonly end: Position;
}

export interface Location {
  readonly uri: string;
  readonly range: Range;
}

export interface LocationLink {
  readonly originSelectionRange?: Range;
  readonly targetUri: string;
  readonly targetRange: Range;
  readonly targetSelectionRange: Range;
}

// ---------------------------------------------------------------------------
// Text Document
// ---------------------------------------------------------------------------

export interface TextDocumentIdentifier {
  readonly uri: string;
}

export interface VersionedTextDocumentIdentifier extends TextDocumentIdentifier {
  readonly version: number;
}

export interface TextDocumentItem {
  readonly uri: string;
  readonly languageId: string;
  readonly version: number;
  readonly text: string;
}

export interface TextDocumentPositionParams {
  readonly textDocument: TextDocumentIdentifier;
  readonly position: Position;
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

export enum DiagnosticSeverity {
  Error = 1,
  Warning = 2,
  Information = 3,
  Hint = 4,
}

export interface Diagnostic {
  readonly range: Range;
  readonly severity?: DiagnosticSeverity;
  readonly code?: number | string;
  readonly codeDescription?: { readonly href: string };
  readonly source?: string;
  readonly message: string;
  readonly tags?: readonly number[];
  readonly relatedInformation?: readonly DiagnosticRelatedInformation[];
  readonly data?: unknown;
}

export interface DiagnosticRelatedInformation {
  readonly location: Location;
  readonly message: string;
}

export interface PublishDiagnosticsParams {
  readonly uri: string;
  readonly version?: number;
  readonly diagnostics: readonly Diagnostic[];
}

// ---------------------------------------------------------------------------
// Completion
// ---------------------------------------------------------------------------

export interface CompletionItem {
  readonly label: string;
  readonly kind?: number;
  readonly detail?: string;
  readonly documentation?: string | MarkupContent;
  readonly deprecated?: boolean;
  readonly preselect?: boolean;
  readonly sortText?: string;
  readonly filterText?: string;
  readonly insertText?: string;
  readonly insertTextFormat?: number;
  readonly textEdit?: TextEdit;
  readonly additionalTextEdits?: readonly TextEdit[];
  readonly commitCharacters?: readonly string[];
  readonly command?: Command;
  readonly data?: unknown;
}

export interface CompletionList {
  readonly isIncomplete: boolean;
  readonly items: readonly CompletionItem[];
}

// ---------------------------------------------------------------------------
// Hover
// ---------------------------------------------------------------------------

export interface Hover {
  readonly contents: MarkupContent | MarkedString | readonly MarkedString[];
  readonly range?: Range;
}

export interface MarkupContent {
  readonly kind: 'plaintext' | 'markdown';
  readonly value: string;
}

export type MarkedString = string | { readonly language: string; readonly value: string };

// ---------------------------------------------------------------------------
// Signature Help
// ---------------------------------------------------------------------------

export interface SignatureHelp {
  readonly signatures: readonly SignatureInformation[];
  readonly activeSignature?: number;
  readonly activeParameter?: number;
}

export interface SignatureInformation {
  readonly label: string;
  readonly documentation?: string | MarkupContent;
  readonly parameters?: readonly ParameterInformation[];
  readonly activeParameter?: number;
}

export interface ParameterInformation {
  readonly label: string | [number, number];
  readonly documentation?: string | MarkupContent;
}

// ---------------------------------------------------------------------------
// Document Symbols
// ---------------------------------------------------------------------------

export interface DocumentSymbol {
  readonly name: string;
  readonly detail?: string;
  readonly kind: number;
  readonly range: Range;
  readonly selectionRange: Range;
  readonly children?: readonly DocumentSymbol[];
}

export interface SymbolInformation {
  readonly name: string;
  readonly kind: number;
  readonly location: Location;
  readonly containerName?: string;
}

// ---------------------------------------------------------------------------
// Code Actions & Edits
// ---------------------------------------------------------------------------

export interface Command {
  readonly title: string;
  readonly command: string;
  readonly arguments?: readonly unknown[];
}

export interface TextEdit {
  readonly range: Range;
  readonly newText: string;
}

export interface TextDocumentEdit {
  readonly textDocument: { readonly uri: string; readonly version?: number | null };
  readonly edits: readonly TextEdit[];
}

export interface WorkspaceEdit {
  readonly changes?: Record<string, readonly TextEdit[]>;
  readonly documentChanges?: readonly TextDocumentEdit[];
}

export interface CodeActionContext {
  readonly diagnostics: readonly Diagnostic[];
  readonly only?: readonly string[];
}

export interface CodeAction {
  readonly title: string;
  readonly kind?: string;
  readonly diagnostics?: readonly Diagnostic[];
  readonly isPreferred?: boolean;
  readonly disabled?: { readonly reason: string };
  readonly edit?: WorkspaceEdit;
  readonly command?: Command;
}

export interface PrepareRenameResult {
  readonly range: Range;
  readonly placeholder?: string;
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

export interface InitializeParams {
  readonly processId: number | null;
  readonly clientInfo?: { readonly name: string; readonly version?: string };
  readonly rootUri: string | null;
  readonly rootPath?: string | null;
  readonly capabilities: ClientCapabilities;
  readonly workspaceFolders?: readonly WorkspaceFolder[] | null;
  readonly initializationOptions?: unknown;
}

export interface WorkspaceFolder {
  readonly uri: string;
  readonly name: string;
}

export interface ClientCapabilities {
  readonly textDocument?: {
    readonly synchronization?: {
      readonly dynamicRegistration?: boolean;
      readonly willSave?: boolean;
      readonly willSaveWaitUntil?: boolean;
      readonly didSave?: boolean;
    };
    readonly completion?: {
      readonly dynamicRegistration?: boolean;
      readonly completionItem?: {
        readonly snippetSupport?: boolean;
        readonly commitCharactersSupport?: boolean;
        readonly documentationFormat?: readonly string[];
        readonly deprecatedSupport?: boolean;
        readonly preselectSupport?: boolean;
      };
      readonly contextSupport?: boolean;
    };
    readonly hover?: {
      readonly dynamicRegistration?: boolean;
      readonly contentFormat?: readonly string[];
    };
    readonly signatureHelp?: {
      readonly dynamicRegistration?: boolean;
      readonly signatureInformation?: {
        readonly documentationFormat?: readonly string[];
        readonly parameterInformation?: { readonly labelOffsetSupport?: boolean };
      };
    };
    readonly definition?: { readonly dynamicRegistration?: boolean; readonly linkSupport?: boolean };
    readonly typeDefinition?: { readonly dynamicRegistration?: boolean; readonly linkSupport?: boolean };
    readonly implementation?: { readonly dynamicRegistration?: boolean; readonly linkSupport?: boolean };
    readonly references?: { readonly dynamicRegistration?: boolean };
    readonly documentHighlight?: { readonly dynamicRegistration?: boolean };
    readonly documentSymbol?: {
      readonly dynamicRegistration?: boolean;
      readonly hierarchicalDocumentSymbolSupport?: boolean;
    };
    readonly codeAction?: {
      readonly dynamicRegistration?: boolean;
      readonly codeActionLiteralSupport?: {
        readonly codeActionKind?: { readonly valueSet?: readonly string[] };
      };
    };
    readonly codeLens?: { readonly dynamicRegistration?: boolean };
    readonly formatting?: { readonly dynamicRegistration?: boolean };
    readonly rangeFormatting?: { readonly dynamicRegistration?: boolean };
    readonly rename?: { readonly dynamicRegistration?: boolean; readonly prepareSupport?: boolean };
    readonly publishDiagnostics?: {
      readonly relatedInformation?: boolean;
      readonly tagSupport?: { readonly valueSet?: readonly number[] };
      readonly versionSupport?: boolean;
    };
    readonly foldingRange?: {
      readonly dynamicRegistration?: boolean;
      readonly lineFoldingOnly?: boolean;
    };
  };
  readonly workspace?: {
    readonly applyEdit?: boolean;
    readonly workspaceEdit?: { readonly documentChanges?: boolean };
    readonly didChangeConfiguration?: { readonly dynamicRegistration?: boolean };
    readonly didChangeWatchedFiles?: { readonly dynamicRegistration?: boolean };
    readonly symbol?: { readonly dynamicRegistration?: boolean };
    readonly executeCommand?: { readonly dynamicRegistration?: boolean };
    readonly workspaceFolders?: boolean;
    readonly configuration?: boolean;
  };
  readonly window?: {
    readonly workDoneProgress?: boolean;
  };
}

export interface InitializeResult {
  readonly capabilities: ServerCapabilities;
  readonly serverInfo?: { readonly name: string; readonly version?: string };
}

export interface ServerCapabilities {
  readonly textDocumentSync?: number | TextDocumentSyncOptions;
  readonly completionProvider?: CompletionOptions;
  readonly hoverProvider?: boolean;
  readonly signatureHelpProvider?: SignatureHelpOptions;
  readonly definitionProvider?: boolean;
  readonly typeDefinitionProvider?: boolean;
  readonly implementationProvider?: boolean;
  readonly referencesProvider?: boolean;
  readonly documentSymbolProvider?: boolean;
  readonly codeActionProvider?: boolean | CodeActionOptions;
  readonly renameProvider?: boolean | RenameOptions;
  readonly documentFormattingProvider?: boolean;
  readonly documentRangeFormattingProvider?: boolean;
  readonly foldingRangeProvider?: boolean;
}

export interface TextDocumentSyncOptions {
  readonly openClose?: boolean;
  readonly change?: number;
  readonly save?: boolean | { readonly includeText?: boolean };
}

export interface CompletionOptions {
  readonly triggerCharacters?: readonly string[];
  readonly resolveProvider?: boolean;
}

export interface SignatureHelpOptions {
  readonly triggerCharacters?: readonly string[];
  readonly retriggerCharacters?: readonly string[];
}

export interface CodeActionOptions {
  readonly codeActionKinds?: readonly string[];
}

export interface RenameOptions {
  readonly prepareProvider?: boolean;
}

// ---------------------------------------------------------------------------
// Window Messages
// ---------------------------------------------------------------------------

export interface LogMessageParams {
  readonly type: number;
  readonly message: string;
}
