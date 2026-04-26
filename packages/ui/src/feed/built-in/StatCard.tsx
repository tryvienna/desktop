import type { ComponentRenderProps } from '@json-render/react';

interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  trend?: 'up' | 'down' | 'flat';
}

export function StatCard({ element: { props } }: ComponentRenderProps<StatCardProps>) {
  const trendColor =
    props.trend === 'up'
      ? 'text-emerald-500'
      : props.trend === 'down'
        ? 'text-red-500'
        : 'text-muted-foreground';

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm dark:bg-surface-interactive">
      <p className="text-xs font-medium text-muted-foreground">{props.label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{props.value}</p>
      {props.delta && (
        <p className={`mt-1 text-xs font-medium ${trendColor}`}>
          {props.delta}
        </p>
      )}
    </div>
  );
}
