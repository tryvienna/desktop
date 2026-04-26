import type { ComponentRenderProps } from '@json-render/react';

interface ProgressCardProps {
  label: string;
  value: number;
  max?: number;
  unit?: string;
}

export function ProgressCard({ element: { props } }: ComponentRenderProps<ProgressCardProps>) {
  const max = props.max && props.max > 0 ? props.max : 100;
  const percent = Math.min(100, Math.max(0, (props.value / max) * 100));

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm dark:bg-surface-interactive">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{props.label}</span>
        <span className="text-xs text-muted-foreground">
          {props.value}{props.unit ? ` ${props.unit}` : ''} / {max}{props.unit ? ` ${props.unit}` : ''}
        </span>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
