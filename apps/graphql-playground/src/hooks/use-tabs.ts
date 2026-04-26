/**
 * useTabs — Multi-tab query state manager with localStorage persistence
 */

import { useState, useCallback } from 'react';
import type { GraphQLResult } from '@/lib/graphql-client';

export interface QueryTab {
  id: string;
  name: string;
  query: string;
  variables: string;
  result: GraphQLResult | null;
  duration: number | null;
  error: string | null;
}

const STORAGE_KEY = 'vienna-playground-tabs';

const DEFAULT_QUERY = `# Welcome to the Vienna GraphQL Playground
#
# Explore the schema using the panel on the left.
# Write queries here and press Cmd+Enter to execute.

query GetProjects {
  projects {
    id
    name
    workstreams {
      id
      title
      status
    }
  }
}
`;

function createTab(name?: string, query?: string): QueryTab {
  return {
    id: crypto.randomUUID(),
    name: name ?? 'New Query',
    query: query ?? DEFAULT_QUERY,
    variables: '{}',
    result: null,
    duration: null,
    error: null,
  };
}

interface TabsState {
  tabs: QueryTab[];
  activeId: string;
}

function loadTabs(): TabsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TabsState;
      if (parsed.tabs.length > 0) {
        // Clear transient state on reload
        return {
          tabs: parsed.tabs.map((t) => ({ ...t, result: null, duration: null, error: null })),
          activeId: parsed.activeId,
        };
      }
    }
  } catch {
    // ignore
  }
  const tab = createTab('GetProjects');
  return { tabs: [tab], activeId: tab.id };
}

function saveTabs(state: TabsState): void {
  // Only persist query/variables, not results
  const toSave: TabsState = {
    tabs: state.tabs.map((t) => ({
      ...t,
      result: null,
      duration: null,
      error: null,
    })),
    activeId: state.activeId,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}

/** Extract operation name from a GraphQL query string */
function extractOperationName(query: string): string | null {
  const match = /(?:query|mutation|subscription)\s+(\w+)/i.exec(query);
  return match?.[1] ?? null;
}

export function useTabs() {
  const [state, setState] = useState<TabsState>(loadTabs);

  const activeTab = state.tabs.find((t) => t.id === state.activeId) ?? state.tabs[0]!;

  const setActiveTab = useCallback((id: string) => {
    setState((prev) => {
      const next = { ...prev, activeId: id };
      saveTabs(next);
      return next;
    });
  }, []);

  const addTab = useCallback((options?: { name?: string; query?: string; variables?: string }) => {
    setState((prev) => {
      const tab = createTab(options?.name ?? `Query ${prev.tabs.length + 1}`, options?.query);
      if (options?.variables) tab.variables = options.variables;
      const next = { tabs: [...prev.tabs, tab], activeId: tab.id };
      saveTabs(next);
      return next;
    });
  }, []);

  const closeTab = useCallback((id: string) => {
    setState((prev) => {
      if (prev.tabs.length <= 1) return prev; // Don't close last tab
      const idx = prev.tabs.findIndex((t) => t.id === id);
      const tabs = prev.tabs.filter((t) => t.id !== id);
      let activeId = prev.activeId;
      if (activeId === id) {
        // Activate the adjacent tab
        activeId = tabs[Math.min(idx, tabs.length - 1)]!.id;
      }
      const next = { tabs, activeId };
      saveTabs(next);
      return next;
    });
  }, []);

  const updateTab = useCallback((id: string, updates: Partial<QueryTab>) => {
    setState((prev) => {
      const tabs = prev.tabs.map((t) => {
        if (t.id !== id) return t;
        const updated = { ...t, ...updates };
        // Auto-derive name from operation
        if (updates.query !== undefined) {
          const opName = extractOperationName(updates.query);
          if (opName) updated.name = opName;
        }
        return updated;
      });
      const next = { ...prev, tabs };
      saveTabs(next);
      return next;
    });
  }, []);

  const renameTab = useCallback((id: string, name: string) => {
    setState((prev) => {
      const tabs = prev.tabs.map((t) => (t.id === id ? { ...t, name } : t));
      const next = { ...prev, tabs };
      saveTabs(next);
      return next;
    });
  }, []);

  return {
    tabs: state.tabs,
    activeTab,
    activeId: state.activeId,
    setActiveTab,
    addTab,
    closeTab,
    updateTab,
    renameTab,
  };
}
