/**
 * useLspProviders — Register all Monaco language providers via LSP.
 *
 * Registers hover, definition, references, completion, signature help,
 * code action, and rename providers. Each provider is a separate function
 * for readability.
 *
 * @module editor/hooks/useLspProviders
 */

import { useEffect, useRef } from 'react';
import type * as Monaco from 'monaco-editor';
import type { LspClient, LspDiagnostic, LspRange, LspWorkspaceEdit } from '../types';
import { CompletionItemKind } from '../types';
import { monacoToLspPosition, lspToMonacoRange } from '../utils';

export interface UseLspProvidersOptions {
  monaco: typeof Monaco | null;
  editor: Monaco.editor.IStandaloneCodeEditor | null;
  lspClient: LspClient;
  /** Monaco language ID (e.g. 'typescript', NOT 'typescriptreact'). */
  monacoLanguageId: string;
  /** LSP language ID (e.g. 'typescriptreact'). */
  lspLanguageId: string;
  /** The file:// URI for this document. */
  uri: string;
  /** Whether the LSP document is open and ready. */
  enabled: boolean;
  /** Called for cross-file go-to-definition navigation. */
  onNavigateToFile?: (filePath: string, line: number, column: number) => void;
}

// ---------------------------------------------------------------------------
// Completion Kind Mapping (LSP → Monaco)
// ---------------------------------------------------------------------------

const COMPLETION_KIND_MAP: Record<number, number> = {
  [CompletionItemKind.Text]: 18,
  [CompletionItemKind.Method]: 0,
  [CompletionItemKind.Function]: 1,
  [CompletionItemKind.Constructor]: 2,
  [CompletionItemKind.Field]: 3,
  [CompletionItemKind.Variable]: 4,
  [CompletionItemKind.Class]: 5,
  [CompletionItemKind.Interface]: 7,
  [CompletionItemKind.Module]: 8,
  [CompletionItemKind.Property]: 9,
  [CompletionItemKind.Unit]: 12,
  [CompletionItemKind.Value]: 13,
  [CompletionItemKind.Enum]: 15,
  [CompletionItemKind.Keyword]: 17,
  [CompletionItemKind.Snippet]: 27,
  [CompletionItemKind.Color]: 19,
  [CompletionItemKind.File]: 20,
  [CompletionItemKind.Reference]: 21,
  [CompletionItemKind.Folder]: 23,
  [CompletionItemKind.EnumMember]: 16,
  [CompletionItemKind.Constant]: 14,
  [CompletionItemKind.Struct]: 6,
  [CompletionItemKind.Event]: 10,
  [CompletionItemKind.Operator]: 11,
  [CompletionItemKind.TypeParameter]: 24,
};

// ---------------------------------------------------------------------------
// Provider Registration Functions
// ---------------------------------------------------------------------------

function registerHoverProvider(
  monaco: typeof Monaco,
  languageId: string,
  lspClient: LspClient,
  uri: string,
): Monaco.IDisposable {
  return monaco.languages.registerHoverProvider(languageId, {
    provideHover: async (model, position) => {
      if (model.uri.toString() !== uri) return null;
      const pos = monacoToLspPosition(position.lineNumber, position.column);

      try {
        const result = await lspClient.getHover({ uri, line: pos.line, character: pos.character });
        if (!result) return null;

        const hover = result as { contents: unknown; range?: LspRange };
        const contents = formatHoverContents(hover.contents);
        const range = hover.range ? lspToMonacoRange(hover.range) : undefined;

        return { contents, range };
      } catch {
        return null;
      }
    },
  });
}

