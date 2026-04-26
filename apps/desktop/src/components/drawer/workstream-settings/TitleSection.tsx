/**
 * TitleSection — Workstream title display with inline editing and status badge.
 *
 * @ai-context
 * - Shows StatusBadge + InlineEdit for the workstream title
 * - Calls updateWorkstreamTitle from WorkstreamContext on save
 * - data-slot="title-section"
 */

import { useCallback } from 'react';
import { StatusBadge, InlineEdit } from '@tryvienna/ui';
import type { Workstream } from '../../../renderer/contexts/WorkstreamContext';
import { formatStatusLabel } from './helpers';

export interface TitleSectionProps {
  workstream: Workstream;
  onTitleSave: (title: string) => Promise<void>;
}

export function TitleSection({ workstream, onTitleSave }: TitleSectionProps) {
  const handleSave = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed && trimmed !== workstream.title) {
        onTitleSave(trimmed);
      }
    },
    [workstream.title, onTitleSave]
  );

  return (
    <div data-slot="title-section" className="space-y-3">
      <div className="flex items-center gap-2">
        <StatusBadge
          status={workstream.status}
          label={formatStatusLabel(workstream.status)}
          size="sm"
        />
      </div>
      <InlineEdit
        value={workstream.title}
        onSave={handleSave}
        placeholder="Untitled workstream"
      />
    </div>
  );
}
