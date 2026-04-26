/**
 * EntityTypeDetail — Expanded entity type view with metadata, URI pattern, and actions
 */

import { ChevronLeft, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SPRINGS } from '@/lib/animations';
import { generateEntitiesQuery } from '@/lib/query-templates';
import type { EntityTypeInfo } from '@/hooks/use-registry';
import type { QueryTemplate } from '@/lib/query-templates';

interface EntityTypeDetailProps {
  entityType: EntityTypeInfo;
  onBack: () => void;
  onTryIt: (template: QueryTemplate) => void;
}

export function EntityTypeDetail({ entityType, onBack, onTryIt }: EntityTypeDetailProps) {
  const handleListEntities = () => {
    onTryIt(generateEntitiesQuery(entityType.type));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border-default)]">
        <motion.button
          type="button"
          onClick={onBack}
          whileHover={{ x: -2 }}
          transition={SPRINGS.SNAPPY}
          className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-1"
        >
          <ChevronLeft className="w-3 h-3" />
          Back
        </motion.button>
        <div className="flex items-center gap-2">
          {entityType.display?.emoji && (
            <span className="text-base">{entityType.display.emoji}</span>
          )}
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {entityType.displayName}
          </h3>
          <span
            className={cn(
              'text-[10px] font-medium uppercase px-2 py-0.5 rounded-full',
              entityType.source === 'integration'
                ? 'bg-[var(--button-brand-bg)]/10 text-[var(--button-brand-bg)]'
                : 'bg-[var(--surface-interactive)] text-[var(--text-muted)]'
            )}
          >
            {entityType.source}
          </span>
        </div>
        {entityType.display?.description && (
          <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
            {entityType.display.description}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* URI Pattern */}
        <div className="px-4 py-3 border-b border-[var(--border-muted)]">
          <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
            URI Pattern
          </span>
          <code className="block mt-1 text-xs font-mono text-[var(--text-secondary)] bg-[var(--surface-sunken)] px-2 py-1.5 rounded-md">
            {entityType.uriExample}
          </code>
        </div>

        {/* Try It: List Entities */}
        <div className="px-4 py-3 border-b border-[var(--border-muted)]">
          <button
            type="button"
            onClick={handleListEntities}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-[var(--surface-interactive)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] transition-colors"
          >
            <Play className="w-3 h-3 text-[var(--button-brand-bg)]" />
            <span className="text-xs font-medium text-[var(--text-primary)]">
              List {entityType.displayName}s
            </span>
            <span className="text-[10px] text-[var(--text-muted)] ml-auto font-mono">
              entities(type: &quot;{entityType.type}&quot;)
            </span>
          </button>
        </div>

        {/* Display Metadata */}
        {entityType.display?.outputFields && entityType.display.outputFields.length > 0 && (
          <div className="py-1">
            <div className="px-4 py-2">
              <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Output Fields
              </span>
            </div>
            {entityType.display.outputFields.map((field) => (
              <div key={field.key} className="flex items-center justify-between gap-2 py-1.5 px-4">
                <span className="text-xs font-mono text-[var(--text-primary)]">{field.label}</span>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">
                  {field.metadataPath}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        {entityType.display?.filterDescriptions &&
          entityType.display.filterDescriptions.length > 0 && (
            <div className="py-1">
              <div className="px-4 py-2">
                <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Filters
                </span>
              </div>
              {entityType.display.filterDescriptions.map((filter) => (
                <div
                  key={filter.name}
                  className="flex items-start justify-between gap-2 py-1.5 px-4"
                >
                  <div>
                    <span className="text-xs font-mono text-[var(--text-primary)]">
                      {filter.name}
                    </span>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                      {filter.description}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] shrink-0">
                    {filter.type}
                  </span>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
