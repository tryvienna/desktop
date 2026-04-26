/**
 * RegistryBrowser — Search + entity types + integrations with animated directional navigation
 */

import { useState, useMemo } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRINGS, slideVariants } from '@/lib/animations';
import { EntityTypeList } from './EntityTypeList';
import { IntegrationList } from './IntegrationList';
import { EntityTypeDetail } from './EntityTypeDetail';
import { IntegrationDetail } from './IntegrationDetail';
import type { EntityTypeInfo, IntegrationInfo } from '@/hooks/use-registry';
import type { QueryTemplate } from '@/lib/query-templates';

type ViewStackEntry = { kind: 'entity'; type: string } | { kind: 'integration'; id: string };

interface RegistryBrowserProps {
  entityTypes: EntityTypeInfo[];
  integrations: IntegrationInfo[];
  loading: boolean;
  onTryIt: (template: QueryTemplate) => void;
}

export function RegistryBrowser({
  entityTypes,
  integrations,
  loading,
  onTryIt,
}: RegistryBrowserProps) {
  const [search, setSearch] = useState('');
  const [viewStack, setViewStack] = useState<ViewStackEntry[]>([]);
  const [direction, setDirection] = useState(1);

  const navigate = (entry: ViewStackEntry) => {
    setDirection(1);
    setViewStack((s) => [...s, entry]);
  };

  const goBack = () => {
    setDirection(-1);
    setViewStack((s) => s.slice(0, -1));
  };

  const currentView = viewStack[viewStack.length - 1];

  // Find detail data
  const currentEntityType =
    currentView?.kind === 'entity'
      ? entityTypes.find((et) => et.type === currentView.type)
      : undefined;

  const currentIntegration =
    currentView?.kind === 'integration'
      ? integrations.find((i) => i.id === currentView.id)
      : undefined;

  // Filter by search
  const searchLower = search.toLowerCase();
  const filteredEntityTypes = useMemo(
    () =>
      search
        ? entityTypes.filter(
            (et) =>
              et.displayName.toLowerCase().includes(searchLower) ||
              et.type.toLowerCase().includes(searchLower)
          )
        : entityTypes,
    [entityTypes, search, searchLower]
  );

  const filteredIntegrations = useMemo(
    () =>
      search
        ? integrations.filter(
            (i) =>
              i.displayName.toLowerCase().includes(searchLower) ||
              i.id.toLowerCase().includes(searchLower)
          )
        : integrations,
    [integrations, search, searchLower]
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-xs text-[var(--text-muted)]"
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Loading registry...
        </motion.div>
      </div>
    );
  }

  // Empty state
  if (entityTypes.length === 0 && integrations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-[var(--text-muted)]">No registrations found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-[var(--border-default)]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search registry..."
            className="w-full bg-[var(--surface-interactive)] border border-[var(--border-default)] rounded-lg pl-9 pr-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--border-interactive)] transition-shadow"
          />
        </div>
      </div>

      {/* Content with directional slide */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          {currentEntityType ? (
            <motion.div
              key={`entity-${currentEntityType.type}`}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={SPRINGS.SNAPPY}
              className="absolute inset-0 overflow-y-auto"
            >
              <EntityTypeDetail entityType={currentEntityType} onBack={goBack} onTryIt={onTryIt} />
            </motion.div>
          ) : currentIntegration ? (
            <motion.div
              key={`integration-${currentIntegration.id}`}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={SPRINGS.SNAPPY}
              className="absolute inset-0 overflow-y-auto"
            >
              <IntegrationDetail
                integration={currentIntegration}
                onBack={goBack}
              />
            </motion.div>
          ) : (
            <motion.div
              key="list"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={SPRINGS.SNAPPY}
              className="absolute inset-0 overflow-y-auto"
            >
              <EntityTypeList
                entityTypes={filteredEntityTypes}
                onSelect={(type) => navigate({ kind: 'entity', type })}
              />
              <IntegrationList
                integrations={filteredIntegrations}
                onSelect={(id) => navigate({ kind: 'integration', id })}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
