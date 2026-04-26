/**
 * ImageAttachmentRenderer — Renders image attachments with preview thumbnail
 *
 * @ai-context
 * - Shows filename header, file size, expandable image preview
 * - Click toggles between compact (200px) and expanded (800px) preview
 * - data-slot="image-attachment-renderer"
 *
 * @example
 * <ImageAttachmentRenderer content={{ type: 'image_attachment', name: 'photo.png', size: 1024, previewUrl: '...' }} messageId="m1" isStreaming={false} />
 */

import { memo, useState, useCallback } from 'react';

import type { ImageAttachmentBlock } from '../types/messages';
import type { RendererProps, RendererDefinition } from './registry';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const ImageAttachmentRenderer = memo(function ImageAttachmentRenderer({
  content,
}: RendererProps<ImageAttachmentBlock>) {
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(false);

  const handleError = useCallback(() => setError(true), []);
  const toggleExpand = useCallback(() => setExpanded((p) => !p), []);

  return (
    <div
      data-slot="image-attachment-renderer"
      data-renderer="image-attachment"
      className="rounded-lg border border-border-muted overflow-hidden max-w-[400px]"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-sunken">
        <svg
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          className="flex-shrink-0 text-muted-foreground"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth={1.5} />
          <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
          <path
            d="M21 15l-5-5L5 21"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-[10px] font-mono text-muted-foreground truncate">{content.name}</span>
        <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0">
          {formatFileSize(content.size)}
        </span>
      </div>
      {/* Preview */}
      {error ? (
        <div className="px-3 py-6 text-center text-xs text-muted-foreground">
          Failed to load image
        </div>
      ) : (
        <button onClick={toggleExpand} className="w-full cursor-pointer bg-surface-sunken">
          <img
            src={content.previewUrl}
            alt={content.name}
            onError={handleError}
            className={`w-full object-contain transition-[max-height] duration-200 ${
              expanded ? 'max-h-[800px]' : 'max-h-[200px]'
            }`}
          />
        </button>
      )}
    </div>
  );
});

export const imageAttachmentRendererDefinition: RendererDefinition<ImageAttachmentBlock> = {
  id: 'image_attachment',
  match: (content): content is ImageAttachmentBlock => content.type === 'image_attachment',
  component: ImageAttachmentRenderer,
  priority: 5,
};
