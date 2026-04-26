/**
 * TagDelegationWidget — Shows that a tag was delegated to a new workstream
 *
 * @ai-context
 * - Renders when a tag with spawnWorkstream=true is applied
 * - Shows tag pill with colored badge and link to the spawned workstream
 * - Uses the TagStatusContext's onNavigateToWorkstream callback for navigation
 * - data-slot="tag-delegation-widget"
 */

import { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { SPRINGS } from '../../tokens';
import { useTagStatusLookup } from './tag-status-context';

const HEX_COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;
function safeColor(c: string): string {
  return HEX_COLOR_RE.test(c) ? c : '#3B82F6';
}

export interface TagDelegationWidgetProps {
  tagName: string;
  color: string;
  delegatedWorkstreamId: string;
  delegatedWorkstreamTitle: string;
}

export const TagDelegationWidget = memo(function TagDelegationWidget({
  tagName,
  color: rawColor,
  delegatedWorkstreamId,
  delegatedWorkstreamTitle,
}: TagDelegationWidgetProps) {
  const color = safeColor(rawColor);
  const ctx = useTagStatusLookup();

  const handleNavigate = useCallback(() => {
    ctx?.onNavigateToWorkstream?.(delegatedWorkstreamId);
  }, [ctx, delegatedWorkstreamId]);

  return (
    <motion.div
      data-slot="tag-delegation-widget"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRINGS.GENTLE}
      className="rounded-lg border bg-surface-page border-border-muted overflow-hidden"
    >
      <div className="flex items-center gap-2 px-3 py-1.5">
        <span
          className="inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded"
          style={{
            backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
            color,
          }}
        >
          {tagName}
        </span>
        <span className="text-xs text-muted-foreground">delegated to</span>
        <button
          type="button"
          onClick={handleNavigate}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer bg-transparent border-none p-0"
        >
          {delegatedWorkstreamTitle}
          <ExternalLink size={12} className="flex-shrink-0" />
        </button>
      </div>
    </motion.div>
  );
});
