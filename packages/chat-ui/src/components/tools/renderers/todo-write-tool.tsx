/**
 * TodoWriteTool — Renderer for task list management
 *
 * @ai-context
 * - Animated progress bar, staggered todo items
 * - Status badges and icons (check/dot/circle)
 * - Active form display, summary footer
 * - data-slot="todo-write-tool-content"
 */

import { motion, AnimatePresence } from 'framer-motion';

import type { TodoItem } from '../../../context/chat-context';
import { ToolOutput } from '../tool-output';
import type { ToolRendererProps } from '../registry';
import { ChecklistIcon, STATUS_ICONS, STATUS_COLORS } from './todo-shared';

export function TodoWriteTool({ toolUse, messageId, isFromHistory, onApprove, onDeny, onRevoke }: ToolRendererProps) {
  const rawTodos = toolUse.input.todos;
  const todos: TodoItem[] = Array.isArray(rawTodos) ? rawTodos : [];
  const error = toolUse.result?.error;

  const isLoading = todos.length === 0 && (toolUse.status === 'pending' || toolUse.status === 'running');

  const completed = todos.filter((t) => t.status === 'completed').length;
  const inProgressCount = todos.filter((t) => t.status === 'in_progress').length;
  const pendingCount = todos.filter((t) => t.status === 'pending').length;
  const total = todos.length;
  const pct = total > 0 ? (completed / total) * 100 : 0;
  const inProgress = todos.find((t) => t.status === 'in_progress');

  const description = isLoading
    ? 'Loading tasks…'
    : (inProgress?.activeForm ?? `${completed}/${total} tasks`);

  return (
    <ToolOutput
      id={toolUse.id}
      toolName="TodoWrite"
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
          <ChecklistIcon />
        </span>
      }
      actions={
        total > 0 && !isLoading ? (
          <span className="flex-shrink-0 text-[10px] text-muted-foreground">
            {completed}/{total} completed
          </span>
        ) : undefined
      }
    >
      <div data-slot="todo-write-tool-content" data-testid={`todowrite-tool-${messageId}`}>
        {/* Progress bar */}
        {total > 0 && (
          <div className="h-1 bg-surface-sunken">
            <motion.div
              className="h-full bg-success"
              initial={isFromHistory ? false : undefined}
              animate={{ width: `${pct}%` }}
              transition={isFromHistory ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        )}

        {/* Todo items */}
        <div className="max-h-[300px] overflow-auto">
          <AnimatePresence mode="popLayout">
            {todos.map((todo, i) => (
              <motion.div
                key={i}
                className={`flex items-start gap-2 border-b border-border-muted px-3 py-1.5 last:border-b-0 ${
                  todo.status === 'completed' ? 'opacity-60' : ''
                }`}
                initial={isFromHistory ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: todo.status === 'completed' ? 0.6 : 1, x: 0 }}
                transition={isFromHistory ? undefined : { delay: i * 0.03 }}
              >
                <span
                  className="mt-0.5 flex-shrink-0"
                  style={{ color: STATUS_COLORS[todo.status] }}
                >
                  {(STATUS_ICONS[todo.status] ?? STATUS_ICONS.pending)!()}
                </span>
                <span
                  className={
                    todo.status === 'completed'
                      ? 'text-xs text-muted-foreground line-through'
                      : todo.status === 'in_progress'
                        ? 'text-xs font-medium text-foreground'
                        : 'text-xs text-foreground-secondary'
                  }
                >
                  {todo.content}
                </span>
                {/* Status badge */}
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
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Empty / loading state */}
        {total === 0 && (
          <div className="p-3 text-center text-xs text-muted-foreground">
            {isLoading ? 'Loading tasks…' : 'No tasks in list'}
          </div>
        )}

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
      </div>
    </ToolOutput>
  );
}
