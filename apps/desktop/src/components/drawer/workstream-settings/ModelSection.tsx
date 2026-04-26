/**
 * ModelSection — Model selector for the workstream.
 *
 * @ai-context
 * - Wraps @tryvienna/ui ModelSelector in a ContentSection
 * - Calls switchWorkstreamModel from WorkstreamContext on change
 * - data-slot="model-section"
 */

import { useCallback } from 'react';

import { ContentSection } from '@tryvienna/ui';
import { ModelSelector, DEFAULT_MODEL } from '../../domain';
import type { Workstream } from '../../../renderer/contexts/WorkstreamContext';

export interface ModelSectionProps {
  workstream: Workstream;
  onModelChange: (model: string) => Promise<void>;
}

export function ModelSection({ workstream, onModelChange }: ModelSectionProps) {
  const handleChange = useCallback(
    (modelId: string) => {
      if (modelId !== workstream.model) {
        onModelChange(modelId);
      }
    },
    [workstream.model, onModelChange]
  );

  return (
    <ContentSection title="Model" data-slot="model-section">
      <ModelSelector
        value={workstream.model ?? DEFAULT_MODEL}
        onChange={handleChange}
      />
    </ContentSection>
  );
}
