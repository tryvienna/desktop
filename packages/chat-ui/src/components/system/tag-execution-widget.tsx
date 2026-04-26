/**
 * TagExecutionWidget — Shows tag execution status with expandable instructions
 *
 * @ai-context
 * - Renders when a tag starts executing on a workstream
 * - Shows tag name with colored pill, status indicator, and expandable instructions
 * - Includes snapshot of all tags on the workstream (pipeline progress)
 * - Uses semantic color tokens (text-success, text-warning, text-error, etc.)
 * - Follows CompactingWidget/TaskNotificationWidget visual patterns
 * - data-slot="tag-execution-widget"
 */

import { memo, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { SPRINGS, TRANSITIONS } from '../../tokens';
import { useTagStatusLookup } from './tag-status-context';
import { SnapshotDAGView } from './snapshot-dag-view';

const HEX_COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;
function safeColor(color: string): string {
  return HEX_COLOR_RE.test(color) ? color : '#3B82F6';
}

const VALID_STATUSES = new Set(['pending', 'running', 'completed', 'failed', 'skipped']);

export interface TagSnapshotItem {
  tagName: string;
  color: string;
  status: string;
  dependsOn?: string[];
  waitingOn?: string[];
  delegatedWorkstreamId?: string;
  delegatedWorkstreamTitle?: string;
}

export interface TagExecutionWidgetProps {
  tagName: string;
  color: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  instructions: string;
  workstreamId: string;
  snapshot: TagSnapshotItem[];
}

function StatusDot({ status, size = 6 }: { status: string; size?: number }) {
  if (status === 'running') {
    return (
      <motion.span
        className="rounded-full bg-warning inline-block flex-shrink-0"
        style={{ width: size, height: size }}
        animate={{ opacity: [1, 0.4, 1] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      />
    );
  }
  if (status === 'completed') {
    return (
      <svg width={size + 4} height={size + 4} viewBox="0 0 24 24" fill="none" className="flex-shrink-0 text-success">
        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === 'failed') {
    return (
      <svg width={size + 4} height={size + 4} viewBox="0 0 24 24" fill="none" className="flex-shrink-0 text-error">
        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
      </svg>
    );
  }
  if (status === 'skipped') {
    return (
      <svg width={size + 4} height={size + 4} viewBox="0 0 24 24" fill="none" className="flex-shrink-0 text-muted-foreground">
        <path d="M5 12h14" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
      </svg>
    );
  }
  // pending / default
  return (
    <span
      className="rounded-full bg-muted-foreground/30 inline-block flex-shrink-0"
      style={{ width: size, height: size }}
    />
  );
}

function statusLabel(status: string): string {
  switch (status) {
    case 'running': return 'Executing...';
    case 'completed': return 'Completed';
    case 'failed': return 'Failed';
    case 'pending': return 'Waiting';
    case 'skipped': return 'Skipped';
    default: return '';
  }
}

function statusTextClass(status: string): string {
  switch (status) {
    case 'running': return 'text-warning';
    case 'completed': return 'text-success';
    case 'failed': return 'text-error';
    default: return 'text-muted-foreground';
  }
}

function statusBorderClass(status: string): string {
  switch (status) {
    case 'running': return 'border-warning/30';
    case 'completed': return 'border-success/30';
    case 'failed': return 'border-error/30';
    default: return 'border-border-muted';
  }
}

export const TagExecutionWidget = memo(function TagExecutionWidget({
  tagName,
  color: rawColor,
  status: initialStatus,
  instructions,
  workstreamId,
  snapshot: initialSnapshot,
}: TagExecutionWidgetProps) {
  const color = safeColor(rawColor);
  const [expanded, setExpanded] = useState(false);
  const toggleExpanded = useCallback(() => setExpanded((prev) => !prev), []);

  // Pull live status from context if available (keeps widget up-to-date after completion)
  const statusCtx = useTagStatusLookup();
  const liveStatuses = statusCtx ? statusCtx.lookup(workstreamId) : null;

  const status = useMemo(() => {
    if (!liveStatuses) return initialStatus;
    const live = liveStatuses.find((s) => s.tagName === tagName);
    if (!live?.status || !VALID_STATUSES.has(live.status)) return initialStatus;
    return live.status as typeof initialStatus;
  }, [liveStatuses, tagName, initialStatus]);

  const snapshot = useMemo(() => {
    if (!liveStatuses || liveStatuses.length === 0) return initialSnapshot;
    return initialSnapshot.map((item) => {
      const live = liveStatuses.find((s) => s.tagName === item.tagName);
      return live ? { ...item, status: live.status } : item;
    });
  }, [liveStatuses, initialSnapshot]);

  const hasDependencies = useMemo(
    () => snapshot.some((item) => item.dependsOn && item.dependsOn.length > 0),
    [snapshot],
  );

  return (
    <motion.div
      data-slot="tag-execution-widget"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRINGS.GENTLE}
      className={`rounded-lg border overflow-hidden ${statusBorderClass(status)}`}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-3 py-2 cursor-pointer select-none"
        onClick={toggleExpanded}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpanded(); } }}
        tabIndex={0}
        role="button"
        aria-expanded={expanded}
      >
        <StatusDot status={status} size={6} />

        {/* Tag pill */}
        <span
          className="text-[11px] font-medium px-2 py-0.5 rounded-full border"
          style={{
            backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
            color,
            borderColor: `color-mix(in srgb, ${color} 25%, transparent)`,
          }}
        >
          {tagName}
        </span>

        {/* Status text */}
        <span className={`text-xs font-medium ${statusTextClass(status)}`}>
          {statusLabel(status)}
        </span>

        {/* Expand chevron */}
        <motion.span
          className="ml-auto flex-shrink-0 text-muted-foreground/60"
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <ChevronRight size={12} />
        </motion.span>
      </div>

      {/* Pipeline snapshot — show DAG when dependencies exist, flat pills otherwise */}
      {snapshot.length > 1 && (
        hasDependencies ? (
          <div className="px-3 pb-2">
            <SnapshotDAGView snapshot={snapshot} />
          </div>
        ) : (
          <div className="px-3 pb-2 flex flex-wrap gap-1.5">
            {snapshot.map((item) => {
              const itemColor = safeColor(item.color);
              return (
              <span
                key={item.tagName}
                className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: `color-mix(in srgb, ${itemColor} 12%, transparent)`,
                  color: item.status === 'pending' ? undefined : itemColor,
                  opacity: item.status === 'pending' ? 0.5 : 1,
                }}
              >
                <StatusDot status={item.status} size={4} />
                <span className={item.status === 'pending' ? 'text-muted-foreground' : undefined}>
                  {item.tagName}
                </span>
                {item.delegatedWorkstreamTitle && (
                  <span className="text-muted-foreground">
                    {'-> '}{item.delegatedWorkstreamTitle}
                  </span>
                )}
              </span>
              );
            })}
          </div>
        )
      )}

      {/* Expandable instructions */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={TRANSITIONS.standard}
            className="overflow-hidden"
          >
            <div className="border-t border-border-muted px-3 py-2">
              <div className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-1">
                Instructions
              </div>
              <pre className="text-xs text-secondary-foreground whitespace-pre-wrap break-words max-h-[200px] overflow-y-auto leading-relaxed m-0 font-sans">
                {instructions}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
