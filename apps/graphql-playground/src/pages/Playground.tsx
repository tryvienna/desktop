/**
 * Playground — Main orchestrator: multi-tab state, schema, execution, history, keyboard shortcuts
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { print, parse } from 'graphql';
import { Layout } from '@/components/Layout';
import { KeyboardShortcutsDialog } from '@/components/KeyboardShortcutsDialog';
import { useSchema } from '@/hooks/use-schema';
import { useRegistry } from '@/hooks/use-registry';
import { useQueryExecution } from '@/hooks/use-query-execution';
import { useHistory } from '@/hooks/use-history';
import { useTheme } from '@/hooks/use-theme';
import { useTabs } from '@/hooks/use-tabs';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import type { ExecuteState } from '@/components/Toolbar';
import type { HistoryEntry } from '@/hooks/use-history';
import type { QueryTemplate } from '@/lib/query-templates';

export function Playground() {
  const { theme, toggle: toggleTheme } = useTheme();
  const { schema, introspection, sdl, loading: schemaLoading } = useSchema();
  const { entityTypes, integrations, loading: registryLoading } = useRegistry();
  const { execute } = useQueryExecution();
  const { entries: historyEntries, addEntry, clearHistory } = useHistory();
  const { tabs, activeTab, activeId, setActiveTab, addTab, closeTab, updateTab, renameTab } =
    useTabs();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [executeState, setExecuteState] = useState<ExecuteState>('idle');
  const resetTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleExecute = useCallback(async () => {
    let vars: Record<string, unknown> | undefined;
    try {
      const parsed = JSON.parse(activeTab.variables) as Record<string, unknown>;
      if (Object.keys(parsed).length > 0) vars = parsed;
    } catch {
      // Invalid JSON — execute without variables
    }

    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    setExecuteState('running');

    const res = await execute(activeTab.query, vars);
    if (res) {
      const hasErrors = !!res.result.errors?.length;
      setExecuteState(hasErrors ? 'error' : 'success');
      updateTab(activeTab.id, {
        result: res.result,
        duration: res.duration,
        error: null,
      });
      addEntry({
        query: activeTab.query,
        variables: activeTab.variables,
        duration: res.duration,
        hasErrors,
      });
    } else {
      setExecuteState('error');
      updateTab(activeTab.id, {
        error: 'Execution failed',
      });
    }

    resetTimerRef.current = setTimeout(() => setExecuteState('idle'), 1500);
  }, [activeTab, execute, updateTab, addEntry]);

  const handlePrettify = useCallback(() => {
    let newQuery = activeTab.query;
    let newVars = activeTab.variables;

    try {
      const doc = parse(activeTab.query);
      newQuery = print(doc);
    } catch {
      // Invalid query — can't prettify
    }

    try {
      const parsed = JSON.parse(activeTab.variables) as unknown;
      newVars = JSON.stringify(parsed, null, 2);
    } catch {
      // Invalid JSON — skip
    }

    updateTab(activeTab.id, { query: newQuery, variables: newVars });
  }, [activeTab, updateTab]);

  const handleQueryChange = useCallback(
    (value: string) => updateTab(activeTab.id, { query: value }),
    [activeTab.id, updateTab]
  );

  const handleVariablesChange = useCallback(
    (value: string) => updateTab(activeTab.id, { variables: value }),
    [activeTab.id, updateTab]
  );

  const handleHistorySelect = useCallback(
    (entry: HistoryEntry) => {
      updateTab(activeTab.id, { query: entry.query, variables: entry.variables });
    },
    [activeTab.id, updateTab]
  );

  const handleTryIt = useCallback(
    (template: QueryTemplate) => {
      addTab({ name: template.name, query: template.query, variables: template.variables });
    },
    [addTab]
  );

  const handleCloseActiveTab = useCallback(() => {
    closeTab(activeTab.id);
  }, [activeTab.id, closeTab]);

  const toggleShortcuts = useCallback(() => {
    setShortcutsOpen((prev) => !prev);
  }, []);

  const handleAddTab = useCallback(() => addTab(), [addTab]);

  const shortcutHandlers = useMemo(
    () => ({
      onExecute: handleExecute,
      onPrettify: handlePrettify,
      onNewTab: handleAddTab,
      onCloseTab: handleCloseActiveTab,
      onToggleShortcuts: toggleShortcuts,
    }),
    [handleExecute, handlePrettify, handleAddTab, handleCloseActiveTab, toggleShortcuts]
  );

  useKeyboardShortcuts(shortcutHandlers);

  return (
    <>
      <Layout
        theme={theme}
        onThemeToggle={toggleTheme}
        onShowShortcuts={toggleShortcuts}
        schema={schema}
        introspection={introspection}
        sdl={sdl}
        schemaLoading={schemaLoading}
        registryEntityTypes={entityTypes}
        registryIntegrations={integrations}
        registryLoading={registryLoading}
        onTryIt={handleTryIt}
        tabs={tabs}
        activeTab={activeTab}
        activeId={activeId}
        onTabSelect={setActiveTab}
        onTabClose={closeTab}
        onTabAdd={handleAddTab}
        onTabRename={renameTab}
        onQueryChange={handleQueryChange}
        onVariablesChange={handleVariablesChange}
        onExecute={handleExecute}
        onPrettify={handlePrettify}
        executeState={executeState}
        history={historyEntries}
        onHistorySelect={handleHistorySelect}
        onHistoryClear={clearHistory}
      />
      <KeyboardShortcutsDialog open={shortcutsOpen} onClose={toggleShortcuts} />
    </>
  );
}
