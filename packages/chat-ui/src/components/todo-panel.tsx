/**
 * TodoPanel — Expandable TODO list panel rendered above the chat input
 *
 * @ai-context
 * - Similar visual style to TodoWriteTool but without ToolOutput wrapper
 * - Shows progress bar, item list with status icons, summary footer
 * - Animated expand/collapse via Framer Motion
 * - data-slot="todo-panel"
 */

import { memo, useEffect, useRef } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@tryvienna/ui';

import { useChatLatestTodo } from '../context/chat-context';
import type { TodoItem } from '../context/chat-context';
import { STATUS_ICONS, STATUS_COLORS } from './tools/renderers/todo-shared';

// ─── TodoItem Row ────────────────────────────────────────────────────────────

function TodoItemRow({ todo }: { todo: TodoItem }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 border-b border-border-muted px-3 py-1.5 last:border-b-0',
        todo.status === 'completed' && 'opacity-60',
      )}
    >
      <span
        className="mt-0.5 flex-shrink-0"
        style={{ color: STATUS_COLORS[todo.status] }}
      >
        {(STATUS_ICONS[todo.status] ?? STATUS_ICONS.pending)!()}
      </span>
      <span
        className={cn(
          'text-xs',
          todo.status === 'completed' && 'text-muted-foreground line-through',
          todo.status === 'in_progress' && 'font-medium text-foreground',
          todo.status === 'pending' && 'text-foreground-secondary',
        )}
      >
        {todo.content}
      </span>
      {todo.status !== 'pending' && (
        <span
          className="ml-auto flex-shrink-0 rounded px-1.5 py-0.5 text-[9px]"
          style={{
            color: STATUS_COLORS[todo.status],
            backgroundColor: `color-mix(in srgb, ${STATUS_COLORS[todo.status]} 15%, transparent)`,
          }}
        >
          {todo.status === 'completed' ? 'done' : 'active'}
        </span>
      )}
    </div>
  );
}

// ─── Panel ───────────────────────────────────────────────────────────────────

export interface TodoPanelProps {
  expanded: boolean;
  /** Called when the panel should auto-close (e.g. all tasks completed) */
  onAutoClose?: () => void;
  className?: string;
}

export const TodoPanel = memo(function TodoPanel({ expanded, onAutoClose, className }: TodoPanelProps) {
  const todoState = useChatLatestTodo();
  const prevHasActive = useRef(todoState?.hasActive ?? false);

  // Auto-close when all tasks complete
  useEffect(() => {
    const hasActive = todoState?.hasActive ?? false;
    if (prevHasActive.current && !hasActive && expanded) {
      onAutoClose?.();
    }
    prevHasActive.current = hasActive;
  }, [todoState?.hasActive, expanded, onAutoClose]);

  if (!todoState || !todoState.hasActive) return null;

  const { todos, completed, total } = todoState;
  const pct = total > 0 ? (completed / total) * 100 : 0;
  const inProgressCount = todos.filter((t) => t.status === 'in_progress').length;
  const pendingCount = todos.filter((t) => t.status === 'pending').length;

  return (
    <AnimatePresence>
      {expanded && (
        <motion.div
          data-slot="todo-panel"
          className={cn(
            'mb-1.5 overflow-hidden rounded-lg border border-border-default bg-surface-elevated',
            className,
          )}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          {/* Progress bar */}
          {total > 0 && (
            <div className="h-1 bg-surface-sunken">
              <motion.div
                className="h-full bg-success"
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
          )}

          {/* Todo items */}
          <div className="max-h-[250px] overflow-auto">
            {todos.map((todo, i) => (
              <TodoItemRow key={i} todo={todo} />
            ))}
          </div>

          {/* Summary footer */}
          {total > 0 && (
            <div className="border-t border-border-muted px-3 py-1.5 text-[10px] text-muted-foreground">
              {inProgressCount > 0 && `${inProgressCount} active`}
              {inProgressCount > 0 && pendingCount > 0 && ', '}
              {pendingCount > 0 && `${pendingCount} pending`}
              {(inProgressCount > 0 || pendingCount > 0) && completed > 0 && ', '}
              {completed > 0 && `${completed} done`}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
});
