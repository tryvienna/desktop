import type { ComponentRenderProps } from '@json-render/react';
import { useFeedNavigate } from '../FeedNavigationContext';
import { FeedImage } from './FeedImage';
import { ArrowUpRight } from 'lucide-react';

interface LinkCardProps {
  title: string;
  description?: string;
  href: string;
  icon?: string;
  image?: string;
}

export function LinkCard({ element: { props } }: ComponentRenderProps<LinkCardProps>) {
  const navigate = useFeedNavigate();

  const content = (
    <div className="flex items-start gap-3">
      {props.image ? (
        <FeedImage src={props.image} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
      ) : props.icon ? (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-base leading-none">{props.icon}</span>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <h3 className="text-sm font-medium truncate">{props.title}</h3>
          <ArrowUpRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        </div>
        {props.description && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
            {props.description}
          </p>
        )}
      </div>
    </div>
  );

  const className = "block w-full cursor-pointer rounded-xl border border-border bg-card p-4 shadow-sm dark:bg-surface-interactive text-left transition-colors hover:bg-accent/50";

  if (navigate) {
    return (
      <button type="button" onClick={() => navigate(props.href)} className={className}>
        {content}
      </button>
    );
  }

  return (
    <a href={props.href} target="_blank" rel="noopener noreferrer" className={className}>
      {content}
    </a>
  );
}
