/**
 * StreamingContent — Optimized streaming text display with typing cursor
 *
 * @ai-context
 * - CSS-animated cursor blink, minimal DOM updates
 * - Optional line numbers via LineNumbers sub-component
 * - useStreamingContent hook for isolated state management
 * - IsolatedStreamingContent for decoupled re-renders
 * - data-slot="streaming-content"
 *
 * @example
 * <StreamingContent content={text} isStreaming isCode />
 */

import { memo, useRef, useLayoutEffect, useState, useCallback, useEffect } from 'react';

import { cn } from '@tryvienna/ui';

export interface StreamingContentProps {
  /** The content to display (updates as streaming progresses) */
  content: string;
  /** Whether content is still streaming */
  isStreaming?: boolean;
  /** Optional className for the container */
  className?: string;
  /** Whether to show line numbers */
  showLineNumbers?: boolean;
  /** Starting line number (default 1) */
  startLineNumber?: number;
  /** Whether this is code/monospace content */
  isCode?: boolean;
}

/**
 * Typing cursor that blinks while streaming
 */
const StreamingCursor = memo(function StreamingCursor() {
  return (
    <span className="inline-block w-0.5 h-[1.1em] bg-ai align-middle ml-0.5 animate-[cursor-blink_1s_ease-in-out_infinite]" />
  );
});

/**
 * Line numbers component
 */
export const LineNumbers = memo(function LineNumbers({
  count,
  start = 1,
}: {
  count: number;
  start?: number;
}) {
  const lines = [];
  for (let i = 0; i < count; i++) {
    lines.push(
      <div key={i} className="text-right pr-3 select-none text-muted-foreground">
        {start + i}
      </div>
    );
  }
  return <div className="flex-shrink-0">{lines}</div>;
});

/**
 * StreamingContent — Optimized streaming text display.
 */
export const StreamingContent = memo(function StreamingContent({
  content,
  isStreaming = false,
  className,
  showLineNumbers = false,
  startLineNumber = 1,
  isCode = false,
}: StreamingContentProps) {
  const contentRef = useRef<HTMLPreElement>(null);
  const prevContentLengthRef = useRef(0);
  const lineCount = content.split('\n').length;

  useLayoutEffect(() => {
    if (contentRef.current && content.length !== prevContentLengthRef.current) {
      prevContentLengthRef.current = content.length;
      if (isStreaming) {
        const container = contentRef.current.parentElement;
        if (container && container.scrollHeight > container.clientHeight) {
          container.scrollTop = container.scrollHeight;
        }
      }
    }
  }, [content, isStreaming]);

  return (
    <div
      data-slot="streaming-content"
      className={cn('relative overflow-auto', showLineNumbers && 'flex', className)}
    >
      {showLineNumbers && <LineNumbers count={lineCount} start={startLineNumber} />}

      <pre
        ref={contentRef}
        className={cn(
          'm-0 flex-1 whitespace-pre-wrap break-words',
          isCode && 'font-mono text-xs leading-relaxed',
          !isCode && 'text-sm leading-normal'
        )}
      >
        <code className="text-foreground">
          {content}
          {isStreaming && <StreamingCursor />}
        </code>
      </pre>
    </div>
  );
});

/**
 * Hook for managing streaming content state (isolated from parent).
 */
export function useStreamingContent(initialContent = '') {
  const contentRef = useRef(initialContent);
  const subscribersRef = useRef<Set<() => void>>(new Set());

  const append = useCallback((chunk: string) => {
    contentRef.current += chunk;
    subscribersRef.current.forEach((fn) => fn());
  }, []);

  const set = useCallback((content: string) => {
    contentRef.current = content;
    subscribersRef.current.forEach((fn) => fn());
  }, []);

  const reset = useCallback(() => {
    contentRef.current = '';
    subscribersRef.current.forEach((fn) => fn());
  }, []);

  const subscribe = useCallback((callback: () => void) => {
    subscribersRef.current.add(callback);
    return () => {
      subscribersRef.current.delete(callback);
    };
  }, []);

  const getContent = useCallback(() => contentRef.current, []);

  return { append, set, reset, subscribe, getContent };
}

/**
 * Isolated streaming content that manages its own state.
 */
export const IsolatedStreamingContent = memo(function IsolatedStreamingContent({
  contentRef,
  isStreaming = false,
  className,
  showLineNumbers = false,
  startLineNumber = 1,
  isCode = false,
}: Omit<StreamingContentProps, 'content'> & {
  contentRef: ReturnType<typeof useStreamingContent>;
}) {
  const [, setState] = useState(0);
  const forceUpdate = useCallback(() => setState((n) => n + 1), []);

  useEffect(() => {
    return contentRef.subscribe(forceUpdate);
  }, [contentRef, forceUpdate]);

  return (
    <StreamingContent
      content={contentRef.getContent()}
      isStreaming={isStreaming}
      className={className}
      showLineNumbers={showLineNumbers}
      startLineNumber={startLineNumber}
      isCode={isCode}
    />
  );
});
