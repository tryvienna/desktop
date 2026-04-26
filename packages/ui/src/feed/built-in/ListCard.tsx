import type { ComponentRenderProps } from '@json-render/react';
import { useFeedNavigate } from '../FeedNavigationContext';
import { FeedImage } from './FeedImage';

interface ListItem {
  text: string;
  icon?: string;
  image?: string;
  description?: string;
  href?: string;
}

interface ListCardProps {
  title?: string;
  items: ListItem[];
}

function ListItemContent({ item }: { item: ListItem }) {
  return (
    <>
      {item.image ? (
        <FeedImage src={item.image} className="h-6 w-6 shrink-0 rounded object-cover" />
      ) : item.icon ? (
        <span className="shrink-0 text-sm leading-none">{item.icon}</span>
      ) : null}
      <div className="min-w-0 flex-1">
        <span className="text-sm">{item.text}</span>
        {item.description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
        )}
      </div>
    </>
  );
}

function ListItemRow({ item }: { item: ListItem }) {
  const navigate = useFeedNavigate();

  if (item.href && navigate) {
    return (
      <li>
        <button
          onClick={() => navigate(item.href!)}
          className="-mx-2 flex w-[calc(100%+16px)] cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent/50"
        >
          <ListItemContent item={item} />
        </button>
      </li>
    );
  }

  if (item.href) {
    return (
      <li>
        <a
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className="-mx-2 flex w-[calc(100%+16px)] cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent/50"
        >
          <ListItemContent item={item} />
        </a>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 py-1.5">
      <ListItemContent item={item} />
    </li>
  );
}

export function ListCard({ element: { props } }: ComponentRenderProps<ListCardProps>) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm dark:bg-surface-interactive">
      {props.title && (
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{props.title}</h3>
      )}
      <ul className="space-y-0">
        {props.items?.map((item, i) => (
          <ListItemRow key={i} item={item} />
        ))}
      </ul>
    </div>
  );
}
