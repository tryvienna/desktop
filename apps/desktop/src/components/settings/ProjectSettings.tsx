/**
 * ProjectSettings — CRUD management for projects.
 *
 * @ai-context
 * - Lists all projects with rename, delete, switch actions
 * - Create new project via inline form
 * - Prevents deleting the last project
 * - Switching projects updates WorkstreamContext
 */

import { useState, useCallback } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import {
  useQuery,
  useMutation,
  GET_PROJECTS,
  CREATE_PROJECT,
  UPDATE_PROJECT,
  DELETE_PROJECT,
} from '@vienna/graphql/client';
import {
  Button,
  Input,
  Badge,
  Separator,
  InlineEdit,
  ConfirmDialog,
} from '@tryvienna/ui';
import { useWorkstreamList, useWorkstreamActions } from '../../renderer/contexts/WorkstreamContext';
import { formatRelativeTime } from '../drawer/workstream-settings/helpers';

export function ProjectSettings() {
  const { projectId } = useWorkstreamList();
  const { switchProject } = useWorkstreamActions();

  const { data, refetch } = useQuery(GET_PROJECTS);
  const [createProject] = useMutation(CREATE_PROJECT);
  const [updateProject] = useMutation(UPDATE_PROJECT);
  const [deleteProject] = useMutation(DELETE_PROJECT);

  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const projects = data?.projects ?? [];

  const handleCreate = useCallback(async () => {
    const name = newProjectName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const { data: result } = await createProject({
        variables: { input: { name } },
      });
      await refetch();
      const newId = result?.createProject?.id;
      if (newId) {
        switchProject(newId);
      }
      setNewProjectName('');
    } finally {
      setCreating(false);
    }
  }, [newProjectName, createProject, refetch, switchProject]);

  const handleRename = useCallback(
    async (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      await updateProject({ variables: { id, input: { name: trimmed } } });
      await refetch();
    },
    [updateProject, refetch]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteProject({ variables: { id: deleteTarget.id } });
      const { data: refetched } = await refetch();
      // If we deleted the active project, switch to the first remaining
      if (deleteTarget.id === projectId) {
        const remaining = (refetched?.projects ?? []).filter((p) => p.id !== deleteTarget.id);
        if (remaining[0]?.id) {
          switchProject(remaining[0].id);
        }
      }
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteProject, refetch, projectId, switchProject]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCreate();
      }
    },
    [handleCreate]
  );

  return (
    <div className="grid gap-6">
      {/* Create new project */}
      <div className="flex items-center gap-2">
        <Input
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="New project name..."
          className="flex-1"
        />
        <Button
          size="sm"
          onClick={handleCreate}
          disabled={!newProjectName.trim() || creating}
        >
          <Plus size={16} className="mr-1" />
          Create
        </Button>
      </div>

      <Separator />

      {/* Project list */}
      <div className="grid gap-2">
        {projects.map((project) => {
          const isActive = project.id === projectId;
          return (
            <div
              key={project.id}
              className="flex items-center gap-3 rounded-lg border border-border px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <InlineEdit
                    value={project.name ?? ''}
                    onSave={(name) => handleRename(project.id!, name)}
                    className="text-sm font-medium"
                  />
                  {isActive && (
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      <Check size={10} className="mr-0.5" />
                      Active
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Created {project.createdAt ? formatRelativeTime(project.createdAt) : '—'}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {!isActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => switchProject(project.id!)}
                  >
                    Switch
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={projects.length <= 1}
                  onClick={() =>
                    setDeleteTarget({ id: project.id!, name: project.name ?? 'Untitled' })
                  }
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete project"
        description={`Are you sure you want to permanently delete "${deleteTarget?.name}"? All workstreams in this project will also be deleted. This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
