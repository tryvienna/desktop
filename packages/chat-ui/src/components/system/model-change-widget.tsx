/**
 * ModelChangeWidget — Compact card showing AI model switch mid-conversation
 *
 * @ai-context
 * - Renders model change system events with from/to model badges
 * - Formats well-known model names (Opus, Sonnet, Haiku)
 * - data-slot="model-change-widget"
 *
 * @example
 * <ModelChangeWidget fromModel="claude-sonnet" toModel="claude-opus" />
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import { SPRINGS } from '../../tokens';

function getModelDisplayName(modelId: string): string {
  if (modelId.includes('haiku')) return 'Haiku';
  if (modelId.includes('sonnet')) return 'Sonnet';
  if (modelId.includes('opus')) return 'Opus';
  return modelId.charAt(0).toUpperCase() + modelId.slice(1);
}

export interface ModelChangeWidgetProps {
  fromModel: string;
  toModel: string;
}

export const ModelChangeWidget = memo(function ModelChangeWidget({
  fromModel,
  toModel,
}: ModelChangeWidgetProps) {
  return (
    <motion.div
      data-slot="model-change-widget"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRINGS.GENTLE}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-surface-page border-border-muted"
    >
      <svg
        width={14}
        height={14}
        viewBox="0 0 24 24"
        fill="none"
        className="flex-shrink-0 text-muted-foreground"
      >
        <path
          d="M4 17V7a2 2 0 0 1 2-2h3l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M9 13h6M12 10v6" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      </svg>
      <span className="text-xs font-medium text-muted-foreground">Model changed</span>
      <span className="text-xs px-1.5 py-0.5 rounded bg-surface-interactive text-foreground-secondary line-through opacity-60">
        {getModelDisplayName(fromModel)}
      </span>
      <svg
        width={14}
        height={14}
        viewBox="0 0 24 24"
        fill="none"
        className="flex-shrink-0 text-muted-foreground"
      >
        <path
          d="M5 12h14m-6-6 6 6-6 6"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-surface-info text-info">
        {getModelDisplayName(toModel)}
      </span>
    </motion.div>
  );
});
