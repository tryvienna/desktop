/**
 * ImageAttachmentWidget — Compact card showing an image thumbnail with filename.
 *
 * Displayed above the user message bubble, connected via an L-shaped connector.
 * Ported from drift-v2's ImageAttachmentWidget.
 */

import { memo } from 'react';

export interface ImageAttachmentWidgetProps {
  name: string;
  mimeType: string;
  size: number;
  previewUrl: string;
}

function formatFileSize(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i];
}

export const ImageAttachmentWidget = memo(function ImageAttachmentWidget({
  name,
  size,
  previewUrl,
}: ImageAttachmentWidgetProps) {
  return (
    <div className="flex max-w-[280px] flex-col overflow-hidden rounded-lg border border-border-muted bg-surface-sunken">
      <div className="flex max-h-[200px] w-full items-center justify-center overflow-hidden bg-surface-elevated">
        <img
          src={previewUrl}
          alt={name}
          className="block h-auto max-h-[200px] w-full object-contain"
        />
      </div>
      <div className="flex items-center gap-1.5 border-t border-border-muted px-2.5 py-1.5">
        <span className="min-w-0 flex-1 truncate text-xs text-foreground-secondary" title={name}>
          {name}
        </span>
        {size > 0 && (
          <span className="flex-shrink-0 text-xs text-muted-foreground">
            {formatFileSize(size)}
          </span>
        )}
      </div>
    </div>
  );
});