function registerDefinitionProvider(
  monaco: typeof Monaco,
  languageId: string,
  lspClient: LspClient,
  uri: string,
  onNavigateToFile?: (filePath: string, line: number, column: number) => void,
): Monaco.IDisposable {
  return monaco.languages.registerDefinitionProvider(languageId, {
    provideDefinition: async (model, position) => {
      if (model.uri.toString() !== uri) return null;
      const pos = monacoToLspPosition(position.lineNumber, position.column);

      try {
        const result = await lspClient.getDefinition({ uri, line: pos.line, character: pos.character });
        if (!result) {
          console.warn('[LSP Definition] No result from server', { uri, line: pos.line, character: pos.character });
          return null;
        }

        const locations = normalizeLocations(result, monaco);
        if (!locations) {
          console.warn('[LSP Definition] Failed to normalize locations', { result });
          return null;
        }

        const locationArray = Array.isArray(locations) ? locations : [locations];
        if (locationArray.length === 0) {
          console.warn('[LSP Definition] Empty locations array', { result });
          return null;
        }

        const sameFile: Monaco.languages.Location[] = [];
        const crossFile: Monaco.languages.Location[] = [];

        for (const loc of locationArray) {
          if (loc.uri.toString() === uri) {
            sameFile.push(loc);
          } else {
            crossFile.push(loc);
          }
        }

        // Handle cross-file definitions directly — Monaco's standalone editor
        // can't resolve models for external files and crashes with "Model not found".
        if (crossFile.length > 0 && onNavigateToFile) {
          const target = crossFile[0];
          console.info('[LSP Definition] Navigating to', target.uri.path, 'line', target.range.startLineNumber);
          onNavigateToFile(target.uri.path, target.range.startLineNumber, target.range.startColumn);
          return sameFile.length > 0 ? sameFile : null;
        }

        return locations;
      } catch (err) {
        console.warn('[LSP Definition] Error', err);
        return null;
      }
    },
  });
}

function registerReferencesProvider(
  monaco: typeof Monaco,
  languageId: string,
  lspClient: LspClient,
  uri: string,
): Monaco.IDisposable {
  return monaco.languages.registerReferenceProvider(languageId, {
    provideReferences: async (model, position) => {
      if (model.uri.toString() !== uri) return null;
      const pos = monacoToLspPosition(position.lineNumber, position.column);

      try {
        const result = await lspClient.getReferences({ uri, line: pos.line, character: pos.character });
        if (!result) return null;

        return result.map((loc) => ({
          uri: monaco.Uri.parse(loc.uri),
          range: lspToMonacoRange(loc.range),
        }));
      } catch {
        return null;
      }
    },
  });
}

function registerCompletionProvider(
  monaco: typeof Monaco,
  languageId: string,
  lspClient: LspClient,
  uri: string,
): Monaco.IDisposable {
  return monaco.languages.registerCompletionItemProvider(languageId, {
    triggerCharacters: ['.', '"', "'", '/', '<'],
    provideCompletionItems: async (model, position) => {
      if (model.uri.toString() !== uri) return null;
      const pos = monacoToLspPosition(position.lineNumber, position.column);

      try {
        const result = await lspClient.getCompletions({ uri, line: pos.line, character: pos.character });
        if (!result) return { suggestions: [] };

        // Handle both CompletionList and CompletionItem[]
        const items = Array.isArray(result) ? result : (result as { items?: unknown[] }).items ?? [];

        const suggestions = (items as Array<Record<string, unknown>>).map((item) => {
          const kind = COMPLETION_KIND_MAP[item.kind as number] ?? 18;
          const insertTextFormat = item.insertTextFormat as number | undefined;

          return {
            label: item.label as string,
            kind,
            detail: item.detail as string | undefined,
            documentation: formatDocumentation(item.documentation),
            insertText: (item.insertText as string) ?? (item.label as string),
            insertTextRules: insertTextFormat === 2
              ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              : undefined,
            sortText: item.sortText as string | undefined,
            filterText: item.filterText as string | undefined,
            preselect: item.preselect as boolean | undefined,
            range: undefined as unknown as Monaco.IRange,
          };
        });

        return { suggestions };
      } catch {
        return { suggestions: [] };
      }
    },
  });
}

function registerSignatureHelpProvider(
  monaco: typeof Monaco,
  languageId: string,
  lspClient: LspClient,
  uri: string,
): Monaco.IDisposable {
  return monaco.languages.registerSignatureHelpProvider(languageId, {
    signatureHelpTriggerCharacters: ['(', ','],
    provideSignatureHelp: async (model, position) => {
      if (model.uri.toString() !== uri) return null;
      const pos = monacoToLspPosition(position.lineNumber, position.column);

      try {
        const result = await lspClient.getSignatureHelp({ uri, line: pos.line, character: pos.character });
        if (!result) return null;

        const help = result as {
          signatures: Array<{
            label: string;
            documentation?: unknown;
            parameters?: Array<{ label: string | [number, number]; documentation?: unknown }>;
          }>;
          activeSignature?: number;
          activeParameter?: number;
        };

        return {
          value: {
            signatures: help.signatures.map((sig) => ({
              label: sig.label,
              documentation: formatDocumentation(sig.documentation),
              parameters: (sig.parameters ?? []).map((p) => ({
                label: p.label,
                documentation: formatDocumentation(p.documentation),
              })),
            })),
            activeSignature: help.activeSignature ?? 0,
            activeParameter: help.activeParameter ?? 0,
          },
          dispose: () => {},
        };
      } catch {
        return null;
      }
    },
  });
}

