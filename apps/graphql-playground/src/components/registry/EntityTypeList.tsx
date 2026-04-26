/**
 * EntityTypeList — Collapsible section listing entity types
 */

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SPRINGS } from '@/lib/animations';
import type { EntityTypeInfo } from '@/hooks/use-registry';

interface EntityTypeListProps {
  entityTypes: EntityTypeInfo[];
  onSelect: (type: string) => void;
  defaultOpen?: boolean;
}

export function EntityTypeList({ entityTypes, onSelect, defaultOpen = true }: EntityTypeListProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (entityTypes.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 w-full px-4 py-2.5 hover:bg-[var(--surface-hover)] transition-colors"
      >
        <motion.div animate={{ rotate: open ? 90 : 0 }} transition={SPRINGS.SNAPPY}>
          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
        </motion.div>
        <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
          Entity Types
        </span>
        <span className="text-xs text-[var(--text-muted)] ml-auto">{entityTypes.length}</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={SPRINGS.GENTLE}
            className="overflow-hidden"
          >
            <div className="pb-1">
              {entityTypes.map((et) => (
                <button
                  key={et.type}
                  type="button"
                  onClick={() => onSelect(et.type)}
                  className="flex items-center gap-2.5 w-full pl-9 pr-4 py-2 text-left rounded-md hover:bg-[var(--surface-hover)] transition-colors group"
                >
                  {et.display?.emoji && (
                    <span className="text-sm shrink-0">{et.display.emoji}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-[var(--text-primary)] group-hover:text-[var(--button-brand-bg)] transition-colors truncate block">
                      {et.displayName}
                    </span>
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0',
                      et.source === 'integration'
                        ? 'bg-[var(--button-brand-bg)]/10 text-[var(--button-brand-bg)]'
                        : 'bg-[var(--surface-interactive)] text-[var(--text-muted)]'
                    )}
                  >
                    {et.source}
                  </span>
                  {et.actions && et.actions.length > 0 && (
                    <span className="text-xs text-[var(--text-muted)] shrink-0">
                      {et.actions.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
