/**
 * MonacoEditor — Core editor component with LSP integration.
 *
 * Wraps @monaco-editor/react with LSP-powered features: hover,
 * completion, diagnostics, go-to-definition, and more.
 *
 * @module editor/components/MonacoEditor
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import MonacoReactEditor, { type OnMount } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import type { LspClient, LspEventSubscriptions } from '../types';
import { useMonacoLsp } from '../hooks/useMonacoLsp';
import { isReadOnlyPath, toMonacoLanguageId, pathToUri } from '../utils';

export interface MonacoEditorSelectionEvent {
  /** Whether there is a non-empty selection. */
  hasSelection: boolean;
  /** The selected text (empty string if no selection). */
  selectedText: string;
  /** Selection range in the editor. */
  range?: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
  /** Mouse/cursor position in viewport (client) coordinates. */
  clientPosition?: {
    x: number;
    y: number;
  };
}

export interface MonacoEditorProps {
  /** Absolute file path being edited. */
  filePath: string;
  /** LSP language ID (e.g. 'typescriptreact'). */
  languageId: string;
  /** File content. */
  content: string;
  /** Whether the editor is read-only. */
  readOnly?: boolean;
  /** Editor theme name. */
  theme?: string;
  /** Typed IPC client for LSP methods. */
  lspClient: LspClient;
  /** Typed IPC event subscriptions. */
  lspEvents: LspEventSubscriptions;
  /** Called when content changes. */
  onChange?: (content: string) => void;
  /** Called when the user presses Cmd+S. */
  onSave?: () => void;
  /** Called for cross-file navigation (Cmd+click). */
  onNavigateToFile?: (filePath: string, line: number, column: number) => void;
  /** Called when the text selection changes in the editor. */
  onSelectionChange?: (event: MonacoEditorSelectionEvent) => void;
  /** Scroll to this line on mount. */
  line?: number;
  /** Scroll to this column on mount. */
  column?: number;
}

const EDITOR_OPTIONS: Monaco.editor.IStandaloneEditorConstructionOptions = {
  fontSize: 13,
  fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', Menlo, Monaco, monospace",
  fontLigatures: true,
  minimap: { enabled: false },
  smoothScrolling: true,
  cursorSmoothCaretAnimation: 'on',
  renderWhitespace: 'selection',
  bracketPairColorization: { enabled: true },
  automaticLayout: true,
  scrollBeyondLastLine: false,
  padding: { top: 12, bottom: 12 },
  lineNumbers: 'on',
  glyphMargin: true,
  folding: true,
  tabSize: 2,
};

