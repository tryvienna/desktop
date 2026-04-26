import type { ComponentRenderProps } from '@json-render/react';

interface TableCardProps {
  title?: string;
  columns: string[];
  rows: string[][];
}

export function TableCard({ element: { props } }: ComponentRenderProps<TableCardProps>) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm dark:bg-surface-interactive">
      {props.title && (
        <h3 className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{props.title}</h3>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-t bg-muted/30">
              {props.columns?.map((col, i) => (
                <th key={i} className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {props.rows?.map((row, i) => (
              <tr key={i} className="border-t">
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-2">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
