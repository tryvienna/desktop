/**
 * AttachmentPreview — File attachment preview card with icon and remove button
 *
 * @ai-context
 * - Displays file name, size, type-specific icon, and optional thumbnail
 * - Size variants: 'sm' (compact) and 'md' (default)
 * - Removable by default with X button
 * - Type-specific icons: Image, PDF, Code, Video, Audio, Archive, generic File
 * - Image thumbnails from attachment.previewUrl
 * - data-slot="attachment-preview"
 *
 * @example
 * <AttachmentPreview attachment={file} onRemove={handleRemove} size="sm" />
 */

import React, { memo } from 'react';

import { X, File, Image, FileText, Code, Video, Music, Archive } from 'lucide-react';
import { cn } from '@tryvienna/ui';
import type { Attachment } from '../../../types/input';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AttachmentPreviewProps {
  /** Attachment to preview */
  attachment: Attachment;
  /** Whether attachment is removable */
  removable?: boolean;
  /** Remove callback */
  onRemove?: (attachment: Attachment) => void;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional className */
  className?: string;
}

// ---------------------------------------------------------------------------
// File Type Icons
// ---------------------------------------------------------------------------

function FileTypeIcon({ mimeType, size = 16 }: { mimeType: string; size?: number }) {
  if (mimeType.startsWith('image/')) return <Image size={size} />;
  if (mimeType === 'application/pdf') return <FileText size={size} />;
  if (
    mimeType.includes('javascript') ||
    mimeType.includes('typescript') ||
    mimeType.includes('json')
  )
    return <Code size={size} />;
  if (mimeType.startsWith('video/')) return <Video size={size} />;
  if (mimeType.startsWith('audio/')) return <Music size={size} />;
  if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('gzip'))
    return <Archive size={size} />;
  return <File size={size} />;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/** Format bytes to human-readable size. */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i];
}

/** Get file type label from MIME type. */
function getFileTypeLabel(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'Image';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.includes('javascript')) return 'JavaScript';
  if (mimeType.includes('typescript')) return 'TypeScript';
  if (mimeType.startsWith('video/')) return 'Video';
  if (mimeType.startsWith('audio/')) return 'Audio';
  if (mimeType.includes('zip') || mimeType.includes('tar')) return 'Archive';
  return 'File';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const AttachmentPreview = memo(function AttachmentPreview({
  attachment,
  removable = true,
  onRemove,
  size = 'md',
  className,
}: AttachmentPreviewProps) {
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.(attachment);
  };

  const isImage = attachment.mimeType.startsWith('image/');
  const hasPreview = isImage && attachment.previewUrl;
  const isSm = size === 'sm';

  return (
    <div
      data-slot="attachment-preview"
      className={cn(
        'flex items-center rounded-lg border border-border-default bg-surface-page',
        'transition-[border-color,background-color] duration-150 ease-out',
        'hover:border-border-interactive',
        isSm ? 'gap-2 p-2' : 'gap-3 p-3',
        className
      )}
    >
      {/* Preview / Icon */}
      <div
        className={cn(
          'flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-hover',
          isSm ? 'h-8 w-8' : 'h-10 w-10'
        )}
      >
        {hasPreview ? (
          <img
            src={attachment.previewUrl}
            alt={attachment.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-foreground-secondary">
            <FileTypeIcon mimeType={attachment.mimeType} size={isSm ? 16 : 20} />
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div
          className={cn('truncate font-medium text-foreground', isSm ? 'text-xs' : 'text-sm')}
          title={attachment.name}
        >
          {attachment.name}
        </div>
        <div className={cn('text-muted-foreground', isSm ? 'text-[10px]' : 'text-xs')}>
          {getFileTypeLabel(attachment.mimeType)} &middot; {formatBytes(attachment.size)}
        </div>
      </div>

      {/* Remove Button */}
      {removable && (
        <button
          type="button"
          onClick={handleRemove}
          className={cn(
            'flex shrink-0 items-center justify-center rounded-md border-none bg-transparent',
            'text-muted-foreground transition-[background-color,color] duration-150 ease-out',
            'hover:bg-surface-hover hover:text-foreground-secondary',
            'cursor-pointer',
            isSm ? 'h-6 w-6' : 'h-7 w-7'
          )}
          aria-label="Remove attachment"
          title="Remove attachment"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
});
