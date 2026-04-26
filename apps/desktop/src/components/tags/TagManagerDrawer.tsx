/**
 * TagManagerDrawer — Full drawer for managing tags with in-drawer navigation.
 *
 * @ai-context
 * - Opened via openFull(tagManagerContent(projectId, 'list' | 'create'))
 * - Uses StandaloneDrawerNavigationProvider for push/pop navigation
 * - Three views: list (manage all), create (new tag form), edit (existing tag form)
 * - List view: tag rows with edit/delete, "Create Tag" button
 * - Create/Edit views: TagEditor form with explicit Save button
 * - data-slot="tag-manager-drawer"
 */

import { useState, useCallback, useMemo } from 'react';
import { Plus, Pencil, Trash2, GitBranch } from 'lucide-react';
import { DrawerContainer } from '../../lib/drawer/DrawerContainer';
import { useDrawerNavigationOptional } from '../../lib/drawer';
import {
  useQuery,
  useMutation,
  GET_TAGS_BY_PROJECT,
  CREATE_TAG,
  UPDATE_TAG,
  DELETE_TAG,
} from '@vienna/graphql/client';
import { Button, ConfirmDialog } from '@tryvienna/ui';
import { TagChip } from './TagChip';
import { TagEditor, DEFAULT_COLORS } from './TagEditor';
import type { TagData } from './TagEditor';
import {
  isTagEditorDrawerContent,
  getTagEditorDrawerPayload,
  tagEditorDrawerContent,
  isTagCreatorDrawerContent,
  tagCreatorDrawerContent,
} from '../drawer/content';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function parseTags(data: unknown): TagData[] {
  const raw = (data as { tagsByProject?: unknown[] })?.tagsByProject ?? [];
  return (raw as Array<Record<string, unknown>>).map((l) => ({
    name: String(l.name ?? ''),
    instructions: String(l.instructions ?? ''),
    color: String(l.color ?? '#3B82F6'),
    maxDepth: (l.maxDepth as number) ?? 3,
    spawnWorkstream: (l.spawnWorkstream as boolean) ?? false,
    worktreeMode: (l.worktreeMode as 'same' | 'fork' | 'from_main') ?? 'same',
    dependsOn: (l.dependsOn as string[]) ?? [],
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Create View
// ─────────────────────────────────────────────────────────────────────────────

function TagCreateView({ projectId }: { projectId: string }) {
  const navigation = useDrawerNavigationOptional();
  const { data, refetch } = useQuery(GET_TAGS_BY_PROJECT, {
    variables: { projectId },
  });
  const [createTag] = useMutation(CREATE_TAG);

  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [color, setColor] = useState(DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)]);
  const [dependsOn, setDependsOn] = useState<string[]>([]);
  const [spawnWorkstream, setSpawnWorkstream] = useState(false);
  const [worktreeMode, setWorktreeMode] = useState<'same' | 'fork' | 'from_main'>('same');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tags = useMemo(() => parseTags(data), [data]);

  const depTags = useMemo(
    () =>
      dependsOn
        .map((depName) => allTags.find((l) => l.name === depName))
        .filter(Boolean)
        .map((l) => ({ name: l!.name, color: l!.color })),
    [dependsOn, tags],
  );

  const depOptions = useMemo(
    () => tags.filter((l) => !dependsOn.includes(l.name)).map((l) => ({ value: l.name, label: l.name })),
    [tags, dependsOn],
  );

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    const trimmedInstructions = instructions.trim();
    if (!trimmedName || !trimmedInstructions) return;
    setSaving(true);
    setError(null);
    try {
      await createTag({
        variables: {
          input: {
            projectId,
            name: trimmedName,
            instructions: trimmedInstructions,
            color,
            spawnWorkstream,
            worktreeMode,
            dependsOn,
          },
        },
      });
      await refetch();
      navigation?.pop();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tag');
    } finally {
      setSaving(false);
    }
  }, [name, instructions, color, spawnWorkstream, worktreeMode, dependsOn, projectId, createTag, refetch, navigation]);

  return (
    <DrawerContainer
      title="Create Tag"
      hideRefresh
      footer={
        <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
          <Button size="sm" onClick={handleSave} disabled={!name.trim() || !instructions.trim() || saving}>
            {saving ? 'Creating...' : 'Create'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigation?.pop()}>
            Cancel
          </Button>
        </div>
      }
    >
      <div className="px-4 py-3">
        {error && (
          <div className="mb-3 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
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
      </div>
    </DrawerContainer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit View
// ─────────────────────────────────────────────────────────────────────────────

function TagEditView({ projectId, tagName }: { projectId: string; tagName: string }) {
  const { data, loading } = useQuery(GET_TAGS_BY_PROJECT, { variables: { projectId } });
  const tags = useMemo(() => parseTags(data), [data]);
  const tag = useMemo(() => tags.find((t) => t.name === tagName), [tags, tagName]);

  if (loading || !data) {
    return (
      <DrawerContainer title={tagName} hideRefresh>
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
          Loading...
        </div>
      </DrawerContainer>
    );
  }

  if (!tag) {
    return (
      <DrawerContainer title={tagName} hideRefresh>
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
          Tag not found
        </div>
      </DrawerContainer>
    );
  }

  return <TagEditForm projectId={projectId} tagName={tagName} tag={tag} allTags={tags} />;
}

function TagEditForm({ projectId, tagName, tag, allTags }: { projectId: string; tagName: string; tag: TagData; allTags: TagData[] }) {
  const navigation = useDrawerNavigationOptional();
  const { refetch } = useQuery(GET_TAGS_BY_PROJECT, { variables: { projectId } });
  const [updateTag] = useMutation(UPDATE_TAG);
  const [deleteTagMut] = useMutation(DELETE_TAG);

  // Local form state initialized from tag (guaranteed to be defined)
  const [localName, setLocalName] = useState(tag.name);
  const [localInstructions, setLocalInstructions] = useState(tag.instructions);
  const [localColor, setLocalColor] = useState(tag.color);
  const [localSpawnWorkstream, setLocalSpawnWorkstream] = useState(tag.spawnWorkstream);
  const [localWorktreeMode, setLocalWorktreeMode] = useState<'same' | 'fork' | 'from_main'>(tag.worktreeMode);
  const [localDependsOn, setLocalDependsOn] = useState<string[]>(tag.dependsOn);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState(false);

  const dependencies = useMemo(
    () =>
      localDependsOn
        .map((depName) => allTags.find((l) => l.name === depName))
        .filter(Boolean)
        .map((l) => ({ name: l!.name, color: l!.color })),
    [localDependsOn, tags],
  );

  const dependents = useMemo(
    () =>
      allTags
        .filter((l) => l.dependsOn.includes(tagName))
        .map((l) => ({ name: l.name, color: l.color })),
    [allTags, tagName],
  );

  const existingDepNames = useMemo(() => new Set(localDependsOn), [localDependsOn]);
  const dependentNames = useMemo(() => new Set(dependents.map((d) => d.name)), [dependents]);

  const depOptions = useMemo(
    () =>
      allTags
        .filter((l) => l.name !== tagName && !existingDepNames.has(l.name) && !dependentNames.has(l.name))
        .map((l) => ({ value: l.name, label: l.name })),
    [allTags, tagName, existingDepNames, dependentNames],
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const input: Record<string, unknown> = {};
      if (localName.trim() !== tagName) input.name = localName.trim();
      if (localInstructions.trim() !== tag.instructions) input.instructions = localInstructions.trim();
      if (localColor !== tag.color) input.color = localColor;
      if (localSpawnWorkstream !== tag.spawnWorkstream) input.spawnWorkstream = localSpawnWorkstream;
      if (localWorktreeMode !== tag.worktreeMode) input.worktreeMode = localWorktreeMode;
      if (JSON.stringify(localDependsOn) !== JSON.stringify(tag.dependsOn)) input.dependsOn = localDependsOn;

      if (Object.keys(input).length > 0) {
        await updateTag({ variables: { projectId, tagName, input } });
        await refetch();
      }
      navigation?.pop();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tag');
    } finally {
      setSaving(false);
    }
  }, [localName, localInstructions, localColor, localSpawnWorkstream, localWorktreeMode, localDependsOn, tagName, tag, projectId, updateTag, refetch, navigation]);

  const handleDelete = useCallback(async () => {
    try {
      await deleteTagMut({ variables: { projectId, tagName } });
      await refetch();
      navigation?.pop();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tag');
    } finally {
      setDeleteTarget(false);
    }
  }, [projectId, tagName, deleteTagMut, refetch, navigation]);

  return (
    <DrawerContainer
      title={
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: localColor }} />
          {tagName}
        </span>
      }
      hideRefresh
      footer={
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigation?.pop()}>
              Cancel
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteTarget(true)}
          >
            <Trash2 size={14} className="mr-1" />
            Delete
          </Button>
        </div>
      }
    >
      <div className="px-4 py-3">
        {error && (
          <div className="mb-3 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        <TagEditor
          name={localName}
          onNameChange={setLocalName}
          instructions={localInstructions}
          onInstructionsChange={setLocalInstructions}
          color={localColor}
          onColorChange={setLocalColor}
          spawnWorkstream={localSpawnWorkstream}
          onSpawnWorkstreamChange={setLocalSpawnWorkstream}
          worktreeMode={localWorktreeMode}
          onWorktreeModeChange={setLocalWorktreeMode}
          dependencies={dependencies}
          dependents={dependents}
          onAddDependency={(depName) => setLocalDependsOn((prev) => [...prev, depName])}
          onRemoveDependency={(depName) => setLocalDependsOn((prev) => prev.filter((d) => d !== depName))}
          depOptions={depOptions}
        />
      </div>

      <ConfirmDialog
        open={deleteTarget}
        onOpenChange={(open: boolean) => !open && setDeleteTarget(false)}
        title="Delete tag"
        description={`Are you sure you want to delete "${tagName}"? This will remove the tag definition. Already-applied snapshots on workstreams will be preserved.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </DrawerContainer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// List View
// ─────────────────────────────────────────────────────────────────────────────

function TagListView({ projectId }: { projectId: string }) {
  const navigation = useDrawerNavigationOptional();
  const { data } = useQuery(GET_TAGS_BY_PROJECT, { variables: { projectId } });
  const tags = useMemo(() => parseTags(data), [data]);

  const handleEditTag = useCallback(
    (tagName: string) => {
      navigation?.push(tagEditorDrawerContent(projectId, tagName), tagName);
    },
    [navigation, projectId],
  );

  const handleCreateTag = useCallback(() => {
    navigation?.push(tagCreatorDrawerContent(projectId), 'Create Tag');
  }, [navigation, projectId]);

  return (
    <DrawerContainer
      title="Tags"
      hideRefresh
      contentClassName="overflow-hidden flex flex-col"
    >
      <div className="px-4 py-3 shrink-0">
        <Button variant="outline" size="sm" onClick={handleCreateTag}>
          <Plus size={14} className="mr-1" />
          Create Tag
        </Button>
      </div>

      {tags.length > 0 ? (
        <div className="flex-1 overflow-y-auto px-4 pb-3">
          <div className="grid gap-2">
            {tags.map((tag) => (
              <button
                key={tag.name}
                type="button"
                onClick={() => handleEditTag(tag.name)}
                className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 min-w-0 overflow-hidden text-left bg-transparent cursor-pointer hover:bg-surface-hover transition-colors duration-100"
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
                <Pencil size={14} className="text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No tags yet. Create one to get started.</p>
        </div>
      )}
    </DrawerContainer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Drawer (router)
// ─────────────────────────────────────────────────────────────────────────────

export interface TagManagerDrawerProps {
  projectId: string;
}

export function TagManagerDrawer({ projectId }: TagManagerDrawerProps) {
  const navigation = useDrawerNavigationOptional();
  const currentContent = navigation?.current?.content;

  // Route based on navigation stack content
  if (currentContent && isTagEditorDrawerContent(currentContent)) {
    const payload = getTagEditorDrawerPayload(currentContent);
    return <TagEditView projectId={projectId} tagName={payload?.tagName ?? ''} />;
  }

  if (currentContent && isTagCreatorDrawerContent(currentContent)) {
    return <TagCreateView projectId={projectId} />;
  }

  // Default: list view
  return <TagListView projectId={projectId} />;
}
