/**
 * TasksWidget — Native feed widget showing project tasks with filters and agent launch.
 *
 * @ai-context
 * - Renders as a card in the home feed via @vienna//widget/tasks in feed.md
 * - Filters: status (multi-select), priority, assignee, due date
 * - Default: shows todo + in_progress tasks sorted by priority
 * - Persistent settings via localStorage (useTasksFeedSettings)
 * - Selection + "Launch agents" CTA: creates workstreams, links entity, assigns task
 * - Clicking a task navigates to @vienna//task/{id} (opens TaskDrawer)
 * - Uses Apollo useQuery for data (not plugin SDK — this is a core widget)
 */

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useApolloClient } from '@apollo/client';
import {
  GET_TASKS,
  UPDATE_TASK,
  CREATE_WORKSTREAM,
  SEND_WORKSTREAM_MESSAGE,
  LINK_WORKSTREAM_ENTITY,
} from '@vienna/graphql/client';
import {
  Checkbox,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  Button,
} from '@tryvienna/ui';
import { Check, CheckSquare, ChevronDown, ChevronUp, Loader2, Zap } from 'lucide-react';
import { TaskStatusIcon, PriorityIcon } from '../../domain/task-status-icon';
import type { TaskStatus, TaskPriority } from '../../domain/task-status-icon';
import { useWorkstreamList } from '../../../renderer/contexts/WorkstreamContext';
import { useTasksFeedSettings } from './useTasksFeedSettings';
import type { NativeFeedWidgetProps } from './registry';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const COLLAPSED_LIMIT = 5;
const FETCH_LIMIT = 50;

const STATUS_OPTIONS = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'Todo' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
  { value: 'canceled', label: 'Canceled' },
] as const;

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
] as const;

const ASSIGNEE_OPTIONS = [
  { value: 'all', label: 'Anyone' },
  { value: 'self', label: 'Me' },
  { value: 'workstream', label: 'Workstream' },
  { value: 'unassigned', label: 'Unassigned' },
] as const;

const DUE_DATE_OPTIONS = [
  { value: 'all', label: 'Any date' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This week' },
  { value: 'no_date', label: 'No date' },
] as const;

const SORT_OPTIONS = [
  { value: 'priority', label: 'Priority' },
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' },
  { value: 'due_date', label: 'Due date' },
] as const;

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
  none: 4,
};

const MAX_BRANCH_LENGTH = 50;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

type LaunchPhase = 'idle' | 'creating' | 'messaging' | 'success';

interface TaskItem {
  id: string;
  identifier: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeType: string | null;
  assigneeWorkstreamId: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  labels: Array<{ id: string; name: string; color: string }>;
}

function toBranchName(identifier: string, title: string): string {
  const slug = `${identifier}-${title}`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug.length > MAX_BRANCH_LENGTH
    ? slug.slice(0, MAX_BRANCH_LENGTH).replace(/-$/, '')
    : slug;
}

function formatDueDate(dateStr: string): string {
  const due = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((due.getTime() - today.getTime()) / 86_400_000);
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff <= 7) return `${diff}d`;
  return dateStr;
}

function dueDateColor(dateStr: string): string {
  const due = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((due.getTime() - today.getTime()) / 86_400_000);
  if (diff < 0) return 'text-red-500';
  if (diff <= 2) return 'text-amber-500';
  return 'text-muted-foreground';
}

