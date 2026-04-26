/**
 * useFileEditor — File read/write/watch lifecycle.
 *
 * Reads file content on mount, watches for external changes,
 * tracks dirty state, and handles save with LSP notification.
 * Detects conflicts when the file changes externally while dirty.
 *
 * @module editor/hooks/useFileEditor
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import type { FileClient, FileEventSubscriptions, LspClient } from '../types';
import { pathToUri } from '../utils';

/** Preserves unsaved content across unmount/remount (e.g. tab switches). */
const dirtyContentCache = new Map<string, string>();
const DIRTY_CACHE_MAX_ENTRIES = 20;

/** Remove a cached dirty entry (e.g. when a tab is closed). */
export function clearDirtyCache(filePath: string): void {
  dirtyContentCache.delete(filePath);
}

export interface UseFileEditorOptions {
  /** Typed IPC client for file operations. */
  fileClient: FileClient;
  /** Typed IPC event subscriptions for file changes. */
  fileEvents: FileEventSubscriptions;
  /** Typed IPC client for LSP methods (used for saveDocument). */
  lspClient: LspClient;
  /** The absolute file path to edit. */
  filePath: string;
}

export interface UseFileEditorResult {
  /** Current file content (null while loading). */
  content: string | null;
  /** Detected language ID for the file. */
  language: string;
  /** Whether the content has unsaved changes. */
  isDirty: boolean;
  /** Whether a save operation is in progress. */
  isSaving: boolean;
  /** Whether the file was changed externally while dirty. */
  hasConflict: boolean;
  /** Whether the file is still being loaded. */
  isLoading: boolean;
  /** Update the content (marks dirty if different from saved). */
  setContent: (content: string) => void;
  /** Save the current content to disk and notify LSP. */
  save: () => Promise<void>;
  /** Reload the file from disk, discarding local changes. */
  reload: () => Promise<void>;
  /** Dismiss the conflict flag without reloading. */
  dismissConflict: () => void;
}

export function useFileEditor(options: UseFileEditorOptions): UseFileEditorResult {
  const { fileClient, fileEvents, lspClient, filePath } = options;

  const [content, setContentState] = useState<string | null>(null);
  const [language, setLanguage] = useState('plaintext');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasConflict, setHasConflict] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const savedContentRef = useRef<string>('');
  const isDirtyRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const uri = pathToUri(filePath);

  // Load file on mount / path change
  const loadFile = useCallback(async () => {
    const isInitialLoad = !hasLoadedRef.current;
    if (isInitialLoad) setIsLoading(true);
    try {
      const result = await fileClient.read({ path: filePath });
      // Skip state update if content hasn't changed (avoids unnecessary re-renders)
      if (!isInitialLoad && result.content === savedContentRef.current) return;
      savedContentRef.current = result.content;
      setLanguage(result.language);

      // Restore unsaved content from cache (e.g. after a tab switch)
      const cached = dirtyContentCache.get(filePath);
      if (isInitialLoad && cached !== undefined) {
        setContentState(cached);
        const dirty = cached !== result.content;
        setIsDirty(dirty);
        isDirtyRef.current = dirty;
        dirtyContentCache.delete(filePath);
      } else {
        setContentState(result.content);
        setIsDirty(false);
        isDirtyRef.current = false;
      }
      setHasConflict(false);
    } catch {
      // File may not exist yet
      setContentState('');
      setLanguage('plaintext');
    } finally {
      if (isInitialLoad) {
        hasLoadedRef.current = true;
        setIsLoading(false);
      }
    }
  }, [fileClient, filePath]);

  // Reset load state when file path changes
  useEffect(() => {
    hasLoadedRef.current = false;
  }, [filePath]);

  useEffect(() => {
    void loadFile();
  }, [loadFile]);

  // Cache dirty content on unmount so it survives tab switches
  const contentRef = useRef(content);
  contentRef.current = content;
  useEffect(() => {
    return () => {
      if (isDirtyRef.current && contentRef.current !== null) {
        dirtyContentCache.set(filePath, contentRef.current);
        // Evict oldest entries if cache grows too large (e.g. from closed tabs)
        if (dirtyContentCache.size > DIRTY_CACHE_MAX_ENTRIES) {
          const oldest = dirtyContentCache.keys().next().value;
          if (oldest !== undefined) dirtyContentCache.delete(oldest);
        }
      } else {
        dirtyContentCache.delete(filePath);
      }
    };
  }, [filePath]);

  // Watch for external changes
  useEffect(() => {
    let watchStarted = false;

    void fileClient.watch({ path: filePath }).then((result) => {
      watchStarted = result.watching;
    });

    const unsub = fileEvents.onChanged((data) => {
      if (data.path !== filePath) return;

      if (isDirtyRef.current) {
        setHasConflict(true);
      } else {
        void loadFile();
      }
    });

    return () => {
      unsub();
      if (watchStarted) {
        void fileClient.unwatch({ path: filePath });
      }
    };
  }, [fileClient, fileEvents, filePath, loadFile]);

  // Update content and track dirty state
  const setContent = useCallback((newContent: string) => {
    setContentState(newContent);
    const dirty = newContent !== savedContentRef.current;
    setIsDirty(dirty);
    isDirtyRef.current = dirty;
  }, []);

  // Save file
  const save = useCallback(async () => {
    if (content === null) return;
    setIsSaving(true);
    try {
      await fileClient.write({ path: filePath, content });
      await lspClient.saveDocument({ uri, text: content });
      savedContentRef.current = content;
      setIsDirty(false);
      isDirtyRef.current = false;
      setHasConflict(false);
      dirtyContentCache.delete(filePath);
    } finally {
      setIsSaving(false);
    }
  }, [fileClient, lspClient, filePath, uri, content]);

  // Reload file from disk
  const reload = useCallback(async () => {
    await loadFile();
  }, [loadFile]);

  // Dismiss conflict without reloading
  const dismissConflict = useCallback(() => {
    setHasConflict(false);
  }, []);

  return {
    content,
    language,
    isDirty,
    isSaving,
    hasConflict,
    isLoading,
    setContent,
    save,
    reload,
    dismissConflict,
  };
}
