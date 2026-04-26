/**
 * TaskStatusIcon / PriorityIcon — Shared task icon components.
 *
 * Used by TaskDrawer and useTasksNavSection to render consistent
 * status and priority icons with correct colors.
 */

import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  Archive,
  AlertTriangle,
  ArrowUp,
  Minus,
  ArrowDown,
} from 'lucide-react';

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'done' | 'canceled';
export type TaskPriority = 'none' | 'urgent' | 'high' | 'medium' | 'low';

export const STATUS_COLORS: Record<TaskStatus, string> = {
  backlog: '#9CA3AF',
  todo: '#6B7280',
  in_progress: '#3B82F6',
  done: '#10B981',
  canceled: '#EF4444',
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  none: '#D1D5DB',
  urgent: '#EF4444',
  high: '#F97316',
  medium: '#EAB308',
  low: '#6B7280',
};

export function TaskStatusIcon({ status, size = 14 }: { status: TaskStatus; size?: number }) {
  const color = STATUS_COLORS[status];
  const props = { size, color, strokeWidth: 2 };
  switch (status) {
    case 'backlog': return <Archive {...props} />;
    case 'todo': return <Circle {...props} />;
    case 'in_progress': return <Loader2 {...props} />;
    case 'done': return <CheckCircle2 {...props} />;
    case 'canceled': return <XCircle {...props} />;
  }
}

export function PriorityIcon({ priority, size = 14 }: { priority: TaskPriority; size?: number }) {
  const color = PRIORITY_COLORS[priority];
  switch (priority) {
    case 'urgent': return <AlertTriangle size={size} color={color} />;
    case 'high': return <ArrowUp size={size} color={color} />;
    case 'medium': return <Minus size={size} color={color} />;
    case 'low': return <ArrowDown size={size} color={color} />;
    default: return <Minus size={size} color="#D1D5DB" />;
  }
}
