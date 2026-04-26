import type { ComponentRenderProps } from '@json-render/react';
import { DetachableCard } from '../detachable/DetachableCard';
import { YouTubeEmbed } from './YouTubeEmbed';

interface YouTubeCardProps {
  /** YouTube video URL or video ID */
  url: string;
  title?: string;
}

/** Extract a YouTube video ID from a URL or return the string as-is if it's already an ID. */
function extractVideoId(urlOrId: string): string | null {
  if (/^[\w-]{11}$/.test(urlOrId)) return urlOrId;

  try {
    const parsed = new URL(urlOrId);
    if (parsed.searchParams.has('v')) return parsed.searchParams.get('v');
    if (parsed.hostname === 'youtu.be') return parsed.pathname.slice(1);
    const embedMatch = parsed.pathname.match(/\/embed\/([\w-]+)/);
    if (embedMatch) return embedMatch[1];
  } catch {
    // Not a valid URL
  }

  return null;
}

export function YouTubeCard({ element: { props } }: ComponentRenderProps<YouTubeCardProps>) {
  const videoId = extractVideoId(props.url);

  if (!videoId) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm dark:bg-surface-interactive">
        <p className="text-sm text-muted-foreground">Invalid YouTube URL</p>
      </div>
    );
  }

  const cardId = `youtube-${videoId}`;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm dark:bg-surface-interactive">
      {props.title && (
        <div className="px-4 py-3">
          <h3 className="text-sm font-medium">{props.title}</h3>
        </div>
      )}
      <DetachableCard
        id={cardId}
        title={props.title ?? 'YouTube'}
        floatingSize={{ width: 320, height: 180 }}
      >
        <YouTubeEmbed videoId={videoId} cardId={cardId} title={props.title} />
      </DetachableCard>
    </div>
  );
}
