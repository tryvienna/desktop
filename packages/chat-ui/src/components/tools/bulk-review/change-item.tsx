/**
 * ChangeItem — A single file change item in the bulk review panel
 *
 * @ai-context
 * - Displays file change with DiffView (syntax highlighting, line numbers, hunks)
 * - Streaming support with animated left border
 * - Language-aware file icons via @tryvienna/ui FileTypeIcon
 * - TrustBadge for auto-approved changes
 * - Write preview with syntax highlighting and line numbers
 * - data-slot="change-item"
 *
 * @example
 * <ChangeItem change={change} focused expanded={false} onClick={fn} onToggleExpand={fn} onApprove={fn} onDeny={fn} />
 */

import * as React from 'react';
import { memo, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { cn, FileTypeIcon, getFileIconType } from '@tryvienna/ui';

import { SPRINGS } from '../../../tokens';
import { TrustBadge } from '../approval/trust-badge';
import { computeLineDiff } from '../../../utils/diff';
import { highlightLines } from '../../../utils/highlight';
import { DiffView } from './diff-view';
import type { PendingChange } from './types';

export type ChangeItemAction = 'approved' | 'denied' | null;

interface ChangeItemProps {
  change: PendingChange;
  focused: boolean;
  expanded: boolean;
  action?: ChangeItemAction;
  isFromHistory?: boolean;
  onClick: () => void;
  onToggleExpand: () => void;
  onApprove: () => void;
  onDeny: () => void;
  onRevokeRule?: (toolName: string, ruleType: 'session' | 'persistent', directory?: string) => void;
  /** Callback to open this file in the editor */
  onOpenInEditor?: (filePath: string) => void;
  itemRef?: (el: HTMLDivElement | null) => void;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function TerminalIcon() {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <motion.path
        d="M5 12l5 5L20 7"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <motion.path
        d="M6 6l12 12M18 6l-12 12"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
      />
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <motion.svg
      animate={{ rotate: expanded ? 90 : 0 }}
      transition={SPRINGS.SNAPPY}
      width={10}
      height={10}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 4l4 4-4 4" />
    </motion.svg>
  );
}

function StreamingIndicator() {
  return (
    <span className="inline-flex items-center gap-1 ml-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1 h-1 rounded-full bg-ai"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </span>
  );
}

function StreamingCursor() {
  return (
    <motion.span
      className="inline-block w-0.5 h-[1.1em] bg-ai align-middle ml-0.5"
      animate={{ opacity: [1, 0] }}
      transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
    />
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getToolIcon(change: PendingChange) {
  if (change.toolType === 'Bash') return <TerminalIcon />;
  return <FileTypeIcon type={getFileIconType(change.filePath)} size={12} />;
}

function getFilename(filePath: string): string {
  return filePath.split('/').pop() || filePath;
}

// ─── Write Preview ────────────────────────────────────────────────────────────

function WritePreview({
  content,
  filePath,
  isStreaming,
}: {
  content: string;
  filePath: string;
  isStreaming: boolean;
}) {
  const highlighted = useMemo(() => highlightLines(content, filePath), [content, filePath]);
  const lines = useMemo(() => content.split('\n'), [content]);

  return (
    <div data-slot="write-preview" className="max-h-[400px] overflow-auto">
      <pre className="py-1 text-xs font-mono whitespace-pre leading-relaxed min-w-full w-fit">
        {highlighted
          ? highlighted.map((lineHtml, i) => (
              <div key={i} className="flex">
                <span className="w-8 text-right pr-2 select-none text-muted-foreground/30 text-[9px] shrink-0 leading-relaxed">
                  {i + 1}
                </span>
                <span
                  className={cn(
                    'hljs flex-1 pl-1',
                    isStreaming ? 'text-ai' : 'text-foreground-secondary/80'
                  )}
                  dangerouslySetInnerHTML={{ __html: lineHtml }}
                />
              </div>
            ))
          : lines.map((line, i) => (
              <div key={i} className="flex">
                <span className="w-8 text-right pr-2 select-none text-muted-foreground/30 text-[9px] shrink-0 leading-relaxed">
                  {i + 1}
                </span>
                <span
                  className={cn(
                    'flex-1 pl-1',
                    isStreaming ? 'text-ai' : 'text-foreground-secondary/80'
                  )}
                >
                  {line || ' '}
                </span>
              </div>
            ))}
        {isStreaming && <StreamingCursor />}
      </pre>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ChangeItem = memo(function ChangeItem({
  change,
  focused,
  expanded,
  action,
  isFromHistory,
  onClick,
  onToggleExpand,
  onApprove,
  onDeny,
  onRevokeRule,
  onOpenInEditor,
  itemRef,
}: ChangeItemProps) {
  const isPathUnknown = change.filePath === 'unknown';
  const filename = isPathUnknown
    ? (change.toolType === 'Write' ? 'Writing' : 'Editing')
    : getFilename(change.filePath);

  const stats = useMemo(() => {
    if (change.toolType !== 'Edit' || !change.oldContent || !change.newContent)
      return { added: 0, removed: 0 };
    const diffLines = computeLineDiff(change.oldContent, change.newContent);
    return {
      added: diffLines.filter((l) => l.type === 'added').length,
      removed: diffLines.filter((l) => l.type === 'removed').length,
    };
  }, [change.toolType, change.oldContent, change.newContent]);

  const handleApprove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onApprove();
    },
    [onApprove]
  );

  const handleDeny = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDeny();
    },
    [onDeny]
  );

  const handleOpenInEditor = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onOpenInEditor?.(change.filePath);
    },
    [onOpenInEditor, change.filePath]
  );

  const isActioned = action === 'approved' || action === 'denied';
  const isStreaming = change.isStreaming ?? false;

  return (
    <motion.div
      ref={itemRef}
      data-slot="change-item"
      data-testid="change-item"
      data-tool-type={change.toolType}
      data-file-path={change.filePath}
      initial={isFromHistory ? false : { opacity: 0, y: isStreaming ? -8 : 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={isFromHistory ? undefined : { duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'border-b border-border-muted/50 last:border-b-0 overflow-hidden relative',
        isActioned && 'opacity-60',
        isStreaming && 'bg-surface-ai/5'
      )}
    >
      {/* Streaming left border */}
      {isStreaming && (
        <motion.div
          className="absolute left-0 top-0 bottom-0 w-0.5 bg-ai"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.2 }}
          style={{ originY: 0 }}
        />
      )}

      {/* Header row */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 cursor-pointer relative',
          'transition-colors duration-100',
          !isActioned && focused && 'bg-surface-hover/80',
          !isActioned && !focused && 'hover:bg-surface-hover/40',
          isActioned && 'hover:bg-surface-hover/20'
        )}
        onClick={() => {
          if (isActioned || focused) onToggleExpand();
          else onClick();
        }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span
            className={cn(
              'flex-shrink-0',
              isActioned ? 'text-muted-foreground/40' : 'text-muted-foreground/60'
            )}
          >
            <ChevronIcon expanded={expanded} />
          </span>

          {isActioned && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25, mass: 0.5 }}
              className={cn(
                'flex-shrink-0',
                action === 'approved' && 'text-success',
                action === 'denied' && 'text-error'
              )}
            >
              {action === 'approved' ? <CheckIcon /> : <XIcon />}
            </motion.span>
          )}

          <span
            className={cn(
              'flex-shrink-0 transition-colors duration-100',
              focused && !isActioned ? 'text-foreground-secondary' : 'text-muted-foreground/70'
            )}
          >
            {getToolIcon(change)}
          </span>

          <span
            className={cn(
              'flex-1 truncate text-xs transition-colors duration-100',
              isPathUnknown ? 'italic text-ai' : 'font-mono',
              !isPathUnknown && (isStreaming ? 'text-ai' : focused && !isActioned ? 'text-foreground' : 'text-foreground-secondary'),
            )}
          >
            {filename}
            {(isStreaming || isPathUnknown) && <StreamingIndicator />}
          </span>

          {isStreaming ? (
            <span className="flex-shrink-0 text-[9px] font-mono text-ai">streaming</span>
          ) : (
            (stats.added > 0 || stats.removed > 0) &&
            !isActioned && (
              <span className="flex-shrink-0 text-[9px] font-mono opacity-50">
                {stats.added > 0 && <span className="text-success">+{stats.added}</span>}
                {stats.added > 0 && stats.removed > 0 && ' '}
                {stats.removed > 0 && <span className="text-error">-{stats.removed}</span>}
              </span>
            )
          )}

          {isActioned && change.approvalMethod && change.approvalMethod !== 'manual' && (
            <TrustBadge
              method={change.approvalMethod}
              toolName={change.toolType}
              onRevoke={
                onRevokeRule
                  ? () =>
                      onRevokeRule(
                        change.toolType,
                        change.approvalMethod === 'persistent_rule' ? 'persistent' : 'session',
                        change.directory
                      )
                  : undefined
              }
            />
          )}

          {/* Open in editor button */}
          {onOpenInEditor && !isPathUnknown && change.toolType !== 'Bash' && (
            <button
              type="button"
              data-testid="change-item-open-in-editor"
              onClick={handleOpenInEditor}
              title="Open in editor"
              className={cn(
                'flex-shrink-0 p-0.5 rounded',
                'text-muted-foreground/50',
                'hover:text-foreground-secondary hover:bg-surface-hover/60',
                'cursor-pointer transition-colors duration-100',
              )}
            >
              <ExternalLinkIcon />
            </button>
          )}

          {focused && !isActioned && (
            <div className="flex-shrink-0 flex items-center gap-1">
              <button
                type="button"
                onClick={handleApprove}
                className={cn(
                  'px-2 py-1 text-[10px] font-medium rounded',
                  'bg-surface-ai/80 text-ai',
                  'hover:bg-surface-ai cursor-pointer',
                  'transition-colors duration-100'
                )}
              >
                Allow
              </button>
              <button
                type="button"
                onClick={handleDeny}
                className={cn(
                  'px-2 py-1 text-[10px] font-medium rounded',
                  'text-muted-foreground/70',
                  'hover:text-error hover:bg-surface-error/5',
                  'cursor-pointer transition-colors duration-100'
                )}
              >
                Deny
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="expanded-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={SPRINGS.SNAPPY}
            className="overflow-hidden"
          >
            <div className="px-3 py-1 bg-surface-sunken/50 text-[9px] text-muted-foreground/70 font-mono">
              {isPathUnknown ? (
                <span className="italic text-ai">
                  {change.toolType === 'Write' ? 'Writing file' : 'Editing file'}
                  <StreamingIndicator />
                </span>
              ) : (
                change.filePath
              )}
            </div>

            {change.toolType === 'Edit' && change.oldContent && change.newContent && (
              <DiffView
                oldContent={change.oldContent}
                newContent={change.newContent}
                filePath={change.filePath}
                isStreaming={isStreaming}
                maxHeight={400}
              />
            )}

            {change.toolType === 'Write' && (change.newContent || isStreaming) && (
              <WritePreview
                content={change.newContent || ''}
                filePath={change.filePath}
                isStreaming={isStreaming}
              />
            )}

            {change.toolType === 'Bash' && change.command && (
              <div className="px-3 py-2 bg-surface-sunken/30">
                <code className="text-xs font-mono text-foreground/80">$ {change.command}</code>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
