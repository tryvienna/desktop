/**
 * TaskDrawer — Entity drawer for task entities.
 *
 * @ai-context
 * - Fetches task via GET_TASK + entity data
 * - Inline editing for title, description, status, priority, assignee, labels
 * - Subtask creation and links management
 * - Delete with confirmation dialog
 * - data-slot="task-entity-drawer"
 */

import { useState, useCallback, useMemo } from 'react';
import {
  DrawerBody,
  ContentSection,
  MetadataList,
  InlineEdit,
  Badge,
  Button,
  RichSelect,
  Input,
  MarkdownEditor,
  Markdown,
  ConfirmDialog,
  Combobox,
  DrawerPanelFooter,
} from '@tryvienna/ui';
import {
  useQuery,
  useMutation,
  GET_TASK,
  GET_TASK_LABELS,
  UPDATE_TASK,
  DELETE_TASK,
  CREATE_TASK,
} from '@vienna/graphql/client';
import { DrawerContainer, useDrawerActions } from '../../../lib/drawer';
import { useEntityData } from './useEntityData';
import { useWorkstreamList } from '../../../renderer/contexts/WorkstreamContext';
import { EntitySearchDialog } from '../../domain/entity-linking/entity-search-dialog';
import { useActionForm } from '../../../providers/ActionFormProvider';
import { LinkedWorkstreams } from '../../domain/entity-linking/linked-workstreams';
import {
  TaskStatusIcon,
  PriorityIcon,
  type TaskStatus,
  type TaskPriority,
} from '../../domain/task-status-icon';
import {
  Trash2,
  Plus,
  User,
  Bot,
  Link as LinkIcon,
  Circle,
  CircleDot,
  XCircle,
} from 'lucide-react';

// ── Select options ──────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'backlog', label: 'Backlog', status: 'backlog' as TaskStatus },
  { value: 'todo', label: 'Todo', status: 'todo' as TaskStatus },
  { value: 'in_progress', label: 'In Progress', status: 'in_progress' as TaskStatus },
  { value: 'done', label: 'Done', status: 'done' as TaskStatus },
  { value: 'canceled', label: 'Canceled', status: 'canceled' as TaskStatus },
];

const PRIORITY_OPTIONS = [
  { value: 'none', label: 'No priority', priority: 'none' as TaskPriority },
  { value: 'urgent', label: 'Urgent', priority: 'urgent' as TaskPriority },
  { value: 'high', label: 'High', priority: 'high' as TaskPriority },
  { value: 'medium', label: 'Medium', priority: 'medium' as TaskPriority },
  { value: 'low', label: 'Low', priority: 'low' as TaskPriority },
];

const ASSIGNEE_OPTIONS = [
  { value: 'unassigned', label: 'Unassigned', assigneeType: 'unassigned' },
  { value: 'self', label: 'Self', assigneeType: 'self' },
  { value: 'workstream', label: 'Workstream', assigneeType: 'workstream' },
];

function renderStatusOption(opt: (typeof STATUS_OPTIONS)[number]) {
  return (
    <span className="flex items-center gap-2">
      <TaskStatusIcon status={opt.status} size={12} />
      <span>{opt.label}</span>
    </span>
  );
}

function renderPriorityOption(opt: (typeof PRIORITY_OPTIONS)[number]) {
  return (
    <span className="flex items-center gap-2">
      <PriorityIcon priority={opt.priority} size={12} />
      <span>{opt.label}</span>
    </span>
  );
}

function renderAssigneeOption(opt: (typeof ASSIGNEE_OPTIONS)[number]) {
  const icon =
    opt.assigneeType === 'self' ? <User size={12} /> :
    opt.assigneeType === 'workstream' ? <Bot size={12} /> :
    <Circle size={12} className="text-muted-foreground" />;
  return (
    <span className="flex items-center gap-2">
      {icon}
      <span>{opt.label}</span>
    </span>
  );
}

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 min-h-8">
      <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────────────────

