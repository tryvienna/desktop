/**
 * GroupSection — Group assignment combobox for the workstream settings drawer.
 *
 * @ai-context
 * - Shows a Combobox to move a workstream to/from a group
 * - "None" option removes the workstream from any group
 * - Calls onGroupChange with groupId or null
 * - data-slot="group-section"
 */

import { useCallback, useMemo } from 'react';

import { ContentSection, Combobox } from '@tryvienna/ui';
import type { ComboboxOption } from '@tryvienna/ui';
import type { WorkstreamGroup } from '../../../renderer/hooks/useWorkstreamsNavSections';

const NO_GROUP_VALUE = '__none__';

export interface GroupSectionProps {
  currentGroupId: string | null;
  groups: WorkstreamGroup[];
  onGroupChange: (groupId: string | null) => void;
}

export function GroupSection({ currentGroupId, groups, onGroupChange }: GroupSectionProps) {
  const options = useMemo<ComboboxOption[]>(
    () => [
      { value: NO_GROUP_VALUE, label: 'None' },
      ...groups.map((g) => ({ value: g.id, label: g.name })),
    ],
    [groups],
  );

  const handleChange = useCallback(
    (value: string) => {
      const groupId = value === NO_GROUP_VALUE ? null : value;
      if (groupId !== currentGroupId) {
        onGroupChange(groupId);
      }
    },
    [currentGroupId, onGroupChange],
  );

  return (
    <ContentSection title="Scope" data-slot="group-section">
      <Combobox
        options={options}
        value={currentGroupId ?? NO_GROUP_VALUE}
        onValueChange={handleChange}
        placeholder="Select a scope..."
        searchPlaceholder="Search scopes..."
        emptyText="No scopes found."
      />
    </ContentSection>
  );
}
