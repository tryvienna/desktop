/**
 * CodeRenderer — Renders CodeBlock with filename header, language badge, and copy button
 *
 * @ai-context
 * - Registered at priority 10 in the renderer registry
 * - Displays filename, language badge, copy-to-clipboard button
 * - data-slot="code-renderer"
 *
 * @example
 * <CodeRenderer content={{ type: 'code', code: '...', language: 'ts' }} messageId="m1" isStreaming={false} />
 */

import { memo, useState, useCallback } from 'react';

import type { CodeBlock } from '../types/messages';
import type { RendererProps, RendererDefinition } from './registry';

export const CodeRenderer = memo(function CodeRenderer({ content }: RendererProps<CodeBlock>) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text
    }
  }, [content.code]);

  return (
    <div
      data-slot="code-renderer"
      data-renderer="code"
      data-language={content.language}
      className="rounded-lg border border-border-muted overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-sunken border-b border-border-muted">
        {content.filename && (
          <span className="text-[10px] font-mono text-muted-foreground truncate">
            {content.filename}
          </span>
        )}
        {content.language && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-interactive text-foreground-secondary">
            {content.language}
          </span>
        )}
        <button
          onClick={handleCopy}
          className="ml-auto flex-shrink-0 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface-interactive transition-colors"
          title="Copy code"
        >
          {copied ? (
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none">
              <path
                d="M20 6L9 17L4 12"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none">
              <rect
                x="9"
                y="9"
                width="13"
                height="13"
                rx="2"
                stroke="currentColor"
                strokeWidth={2}
              />
              <path
                d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
                stroke="currentColor"
                strokeWidth={2}
              />
            </svg>
          )}
        </button>
      </div>
      {/* Code content */}
      <pre className="p-3 text-xs font-mono text-foreground bg-surface-sunken overflow-x-auto max-h-[500px] overflow-y-auto">
        <code>{content.code}</code>
      </pre>
    </div>
  );
});

export const codeRendererDefinition: RendererDefinition<CodeBlock> = {
  id: 'code',
  match: (content): content is CodeBlock => content.type === 'code',
  component: CodeRenderer,
  priority: 10,
};
