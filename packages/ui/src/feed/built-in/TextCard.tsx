import type { ComponentRenderProps } from '@json-render/react';
import { FeedImage, isAllowedImageUrl } from './FeedImage';

interface TextCardProps {
  title?: string;
  content: string;
  image?: string;
}

export function TextCard({ element: { props } }: ComponentRenderProps<TextCardProps>) {
  const hasImage = props.image && isAllowedImageUrl(props.image);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm dark:bg-surface-interactive">
      {hasImage && (
        <FeedImage src={props.image!} className="w-full max-h-48 object-cover" />
      )}
      <div className="p-4">
        {props.title && (
          <h3 className="mb-2 text-sm font-medium">{props.title}</h3>
        )}
        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{props.content}</p>
      </div>
    </div>
  );
}
