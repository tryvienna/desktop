/**
 * TodoIndicator — Compact footer badge showing TODO progress
 *
 * @ai-context
 * - Renders a clickable "x/y" badge in the chat input footer
 * - Hidden when no active TodoWrite exists in the conversation
 * - Toggles the TodoPanel above the input when clicked
 * - Gradient color shift animation on icon+text when a task is in_progress
 * - data-slot="todo-indicator"
 */

import { memo } from 'react';

import { motion } from 'framer-motion';
import { cn } from '@tryvienna/ui';

import { useChatLatestTodo } from '../context/chat-context';

function ChecklistIcon({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className={className}>
      <rect x="2" y="1" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M5 5L6.5 6.5L9 4"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M5 8H9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M5 10H8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

export interface TodoIndicatorProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

export const TodoIndicator = memo(function TodoIndicator({
  expanded,
  onToggle,
  className,
}: TodoIndicatorProps) {
  const todoState = useChatLatestTodo();

  if (!todoState || !todoState.hasActive) return null;

  const hasInProgress = todoState.todos.some((t) => t.status === 'in_progress');

  const content = (
    <>
      <ChecklistIcon />
      <span className="tabular-nums">
        {todoState.completed}/{todoState.total}
      </span>
    </>
  );

  return (
    <button
      data-slot="todo-indicator"
      type="button"
      onClick={onToggle}
      className={cn(
        'flex items-center gap-1 rounded px-1.5 py-0.5 mx-2 text-[11px] transition-colors hover:text-muted-foreground',
        !hasInProgress && 'text-muted-foreground/70',
        expanded && 'bg-surface-hover text-muted-foreground',
        className,
      )}
    >
      {hasInProgress ? (
        <motion.span
          className="flex items-center gap-1"
          animate={{
            color: [
              'var(--text-muted)',
              'var(--text-info)',
              'var(--text-muted)',
            ],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          {content}
        </motion.span>
      ) : (
        content
      )}
    </button>
  );
});
