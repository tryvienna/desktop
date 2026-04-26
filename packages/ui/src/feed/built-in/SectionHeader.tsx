import type { ComponentRenderProps } from '@json-render/react';

interface SectionHeaderProps {
  title: string;
  description?: string;
}

export function SectionHeader({ element: { props } }: ComponentRenderProps<SectionHeaderProps>) {
  return (
    <div className="pt-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {props.title}
      </h2>
      {props.description && (
        <p className="mt-1 text-xs text-muted-foreground/70">{props.description}</p>
      )}
    </div>
  );
}
