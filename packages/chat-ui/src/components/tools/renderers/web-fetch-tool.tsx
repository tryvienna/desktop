/**
 * WebFetchTool — Renders URL fetch operations with content preview
 *
 * @ai-context
 * - URL header with domain extraction
 * - Prompt display, streamed response with markdown link rendering
 * - Spinner while fetching, duration badge
 * - data-slot="web-fetch-tool-content"
 */

import React from 'react';

import { ToolOutput } from '../tool-output';
import { StreamingContent } from '../streaming-content';
import type { ToolRendererProps } from '../registry';

// ─── Icons ────────────────────────────────────────────────────────────────────

function GlobeIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

/**
 * Convert markdown-style links [text](url) to clickable elements.
 */
function renderContentWithLinks(
  content: string,
  onOpenUrl?: (url: string) => void
): React.ReactNode {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    const linkText = match[1];
    const linkUrl = match[2];
    parts.push(
      <a
        key={match.index}
        href={linkUrl}
        onClick={(e) => {
          e.preventDefault();
          onOpenUrl?.(linkUrl);
        }}
        className="text-info hover:underline cursor-pointer"
      >
        {linkText}
      </a>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : content;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WebFetchTool({ toolUse, onApprove, onDeny, onRevoke, isFromHistory }: ToolRendererProps) {
  const input = toolUse.input || {};
  const url = (input.url as string) || '';
  const prompt = input.prompt as string | undefined;
  const content = toolUse.result?.output;
  const duration = toolUse.result?.durationMs as number | undefined;
  const isStreaming = toolUse.isStreaming ?? false;
  const domain = getDomain(url);

  return (
    <ToolOutput
      id={toolUse.id}
      toolName="WebFetch"
      description={domain}
      status={toolUse.status}
      images={toolUse.result?.images}
      isFromHistory={isFromHistory}
      icon={
        <span className="flex-shrink-0 text-muted-foreground">
          <GlobeIcon />
        </span>
      }
      error={toolUse.result?.error}
      requestId={toolUse.requestId}
      approvalMethod={toolUse.approvalMethod}
      onApprove={onApprove}
      onDeny={onDeny}
      onRevoke={onRevoke}
      actions={
        duration ? (
          <span className="flex-shrink-0 text-[9px] text-muted-foreground">
            {duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(1)}s`}
          </span>
        ) : undefined
      }
    >
      <div data-slot="web-fetch-tool-content">
        {/* URL header */}
        <div className="flex items-center gap-2 px-3 py-2 bg-surface-sunken border-b border-border-muted">
          <span className="text-[10px] text-info truncate flex-1">{url}</span>
        </div>

        {/* Prompt */}
        {prompt && (
          <div className="px-3 py-2 border-b border-border-muted">
            <div className="text-[9px] text-muted-foreground uppercase tracking-wide mb-1">
              Prompt
            </div>
            <p className="text-xs text-foreground-secondary m-0 line-clamp-3">{prompt}</p>
          </div>
        )}

        {/* Fetched content */}
        {(content || isStreaming) && (
          <div className="p-3">
            <div className="text-[9px] text-muted-foreground uppercase tracking-wide mb-1">
              {isStreaming ? 'Streaming response...' : 'Response'}
            </div>
            <div className="p-3 overflow-auto rounded bg-surface-sunken max-h-[400px] text-xs leading-relaxed whitespace-pre-wrap">
              {isStreaming ? (
                <StreamingContent
                  content={content || ''}
                  isStreaming={isStreaming}
                  className="text-foreground"
                />
              ) : (
                <div className="text-foreground">{renderContentWithLinks(content || '')}</div>
              )}
            </div>
          </div>
        )}

        {/* Running state */}
        {toolUse.status === 'running' && !content && !isStreaming && (
          <div className="flex items-center gap-2 p-3 text-muted-foreground">
            <span className="inline-block animate-spin">
              <svg
                width={12}
                height={12}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="12" cy="12" r="10" strokeOpacity={0.2} />
                <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeDasharray="31.4 31.4" />
              </svg>
            </span>
            <span className="text-xs">Fetching {domain}...</span>
          </div>
        )}
      </div>
    </ToolOutput>
  );
}
