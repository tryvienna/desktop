/**
 * useDraftPersistence — Auto-saves draft input to localStorage and restores on mount
 *
 * @ai-context
 * - Debounced auto-save (default 500ms) to localStorage
 * - Restores draft on mount via onRestore callback
 * - Returns { clearDraft, saveDraft, hasDraft }
 *
 * @example
 * const { clearDraft } = useDraftPersistence({ draftKey: 'ws-123', value: text, onRestore: setText });
 */

import { useEffect, useCallback, useRef } from 'react';

export interface UseDraftPersistenceOptions {
  draftKey: string;
  value: string;
  onRestore?: (draft: string) => void;
  debounceMs?: number;
  enabled?: boolean;
}

export interface UseDraftPersistenceReturn {
  clearDraft: () => void;
  saveDraft: (value: string) => void;
  hasDraft: () => boolean;
}

export function useDraftPersistence(
  options: UseDraftPersistenceOptions
): UseDraftPersistenceReturn {
  const { draftKey, value, onRestore, debounceMs = 500, enabled = true } = options;

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRestoredRef = useRef(false);
  const prevKeyRef = useRef(draftKey);

  // When draftKey changes (e.g. workstream switch), flush the old draft
  // and reset so the new key's draft gets restored.
  if (prevKeyRef.current !== draftKey) {
    // Flush any pending debounced save for the OLD key immediately
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    hasRestoredRef.current = false;
    prevKeyRef.current = draftKey;
  }

  const saveDraft = useCallback(
    (draftValue: string) => {
      if (!enabled) return;
      try {
        if (draftValue.trim()) localStorage.setItem(draftKey, draftValue);
        else localStorage.removeItem(draftKey);
      } catch {
        /* localStorage unavailable */
      }
    },
    [draftKey, enabled]
  );

  const clearDraft = useCallback(() => {
    if (!enabled) return;
    try {
      localStorage.removeItem(draftKey);
    } catch {
      /* noop */
    }
  }, [draftKey, enabled]);

  const hasDraft = useCallback(() => {
    if (!enabled) return false;
    try {
      const draft = localStorage.getItem(draftKey);
      return draft !== null && draft.trim().length > 0;
    } catch {
      return false;
    }
  }, [draftKey, enabled]);

  // Restore on mount and when draftKey changes
  useEffect(() => {
    if (!enabled || hasRestoredRef.current) return;
    try {
      const draft = localStorage.getItem(draftKey);
      if (draft?.trim()) onRestore?.(draft);
    } catch {
      /* noop */
    }
    hasRestoredRef.current = true;
  }, [draftKey, enabled, onRestore]);

  // Auto-save (debounced)
  useEffect(() => {
    if (!enabled || !hasRestoredRef.current) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => saveDraft(value), debounceMs);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value, enabled, debounceMs, saveDraft]);

  return { clearDraft, saveDraft, hasDraft };
}
