/**
 * IntegrationList — Collapsible section listing integrations
 */

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRINGS } from '@/lib/animations';
import type { IntegrationInfo } from '@/hooks/use-registry';

interface IntegrationListProps {
  integrations: IntegrationInfo[];
  onSelect: (id: string) => void;
  defaultOpen?: boolean;
}

export function IntegrationList({
  integrations,
  onSelect,
  defaultOpen = true,
}: IntegrationListProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (integrations.length === 0) return null;

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
          Integrations
        </span>
        <span className="text-xs text-[var(--text-muted)] ml-auto">{integrations.length}</span>
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
              {integrations.map((integration) => (
                <button
                  key={integration.id}
                  type="button"
                  onClick={() => onSelect(integration.id)}
                  className="flex items-center gap-2.5 w-full pl-9 pr-4 py-2 text-left rounded-md hover:bg-[var(--surface-hover)] transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-[var(--text-primary)] group-hover:text-[var(--button-brand-bg)] transition-colors truncate block">
                      {integration.displayName}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--text-muted)] shrink-0">
                    {integration.id}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
