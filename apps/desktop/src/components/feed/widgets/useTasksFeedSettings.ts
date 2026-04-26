/**
 * useTasksFeedSettings — Persistent settings for the Tasks feed widget.
 *
 * @ai-context
 * - Follows the exact same pattern as useLinearFeedSettings in the Linear plugin
 * - Stores filter/sort state in localStorage, syncs via CustomEvent
 * - Used by TasksWidget to persist user filter choices across sessions
 */

import { useState, useEffect, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TasksFeedSettings {
  /** Status types to include (multi-select) */
  statuses: string[];
  /** Priority filter: 'all' or a specific priority value */
  priority: string;
  /** Assignee filter */
  assignee: 'all' | 'self' | 'workstream' | 'unassigned';
  /** Due date filter */
  dueDate: 'all' | 'overdue' | 'today' | 'this_week' | 'no_date';
  /** Sort field */
  sortBy: 'created' | 'updated' | 'priority' | 'due_date';
}

export const DEFAULT_TASKS_FEED_SETTINGS: TasksFeedSettings = {
  statuses: ['todo', 'in_progress'],
  priority: 'all',
  assignee: 'all',
  dueDate: 'all',
  sortBy: 'priority',
};

// ─────────────────────────────────────────────────────────────────────────────
// Storage
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'vienna:widget:tasks:feed-settings';
const CHANGE_EVENT = 'vienna:widget:tasks:feed-settings-changed';

function loadSettings(): TasksFeedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TASKS_FEED_SETTINGS;
    return { ...DEFAULT_TASKS_FEED_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_TASKS_FEED_SETTINGS;
  }
}

function saveSettings(settings: TasksFeedSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    // localStorage unavailable
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useTasksFeedSettings() {
  const [settings, setSettingsState] = useState(loadSettings);

  useEffect(() => {
    const handler = () => setSettingsState(loadSettings());
    window.addEventListener(CHANGE_EVENT, handler);
    return () => window.removeEventListener(CHANGE_EVENT, handler);
  }, []);

  const updateSettings = useCallback((patch: Partial<TasksFeedSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  return { settings, updateSettings };
}
