/**
 * ThinkingRenderer — Renders ThinkingBlock as a collapsible disclosure panel
 *
 * @ai-context
 * - Vienna-specific; drift-v2 does not render thinking blocks
 * - Collapsible with framer-motion AnimatePresence
 * - Shows "streaming..." indicator during active thinking
 * - data-slot="thinking-renderer"
 *
 * @example
 * <ThinkingRenderer content={{ type: 'thinking', text: '...' }} messageId="m1" isStreaming={true} />
 */

import { memo, useState } from 'react';

import { motion, AnimatePresence } from 'framer-motion';

import type { ThinkingBlock } from '../types/messages';
import type { RendererProps, RendererDefinition } from './registry';
import { SPRINGS } from '../tokens';

export const ThinkingRenderer = memo(function ThinkingRenderer({
  content,
  isStreaming,
}: RendererProps<ThinkingBlock>) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      data-slot="thinking-renderer"
      data-renderer="thinking"
      data-streaming={isStreaming}
      className="rounded-lg border border-border-muted bg-surface-page"
    >
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="flex items-center gap-2 w-full px-3 py-1.5 text-left cursor-pointer select-none hover:bg-surface-hover transition-colors duration-100"
      >
        <svg
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          className="flex-shrink-0 text-ai"
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={1.5} />
          <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
        </svg>
        <span className="text-xs font-medium text-ai">Thinking</span>
        {isStreaming && (
          <span className="text-[10px] text-muted-foreground animate-pulse">streaming...</span>
        )}
        <motion.svg
          width={14}
          height={14}
          viewBox="0 0 14 14"
          fill="none"
          className="ml-auto flex-shrink-0 text-muted-foreground"
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={SPRINGS.SNAPPY}
        >
          <path
            d="M3.5 5.25L7 8.75L10.5 5.25"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.svg>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            className="overflow-hidden border-t border-border-muted"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ height: SPRINGS.GENTLE, opacity: { duration: 0.15 } }}
          >
            <pre className="p-3 text-xs font-mono text-foreground-secondary whitespace-pre-wrap break-words max-h-[400px] overflow-y-auto">
              {content.text}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export const thinkingRendererDefinition: RendererDefinition<ThinkingBlock> = {
  id: 'thinking',
  match: (content): content is ThinkingBlock => content.type === 'thinking',
  component: ThinkingRenderer,
  priority: 5,
};
