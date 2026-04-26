/**
 * ToolResultImages — Renders images returned in tool results (e.g. screenshots)
 */

import { memo } from 'react';

export interface ToolResultImagesProps {
  images: Array<{ url: string }>;
}

export const ToolResultImages = memo(function ToolResultImages({ images }: ToolResultImagesProps) {
  return (
    <div className="flex flex-wrap gap-2 p-3">
      {images.map((img, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-md border border-border-muted bg-surface-sunken"
        >
          <img
            src={img.url}
            alt={`Tool result image ${i + 1}`}
            className="block max-h-[300px] max-w-full object-contain"
          />
        </div>
      ))}
    </div>
  );
});
