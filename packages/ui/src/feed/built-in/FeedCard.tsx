import type { ComponentRenderProps } from '@json-render/react';

interface FeedCardProps {
  title?: string;
  subtitle?: string;
  icon?: string;
}

export function FeedCard({ element, children }: ComponentRenderProps<FeedCardProps>) {
  const props = element.props;
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm dark:bg-surface-interactive">
      {(props.title || props.icon) && (
        <div className="mb-3 flex items-center gap-2">
          {props.icon && <span className="text-base leading-none">{props.icon}</span>}
          <div>
            {props.title && (
              <h3 className="text-sm font-medium">{props.title}</h3>
            )}
            {props.subtitle && (
              <p className="mt-0.5 text-xs text-muted-foreground">{props.subtitle}</p>
            )}
          </div>
        </div>
      )}
      {children && <div className="text-sm">{children}</div>}
    </div>
  );
}
