/**
 * TextRenderer — Renders plain TextBlock content with whitespace preservation
 *
 * @ai-context
 * - Catch-all fallback renderer at priority 0
 * - Plain text with whitespace preservation (markdown handled in message.tsx)
 * - data-slot="text-renderer"
 *
 * @example
 * <TextRenderer content={{ type: 'text', text: 'Hello world' }} messageId="m1" isStreaming={false} />
 */

import { memo } from 'react';

import type { TextBlock } from '../types/messages';
import type { RendererProps, RendererDefinition } from './registry';

export const TextRenderer = memo(function TextRenderer({
  content,
  isStreaming,
}: RendererProps<TextBlock>) {
  return (
    <div data-slot="text-renderer" data-renderer="text" data-streaming={isStreaming}>
      <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{content.text}</span>
    </div>
  );
});

export const textRendererDefinition: RendererDefinition<TextBlock> = {
  id: 'text',
  match: (content): content is TextBlock => content.type === 'text',
  component: TextRenderer,
  priority: 0,
};