export function TaskDrawer({ uri, headerActions }: { uri: string; headerActions?: React.ReactNode }) {
  const { loading: entityLoading, error: entityError } = useEntityData(uri);
  // URI format: @vienna//task/{id}?label=... — strip query string before extracting ID
  const taskId = uri.split('?')[0].split('/').pop()!;
  const { closeTab } = useDrawerActions();

  const { data: taskData, loading, refetch } = useQuery(GET_TASK, {
    variables: { id: taskId },
    skip: !taskId,
    fetchPolicy: 'cache-and-network',
  });

  const task = taskData?.task;
  const projectId = (task?.projectId ?? undefined) as string | undefined;

  const { data: labelsData } = useQuery(GET_TASK_LABELS, {
    variables: { projectId: projectId ?? '' },
    skip: !projectId,
    fetchPolicy: 'cache-and-network',
  });

  const [updateTaskMutation] = useMutation(UPDATE_TASK);
  const [deleteTaskMutation] = useMutation(DELETE_TASK);
  const [createTaskMutation] = useMutation(CREATE_TASK);

  const [editingDescription, setEditingDescription] = useState(false);
  const [draftDescription, setDraftDescription] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [showNewSubtask, setShowNewSubtask] = useState(false);
  const [entitySearchOpen, setEntitySearchOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workstreamPickerOpen, setWorkstreamPickerOpen] = useState(false);

  const { workstreams } = useWorkstreamList();
  const actionForm = useActionForm();
  const labels = labelsData?.taskLabels ?? [];
  const subtasks = task?.subtasks ?? [];

  const wsOptions = useMemo(
    () => [
      ...workstreams
        .filter((w) => !w.archivedAt)
        .map((w) => ({ value: w.id, label: w.title, icon: <Bot size={12} /> })),
      { value: '__create__', label: 'Create new workstream\u2026', icon: <Plus size={12} /> },
    ],
    [workstreams],
  );

  const updateField = useCallback(
    async (input: Record<string, unknown>) => {
      if (!task?.id) return;
      try {
        await updateTaskMutation({
          variables: { id: task.id, input },
          refetchQueries: 'active',
        });
        refetch();
      } catch (err) {
        console.error('Failed to update task:', err);
      }
    },
    [task, updateTaskMutation, refetch],
  );

  const handleWorkstreamSelect = useCallback(
    (value: string) => {
      setWorkstreamPickerOpen(false);
      if (!task?.id) return;
      if (value === '__create__') {
        actionForm.showForm({
          entities: [{
            uri: `@vienna//task/${task.id}`,
            type: 'task',
            title: task.title ?? 'Task',
          }],
          onCreated: (workstreamId: string) => {
            updateField({
              assigneeType: 'workstream',
              assigneeWorkstreamId: workstreamId,
            });
          },
        });
      } else if (value) {
        updateField({
          assigneeType: 'workstream',
          assigneeWorkstreamId: value,
        });
      }
    },
    [task, actionForm, updateField],
  );

  const handleDelete = useCallback(async () => {
    if (!task?.id) return;
    try {
      await deleteTaskMutation({ variables: { id: task.id }, refetchQueries: 'active' });
      setDeleteDialogOpen(false);
      closeTab(`entity:${uri}`);
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  }, [task, deleteTaskMutation, closeTab, uri]);

  const handleCreateSubtask = useCallback(async () => {
    if (!newSubtaskTitle.trim() || !task || !projectId) return;
    try {
      await createTaskMutation({
        variables: {
          input: {
            projectId,
            title: newSubtaskTitle.trim(),
            parentId: task.id,
            status: task.status,
          },
        },
        refetchQueries: 'active',
      });
      setNewSubtaskTitle('');
      setShowNewSubtask(false);
      refetch();
    } catch (err) {
      console.error('Failed to create subtask:', err);
    }
  }, [newSubtaskTitle, task, projectId, createTaskMutation, refetch]);

  const handleAddLink = useCallback(
    async (entityUri: string) => {
      if (!task) return;
      const current = task.links ?? [];
      if (current.includes(entityUri)) return;
      await updateField({ links: [...current, entityUri] });
    },
    [task, updateField],
  );

  const handleRemoveLink = useCallback(
    async (linkToRemove: string) => {
      if (!task) return;
      const updatedLinks = (task.links ?? []).filter((l: string) => l !== linkToRemove);
      await updateField({ links: updatedLinks });
    },
    [task, updateField],
  );

  if ((loading || entityLoading) && !task) {
    return (
      <DrawerContainer title="Task">
        <DrawerBody>
          <div data-slot="task-entity-drawer" className="space-y-4 animate-pulse">
            <div className="h-4 w-16 bg-muted rounded" />
            <div className="h-6 w-48 bg-muted rounded" />
            <div className="h-20 w-full bg-muted rounded" />
          </div>
        </DrawerBody>
      </DrawerContainer>
    );
  }

  if (entityError || !task || !task.id) {
    return (
      <DrawerContainer title="Task">
        <DrawerBody>
          <div data-slot="task-entity-drawer" className="flex flex-col items-center gap-2 py-8">
            <CircleDot className="size-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {entityError ? 'Failed to load task' : 'Task not found'}
            </span>
          </div>
        </DrawerBody>
      </DrawerContainer>
    );
  }

  // After the guard, narrow task fields to non-null for the render below
  const taskId_ = task.id;
  const taskTitle = task.title ?? '';
  const taskIdentifier = task.identifier ?? '';
  const taskStatus = (task.status ?? 'todo') as string;
  const taskPriority = (task.priority ?? 'none') as string;
  const taskDescription = task.description ?? null;
  const taskAssigneeType = task.assigneeType ?? null;
  const taskAssigneeWorkstreamId = task.assigneeWorkstreamId ?? null;
  const taskDueDate = task.dueDate ?? null;
  const taskLinks = (task.links ?? []) as string[];
  const taskLabels = (task.labels ?? []) as Array<{ id: string; name: string; color: string }>;

  return (
    <DrawerContainer
      title={taskTitle}
      headerActions={headerActions}
      footer={
        <DrawerPanelFooter>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 size={12} />
            Delete
          </Button>
        </DrawerPanelFooter>
      }
    >
      <DrawerBody>
        <div data-slot="task-entity-drawer" className="flex flex-col gap-4">
          {/* Header: Identifier + Title */}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground font-mono">
              {taskIdentifier}
            </span>
            <InlineEdit
              value={taskTitle}
              onSave={(value) => updateField({ title: value })}
            />
          </div>

          {/* Properties */}
          <ContentSection title="Properties">
            <div className="flex flex-col gap-1">
              <PropertyRow label="Status">
                <RichSelect
                  value={taskStatus}
                  onValueChange={(v) => updateField({ status: v })}
                  options={STATUS_OPTIONS}
                  renderOption={renderStatusOption}
                  renderValue={renderStatusOption}
                  size="sm"
                />
              </PropertyRow>

              <PropertyRow label="Priority">
                <RichSelect
                  value={taskPriority}
                  onValueChange={(v) => updateField({ priority: v === 'none' ? null : v })}
                  options={PRIORITY_OPTIONS}
                  renderOption={renderPriorityOption}
                  renderValue={renderPriorityOption}
                  size="sm"
                />
              </PropertyRow>

              <PropertyRow label="Assignee">
                <RichSelect
                  value={taskAssigneeType ?? 'unassigned'}
                  onValueChange={(v) => {
                    if (v === 'unassigned') {
                      updateField({ assigneeType: null, assigneeWorkstreamId: null });
                    } else if (v === 'workstream') {
                      setWorkstreamPickerOpen(true);
                    } else {
                      updateField({ assigneeType: v, assigneeWorkstreamId: null });
                    }
                  }}
                  options={ASSIGNEE_OPTIONS}
                  renderOption={renderAssigneeOption}
                  renderValue={renderAssigneeOption}
                  size="sm"
                />
              </PropertyRow>

              {(taskAssigneeType === 'workstream' || workstreamPickerOpen) && (
                <PropertyRow label="Workstream">
                  <Combobox
                    options={wsOptions}
                    value={taskAssigneeWorkstreamId ?? ''}
                    onValueChange={handleWorkstreamSelect}
                    placeholder="Select workstream\u2026"
                    searchPlaceholder="Search workstreams\u2026"
                    emptyText="No workstreams found."
                    defaultOpen={workstreamPickerOpen}
                    onOpenChange={(open) => {
                      if (!open && workstreamPickerOpen && !taskAssigneeWorkstreamId) {
                        setWorkstreamPickerOpen(false);
                      }
                    }}
                  />
                </PropertyRow>
              )}

              <PropertyRow label="Due date">
                <Input
                  type="date"
                  value={taskDueDate ?? ''}
                  onChange={(e) => updateField({ dueDate: e.target.value || null })}
                  className="h-8 text-xs"
                />
              </PropertyRow>

              <PropertyRow label="Labels">
                <div className="flex flex-wrap items-center gap-1">
                  {taskLabels.map((label) => (
                    <Badge
                      key={label.id}
                      variant="outline"
                      className="text-[10px] cursor-pointer hover:line-through"
                      style={{ borderColor: label.color, color: label.color }}
                      onClick={() => {
                        const updated = taskLabels
                          .filter((l) => l.id !== label.id)
                          .map((l) => l.id);
                        updateField({ labelIds: updated });
                      }}
                    >
                      {label.name}
                    </Badge>
                  ))}
                  <Combobox
                    options={(labels as Array<{ id: string; name: string }>)
                      .filter((l) => !taskLabels.some((tl) => tl.id === l.id))
                      .map((l) => ({ label: l.name, value: l.id }))}
                    value=""
                    onValueChange={(v) => {
                      if (v) {
                        const currentIds = taskLabels.map((l) => l.id);
                        updateField({ labelIds: [...currentIds, v] });
                      }
                    }}
                    placeholder="+"
                    searchPlaceholder="Search labels..."
                  />
                </div>
              </PropertyRow>
            </div>
          </ContentSection>

          {/* Description */}
          <ContentSection
            title="Description"
            titleAction={
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  if (!editingDescription) {
                    setDraftDescription(taskDescription ?? '');
                  }
                  setEditingDescription(!editingDescription);
                }}
              >
                {editingDescription ? 'Cancel' : 'Edit'}
              </Button>
            }
          >
            {editingDescription ? (
              <MarkdownEditor
                value={draftDescription}
                onChange={setDraftDescription}
                onSave={(value) => {
                  updateField({ description: value || null });
                  setEditingDescription(false);
                }}
                onCancel={() => setEditingDescription(false)}
                placeholder="Add a description..."
                minHeight="80px"
                size="sm"
              />
            ) : taskDescription ? (
              <Markdown content={taskDescription} size="sm" />
            ) : (
              <p className="text-xs text-muted-foreground italic">No description</p>
            )}
          </ContentSection>

          {/* Subtasks */}
          <ContentSection
            title={`Subtasks${subtasks.length > 0 ? ` (${subtasks.length})` : ''}`}
            titleAction={
              <Button variant="ghost" size="xs" onClick={() => setShowNewSubtask(true)} aria-label="Add subtask">
                <Plus size={12} />
              </Button>
            }
          >
            <div className="flex flex-col gap-0.5">
              {subtasks.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50 cursor-pointer text-xs transition-colors"
                >
                  <TaskStatusIcon status={st.status as TaskStatus} size={12} />
                  <span className={st.status === 'done' ? 'line-through text-muted-foreground' : ''}>
                    {st.title}
                  </span>
                </div>
              ))}
              {showNewSubtask && (
                <div className="flex items-center gap-1 mt-1">
                  <Input
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateSubtask();
                      if (e.key === 'Escape') {
                        setShowNewSubtask(false);
                        setNewSubtaskTitle('');
                      }
                    }}
                    placeholder="Subtask title..."
                    autoFocus
                    className="h-7 text-xs"
                  />
                </div>
              )}
              {subtasks.length === 0 && !showNewSubtask && (
                <p className="text-xs text-muted-foreground italic">No subtasks</p>
              )}
            </div>
          </ContentSection>

          {/* Related Entities */}
          <ContentSection
            title={`Related Entities${taskLinks.length > 0 ? ` (${taskLinks.length})` : ''}`}
            titleAction={
              <Button variant="ghost" size="xs" onClick={() => setEntitySearchOpen(true)} aria-label="Add related entity">
                <Plus size={12} />
              </Button>
            }
          >
            <div className="flex flex-col gap-0.5">
              {taskLinks.map((link) => {
                const parts = link.replace('@vienna//', '').split('/');
                const entityType = parts[0] ?? 'entity';
                return (
                  <div
                    key={link}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs group hover:bg-accent/50 transition-colors"
                  >
                    <LinkIcon size={10} className="text-muted-foreground shrink-0" />
                    <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">{entityType}</Badge>
                    <span className="flex-1 truncate text-[11px]">{link}</span>
                    <button
                      type="button"
                      className="opacity-0 group-hover:opacity-100 text-destructive transition-opacity"
                      onClick={() => handleRemoveLink(link)}
                      aria-label="Remove link"
                    >
                      <XCircle size={12} />
                    </button>
                  </div>
                );
              })}
              {taskLinks.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No linked entities</p>
              )}
            </div>
            <EntitySearchDialog
              open={entitySearchOpen}
              onOpenChange={setEntitySearchOpen}
              onSelect={(result) => handleAddLink(result.uri)}
              excludeUris={taskLinks}
            />
          </ContentSection>

          {/* Linked Workstreams */}
          <LinkedWorkstreams entityUri={uri} />

          {/* Metadata */}
          <ContentSection title="Details" collapsible defaultCollapsed>
            <MetadataList
              items={[
                { label: 'Created', value: new Date(task.createdAt as number).toLocaleString() },
                { label: 'Updated', value: new Date(task.updatedAt as number).toLocaleString() },
                { label: 'ID', value: taskId_, copyable: true },
              ]}
            />
          </ContentSection>
        </div>
      </DrawerBody>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete task"
        description={`Are you sure you want to delete "${taskTitle}"? This will also delete all subtasks.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </DrawerContainer>
  );
}