function matchesDueDateFilter(dueDate: string | null, filter: string): boolean {
  if (filter === 'all') return true;
  if (filter === 'no_date') return !dueDate;
  if (!dueDate) return false;

  const due = new Date(dueDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((due.getTime() - today.getTime()) / 86_400_000);

  switch (filter) {
    case 'overdue': return diff < 0;
    case 'today': return diff === 0;
    case 'this_week': return diff >= 0 && diff <= 7;
    default: return true;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Micro-animation styles (same as LinearFeed)
// Safe to use with dangerouslySetInnerHTML — content is a compile-time constant.
// ─────────────────────────────────────────────────────────────────────────────

const ANIM_STYLE = `
@keyframes feed-cta-enter {
  0% { opacity: 0; transform: translateY(8px) scale(0.97); }
  60% { opacity: 1; transform: translateY(-2px) scale(1.01); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes feed-cta-count {
  0% { transform: scale(1); }
  40% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
@keyframes feed-success-check {
  0% { transform: scale(0) rotate(-45deg); opacity: 0; }
  50% { transform: scale(1.2) rotate(0deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
.feed-cta-enter { animation: feed-cta-enter 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.feed-cta-count { animation: feed-cta-count 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
.feed-success-check { animation: feed-success-check 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StatusMultiSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (status: string) => {
    if (value.includes(status)) {
      if (value.length > 1) onChange(value.filter((v) => v !== status));
    } else {
      onChange([...value, status]);
    }
  };

  const label =
    value.length === STATUS_OPTIONS.length
      ? 'All'
      : value.length === 1
        ? STATUS_OPTIONS.find((o) => o.value === value[0])?.label ?? 'Status'
        : `${value.length} statuses`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs font-normal">
          {label}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[140px]">
        {STATUS_OPTIONS.map((opt) => (
          <DropdownMenuCheckboxItem
            key={opt.value}
            checked={value.includes(opt.value)}
            onCheckedChange={() => toggle(opt.value)}
            onSelect={(e) => e.preventDefault()}
          >
            <span className="flex items-center gap-2">
              <TaskStatusIcon status={opt.value as TaskStatus} size={12} />
              {opt.label}
            </span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TaskRow({
  task,
  selected,
  onToggle,
  onNavigate,
}: {
  task: TaskItem;
  selected: boolean;
  onToggle: () => void;
  onNavigate?: (uri: string) => void;
}) {
  return (
    <div
      className={`flex w-full items-center gap-2 px-4 py-2 transition-colors ${
        selected ? 'bg-primary/[0.04]' : ''
      }`}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={onToggle}
        className="shrink-0"
      />
      <TaskStatusIcon status={task.status} size={14} />
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm hover:underline"
        onClick={() => onNavigate?.(`@vienna//task/${task.id}`)}
      >
        <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
          {task.identifier}
        </span>
        <span className="min-w-0 flex-1 truncate">{task.title}</span>
      </button>
      {task.priority !== 'none' && (
        <span className="shrink-0">
          <PriorityIcon priority={task.priority} size={12} />
        </span>
      )}
      {task.labels.length > 0 && (
        <span className="shrink-0 flex items-center gap-1">
          {task.labels.slice(0, 2).map((label) => (
            <span
              key={label.id}
              className="rounded px-1 py-0.5 text-[9px] font-medium leading-none"
              style={{ backgroundColor: label.color + '20', color: label.color }}
            >
              {label.name}
            </span>
          ))}
        </span>
      )}
      {task.dueDate && (
        <span className={`shrink-0 text-[10px] ${dueDateColor(task.dueDate)}`}>
          {formatDueDate(task.dueDate)}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CTA Button content by phase
// ─────────────────────────────────────────────────────────────────────────────

function LaunchButtonContent({
  phase,
  count,
  countKey,
}: {
  phase: LaunchPhase;
  count: number;
  countKey: number;
}) {
  switch (phase) {
    case 'creating':
      return (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Launching agents...</span>
        </>
      );
    case 'messaging':
      return (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Messaging agents...</span>
        </>
      );
    case 'success':
      return (
        <>
          <Check className="feed-success-check h-4 w-4" />
          <span>Launched</span>
        </>
      );
    case 'idle':
    default:
      return (
        <>
          <Zap className="h-3.5 w-3.5" />
          <span>Launch agents</span>
          <span
            key={countKey}
            className="feed-cta-count inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-foreground/20 px-1.5 text-xs font-semibold"
          >
            {count}
          </span>
        </>
      );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Widget
// ─────────────────────────────────────────────────────────────────────────────

export function TasksWidget({ onNavigate }: NativeFeedWidgetProps) {
  const { projectId } = useWorkstreamList();
  const client = useApolloClient();
  const { settings, updateSettings } = useTasksFeedSettings();
  const [expanded, setExpanded] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [countKey, setCountKey] = useState(0);
  const [launchPhase, setLaunchPhase] = useState<LaunchPhase>('idle');

  // Fetch tasks — no status filter so we can do multi-status client-side
  const { data, loading } = useQuery(GET_TASKS, {
    variables: { projectId: projectId ?? '', limit: FETCH_LIMIT, parentId: null },
    skip: !projectId,
    fetchPolicy: 'cache-and-network',
  });

  const tasks: TaskItem[] = (data?.tasks ?? []) as TaskItem[];

  // Client-side filtering and sorting
  const filteredAndSorted = useMemo(() => {
    let result = tasks;

    // Status filter (multi-select)
    if (settings.statuses.length > 0 && settings.statuses.length < STATUS_OPTIONS.length) {
      const statusSet = new Set(settings.statuses);
      result = result.filter((t) => statusSet.has(t.status));
    }

    // Priority filter
    if (settings.priority !== 'all') {
      result = result.filter((t) => t.priority === settings.priority);
    }

    // Assignee filter
    if (settings.assignee !== 'all') {
      if (settings.assignee === 'unassigned') {
        result = result.filter((t) => !t.assigneeType);
      } else {
        result = result.filter((t) => t.assigneeType === settings.assignee);
      }
    }

    // Due date filter
    if (settings.dueDate !== 'all') {
      result = result.filter((t) => matchesDueDateFilter(t.dueDate, settings.dueDate));
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (settings.sortBy) {
        case 'priority':
          return (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99);
        case 'updated':
          return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
        case 'due_date': {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.localeCompare(b.dueDate);
        }
        case 'created':
        default:
          return (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
      }
    });

    return result;
  }, [tasks, settings]);

  const displayedTasks = expanded
    ? filteredAndSorted
    : filteredAndSorted.slice(0, COLLAPSED_LIMIT);
  const remaining = filteredAndSorted.length - COLLAPSED_LIMIT;

  const toggleExpanded = useCallback(() => setExpanded((v) => !v), []);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setCountKey((k) => k + 1);
  }, []);

  // Yield to React's render cycle so phase transitions (creating → messaging → success)
  // are visible to the user between sequential async mutations. Same pattern as LinearFeed.
  const tick = useCallback(() => new Promise<void>((r) => setTimeout(r, 50)), []);

  const handleLaunchAgents = useCallback(async () => {
    if (launchPhase !== 'idle' || selectedIds.size === 0 || !projectId) return;

    try {
      const selectedTasks = filteredAndSorted.filter((t) => selectedIds.has(t.id));

      // ── Phase 1: Creating workstreams ──────────────────────────────────
      setLaunchPhase('creating');
      await tick();

      const workstreamMap: Array<{ workstreamId: string; task: TaskItem }> = [];

      for (const task of selectedTasks) {
        const { data: wsResult } = await client.mutate({
          mutation: CREATE_WORKSTREAM,
          variables: {
            input: {
              projectId,
              title: `${task.identifier} ${task.title}`,
              groupName: 'Tasks',
              createWorktrees: true,
              branchName: toBranchName(task.identifier, task.title),
            },
          },
        });

        const wsId = wsResult?.createWorkstream?.workstream?.id;
        if (!wsId) continue;

        // Link the task entity to the workstream
        await client.mutate({
          mutation: LINK_WORKSTREAM_ENTITY,
          variables: {
            workstreamId: wsId,
            entityUri: `@vienna//task/${task.id}`,
            entityType: 'task',
            entityTitle: task.title,
          },
        });

        // Assign the task to the workstream
        await client.mutate({
          mutation: UPDATE_TASK,
          variables: {
            id: task.id,
            input: {
              assigneeType: 'workstream',
              assigneeWorkstreamId: wsId,
              status: task.status === 'todo' || task.status === 'backlog' ? 'in_progress' : undefined,
            },
          },
        });

        workstreamMap.push({ workstreamId: wsId, task });
      }

      // ── Phase 2: Messaging agents ─────────────────────────────────────
      setLaunchPhase('messaging');
      await tick();

      for (const { workstreamId } of workstreamMap) {
        await client.mutate({
          mutation: SEND_WORKSTREAM_MESSAGE,
          variables: {
            workstreamId,
            text: 'Work on this task',
          },
        });
      }

      // ── Phase 3: Success ──────────────────────────────────────────────
      setLaunchPhase('success');
      setSelectedIds(new Set());
      await tick();

      setTimeout(() => setLaunchPhase('idle'), 2500);
    } catch (err) {
      console.error('[TasksWidget] Failed to launch agents:', err);
      setLaunchPhase('idle');
    }
  }, [launchPhase, selectedIds, filteredAndSorted, projectId, client, tick]);

  const selectionCount = selectedIds.size;
  const showCta = selectionCount > 0 || launchPhase !== 'idle';

  if (!projectId) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm dark:bg-surface-interactive">
      <style dangerouslySetInnerHTML={{ __html: ANIM_STYLE }} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-foreground" />
          <span className="text-sm font-medium">Tasks</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs font-normal text-muted-foreground">
              {SORT_OPTIONS.find((o) => o.value === settings.sortBy)?.label ?? 'Sort'}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup
              value={settings.sortBy}
              onValueChange={(v) => updateSettings({ sortBy: v as TasksFeedSettings['sortBy'] })}
            >
              {SORT_OPTIONS.map((opt) => (
                <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                  {opt.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2">
        <StatusMultiSelect
          value={settings.statuses}
          onChange={(statuses) => updateSettings({ statuses })}
        />

        <div className="mx-0.5 h-4 w-px bg-border" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1">
              {PRIORITY_OPTIONS.find((o) => o.value === settings.priority)?.label ?? 'Priority'}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuRadioGroup
              value={settings.priority}
              onValueChange={(v) => updateSettings({ priority: v })}
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                  <span className="flex items-center gap-2">
                    {opt.value !== 'all' && <PriorityIcon priority={opt.value as TaskPriority} size={12} />}
                    {opt.label}
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1">
              {ASSIGNEE_OPTIONS.find((o) => o.value === settings.assignee)?.label ?? 'Assignee'}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuRadioGroup
              value={settings.assignee}
              onValueChange={(v) => updateSettings({ assignee: v as TasksFeedSettings['assignee'] })}
            >
              {ASSIGNEE_OPTIONS.map((opt) => (
                <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                  {opt.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1">
              {DUE_DATE_OPTIONS.find((o) => o.value === settings.dueDate)?.label ?? 'Due'}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuRadioGroup
              value={settings.dueDate}
              onValueChange={(v) => updateSettings({ dueDate: v as TasksFeedSettings['dueDate'] })}
            >
              {DUE_DATE_OPTIONS.map((opt) => (
                <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                  {opt.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Task list */}
      <div className="border-t border-border">
        {loading && tasks.length === 0 ? (
          <div className="px-4 py-3">
            <p className="text-xs text-muted-foreground">Loading...</p>
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="px-4 py-3">
            <p className="text-xs text-muted-foreground">No tasks found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {displayedTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                selected={selectedIds.has(task.id)}
                onToggle={() => toggleSelection(task.id)}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}
      </div>

      {/* View more / Show less */}
      {filteredAndSorted.length > COLLAPSED_LIMIT && (
        <button
          type="button"
          className="flex w-full items-center justify-center gap-1 border-t border-border px-4 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/50"
          onClick={toggleExpanded}
        >
          {expanded ? (
            <>
              Show less <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              View more ({remaining}) <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      )}

      {/* Selection CTA */}
      {showCta && (
        <div className="feed-cta-enter border-t border-border bg-primary/[0.06] px-4 py-2.5">
          <button
            type="button"
            disabled={launchPhase !== 'idle'}
            className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed ${
              launchPhase === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
            onClick={handleLaunchAgents}
          >
            <LaunchButtonContent
              phase={launchPhase}
              count={selectionCount}
              countKey={countKey}
            />
          </button>
        </div>
      )}
    </div>
  );
}

type TasksFeedSettings = import('./useTasksFeedSettings').TasksFeedSettings;
