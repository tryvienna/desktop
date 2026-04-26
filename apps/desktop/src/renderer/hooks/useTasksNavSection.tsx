/**
 * useTasksNavSection — Transforms tasks list into a nav sidebar section.
 *
 * @ai-context
 * - Fetches tasks via GET_TASKS GraphQL query
 * - Filters by status, groups, sorts, and limits based on taskDisplaySettings
 * - Maps each task to a NavItemData
 * - Items use entity URI for entity drawer opening
 * - Settings button opens TaskSettingsDrawer
 */

import { useMemo, useCallback } from 'react';
import type { NavSectionData, NavItemData } from '@tryvienna/ui';
import { NavCreateButton, NavSettingsButton } from '@tryvienna/ui';
import { useQuery, GET_TASKS } from '@vienna/graphql/client';
import { useDrawerActions } from '../../lib/drawer';
import { taskSettingsContent } from '../../components/drawer/content';
import { usePersistedState } from '../../storage';
import { TaskStatusIcon, type TaskStatus } from '../../components/domain/task-status-icon';
import { ListTodo } from 'lucide-react';

const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'Todo',
  in_progress: 'In Progress',
  done: 'Done',
  canceled: 'Canceled',
};

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
  none: 4,
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  none: 'No priority',
};

interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  assigneeType: string | null;
  dueDate: string | null;
  labels: Array<{ id: string; name: string; color: string }>;
  createdAt: string;
  updatedAt: string;
}

function groupTasks(tasks: TaskItem[], groupBy: string): Map<string, TaskItem[]> {
  const groups = new Map<string, TaskItem[]>();
  for (const task of tasks) {
    let key: string;
    switch (groupBy) {
      case 'status':
        key = STATUS_LABELS[task.status as TaskStatus] ?? task.status;
        break;
      case 'priority':
        key = PRIORITY_LABELS[task.priority] ?? 'No priority';
        break;
      case 'label':
        key = task.labels?.[0]?.name ?? 'No label';
        break;
      case 'assignee':
        key = task.assigneeType === 'self' ? 'Self'
          : task.assigneeType === 'workstream' ? 'Workstream'
          : 'Unassigned';
        break;
      default:
        key = '';
    }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(task);
  }
  return groups;
}

function sortTasks(tasks: TaskItem[], sortBy: string): TaskItem[] {
  const sorted = [...tasks];
  switch (sortBy) {
    case 'updated':
      sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      break;
    case 'priority':
      sorted.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4));
      break;
    case 'due_date':
      sorted.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
      break;
    case 'created':
    default:
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
  }
  return sorted;
}

export interface UseTasksNavSectionOptions {
  projectId: string;
  onCreateTask: () => void;
}

export function useTasksNavSection({
  projectId,
  onCreateTask,
}: UseTasksNavSectionOptions): {
  section: NavSectionData;
} {
  const { data } = useQuery(GET_TASKS, {
    variables: { projectId },
    fetchPolicy: 'cache-and-network',
  });

  const { openFull } = useDrawerActions();
  const [settings] = usePersistedState('taskDisplaySettings');

  const handleOpenSettings = useCallback(() => {
    openFull(taskSettingsContent(projectId));
  }, [openFull, projectId]);

  const tasks = data?.tasks;

  const section = useMemo<NavSectionData>(() => {
    // Filter by configured status types
    const filtered = (tasks ?? []).filter(
      (t) =>
        t != null && t.id != null && t.status != null && settings.statusTypes.includes(t.status),
    ) as TaskItem[];

    // Sort
    const sorted = sortTasks(filtered, settings.sortBy);

    // Limit
    const limited = sorted.slice(0, settings.limit);

    // Build nav items — helper to create a task item
    const toNavItem = (task: TaskItem): NavItemData => ({
      id: `task:${task.id}`,
      label: task.title,
      variant: 'item' as const,
      icon: <TaskStatusIcon status={task.status as TaskStatus} />,
    });

    let items: NavItemData[];

    if (settings.groupBy !== 'none' && limited.length > 0) {
      const groups = groupTasks(limited, settings.groupBy);
      items = Array.from(groups.entries()).map(([groupName, groupItems]) => ({
        id: `task-group:${groupName}`,
        label: groupName,
        variant: 'folder' as const,
        children: groupItems.map(toNavItem),
      }));
    } else {
      items = limited.map(toNavItem);
    }

    return {
      id: 'tasks',
      label: 'Tasks',
      icon: <ListTodo size={12} />,
      hoverActions: (
        <>
          <NavSettingsButton
            onClick={(e) => {
              e.stopPropagation();
              handleOpenSettings();
            }}
            ariaLabel="Task settings"
          />
          <NavCreateButton
            onClick={(e) => {
              e.stopPropagation();
              onCreateTask();
            }}
            ariaLabel="New task"
          />
        </>
      ),
      items,
      emptyState: 'No tasks match filters',
    };
  }, [tasks, settings, onCreateTask, handleOpenSettings]);

  return { section };
}