function registerCodeActionProvider(
  monaco: typeof Monaco,
  languageId: string,
  lspClient: LspClient,
  uri: string,
): Monaco.IDisposable {
  return monaco.languages.registerCodeActionProvider(languageId, {
    provideCodeActions: async (model, range, context) => {
      if (model.uri.toString() !== uri) return null;

      const lspRange: LspRange = {
        start: { line: range.startLineNumber - 1, character: range.startColumn - 1 },
        end: { line: range.endLineNumber - 1, character: range.endColumn - 1 },
      };

      const diagnostics: LspDiagnostic[] = context.markers.map((m) => ({
        range: {
          start: { line: m.startLineNumber - 1, character: m.startColumn - 1 },
          end: { line: m.endLineNumber - 1, character: m.endColumn - 1 },
        },
        severity: monacoToLspSeverity(m.severity) as LspDiagnostic['severity'],
        message: m.message,
        source: m.source,
        code: m.code?.toString(),
      }));

      try {
        const result = await lspClient.getCodeActions({ uri, range: lspRange, context: { diagnostics } });
        if (!result) return { actions: [], dispose: () => {} };

        const actions = (result as Array<Record<string, unknown>>).map((action) => ({
          title: action.title as string,
          kind: action.kind as string | undefined,
          isPreferred: action.isPreferred as boolean | undefined,
          disabled: (action.disabled as { reason: string } | undefined)?.reason,
          edit: action.edit ? convertWorkspaceEdit(action.edit as LspWorkspaceEdit, monaco) : undefined,
        }));

        return { actions, dispose: () => {} };
      } catch {
        return { actions: [], dispose: () => {} };
      }
    },
  });
}

