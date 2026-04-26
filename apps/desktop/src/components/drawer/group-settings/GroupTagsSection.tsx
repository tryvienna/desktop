/**
 * GroupTagsSection — Shows tags applied across workstreams in a group.
 *
 * @ai-context
 * - Queries project tags for the picker
 * - Shows unique tags applied to any workstream in the group
 * - Allows applying a tag to all workstreams in the group
 * - Wrapped in ContentSection with "Tags" title
 * - data-slot="group-tags-section"
 */

import { useState, useCallback, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { ContentSection, Button, Combobox } from '@tryvienna/ui';
import {
  useQuery,
  useMutation,
  GET_TAGS_BY_PROJECT,
  GET_WORKSTREAMS_BY_PROJECT,
  APPLY_TAG_TO_WORKSTREAM,
  GET_WORKSTREAM_TAGS,
} from '@vienna/graphql/client';
import { TagChip } from '../../tags/TagChip';

export interface GroupTagsSectionProps {
  groupId: string;
  projectId: string;
}

export function GroupTagsSection({ groupId, projectId }: GroupTagsSectionProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: projectTagData } = useQuery(GET_TAGS_BY_PROJECT, {
    variables: { projectId },
  });

  const { data: workstreamsData } = useQuery(GET_WORKSTREAMS_BY_PROJECT, {
    variables: { projectId },
  });

  const [applyTag] = useMutation(APPLY_TAG_TO_WORKSTREAM);

  const projectTags = projectTagData?.tagsByProject ?? [];
  const groupWorkstreams = useMemo(
    () =>
      (workstreamsData?.workstreamsByProject ?? []).filter(
        (ws) => ws.groupId === groupId,
      ),
    [workstreamsData, groupId],
  );

  // Query tags for the first workstream in the group as a representative sample
  const firstWsId = groupWorkstreams[0]?.id as string | undefined;
  const { data: firstWsTags, refetch: refetchTags } = useQuery(GET_WORKSTREAM_TAGS, {
    variables: { workstreamId: firstWsId ?? '' },
    skip: !firstWsId,
  });

  const appliedTags = firstWsTags?.workstreamTags ?? [];

  const pickerOptions = useMemo(
    () => projectTags.map((l) => ({ value: String(l.name ?? ''), label: String(l.name ?? '') })),
    [projectTags],
  );

  const handleApplyToGroup = useCallback(
    async (tagName: string) => {
      setError(null);
      const results = await Promise.allSettled(
        groupWorkstreams.map((ws) =>
          applyTag({ variables: { workstreamId: String(ws.id), tagName } }),
        ),
      );
      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        setError(`Applied to ${results.length - failures.length}/${results.length} workstreams. ${failures.length} failed.`);
      }
      setShowPicker(false);
      refetchTags();
    },
    [groupWorkstreams, applyTag, refetchTags],
  );

  return (
    <ContentSection
      title="Tags"

      titleAction={
        projectTags.length > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1"
            onClick={() => setShowPicker(!showPicker)}
            aria-label="Apply tag to scope"
          >
            <Plus size={14} />
          </Button>
        ) : undefined
      }
      data-slot="group-tags-section"
    >
      <div className="space-y-2">
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
        {appliedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {appliedTags.map((wsl) => (
              <TagChip
                key={wsl.id}
                name={String(wsl.tagName)}
                color={String(wsl.tagColor ?? '#3B82F6')}
              />
            ))}
          </div>
        )}

        {showPicker && (
          <Combobox
            options={pickerOptions}
            value=""
            onValueChange={(val: string) => {
              if (val) void handleApplyToGroup(val);
            }}
            placeholder="Apply tag to scope..."
            searchPlaceholder="Search tags..."
            emptyText="No tags available."
          />
        )}

        {appliedTags.length === 0 && !showPicker && groupWorkstreams.length > 0 && (
          <p className="text-xs text-muted-foreground">No tags applied</p>
        )}

        {groupWorkstreams.length === 0 && (
          <p className="text-xs text-muted-foreground">No workstreams in this scope</p>
        )}
      </div>
    </ContentSection>
  );
}