export function MonacoEditor(props: MonacoEditorProps) {
  const {
    filePath,
    languageId,
    content,
    readOnly,
    theme = 'vienna-dark',
    lspClient,
    lspEvents,
    onChange,
    onSave,
    onNavigateToFile,
    onSelectionChange,
    line,
    column,
  } = props;

  // State (not refs) so that onMount triggers a re-render, which is needed
  // for useMonacoLsp hooks to pick up the editor/monaco instances.
  // With refs, if openDocument resolves before onMount, the re-render from
  // setIsDocumentOpen sees null refs and providers never register.
  const [monacoInstance, setMonacoInstance] = useState<typeof Monaco | null>(null);
  const [editorInstance, setEditorInstance] = useState<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;

  const effectiveReadOnly = readOnly ?? isReadOnlyPath(filePath);
  const monacoLanguageId = toMonacoLanguageId(languageId);
  const modelUri = pathToUri(filePath);

  // Continuously track scroll position so we can restore it after
  // external content updates (the controlled `value` prop resets viewport).
  const scrollTopRef = useRef(0);
  const scrollLeftRef = useRef(0);

  useEffect(() => {
    if (!editorInstance) return;
    const disposable = editorInstance.onDidScrollChange((e) => {
      scrollTopRef.current = e.scrollTop;
      scrollLeftRef.current = e.scrollLeft;
    });
    return () => disposable.dispose();
  }, [editorInstance]);

  // Restore scroll position after external content changes.
  // The controlled `value` prop causes @monaco-editor/react to call
  // executeEdits which resets the viewport — we restore it in rAF.
  const prevContentRef = useRef(content);
  useEffect(() => {
    if (!editorInstance) return;
    if (content === prevContentRef.current) return;
    prevContentRef.current = content;

    // Only restore scroll for external changes (model value differs
    // from the incoming content, meaning @monaco-editor/react will
    // update the model and reset the viewport).
    const model = editorInstance.getModel();
    if (model && model.getValue() !== content) {
      const top = scrollTopRef.current;
      const left = scrollLeftRef.current;
      requestAnimationFrame(() => {
        editorInstance.setScrollTop(top);
        editorInstance.setScrollLeft(left);
      });
    }
  }, [content, editorInstance]);

  // Bridge Monaco selection changes to the onSelectionChange callback.
  // We listen on mouseup (not onDidChangeCursorSelection) to avoid showing
  // the popover while the user is still dragging to expand their selection.
  // Mouse position is tracked so the popover appears next to the cursor.
  const lastMousePositionRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!editorInstance) return;

    const emitSelection = (clientPosition: { x: number; y: number } | null) => {
      const callback = onSelectionChangeRef.current;
      if (!callback) return;

      const sel = editorInstance.getSelection();
      if (!sel || sel.isEmpty()) {
        callback({ hasSelection: false, selectedText: '' });
        return;
      }

      const model = editorInstance.getModel();
      if (!model) return;

      const selectedText = model.getValueInRange(sel);
      if (!selectedText.trim()) {
        callback({ hasSelection: false, selectedText: '' });
        return;
      }

      callback({
        hasSelection: true,
        selectedText,
        range: {
          startLine: sel.startLineNumber,
          startColumn: sel.startColumn,
          endLine: sel.endLineNumber,
          endColumn: sel.endColumn,
        },
        clientPosition: clientPosition ?? undefined,
      });
    };

    // Deduplicate: mouseup already handles mouse selections, so the
    // onDidChangeCursorSelection handler skips when mouseup just fired.
    let mouseUpFiredRecently = false;

    // Use mouseup to detect end of selection drag — capture mouse coordinates
    const handleMouseUp = (e: MouseEvent) => {
      mouseUpFiredRecently = true;
      lastMousePositionRef.current = { x: e.clientX, y: e.clientY };
      // Defer slightly so Monaco has updated its selection
      requestAnimationFrame(() => {
        emitSelection(lastMousePositionRef.current);
        mouseUpFiredRecently = false;
      });
    };

    // Handle non-mouse selection changes (keyboard, Ctrl+A, etc.).
    const { CursorChangeReason } = monacoInstance!.editor;
    const disposable = editorInstance.onDidChangeCursorSelection((e) => {
      // Skip programmatic / bulk changes that aren't user-initiated selections
      if (
        e.reason === CursorChangeReason.ContentFlush ||
        e.reason === CursorChangeReason.Paste ||
        e.reason === CursorChangeReason.Undo ||
        e.reason === CursorChangeReason.Redo
      ) return;

      // Mouse selections are handled by mouseup — skip to avoid double-emit
      if (mouseUpFiredRecently) return;

      let clientPos: { x: number; y: number } | null = null;
      const cursorPosition = editorInstance.getPosition();
      const pos = cursorPosition
        ? editorInstance.getScrolledVisiblePosition(cursorPosition)
        : null;
      if (pos) {
        const editorDomNode = editorInstance.getDomNode();
        const editorRect = editorDomNode?.getBoundingClientRect();
        if (editorRect) {
          clientPos = {
            x: editorRect.left + pos.left,
            y: editorRect.top + pos.top + pos.height,
          };
        }
      }
      emitSelection(clientPos);
    });

    const editorDomNode = editorInstance.getDomNode();
    editorDomNode?.addEventListener('mouseup', handleMouseUp);

    return () => {
      editorDomNode?.removeEventListener('mouseup', handleMouseUp);
      disposable.dispose();
    };
  }, [editorInstance, monacoInstance]);

  useMonacoLsp({
    monaco: monacoInstance,
    editor: editorInstance,
    lspClient,
    lspEvents,
    filePath,
    languageId,
    onNavigateToFile,
  });

  const handleMount: OnMount = useCallback(
    (editor, monaco) => {
      setMonacoInstance(monaco);
      setEditorInstance(editor);

      // Disable built-in language validation — LSP handles all diagnostics.
      // Without this, Monaco's built-in workers compete with our LSP providers.
      for (const defaults of [
        monaco.languages.typescript?.typescriptDefaults,
        monaco.languages.typescript?.javascriptDefaults,
      ]) {
        defaults?.setDiagnosticsOptions({
          noSemanticValidation: true,
          noSyntaxValidation: true,
          noSuggestionDiagnostics: true,
        });
        defaults?.setEagerModelSync(false);
      }

      monaco.languages.json?.jsonDefaults?.setDiagnosticsOptions({
        validate: false,
      });
      monaco.languages.css?.cssDefaults?.setDiagnosticsOptions({ validate: false });
      monaco.languages.css?.scssDefaults?.setDiagnosticsOptions({ validate: false });
      monaco.languages.css?.lessDefaults?.setDiagnosticsOptions({ validate: false });
      monaco.languages.html?.htmlDefaults?.setOptions({ validate: false });
      monaco.languages.html?.handlebarDefaults?.setOptions({ validate: false });
      monaco.languages.html?.razorDefaults?.setOptions({ validate: false });

      // Cmd+S keybinding
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        onSaveRef.current?.();
      });

      // Scroll to initial position — deferred so the editor has a
      // computed viewport (layout may not be ready synchronously at mount).
      if (line) {
        requestAnimationFrame(() => {
          editor.revealLineInCenter(line);
          editor.setPosition({ lineNumber: line, column: column ?? 1 });
          editor.focus();
        });
      } else {
        editor.focus();
      }
    },
    [line, column],
  );

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined && onChange) {
        onChange(value);
      }
    },
    [onChange],
  );

  return (
    <div className="flex h-full w-full flex-col" data-slot="monaco-editor">
      <div className="flex-1 min-h-0">
        <MonacoReactEditor
          path={modelUri}
          language={monacoLanguageId}
          value={content}
          theme={theme}
          saveViewState={false}
          options={{
            ...EDITOR_OPTIONS,
            readOnly: effectiveReadOnly,
          }}
          onMount={handleMount}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
