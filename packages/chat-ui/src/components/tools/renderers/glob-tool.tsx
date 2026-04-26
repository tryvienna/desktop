/**
 * GlobTool — Renderer for file pattern matching
 *
 * @ai-context
 * - Pattern header, staggered file list with icons
 * - Match count badge, "Show N more..." truncation
 * - Scanning indicator while running
 * - data-slot="glob-tool-content"
 */

import { useState } from 'react';
import { motion } from 'framer-motion';

import { SPRINGS } from '../../../tokens';
import { ToolOutput } from '../tool-output';
import type { ToolRendererProps } from '../registry';

const MAX_VISIBLE = 10;

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.25" />
      <path d="M9 9L12 12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function FileSmallIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M7 1H3C2.44772 1 2 1.44772 2 2V10C2 10.5523 2.44772 11 3 11H9C9.55228 11 10 10.5523 10 10V4L7 1Z"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GlobTool({ toolUse, messageId, isFromHistory, onApprove, onDeny, onRevoke }: ToolRendererProps) {
  const pattern = (toolUse.input.pattern as string) ?? '';
  const path = (toolUse.input.path as string) ?? '';
  const description = path ? `${pattern} in ${path}` : pattern;
  const output = toolUse.result?.output ?? '';
  const error = toolUse.result?.error;
  const isStreaming = toolUse.status === 'running';

  const files = output ? output.split('\n').filter(Boolean) : [];
  const [showAll, setShowAll] = useState(false);
  const truncated = !showAll && files.length > MAX_VISIBLE;
  const visible = truncated ? files.slice(0, MAX_VISIBLE) : files;

  return (
    <ToolOutput
      id={toolUse.id}
      toolName="Glob"
      description={description}
      status={toolUse.status}
      error={error}
      requestId={toolUse.requestId}
      approvalMethod={toolUse.approvalMethod}
      onApprove={onApprove}
      onDeny={onDeny}
      onRevoke={onRevoke}
      images={toolUse.result?.images}
      isFromHistory={isFromHistory}
      icon={
        <span className="flex-shrink-0 text-muted-foreground">
          <SearchIcon />
        </span>
      }
      actions={
        files.length > 0 ? (
          <span className="flex-shrink-0 rounded bg-surface-info px-1.5 py-0.5 text-[10px] text-info">
            {isStreaming ? '...' : files.length}
          </span>
        ) : undefined
      }
    >
      <div data-slot="glob-tool-content" data-testid={`glob-tool-${messageId}`}>
        {/* Pattern header */}
        <div className="flex items-center gap-2 border-b border-border-muted bg-surface-sunken px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
          <span className="truncate">{pattern}</span>
          {path && <span className="text-info">in {path}</span>}
        </div>

        {/* File list */}
        <div className="max-h-[250px] overflow-auto">
          {visible.map((file, i) => (
            <motion.div
              key={file}
              className="flex items-center gap-2 px-3 py-1 transition-colors hover:bg-surface-hover"
              initial={isFromHistory ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={isFromHistory ? undefined : { ...SPRINGS.SNAPPY, delay: i * 0.02 }}
            >
              <span className="flex-shrink-0 text-muted-foreground">
                <FileSmallIcon />
              </span>
              <span className="truncate font-mono text-xs text-foreground-secondary">{file}</span>
            </motion.div>
          ))}
        </div>

        {/* Show more button */}
        {truncated && (
          <button
            className="w-full border-t border-border-muted px-3 py-1.5 text-xs text-info transition-colors hover:bg-surface-hover"
            onClick={() => setShowAll(true)}
          >
            Show {files.length - MAX_VISIBLE} more...
          </button>
        )}

        {/* Scanning indicator */}
        {isStreaming && (
          <div className="flex items-center gap-2 border-t border-border-muted px-3 py-1.5 text-xs text-muted-foreground">
            Scanning...
          </div>
        )}

        {/* No results */}
        {!isStreaming && files.length === 0 && !error && (
          <div className="p-3 text-center text-xs text-muted-foreground">
            No files matched the pattern
          </div>
        )}
      </div>
    </ToolOutput>
  );
}
