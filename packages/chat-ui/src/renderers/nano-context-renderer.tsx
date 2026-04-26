/**
 * NanoContextRenderer — Renders NanoContextBlock content in message history
 *
 * @ai-context
 * - Thin wrapper delegating to NanoContextWidget
 * - Registered at priority 5 in the renderer registry
 * - data-slot="nano-context-renderer"
 *
 * @example
 * <NanoContextRenderer content={{ type: 'nanocontext', contextType: 'drawer_selection', ... }} messageId="m1" isStreaming={false} />
 */

import { memo } from 'react';

import type { RendererDefinition, RendererProps } from './registry';
import type { NanoContextBlock } from '../types/messages';
import { NanoContextWidget } from '../nano-context/nano-context-widget';

export const NanoContextRenderer = memo(function NanoContextRenderer({
  content,
}: RendererProps<NanoContextBlock>) {
  return (
    <div data-slot="nano-context-renderer">
      <NanoContextWidget
        contextType={content.contextType}
        title={content.title}
        subtitle={content.subtitle}
        content={content.content}
        metadata={content.metadata}
      />
    </div>
  );
});

export const nanoContextRendererDefinition: RendererDefinition<NanoContextBlock> = {
  id: 'nanocontext',
  match: (content): content is NanoContextBlock => content.type === 'nanocontext',
  component: NanoContextRenderer,
  priority: 5,
};
