/**
 * FeedEditorDrawer — Monaco editor for editing feed.md files.
 *
 * @ai-context
 * - Opened from the FeedSection edit button via drawer tab system
 * - Reads/writes feed.md files via feed IPC (readFeedFile / writeFeedFile)
 * - Tracks dirty state and syncs it to the drawer tab
 * - On save (Cmd+S), writes the file and triggers a feed refresh
 * - Uses BaseMonacoEditor from @vienna/editor (markdown, no LSP)
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { BaseMonacoEditor as Editor, type MonacoOnMount, initializeMonaco } from '@vienna/editor';
import { getApi } from '@vienna/ipc/renderer';
import { api } from '../../ipc/index';
import { useDrawerActions, useDrawerState, DrawerContainer, useDrawerNavigationOptional } from '../../lib/drawer';
import type { DrawerContentDescriptor } from '../../lib/drawer';
import { getFeedEditorPayload, feedWidgetsContent } from './content';
import { emitFeedRefresh } from '../feed/use-feed';
import { Save, Blocks } from 'lucide-react';

// Initialize Monaco at module load time (lazy-loaded, so this runs on first open).
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

export interface FeedEditorDrawerProps {
  content: DrawerContentDescriptor;
}

export function FeedEditorDrawer({ content }: FeedEditorDrawerProps) {
  const payload = getFeedEditorPayload(content);
  const filePath = payload?.filePath ?? '';
  const projectId = payload?.projectId ?? '__global__';
  const label = payload?.label ?? 'feed.md';

  const editorTheme = useEditorTheme();
  const { activeTab } = useDrawerState();
  const { updateTabDirty } = useDrawerActions();
  const navigation = useDrawerNavigationOptional();

  const editorRef = useRef<Parameters<MonacoOnMount>[0] | null>(null);
  const [savedContent, setSavedContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleSaveRef = useRef<(() => void) | undefined>(undefined);

  // Load file content on mount
  useEffect(() => {
    const ipc = getApi(api);
    let cancelled = false;

    (async () => {
      const result = await ipc.feed.readFeedFile({ filePath, projectId });
      if (cancelled) return;

      const text = result.exists ? result.content : defaultFeedContent();
      setSavedContent(text);
      setIsLoaded(true);

      // Set initial value in editor if already mounted
      if (editorRef.current) {
        const model = editorRef.current.getModel();
        if (model && model.getValue() !== text) {
          model.setValue(text);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [filePath, projectId]);

  const handleMount: MonacoOnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    // If content already loaded, set it
    if (isLoaded && savedContent) {
      const model = editor.getModel();
      if (model && model.getValue() !== savedContent) {
        model.setValue(savedContent);
      }
    }

    // Cmd+S to save
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSaveRef.current?.();
    });
  }, [isLoaded, savedContent]);

  const handleChange = useCallback(
    (value: string | undefined) => {
      setIsDirty((value ?? '') !== savedContent);
    },
    [savedContent],
  );

  // Sync dirty state to drawer tab
  const tabId = activeTab?.id;
  useEffect(() => {
    if (!tabId) return;
    updateTabDirty(tabId, isDirty);
  }, [isDirty, tabId, updateTabDirty]);

  const handleSave = useCallback(async () => {
    if (!editorRef.current) return;
    const newContent = editorRef.current.getValue();

    setIsSaving(true);
    try {
      const ipc = getApi(api);
      const result = await ipc.feed.writeFeedFile({ filePath, content: newContent, projectId });
      if (result.success) {
        setSavedContent(newContent);
        setIsDirty(false);

        // Signal useFeed to re-initialize (re-checks config + triggers refresh)
        emitFeedRefresh();
      }
    } finally {
      setIsSaving(false);
    }
  }, [filePath, projectId]);

  handleSaveRef.current = handleSave;

  const handleOpenPlugins = useCallback(async () => {
    if (!payload) return;
    // Auto-save unsaved changes before navigating away
    if (isDirty && editorRef.current) {
      const currentContent = editorRef.current.getValue();
      const ipc = getApi(api);
      const result = await ipc.feed.writeFeedFile({ filePath, content: currentContent, projectId });
      if (result.success) {
        setSavedContent(currentContent);
        setIsDirty(false);
      }
    }
    navigation?.push(
      feedWidgetsContent(payload.filePath, payload.tier, payload.label, payload.projectId),
      'Feed Widgets',
    );
  }, [payload, isDirty, filePath, projectId, navigation]);

  return (
    <DrawerContainer
      title={`feed.md (${label})`}
      isSaving={isSaving}
      contentClassName="!overflow-hidden flex flex-col"
      headerActions={
        <div className="flex items-center gap-1">
          <button
            onClick={handleOpenPlugins}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Manage feed widgets"
          >
            <Blocks className="h-3 w-3" />
            Widgets
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
            title="Save (Cmd+S)"
          >
            <Save className="h-3 w-3" />
            Save
          </button>
        </div>
      }
      footer={
        <div className="flex shrink-0 items-center justify-between border-t border-border-muted px-3 py-1.5 text-[11px] text-foreground-muted">
          <span>{isDirty ? 'Unsaved changes' : 'Saved'}</span>
          <span className="text-foreground-muted/60">Cmd+S to save</span>
        </div>
      }
    >
      {!isLoaded ? (
        <div className="flex h-full items-center justify-center text-sm text-neutral-500">
          Loading...
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          <Editor
            defaultValue={savedContent}
            language="markdown"
            theme={editorTheme}
            options={{
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
      )}
    </DrawerContainer>
  );
}

/** Default template content for a new feed.md file */
function defaultFeedContent(): string {
  return `@vienna//widget/workstreams?sections=needs_action,completed
@vienna//widget/tasks?statuses=todo,in_progress

# Feed Instructions

Write natural language instructions for what should appear in your home feed.
Each instruction will be processed by AI to generate feed cards.

## Examples

- Show me a motivational quote for the day
- Display my recent git activity summary
- Show upcoming deadlines from my project
`;
}
