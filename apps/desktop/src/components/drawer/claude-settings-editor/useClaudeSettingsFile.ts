/**
 * useClaudeSettingsFile — Manages reading, editing, and saving a Claude
 * Code settings.json file via IPC.
 *
 * @ai-context
 * - Loads file content on mount via claudeSettings.readFile IPC
 * - Maintains a parsed working copy + serialized baseline for dirty detection
 * - updateField/deleteField use immutable deep-set/delete helpers
 * - save() writes back via claudeSettings.writeFile IPC
 * - updateRawJson() allows JSON-mode edits to sync back to the object
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getApi } from '@vienna/ipc/renderer';
import { api } from '../../../ipc';

type Settings = Record<string, unknown>;

/** Immutable deep-set: returns a new object with value set at the given path */
function deepSet(obj: Settings, path: string[], value: unknown): Settings {
  if (path.length === 0) return obj;
  if (path.length === 1) {
    return { ...obj, [path[0]!]: value };
  }
  const [head, ...rest] = path;
  const child = (obj[head!] ?? {}) as Settings;
  return { ...obj, [head!]: deepSet(child, rest, value) };
}

/** Immutable deep-delete: returns a new object with the key at path removed */
function deepDelete(obj: Settings, path: string[]): Settings {
  if (path.length === 0) return obj;
  if (path.length === 1) {
    const { [path[0]!]: _, ...rest } = obj;
    return rest;
  }
  const [head, ...rest] = path;
  const child = obj[head!];
  if (child == null || typeof child !== 'object') return obj;
  return { ...obj, [head!]: deepDelete(child as Settings, rest) };
}

/** Deep-get a value at the given path */
export function deepGet(obj: Settings, path: string[]): unknown {
  let current: unknown = obj;
  for (const key of path) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Settings)[key];
  }
  return current;
}

function serialize(settings: Settings): string {
  return JSON.stringify(settings, null, 2) + '\n';
}

export interface UseClaudeSettingsFileResult {
  settings: Settings;
  rawJson: string;
  isDirty: boolean;
  isSaving: boolean;
  isLoading: boolean;
  error: string | null;
  updateField: (path: string[], value: unknown) => void;
  deleteField: (path: string[]) => void;
  updateRawJson: (json: string) => void;
  save: () => Promise<void>;
  reload: () => Promise<void>;
}

export function useClaudeSettingsFile(filePath: string): UseClaudeSettingsFileResult {
  const [settings, setSettings] = useState<Settings>({});
  const [savedJson, setSavedJson] = useState<string>('');
  // rawJsonOverride is set only when editing in JSON mode (raw text that may not parse)
  const [rawJsonOverride, setRawJsonOverride] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filePathRef = useRef(filePath);
  filePathRef.current = filePath;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const errorRef = useRef(error);
  errorRef.current = error;

  // Derive rawJson from settings (single source of truth), unless JSON mode override is active
  const derivedJson = useMemo(() => serialize(settings), [settings]);
  const rawJson = rawJsonOverride ?? derivedJson;

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const ipc = getApi(api);
      const result = await ipc.claudeSettings.readFile({ path: filePath });
      const parsed = JSON.parse(result.content) as Settings;
      setSettings(parsed);
      setRawJsonOverride(null);
      setSavedJson(serialize(parsed));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSettings({});
      setRawJsonOverride(null);
      setSavedJson(serialize({}));
    } finally {
      setIsLoading(false);
    }
  }, [filePath]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateField = useCallback((path: string[], value: unknown) => {
    setSettings((prev) => deepSet(prev, path, value));
    setRawJsonOverride(null);
    setError(null);
  }, []);

  const deleteField = useCallback((path: string[]) => {
    setSettings((prev) => deepDelete(prev, path));
    setRawJsonOverride(null);
    setError(null);
  }, []);

  const updateRawJson = useCallback((json: string) => {
    setRawJsonOverride(json);
    try {
      const parsed = JSON.parse(json) as Settings;
      setSettings(parsed);
      setError(null);
    } catch {
      setError('Invalid JSON');
    }
  }, []);

  const save = useCallback(async () => {
    if (errorRef.current === 'Invalid JSON') return;
    setIsSaving(true);
    try {
      const content = serialize(settingsRef.current);
      const ipc = getApi(api);
      const result = await ipc.claudeSettings.writeFile({ path: filePathRef.current, content });
      if (!result.success) {
        setError('Failed to save — file path may not be allowed');
        return;
      }
      setSavedJson(content);
      setRawJsonOverride(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  }, []);

  const isDirty = rawJson !== savedJson;

  return {
    settings,
    rawJson,
    isDirty,
    isSaving,
    isLoading,
    error,
    updateField,
    deleteField,
    updateRawJson,
    save,
    reload: load,
  };
}
