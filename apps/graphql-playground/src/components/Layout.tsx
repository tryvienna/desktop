/**
 * Layout — Header + TabBar + 3-panel resizable body
 */

import { useState } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SPRINGS } from '@/lib/animations';
import { Header } from './Header';
import { TabBar } from './TabBar';
import { SchemaBrowser } from './schema-browser/SchemaBrowser';
import { RegistryBrowser } from './registry/RegistryBrowser';
import { QueryEditor } from './editor/QueryEditor';
import { VariablesEditor } from './editor/VariablesEditor';
import { Toolbar } from './Toolbar';
import { ResultsPanel } from './results/ResultsPanel';
import type { GraphQLSchema, IntrospectionQuery } from 'graphql';
import type { HistoryEntry } from '@/hooks/use-history';
import type { QueryTab } from '@/hooks/use-tabs';
import type { Theme } from '@/hooks/use-theme';
import type { ExecuteState } from './Toolbar';
import type { EntityTypeInfo, IntegrationInfo } from '@/hooks/use-registry';
import type { QueryTemplate } from '@/lib/query-templates';

type LeftPanelTab = 'schema' | 'registry';

interface LayoutProps {
  // Theme
  theme: Theme;
  onThemeToggle: () => void;
  onShowShortcuts?: () => void;

  // Schema
  schema: GraphQLSchema | null;
  introspection: IntrospectionQuery | null;
  sdl: string | null;
  schemaLoading: boolean;

  // Registry
  registryEntityTypes: EntityTypeInfo[];
  registryIntegrations: IntegrationInfo[];
  registryLoading: boolean;
  onTryIt: (template: QueryTemplate) => void;

  // Tabs
  tabs: QueryTab[];
  activeTab: QueryTab;
  activeId: string;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
  onTabAdd: () => void;
  onTabRename: (id: string, name: string) => void;

  // Editor
  onQueryChange: (value: string) => void;
  onVariablesChange: (value: string) => void;

  // Execution
  onExecute: () => void;
  onPrettify: () => void;
  executeState: ExecuteState;

  // History
  history: HistoryEntry[];
  onHistorySelect: (entry: HistoryEntry) => void;
  onHistoryClear: () => void;
}

const LEFT_TABS: { id: LeftPanelTab; label: string }[] = [
  { id: 'schema', label: 'Schema' },
  { id: 'registry', label: 'Registry' },
];

export function Layout({
  theme,
  onThemeToggle,
  onShowShortcuts,
  schema,
  introspection,
  sdl,
  schemaLoading,
  registryEntityTypes,
  registryIntegrations,
  registryLoading,
  onTryIt,
  tabs,
  activeTab,
  activeId,
  onTabSelect,
  onTabClose,
  onTabAdd,
  onTabRename,
  onQueryChange,
  onVariablesChange,
  onExecute,
  onPrettify,
  executeState,
  history,
  onHistorySelect,
  onHistoryClear,
}: LayoutProps) {
  const [leftPanelTab, setLeftPanelTab] = useState<LeftPanelTab>('schema');

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--surface-page)]">
      <Header theme={theme} onThemeToggle={onThemeToggle} onShowShortcuts={onShowShortcuts} />
      <TabBar
        tabs={tabs}
        activeId={activeId}
        onTabSelect={onTabSelect}
        onTabClose={onTabClose}
        onTabAdd={onTabAdd}
        onTabRename={onTabRename}
      />

      <PanelGroup direction="horizontal" className="flex-1">
        {/* Left Panel: Schema / Registry */}
        <Panel defaultSize={20} minSize={15} maxSize={35}>
          <div className="h-full border-r border-[var(--border-default)] bg-[var(--surface-elevated)] flex flex-col">
            <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center gap-0">
              {LEFT_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setLeftPanelTab(tab.id)}
                  className={cn(
                    'relative px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] transition-colors',
                    leftPanelTab === tab.id
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  )}
                >
                  {tab.label}
                  {leftPanelTab === tab.id && (
                    <motion.div
                      layoutId="left-panel-tab-underline"
                      className="absolute bottom-0 left-1 right-1 h-0.5 bg-[var(--button-brand-bg)] rounded-full"
                      transition={SPRINGS.SNAPPY}
                    />
                  )}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-hidden">
              {leftPanelTab === 'schema' ? (
                <SchemaBrowser introspection={introspection} loading={schemaLoading} />
              ) : (
                <RegistryBrowser
                  entityTypes={registryEntityTypes}
                  integrations={registryIntegrations}
                  loading={registryLoading}
                  onTryIt={onTryIt}
                />
              )}
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="w-[1px] bg-[var(--border-default)] hover:bg-[var(--border-interactive)] transition-colors cursor-col-resize" />

        {/* Editor */}
        <Panel defaultSize={40} minSize={25}>
          <div className="h-full flex flex-col">
            <Toolbar
              onExecute={onExecute}
              onPrettify={onPrettify}
              executeState={executeState}
              duration={activeTab.duration}
            />

            <PanelGroup direction="vertical" className="flex-1">
              <Panel defaultSize={70} minSize={30}>
                <QueryEditor
                  schema={schema}
                  value={activeTab.query}
                  onChange={onQueryChange}
                  onExecute={onExecute}
                  theme={theme}
                />
              </Panel>

              <PanelResizeHandle className="h-[1px] bg-[var(--border-default)] hover:bg-[var(--border-interactive)] transition-colors cursor-row-resize" />

              <Panel defaultSize={30} minSize={15}>
                <div className="h-full flex flex-col">
                  <div className="px-4 py-2 border-b border-[var(--border-default)] bg-[var(--surface-elevated)]">
                    <span className="text-xs font-medium text-[var(--text-muted)]">Variables</span>
                  </div>
                  <div className="flex-1">
                    <VariablesEditor
                      value={activeTab.variables}
                      onChange={onVariablesChange}
                      theme={theme}
                    />
                  </div>
                </div>
              </Panel>
            </PanelGroup>
          </div>
        </Panel>

        <PanelResizeHandle className="w-[1px] bg-[var(--border-default)] hover:bg-[var(--border-interactive)] transition-colors cursor-col-resize" />

        {/* Results */}
        <Panel defaultSize={40} minSize={20}>
          <ResultsPanel
            result={activeTab.result}
            duration={activeTab.duration}
            loading={executeState === 'running'}
            error={activeTab.error}
            sdl={sdl}
            history={history}
            onHistorySelect={onHistorySelect}
            onHistoryClear={onHistoryClear}
          />
        </Panel>
      </PanelGroup>
    </div>
  );
}
