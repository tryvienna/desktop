/**
 * TagsSection — Shows tags applied to a workstream with ability to add/remove.
 *
 * @ai-context
 * - Fetches workstream tags via GET_WORKSTREAM_TAGS (snapshot fields)
 * - Fetches project tags via GET_TAGS_BY_PROJECT for the picker
 * - Uses TagChip for display, Combobox for selection
 * - Wrapped in ContentSection with "Tags" title
 * - data-slot="tags-section"
 */

import { useState, useCallback, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { ContentSection, Button, Combobox } from '@tryvienna/ui';
import {
  useQuery,
  useMutation,
  GET_WORKSTREAM_TAGS,
  GET_TAGS_BY_PROJECT,
  APPLY_TAG_TO_WORKSTREAM,
  REMOVE_TAG_FROM_WORKSTREAM,
} from '@vienna/graphql/client';
import { useWorkstreamActions } from '../../../renderer/contexts/WorkstreamContext';
import { TagChip } from '../../tags/TagChip';
import type { TagStatus } from '../../tags/TagChip';
import { PipelineDAGView } from '../../tags/PipelineDAGView';

export interface TagsSectionProps {
  workstreamId: string;
  projectId: string;
}

export function TagsSection({ workstreamId, projectId }: TagsSectionProps) {
  const { setActiveWorkstream } = useWorkstreamActions();
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: wsTagData, refetch: refetchWsTags } = useQuery(GET_WORKSTREAM_TAGS, {
    variables: { workstreamId },
  });

  const { data: projectTagData } = useQuery(GET_TAGS_BY_PROJECT, {
    variables: { projectId },
  });

  const [applyTag] = useMutation(APPLY_TAG_TO_WORKSTREAM);
  const [removeTag] = useMutation(REMOVE_TAG_FROM_WORKSTREAM);

  const workstreamTags = wsTagData?.workstreamTags ?? [];
  const projectTags = projectTagData?.tagsByProject ?? [];

  const appliedTagNames = useMemo(
    () => new Set(workstreamTags.map((wsl) => wsl.tagName)),
    [workstreamTags],
  );

  const availableTags = useMemo(
    () => projectTags.filter((l) => !appliedTagNames.has(l.name)),
    [projectTags, appliedTagNames],
  );

  const hasDependencies = useMemo(
    () => workstreamTags.length >= 2 &&
      workstreamTags.some((wsl) => (wsl.tagDependsOn as string[] | null)?.length),
    [workstreamTags],
  );

  const handleApply = useCallback(
    async (tagName: string) => {
      try {
        setError(null);
        await applyTag({ variables: { workstreamId, tagName } });
        setShowPicker(false);
        refetchWsTags();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to apply tag');
      }
    },
    [workstreamId, applyTag, refetchWsTags],
  );

  const handleRemove = useCallback(
    async (tagName: string) => {
      try {
        setError(null);
        await removeTag({ variables: { workstreamId, tagName } });
        refetchWsTags();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove tag');
      }
    },
    [workstreamId, removeTag, refetchWsTags],
  );

  const handleDelegatedClick = useCallback(
    (delegatedWsId: string) => {
      setActiveWorkstream(delegatedWsId);
    },
    [setActiveWorkstream],
  );

  const pickerOptions = useMemo(
    () => availableTags.map((l) => ({ value: String(l.name ?? ''), label: String(l.name ?? '') })),
    [availableTags],
  );

  return (
    <ContentSection
      title="Tags"

      titleAction={
        availableTags.length > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1"
            onClick={() => setShowPicker(!showPicker)}
            aria-label="Add tag"
          >
            <Plus size={14} />
          </Button>
        ) : undefined
      }
      data-slot="tags-section"
    >
      <div className="space-y-2">
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
        {workstreamTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {workstreamTags.map((wsl) => (
              <TagChip
                key={wsl.id}
                name={String(wsl.tagName)}
                color={String(wsl.tagColor ?? '#3B82F6')}
                status={wsl.status as TagStatus}
                onRemove={() => void handleRemove(String(wsl.tagName))}
              />
            ))}
          </div>
        )}

        {showPicker && (
          <Combobox
            options={pickerOptions}
            value=""
            onValueChange={(val: string) => {
              if (val) void handleApply(val);
            }}
            placeholder="Add a tag..."
            searchPlaceholder="Search tags..."
            emptyText="No tags available."
          />
        )}

        {hasDependencies && (
          <PipelineDAGView
            projectId={projectId}
            workstreamId={workstreamId}
            className="h-48 rounded-md border border-border"
            onDelegatedClick={handleDelegatedClick}
          />
        )}

        {workstreamTags.length === 0 && !showPicker && (
          <p className="text-xs text-muted-foreground">No tags applied</p>
        )}
      </div>
    </ContentSection>
  );
}
