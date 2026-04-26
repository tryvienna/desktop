/**
 * GrepTool — Renderer for content search
 *
 * @ai-context
 * - Pattern header with warning color, staggered result items
 * - Match count badge, file:line:content parsing
 * - "Show N more..." truncation
 * - data-slot="grep-tool-content"
 */

import { useState } from 'react';
import { motion } from 'framer-motion';

import { SPRINGS } from '../../../tokens';
import { ToolOutput } from '../tool-output';
import type { ToolRendererProps } from '../registry';

const MAX_VISIBLE = 8;

function GrepIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.25" />
      <path d="M9 9L12 12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <path d="M4 6H8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M4 4.5H7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M4 7.5H6.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

interface ParsedMatch {
  file: string;
  line?: string;
  content: string;
}

function parseOutput(output: string): ParsedMatch[] {
  return output
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      // Try to parse "file:line:content" format
      const match = line.match(/^([^:]+):(\d+):(.*)$/);
      if (match) {
        return { file: match[1], line: match[2], content: match[3] };
      }
      return { file: '', content: line };
    });
}

export function GrepTool({ toolUse, messageId, isFromHistory, onApprove, onDeny, onRevoke }: ToolRendererProps) {
  const pattern = (toolUse.input.pattern as string) ?? '';
  const glob = (toolUse.input.glob as string) ?? '';
  const fileType = (toolUse.input.type as string) ?? '';
  const path = (toolUse.input.path as string) ?? '';
  const description = glob ? `/${pattern}/ in ${glob}` : `/${pattern}/`;
  const output = toolUse.result?.output ?? '';
  const error = toolUse.result?.error;

  const matches = parseOutput(output);
  const [showAll, setShowAll] = useState(false);
  const truncated = !showAll && matches.length > MAX_VISIBLE;
  const visible = truncated ? matches.slice(0, MAX_VISIBLE) : matches;

  return (
    <ToolOutput
      id={toolUse.id}
      toolName="Grep"
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
          <GrepIcon />
        </span>
      }
      actions={
        matches.length > 0 ? (
          <span className="flex-shrink-0 rounded bg-surface-warning px-1.5 py-0.5 text-[10px] text-warning">
            {matches.length}
          </span>
        ) : undefined
      }
    >
      <div data-slot="grep-tool-content" data-testid={`grep-tool-${messageId}`}>
        {/* Pattern header */}
        <div className="border-b border-border-muted bg-surface-sunken px-3 py-1.5 font-mono text-[10px]">
          <span className="text-warning">{pattern}</span>
          {fileType && <span className="ml-2 text-info">{fileType}</span>}
          {path && <span className="ml-2 text-muted-foreground">in {path}</span>}
        </div>

        {/* Results */}
        <div className="max-h-[300px] overflow-auto divide-y divide-border-muted">
          {visible.map((match, i) => (
            <motion.div
              key={i}
              className="px-3 py-2 transition-colors hover:bg-surface-hover"
              initial={isFromHistory ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={isFromHistory ? undefined : { ...SPRINGS.SNAPPY, delay: i * 0.02 }}
            >
              {match.file && (
                <div className="mb-1 flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                  <span className="truncate">{match.file}</span>
                  {match.line && <span className="flex-shrink-0 text-info">:{match.line}</span>}
                </div>
              )}
              <div className="truncate font-mono text-xs text-foreground">{match.content}</div>
            </motion.div>
          ))}
        </div>

        {/* Show more */}
        {truncated && (
          <button
            className="w-full border-t border-border-muted px-3 py-1.5 text-center text-xs text-info transition-colors hover:bg-surface-hover"
            onClick={() => setShowAll(true)}
          >
            Show {matches.length - MAX_VISIBLE} more...
          </button>
        )}

        {/* No results */}
        {toolUse.status !== 'running' && matches.length === 0 && !error && (
          <div className="p-3 text-center text-xs text-muted-foreground">No matches found</div>
        )}
      </div>
    </ToolOutput>
  );
}