function registerRenameProvider(
  monaco: typeof Monaco,
  languageId: string,
  lspClient: LspClient,
  uri: string,
): Monaco.IDisposable {
  return monaco.languages.registerRenameProvider(languageId, {
    provideRenameEdits: async (model, position, newName) => {
      if (model.uri.toString() !== uri) return null;
      const pos = monacoToLspPosition(position.lineNumber, position.column);

      try {
        const result = await lspClient.rename({ uri, line: pos.line, character: pos.character, newName });
        if (!result) return null;
        return convertWorkspaceEdit(result, monaco);
      } catch {
        return null;
      }
    },

    resolveRenameLocation: async (model, position) => {
      if (model.uri.toString() !== uri) return null;
      const pos = monacoToLspPosition(position.lineNumber, position.column);

      try {
        const result = await lspClient.prepareRename({ uri, line: pos.line, character: pos.character });
        if (!result) return { text: '', range: { startLineNumber: 0, startColumn: 0, endLineNumber: 0, endColumn: 0 }, rejectReason: 'Cannot rename this symbol' };

        const prepared = result as { range: LspRange; placeholder?: string } | LspRange;
        const range = 'range' in prepared && prepared.range ? prepared.range : prepared as LspRange;
        const placeholder = 'placeholder' in prepared ? prepared.placeholder : undefined;

        return {
          range: lspToMonacoRange(range),
          text: placeholder ?? model.getValueInRange(lspToMonacoRange(range)),
        };
      } catch {
        return { text: '', range: { startLineNumber: 0, startColumn: 0, endLineNumber: 0, endColumn: 0 }, rejectReason: 'Cannot rename this symbol' };
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatHoverContents(contents: unknown): Monaco.IMarkdownString[] {
  if (!contents) return [];

  // MarkupContent
  if (typeof contents === 'object' && contents !== null && 'kind' in contents) {
    const mc = contents as { kind: string; value: string };
    return [{ value: mc.kind === 'markdown' ? mc.value : `\`\`\`\n${mc.value}\n\`\`\`` }];
  }

  // MarkedString or string
  if (typeof contents === 'string') {
    return [{ value: contents }];
  }

  // Array
  if (Array.isArray(contents)) {
    return contents.map((c) => {
      if (typeof c === 'string') return { value: c };
      if (typeof c === 'object' && c !== null && 'language' in c) {
        const ms = c as { language: string; value: string };
        return { value: `\`\`\`${ms.language}\n${ms.value}\n\`\`\`` };
      }
      return { value: String(c) };
    });
  }

  // Object with language
  if (typeof contents === 'object' && contents !== null && 'language' in contents) {
    const ms = contents as { language: string; value: string };
    return [{ value: `\`\`\`${ms.language}\n${ms.value}\n\`\`\`` }];
  }

  return [];
}

function formatDocumentation(doc: unknown): string | Monaco.IMarkdownString | undefined {
  if (!doc) return undefined;
  if (typeof doc === 'string') return doc;
  if (typeof doc === 'object' && doc !== null && 'kind' in doc) {
    const mc = doc as { kind: string; value: string };
    return { value: mc.value };
  }
  return undefined;
}

function normalizeLocations(
  result: unknown,
  monaco: typeof Monaco,
): Monaco.languages.Location | Monaco.languages.Location[] | null {
  if (!result) return null;

  if (Array.isArray(result)) {
    return result
      .map((loc) => {
        const locUri = (loc as { uri?: string; targetUri?: string }).uri ??
          (loc as { targetUri?: string }).targetUri;
        const locRange = (loc as { range?: LspRange; targetRange?: LspRange }).range ??
          (loc as { targetRange?: LspRange }).targetRange;
        if (!locUri || !locRange) return null;
        return {
          uri: monaco.Uri.parse(locUri),
          range: lspToMonacoRange(locRange),
        };
      })
      .filter((loc): loc is Monaco.languages.Location => loc !== null);
  }

  const loc = result as { uri?: string; targetUri?: string; range?: LspRange; targetRange?: LspRange };
  const locUri = loc.uri ?? loc.targetUri;
  const locRange = loc.range ?? loc.targetRange;
  if (!locUri || !locRange) return null;

  return {
    uri: monaco.Uri.parse(locUri),
    range: lspToMonacoRange(locRange),
  };
}

function convertWorkspaceEdit(
  edit: LspWorkspaceEdit,
  monaco: typeof Monaco,
): Monaco.languages.WorkspaceEdit {
  const edits: Monaco.languages.IWorkspaceTextEdit[] = [];

  if (edit.changes) {
    for (const [editUri, textEdits] of Object.entries(edit.changes)) {
      for (const te of textEdits) {
        edits.push({
          resource: monaco.Uri.parse(editUri),
          textEdit: { range: lspToMonacoRange(te.range), text: te.newText },
          versionId: undefined,
        });
      }
    }
  }

  if (edit.documentChanges) {
    for (const docChange of edit.documentChanges) {
      for (const te of docChange.edits) {
        edits.push({
          resource: monaco.Uri.parse(docChange.textDocument.uri),
          textEdit: { range: lspToMonacoRange(te.range), text: te.newText },
          versionId: undefined,
        });
      }
    }
  }

  return { edits };
}

function monacoToLspSeverity(severity: Monaco.MarkerSeverity): number {
  switch (severity) {
    case 8: return 1; // Error
    case 4: return 2; // Warning
    case 2: return 3; // Information
    case 1: return 4; // Hint
    default: return 1;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLspProviders(options: UseLspProvidersOptions): void {
  const { monaco, editor, lspClient, monacoLanguageId, lspLanguageId, uri, enabled, onNavigateToFile } = options;
  const disposablesRef = useRef<Monaco.IDisposable[]>([]);
  const onNavigateRef = useRef(onNavigateToFile);
  onNavigateRef.current = onNavigateToFile;

  useEffect(() => {
    if (!monaco || !editor || !enabled) return;

    const navigateToFile: typeof onNavigateToFile = (...args) => onNavigateRef.current?.(...args);

    const disposables: Monaco.IDisposable[] = [
      registerHoverProvider(monaco, monacoLanguageId, lspClient, uri),
      registerDefinitionProvider(monaco, monacoLanguageId, lspClient, uri, navigateToFile),
      registerReferencesProvider(monaco, monacoLanguageId, lspClient, uri),
      registerCompletionProvider(monaco, monacoLanguageId, lspClient, uri),
      registerSignatureHelpProvider(monaco, monacoLanguageId, lspClient, uri),
      registerCodeActionProvider(monaco, monacoLanguageId, lspClient, uri),
      registerRenameProvider(monaco, monacoLanguageId, lspClient, uri),
    ];

    disposablesRef.current = disposables;

    return () => {
      for (const d of disposables) d.dispose();
      disposablesRef.current = [];
    };
  }, [monaco, editor, lspClient, monacoLanguageId, lspLanguageId, uri, enabled]);
}
