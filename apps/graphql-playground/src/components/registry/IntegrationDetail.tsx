/**
 * IntegrationDetail — Expanded integration view
 */

import { ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { SPRINGS } from '@/lib/animations';
import type { IntegrationInfo } from '@/hooks/use-registry';

interface IntegrationDetailProps {
  integration: IntegrationInfo;
  onBack: () => void;
}

export function IntegrationDetail({ integration, onBack }: IntegrationDetailProps) {
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
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {integration.displayName}
          </h3>
          <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full bg-[var(--button-brand-bg)]/10 text-[var(--button-brand-bg)]">
            integration
          </span>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Use <code className="text-[11px]">graphql_operations</code> to discover available queries and mutations for this integration.
        </p>
      </div>
    </div>
  );
}
