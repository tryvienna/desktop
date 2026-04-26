/**
 * useHistory — localStorage-backed query history
 */

import { useState, useCallback } from 'react';

export interface HistoryEntry {
  id: string;
  query: string;
  variables: string;
  timestamp: number;
  duration: number | null;
  hasErrors: boolean;
}

const STORAGE_KEY = 'graphql-playground-history';
const MAX_ENTRIES = 50;

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>(loadHistory);

  const addEntry = useCallback((entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
    setEntries((prev) => {
      const next = [
        {
          ...entry,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        },
        ...prev,
      ].slice(0, MAX_ENTRIES);
      saveHistory(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setEntries([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { entries, addEntry, clearHistory };
}
