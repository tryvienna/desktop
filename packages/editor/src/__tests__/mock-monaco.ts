/**
 * Mock Monaco — Test utilities for mocking Monaco editor APIs.
 *
 * Provides createMockMonaco(), createMockEditor(), and createMockModel()
 * for use in hook and component unit tests.
 */

import { vi } from 'vitest';

/** Create a mock Monaco namespace. */
export function createMockMonaco() {
  const disposable = { dispose: vi.fn() };

  return {
    Uri: {
      parse: vi.fn((uri: string) => ({ toString: () => uri, path: uri.replace('file://', '') })),
      file: vi.fn((path: string) => ({ toString: () => `file://${path}`, path })),
    },
    MarkerSeverity: { Error: 8, Warning: 4, Info: 2, Hint: 1 },
    KeyMod: { CtrlCmd: 2048 },
    KeyCode: { KeyS: 49 },
    editor: {
      setModelMarkers: vi.fn(),
      registerEditorOpener: vi.fn(() => disposable),
      createModel: vi.fn(() => createMockModel()),
    },
    languages: {
      registerHoverProvider: vi.fn(() => disposable),
      registerDefinitionProvider: vi.fn(() => disposable),
      registerReferenceProvider: vi.fn(() => disposable),
      registerCompletionItemProvider: vi.fn(() => disposable),
      registerSignatureHelpProvider: vi.fn(() => disposable),
      registerCodeActionProvider: vi.fn(() => disposable),
      registerRenameProvider: vi.fn(() => disposable),
      CompletionItemInsertTextRule: { InsertAsSnippet: 4 },
      typescript: {
        typescriptDefaults: {
          setDiagnosticsOptions: vi.fn(),
        },
        javascriptDefaults: {
          setDiagnosticsOptions: vi.fn(),
        },
      },
    },
  };
}

/** Create a mock Monaco editor instance. */
export function createMockEditor() {
  const model = createMockModel();
  return {
    getModel: vi.fn(() => model),
    getPosition: vi.fn(() => ({ lineNumber: 1, column: 1 })),
    setPosition: vi.fn(),
    revealLineInCenter: vi.fn(),
    focus: vi.fn(),
    addCommand: vi.fn(),
    onDidChangeCursorPosition: vi.fn(() => ({ dispose: vi.fn() })),
    _model: model,
  };
}

/** Create a mock Monaco text model. */
export function createMockModel() {
  const contentChangeListeners: Array<() => void> = [];
  return {
    uri: { toString: () => 'file:///test/file.ts', path: '/test/file.ts' },
    getValue: vi.fn(() => 'const x = 1;'),
    setValue: vi.fn(),
    getValueInRange: vi.fn(() => 'x'),
    onDidChangeContent: vi.fn((listener: () => void) => {
      contentChangeListeners.push(listener);
      return { dispose: vi.fn() };
    }),
    _triggerContentChange: () => {
      for (const l of contentChangeListeners) l();
    },
    dispose: vi.fn(),
  };
}

/** Create a mock LspClient. */
export function createMockLspClient() {
  return {
    openDocument: vi.fn().mockResolvedValue({ opened: true }),
    closeDocument: vi.fn().mockResolvedValue({ success: true }),
    changeDocument: vi.fn().mockResolvedValue({ success: true }),
    saveDocument: vi.fn().mockResolvedValue({ success: true }),
    getHover: vi.fn().mockResolvedValue(null),
    getDefinition: vi.fn().mockResolvedValue(null),
    getReferences: vi.fn().mockResolvedValue(null),
    getCompletions: vi.fn().mockResolvedValue(null),
    getSignatureHelp: vi.fn().mockResolvedValue(null),
    getCodeActions: vi.fn().mockResolvedValue(null),
    prepareRename: vi.fn().mockResolvedValue(null),
    rename: vi.fn().mockResolvedValue(null),
  };
}

/** Create mock LSP event subscriptions. */
export function createMockLspEvents() {
  return {
    onDiagnostics: vi.fn(() => vi.fn()),
    onServerReady: vi.fn(() => vi.fn()),
    onServerStopped: vi.fn(() => vi.fn()),
  };
}

/** Create a mock FileClient. */
export function createMockFileClient() {
  return {
    read: vi.fn().mockResolvedValue({ content: 'const x = 1;', language: 'typescript' }),
    write: vi.fn().mockResolvedValue({ success: true }),
    watch: vi.fn().mockResolvedValue({ watching: true }),
    unwatch: vi.fn().mockResolvedValue({ success: true }),
  };
}

/** Create mock file event subscriptions. */
export function createMockFileEvents() {
  return {
    onChanged: vi.fn(() => vi.fn()),
  };
}
