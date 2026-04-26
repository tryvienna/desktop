/**
 * TaskSettingsDrawer — Settings panel for tasks.
 *
 * @ai-context
 * - Display settings: status filter, group by, sort by, limit
 * - Label management: create, delete
 * - Settings persisted via usePersistedState (storageRegistry)
 * - Rendered via drawer registration (TASK_SETTINGS_CONTENT_ID)
 */

import { useState, useCallback } from 'react';
import {
  DrawerBody,
  ContentSection,
  Button,
  Input,
  EmptyState,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Checkbox,
  Label,
} from '@tryvienna/ui';
import {
  useQuery,
  useMutation,
  GET_TASK_LABELS,
  CREATE_TASK_LABEL,
  DELETE_TASK_LABEL,
} from '@vienna/graphql/client';
import { DrawerContainer } from '../../../lib/drawer';
import { Plus, Trash2, Tag } from 'lucide-react';
import { usePersistedState } from '../../../storage';

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E',
  '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280',
];

const STATUS_TYPE_OPTIONS = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'Todo' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
  { value: 'canceled', label: 'Canceled' },
];

const GROUP_BY_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'label', label: 'Label' },
  { value: 'assignee', label: 'Assignee' },
] as const;

const SORT_BY_OPTIONS = [
  { value: 'created', label: 'Date created' },
  { value: 'updated', label: 'Last updated' },
  { value: 'priority', label: 'Priority' },
  { value: 'due_date', label: 'Due date' },
] as const;

const LIMIT_OPTIONS = [10, 20, 50, 100];

export function TaskSettingsDrawer({ projectId }: { projectId: string }) {
  const { data, loading: labelsLoading, refetch } = useQuery(GET_TASK_LABELS, {
    variables: { projectId },
    fetchPolicy: 'cache-and-network',
  });
  const [createLabelMutation] = useMutation(CREATE_TASK_LABEL);
  const [deleteLabelMutation] = useMutation(DELETE_TASK_LABEL);

  const [settings, setSettings] = usePersistedState('taskDisplaySettings');

  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(PRESET_COLORS[4]!);
  const [showCreateLabel, setShowCreateLabel] = useState(false);

  const labels = data?.taskLabels ?? [];

  const handleCreateLabel = useCallback(async () => {
    if (!newLabelName.trim()) return;
    await createLabelMutation({
      variables: { projectId, name: newLabelName.trim(), color: newLabelColor },
      refetchQueries: 'active',
    });
    setNewLabelName('');
    setShowCreateLabel(false);
    refetch();
  }, [newLabelName, newLabelColor, projectId, createLabelMutation, refetch]);

  const handleDeleteLabel = useCallback(
    async (id: string) => {
      await deleteLabelMutation({
        variables: { id },
        refetchQueries: 'active',
      });
      refetch();
    },
    [deleteLabelMutation, refetch],
  );

  const handleStatusTypeToggle = useCallback(
    (status: string) => {
      setSettings((prev) => {
        const current = prev.statusTypes;
        const next = current.includes(status)
          ? current.filter((s) => s !== status)
          : [...current, status];
        // Require at least one status
        if (next.length === 0) return prev;
        return { ...prev, statusTypes: next };
      });
    },
    [setSettings],
  );

  const handleReset = useCallback(() => {
    setSettings({
      statusTypes: ['backlog', 'todo', 'in_progress'],
      groupBy: 'none',
      sortBy: 'created',
      limit: 50,
    });
  }, [setSettings]);

  return (
    <DrawerContainer title="Task Settings">
      <DrawerBody>
        <div data-slot="task-settings-drawer" className="flex flex-col gap-4">
          {/* Status Filter */}
          <ContentSection title="Status filter">
            <div className="flex flex-col gap-2">
              {STATUS_TYPE_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`task-status-${opt.value}`}
                    checked={settings.statusTypes.includes(opt.value)}
                    onCheckedChange={() => handleStatusTypeToggle(opt.value)}
                  />
                  <Label
                    htmlFor={`task-status-${opt.value}`}
                    className="text-[13px] cursor-pointer"
                  >
                    {opt.label}
                  </Label>
                </div>
              ))}
            </div>
          </ContentSection>

          {/* Group By */}
          <ContentSection title="Group by">
            <div className="flex flex-wrap gap-1">
              {GROUP_BY_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant={settings.groupBy === opt.value ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setSettings((prev) => ({ ...prev, groupBy: opt.value }))}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </ContentSection>

          {/* Sort By */}
          <ContentSection title="Sort by">
            <div className="flex flex-wrap gap-1">
              {SORT_BY_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant={settings.sortBy === opt.value ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setSettings((prev) => ({ ...prev, sortBy: opt.value }))}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </ContentSection>

          {/* Task Limit */}
          <ContentSection title="Task limit">
            <Select
              value={String(settings.limit)}
              onValueChange={(value) => setSettings((prev) => ({ ...prev, limit: Number(value) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LIMIT_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} tasks
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ContentSection>

          {/* Labels */}
          <ContentSection
            title="Labels"
            titleAction={
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setShowCreateLabel(!showCreateLabel)}
                aria-label="Create label"
              >
                <Plus size={12} />
              </Button>
            }
          >
            {labelsLoading && labels.length === 0 ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-4 w-32 bg-muted rounded" />
              </div>
            ) : labels.length === 0 && !showCreateLabel ? (
              <EmptyState
                icon={<Tag />}
                title="No labels"
                description="Labels help you categorize and filter tasks."
                action={
                  <Button variant="outline" size="sm" onClick={() => setShowCreateLabel(true)}>
                    <Plus size={12} />
                    Create label
                  </Button>
                }
              />
            ) : (
              <div className="flex flex-col gap-0.5">
                {(labels as Array<{ id: string; name: string; color: string }>).map((label) => (
                  <div
                    key={label.id}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 group hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="size-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="text-xs">{label.name}</span>
                    </div>
                    <button
                      type="button"
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                      onClick={() => handleDeleteLabel(label.id)}
                      aria-label={`Delete label ${label.name}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showCreateLabel && (
              <div className="flex flex-col gap-2 rounded-lg border border-border p-3 mt-2">
                <Input
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  placeholder="Label name..."
                  className="h-8 text-xs"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateLabel();
                    if (e.key === 'Escape') setShowCreateLabel(false);
                  }}
                />
                <div className="flex gap-1.5">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className="size-5 rounded-full border-2 transition-all hover:scale-110"
                      style={{
                        backgroundColor: color,
                        borderColor: color === newLabelColor ? 'var(--foreground)' : 'transparent',
                      }}
                      onClick={() => setNewLabelColor(color)}
                      aria-label={`Color ${color}`}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="xs" onClick={handleCreateLabel} disabled={!newLabelName.trim()}>
                    Create
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      setShowCreateLabel(false);
                      setNewLabelName('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </ContentSection>

          {/* Reset */}
          <ContentSection>
            <Button variant="outline" size="sm" onClick={handleReset} className="w-full">
              Reset to defaults
            </Button>
            <p className="text-[11px] text-muted-foreground mt-2 text-center">
              Settings are saved automatically
            </p>
          </ContentSection>
        </div>
      </DrawerBody>
    </DrawerContainer>
  );
}
