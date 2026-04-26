/**
 * PasteDrawer — Monaco editor drawer panel for viewing/editing pasted content.
 *
 * @ai-context
 * - Opened when a paste chip is clicked (input area or message history)
 * - Input chips open editable (readOnly: false), history chips open read-only
 * - Cmd+Enter saves edits back to the paste chip via onSave callback
 * - Uses BaseMonacoEditor from @vienna/editor (no LSP needed for plaintext)
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { BaseMonacoEditor as Editor, type MonacoOnMount, initializeMonaco } from '@vienna/editor';
import { useDrawerActions, useDrawerState } from '../../lib/drawer';
import type { DrawerContentDescriptor } from '../../lib/drawer';
import { getPastePayload } from './content';

// Initialize Monaco at module load time (before any Editor renders).
// This is safe because PasteDrawer is lazy-loaded, so this only runs
// when the drawer is first opened. initializeMonaco is idempotent.
initializeMonaco();

function useEditorTheme(): 'vienna-dark' | 'vienna-light' {
  const isDark = useSyncExternalStore(
    (cb) => {
      const observer = new MutationObserver(cb);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      return () => observer.disconnect();
    },
    () => document.documentElement.classList.contains('dark'),
  );
  return isDark ? 'vienna-dark' : 'vienna-light';
}

export interface PasteDrawerProps {
  content: DrawerContentDescriptor;
}

export function PasteDrawer({ content }: PasteDrawerProps) {
  const payload = getPastePayload(content);
  const initialContent = payload?.content ?? '';
  const readOnly = payload?.readOnly ?? true;
  const onSaveCallback = payload?.onSave;
  const editorTheme = useEditorTheme();

  const { activeTab } = useDrawerState();
  const { updateTabDirty, closeTab } = useDrawerActions();
  const editorRef = useRef<Parameters<MonacoOnMount>[0] | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const handleSaveRef = useRef<() => void>();

  const handleMount: MonacoOnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    // Cmd+S to save
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSaveRef.current?.();
    });
  }, []);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (readOnly) return;
      setIsDirty((value ?? '') !== initialContent);
    },
    [readOnly, initialContent],
  );

  // Sync dirty state to drawer tab
  const tabId = activeTab?.id;
  useEffect(() => {
    if (!tabId) return;
    updateTabDirty(tabId, isDirty);
  }, [isDirty, tabId, updateTabDirty]);

  const handleSave = useCallback(() => {
    if (!readOnly && editorRef.current && onSaveCallback) {
      onSaveCallback(editorRef.current.getValue());
      setIsDirty(false);
    }
  }, [readOnly, onSaveCallback]);

  handleSaveRef.current = handleSave;

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!readOnly && (e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  }, [readOnly, handleSave]);

  return (
    <div className="flex h-full flex-col" onKeyDown={handleKeyDown}>
      <div className="min-h-0 flex-1">
        <Editor
          defaultValue={initialContent}
          language="plaintext"
          theme={editorTheme}
          options={{
            readOnly,
            minimap: { enabled: false },
            wordWrap: 'on',
            fontSize: 13,
            lineHeight: 20,
            fontFamily: 'var(--font-mono, "SF Mono", "Fira Code", monospace)',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 8, bottom: 8 },
          }}
          onChange={handleChange}
          onMount={handleMount}
        />
      </div>
      {!readOnly && (
        <div className="flex shrink-0 items-center justify-between border-t border-border-muted px-3 py-1.5 text-[11px] text-foreground-muted">
          <span>Cmd+S or Cmd+Enter to save</span>
          <button
            onClick={() => {
              handleSave();
              if (tabId) closeTab(tabId);
            }}
            className="cursor-pointer rounded-md bg-[var(--button-brand-bg)] px-2.5 py-0.5 text-xs font-medium text-white hover:bg-[var(--button-brand-hover)]"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
