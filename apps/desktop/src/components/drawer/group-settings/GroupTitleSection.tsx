/**
 * GroupTitleSection — Group name display with inline editing and emoji picker.
 *
 * @ai-context
 * - Shows InlineEdit for the group name
 * - Shows GroupEmojiPicker for optional emoji icon
 * - Calls onNameSave with trimmed value when changed
 * - Calls onEmojiSave when emoji is selected or removed
 * - data-slot="group-title-section"
 */

import { useCallback } from 'react';
import { InlineEdit } from '@tryvienna/ui';
import type { WorkstreamGroup } from '../../../renderer/hooks/useWorkstreamsNavSections';
import { GroupEmojiPicker } from './GroupEmojiPicker';

export interface GroupTitleSectionProps {
  group: WorkstreamGroup;
  onNameSave: (name: string) => Promise<void>;
  onEmojiSave: (emoji: string | null) => Promise<void>;
}

export function GroupTitleSection({ group, onNameSave, onEmojiSave }: GroupTitleSectionProps) {
  const handleSave = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed && trimmed !== group.name) {
        onNameSave(trimmed);
      }
    },
    [group.name, onNameSave],
  );

  return (
    <div data-slot="group-title-section" className="space-y-3">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Scope Name
      </div>
      <InlineEdit
        value={group.name}
        onSave={handleSave}
        placeholder="Untitled scope"
      />
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Icon
      </div>
      <GroupEmojiPicker value={group.emoji} onSelect={onEmojiSave} />
    </div>
  );
}
