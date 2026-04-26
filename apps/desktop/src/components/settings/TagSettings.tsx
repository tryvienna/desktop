/**
 * TagSettings — CRUD management for tags within the active project.
 *
 * @ai-context
 * - Tags shown as compact rows (like ProjectSettings cards)
 * - Edit opens a Dialog with full tag editor
 * - Create also uses a Dialog
 * - Uses Switch for spawn workstream, save-on-blur for instructions
 * - Dependencies managed via combobox + TagChip removables
 * - DAG visualization shown when dependencies exist
 * - Tags are identified by name (not ID) and stored as JSON files
 * - data-slot="tag-settings"
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Plus, Trash2, Pencil, GitBranch } from 'lucide-react';
import { PipelineDAGView } from '../tags/PipelineDAGView';
import {
  useQuery,
  useMutation,
  GET_TAGS_BY_PROJECT,
  CREATE_TAG,
  UPDATE_TAG,
  DELETE_TAG,
} from '@vienna/graphql/client';
import {
  Button,
  Separator,
  InlineEdit,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@tryvienna/ui';
import { useWorkstreamList } from '../../renderer/contexts/WorkstreamContext';
import { TagChip } from '../tags/TagChip';
import { TagEditor, DEFAULT_COLORS } from '../tags/TagEditor';
import type { TagData } from '../tags/TagEditor';

// ─────────────────────────────────────────────────────────────────────────────
// Edit tag dialog
// ─────────────────────────────────────────────────────────────────────────────

interface EditTagDialogProps {
  tag: TagData;
  allTags: TagData[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRename: (name: string) => void;
  onUpdateInstructions: (instructions: string) => void;
  onUpdateColor: (color: string) => void;
  onUpdateSpawnWorkstream: (v: boolean) => void;
  onUpdateWorktreeMode: (v: 'same' | 'fork' | 'from_main') => void;
  onUpdateDependsOn: (dependsOn: string[]) => void;
}

function EditTagDialog({
  tag,
  allTags,
  open,
  onOpenChange,
  onRename,
  onUpdateInstructions,
  onUpdateColor,
  onUpdateSpawnWorkstream,
  onUpdateWorktreeMode,
  onUpdateDependsOn,
}: EditTagDialogProps) {
  const [localInstructions, setLocalInstructions] = useState(tag.instructions);
  const instructionsDirty = useRef(false);

  // Sync when tag changes or dialog opens
  useEffect(() => {
    if (open) {
      setLocalInstructions(tag.instructions);
      instructionsDirty.current = false;
    }
  }, [open, tag.instructions]);

  // Build dependency display data from dependsOn names
  const dependencies = useMemo(
    () =>
      tag.dependsOn
        .map((depName) => allTags.find((l) => l.name === depName))
        .filter(Boolean)
        .map((l) => ({ name: l!.name, color: l!.color })),
    [tag.dependsOn, allTags],
  );

  // Build dependents: tags that list this tag in their dependsOn
  const dependents = useMemo(
    () =>
      allTags
        .filter((l) => l.dependsOn.includes(tag.name))
        .map((l) => ({ name: l.name, color: l.color })),
    [allTags, tag.name],
  );

  const existingDepNames = useMemo(() => new Set(tag.dependsOn), [tag.dependsOn]);
  const dependentNames = useMemo(() => new Set(dependents.map((d) => d.name)), [dependents]);

  const depOptions = useMemo(
    () =>
      allTags
        .filter((l) => l.name !== tag.name && !existingDepNames.has(l.name) && !dependentNames.has(l.name))
        .map((l) => ({ value: l.name, label: l.name })),
    [allTags, tag.name, existingDepNames, dependentNames],
  );

  const handleClose = useCallback(
    (nextOpen: boolean) => {
      // Save pending instructions on close
      if (!nextOpen && instructionsDirty.current) {
        const trimmed = localInstructions.trim();
        if (trimmed && trimmed !== tag.instructions) {
          onUpdateInstructions(trimmed);
        }
        instructionsDirty.current = false;
      }
      onOpenChange(nextOpen);
    },
    [localInstructions, tag.instructions, onUpdateInstructions, onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: tag.color }}
            />
            <InlineEdit
              value={tag.name}
              onSave={onRename}
              className="text-base font-semibold"
            />
          </DialogTitle>
          <DialogDescription className="sr-only">Edit tag settings</DialogDescription>
        </DialogHeader>
        <TagEditor
          name={tag.name}
          onNameChange={() => {}}
          instructions={localInstructions}
          onInstructionsChange={(v) => {
            instructionsDirty.current = true;
            setLocalInstructions(v);
          }}
          color={tag.color}
          onColorChange={onUpdateColor}
          spawnWorkstream={tag.spawnWorkstream}
          onSpawnWorkstreamChange={onUpdateSpawnWorkstream}
          worktreeMode={tag.worktreeMode}
          onWorktreeModeChange={onUpdateWorktreeMode}
          dependencies={dependencies}
          dependents={dependents}
          onAddDependency={(depName) => onUpdateDependsOn([...tag.dependsOn, depName])}
          onRemoveDependency={(depName) => onUpdateDependsOn(tag.dependsOn.filter((d) => d !== depName))}
          depOptions={depOptions}
          nameEditable={false}
        />
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create tag dialog
// ─────────────────────────────────────────────────────────────────────────────

interface CreateTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tags: TagData[];
  onCreate: (input: {
    name: string;
    instructions: string;
    color: string;
    spawnWorkstream: boolean;
    worktreeMode: 'same' | 'fork' | 'from_main';
    dependsOn: string[];
  }) => void;
  creating: boolean;
}

function CreateTagDialog({ open, onOpenChange, tags, onCreate, creating }: CreateTagDialogProps) {
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [color, setColor] = useState(DEFAULT_COLORS[0]);
  const [dependsOn, setDependsOn] = useState<string[]>([]);
  const [spawnWorkstream, setSpawnWorkstream] = useState(false);
  const [worktreeMode, setWorktreeMode] = useState<'same' | 'fork' | 'from_main'>('same');

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName('');
      setInstructions('');
      setColor(DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)]);
      setDependsOn([]);
      setSpawnWorkstream(false);
      setWorktreeMode('same');
    }
  }, [open]);

  const depTags = useMemo(
    () =>
      dependsOn
        .map((depName) => tags.find((l) => l.name === depName))
        .filter(Boolean)
        .map((l) => ({ name: l!.name, color: l!.color })),
    [dependsOn, tags],
  );

  const depOptions = useMemo(
    () => tags.filter((l) => !dependsOn.includes(l.name)).map((l) => ({ value: l.name, label: l.name })),
    [tags, dependsOn],
  );

  const handleSubmit = useCallback(() => {
    const trimmedName = name.trim();
    const trimmedInstructions = instructions.trim();
    if (!trimmedName || !trimmedInstructions) return;
    onCreate({ name: trimmedName, instructions: trimmedInstructions, color, spawnWorkstream, worktreeMode, dependsOn });
  }, [name, instructions, color, spawnWorkstream, worktreeMode, dependsOn, onCreate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create tag</DialogTitle>
          <DialogDescription className="sr-only">Create a new tag with instructions</DialogDescription>
        </DialogHeader>
        <TagEditor
          name={name}
          onNameChange={setName}
          instructions={instructions}
          onInstructionsChange={setInstructions}
          color={color}
          onColorChange={setColor}
          spawnWorkstream={spawnWorkstream}
          onSpawnWorkstreamChange={setSpawnWorkstream}
          worktreeMode={worktreeMode}
          onWorktreeModeChange={setWorktreeMode}
          dependencies={depTags}
          dependents={[]}
          onAddDependency={(depName) => setDependsOn((prev) => [...prev, depName])}
          onRemoveDependency={(depName) => setDependsOn((prev) => prev.filter((d) => d !== depName))}
          depOptions={depOptions}
        />
        <div className="flex items-center gap-2 pt-2">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!name.trim() || !instructions.trim() || creating}
          >
            Create
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function TagSettings() {
  const { projectId } = useWorkstreamList();

  const { data, refetch } = useQuery(GET_TAGS_BY_PROJECT, {
    variables: { projectId: projectId ?? '' },
    skip: !projectId,
  });

  const [createTag] = useMutation(CREATE_TAG);
  const [updateTag] = useMutation(UPDATE_TAG);
  const [deleteTag] = useMutation(DELETE_TAG);

  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ name: string } | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const tags: TagData[] = useMemo(
    () =>
      (data?.tagsByProject ?? []).map((l) => ({
        name: String(l.name ?? ''),
        instructions: String(l.instructions ?? ''),
        color: String(l.color ?? '#3B82F6'),
        maxDepth: l.maxDepth ?? 3,
        spawnWorkstream: l.spawnWorkstream ?? false,
        worktreeMode: (l.worktreeMode as 'same' | 'fork' | 'from_main') ?? 'same',
        dependsOn: (l.dependsOn ?? []) as string[],
      })),
    [data],
  );

  const editTag = useMemo(
    () => tags.find((l) => l.name === editingTag) ?? null,
    [tags, editingTag],
  );

  const hasDependencies = useMemo(
    () => tags.some((l) => l.dependsOn.length > 0),
    [tags],
  );

  // ── Handlers ─────────────────────────────────────────────────────────────

  const withErrorHandling = useCallback(
    (fn: () => Promise<unknown>, fallbackMsg: string) => {
      fn().catch((err) => {
        setMutationError(err instanceof Error ? err.message : fallbackMsg);
      });
    },
    [],
  );

  const handleCreate = useCallback(
    async (input: {
      name: string;
      instructions: string;
      color: string;
      spawnWorkstream: boolean;
      worktreeMode: 'same' | 'fork' | 'from_main';
      dependsOn: string[];
    }) => {
      if (!projectId) return;
      setCreating(true);
      setMutationError(null);
      try {
        await createTag({
          variables: {
            input: {
              projectId,
              name: input.name,
              instructions: input.instructions,
              color: input.color,
              spawnWorkstream: input.spawnWorkstream,
              worktreeMode: input.worktreeMode,
              dependsOn: input.dependsOn,
            },
          },
        });
        await refetch();
        setShowCreate(false);
      } catch (err) {
        setMutationError(err instanceof Error ? err.message : 'Failed to create tag');
      } finally {
        setCreating(false);
      }
    },
    [projectId, createTag, refetch],
  );

  const handleRename = useCallback(
    (tagName: string, newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed || !projectId) return;
      withErrorHandling(
        () => updateTag({ variables: { projectId, tagName, input: { name: trimmed } } }).then(() => refetch()) as Promise<unknown>,
        'Failed to rename tag',
      );
    },
    [projectId, updateTag, refetch, withErrorHandling],
  );

  const handleUpdateInstructions = useCallback(
    (tagName: string, instructions: string) => {
      if (!projectId) return;
      withErrorHandling(
        () => updateTag({ variables: { projectId, tagName, input: { instructions } } }).then(() => refetch()) as Promise<unknown>,
        'Failed to update instructions',
      );
    },
    [projectId, updateTag, refetch, withErrorHandling],
  );

  const handleUpdateColor = useCallback(
    (tagName: string, color: string) => {
      if (!projectId) return;
      withErrorHandling(
        () => updateTag({ variables: { projectId, tagName, input: { color } } }).then(() => refetch()) as Promise<unknown>,
        'Failed to update color',
      );
    },
    [projectId, updateTag, refetch, withErrorHandling],
  );

  const handleUpdateSpawnWorkstream = useCallback(
    (tagName: string, v: boolean) => {
      if (!projectId) return;
      withErrorHandling(
        () => updateTag({ variables: { projectId, tagName, input: { spawnWorkstream: v } } }).then(() => refetch()) as Promise<unknown>,
        'Failed to update spawn workstream',
      );
    },
    [projectId, updateTag, refetch, withErrorHandling],
  );

  const handleUpdateWorktreeMode = useCallback(
    (tagName: string, v: 'same' | 'fork' | 'from_main') => {
      if (!projectId) return;
      withErrorHandling(
        () => updateTag({ variables: { projectId, tagName, input: { worktreeMode: v } } }).then(() => refetch()) as Promise<unknown>,
        'Failed to update worktree mode',
      );
    },
    [projectId, updateTag, refetch, withErrorHandling],
  );

  const handleUpdateDependsOn = useCallback(
    (tagName: string, dependsOn: string[]) => {
      if (!projectId) return;
      withErrorHandling(
        () => updateTag({ variables: { projectId, tagName, input: { dependsOn } } }).then(() => refetch()) as Promise<unknown>,
        'Failed to update dependencies',
      );
    },
    [projectId, updateTag, refetch, withErrorHandling],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget || !projectId) return;
    try {
      await deleteTag({ variables: { projectId, tagName: deleteTarget.name } });
      if (editingTag === deleteTarget.name) setEditingTag(null);
      await refetch();
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : 'Failed to delete tag');
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, projectId, deleteTag, refetch, editingTag]);

  if (!projectId) {
    return <p className="text-sm text-muted-foreground">No project selected.</p>;
  }

  return (
    <div className="grid gap-6 min-w-0 overflow-hidden" data-slot="tag-settings">
      {/* Error banner */}
      {mutationError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive flex items-center justify-between">
          <span>{mutationError}</span>
          <button type="button" className="text-xs underline ml-2" onClick={() => setMutationError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {/* Create button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowCreate(true)}
        className="w-fit"
      >
        <Plus size={16} className="mr-1" />
        Create Tag
      </Button>

      {tags.length > 0 && <Separator />}

      {/* Tag list — compact rows like ProjectSettings */}
      {tags.length > 0 && (
        <div className="grid gap-2 min-w-0">
          {tags.map((tag) => (
            <div
              key={tag.name}
              className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 min-w-0 overflow-hidden"
            >
              <TagChip name={tag.name} color={tag.color} className="shrink-0" />
              <span className="flex-1 min-w-0 text-xs text-muted-foreground truncate">
                {tag.instructions || 'No instructions'}
              </span>
              {tag.dependsOn.length > 0 && (
                <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                  {tag.dependsOn.length} dep{tag.dependsOn.length !== 1 ? 's' : ''}
                </span>
              )}
              {tag.spawnWorkstream && (
                <GitBranch size={12} className="text-muted-foreground shrink-0" />
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setEditingTag(tag.name)}
                className="text-muted-foreground hover:text-foreground shrink-0"
                aria-label={`Edit ${tag.name}`}
              >
                <Pencil size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setDeleteTarget({ name: tag.name })}
                className="text-muted-foreground hover:text-destructive shrink-0"
                aria-label={`Delete ${tag.name}`}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* DAG visualization */}
      {hasDependencies && projectId && (
        <>
          <Separator />
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-2">
              <GitBranch size={14} />
              Dependency Graph
            </h3>
            <PipelineDAGView
              projectId={projectId}
              tags={tags}
              className="h-56 rounded-md border border-border"
            />
          </div>
        </>
      )}

      {/* Empty state */}
      {tags.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No tags yet. Create one to get started.
        </p>
      )}

      {/* Create dialog */}
      <CreateTagDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        tags={tags}
        onCreate={(input) => void handleCreate(input)}
        creating={creating}
      />

      {/* Edit dialog */}
      {editTag && (
        <EditTagDialog
          tag={editTag}
          allTags={tags}
          open={!!editingTag}
          onOpenChange={(open) => { if (!open) setEditingTag(null); }}
          onRename={(name) => handleRename(editTag.name, name)}
          onUpdateInstructions={(instructions) => handleUpdateInstructions(editTag.name, instructions)}
          onUpdateColor={(color) => handleUpdateColor(editTag.name, color)}
          onUpdateSpawnWorkstream={(v) => handleUpdateSpawnWorkstream(editTag.name, v)}
          onUpdateWorktreeMode={(v) => handleUpdateWorktreeMode(editTag.name, v)}
          onUpdateDependsOn={(dependsOn) => handleUpdateDependsOn(editTag.name, dependsOn)}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}
        title="Delete tag"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This will remove the tag definition. Already-applied snapshots on workstreams will be preserved. This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
