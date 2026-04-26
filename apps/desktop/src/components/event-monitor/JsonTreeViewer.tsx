/**
 * JsonTreeViewer — Recursive, syntax-highlighted JSON tree viewer.
 *
 * Renders a collapsible tree with styled keys/values, type coloring,
 * and a filter icon on hover for leaf values to add payload filters.
 */

import { useState, useCallback } from 'react';
import { ChevronRight, ChevronDown, Filter } from 'lucide-react';
import { cn } from '@tryvienna/ui/utils';

interface JsonTreeViewerProps {
  data: unknown;
  depth?: number;
  maxDepth?: number;
  path?: string;
  /** Called when the filter icon is clicked on a leaf value. */
  onFilterClick?: (path: string, value: unknown) => void;
}

export function JsonTreeViewer({
  data,
  depth = 0,
  maxDepth = 3,
  path = '',
  onFilterClick,
}: JsonTreeViewerProps) {
  if (data === null) return <LeafValue path={path} display="null" className="text-orange-400" value={null} onFilterClick={onFilterClick} />;
  if (data === undefined) return <span className="text-muted-foreground">undefined</span>;

  if (typeof data === 'string') {
    const display = data.length > 200 ? `"${data.slice(0, 200)}..."` : `"${data}"`;
    return <LeafValue path={path} display={display} className="text-green-400" value={data} onFilterClick={onFilterClick} />;
  }

  if (typeof data === 'number') {
    return <LeafValue path={path} display={String(data)} className="text-blue-400" value={data} onFilterClick={onFilterClick} />;
  }

  if (typeof data === 'boolean') {
    return <LeafValue path={path} display={String(data)} className="text-yellow-400" value={data} onFilterClick={onFilterClick} />;
  }

  if (Array.isArray(data)) {
    return (
      <CollapsibleNode
        label={`Array(${data.length})`}
        depth={depth}
        maxDepth={maxDepth}
        isEmpty={data.length === 0}
        emptyDisplay="[]"
      >
        {data.map((item, i) => (
          <div key={i} className="flex items-start gap-1" style={{ paddingLeft: 16 }}>
            <span className="text-muted-foreground shrink-0">{i}:</span>
            <JsonTreeViewer
              data={item}
              depth={depth + 1}
              maxDepth={maxDepth}
              path={`${path}[${i}]`}
              onFilterClick={onFilterClick}
            />
          </div>
        ))}
      </CollapsibleNode>
    );
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>);
    return (
      <CollapsibleNode
        label={`{${entries.length}}`}
        depth={depth}
        maxDepth={maxDepth}
        isEmpty={entries.length === 0}
        emptyDisplay="{}"
      >
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-start gap-1" style={{ paddingLeft: 16 }}>
            <span className="text-purple-400 shrink-0">{key}:</span>
            <JsonTreeViewer
              data={value}
              depth={depth + 1}
              maxDepth={maxDepth}
              path={path ? `${path}.${key}` : key}
              onFilterClick={onFilterClick}
            />
          </div>
        ))}
      </CollapsibleNode>
    );
  }

  return <span className="text-muted-foreground">{String(data)}</span>;
}

// ── Leaf value with filter icon on hover ──────────────────────────────────

interface LeafValueProps {
  path: string;
  display: string;
  className: string;
  value: unknown;
  onFilterClick?: (path: string, value: unknown) => void;
}

function LeafValue({ path, display, className, value, onFilterClick }: LeafValueProps) {
  return (
    <span className="group/leaf inline-flex items-center gap-0.5">
      <span className={className}>{display}</span>
      {onFilterClick && path && (
        <button
          className="opacity-0 group-hover/leaf:opacity-100 transition-opacity p-0 border-0 bg-transparent cursor-pointer text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onFilterClick(path, value);
          }}
          title={`Filter by ${path}=${String(value)}`}
        >
          <Filter className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}

// ── Collapsible container ─────────────────────────────────────────────────

interface CollapsibleNodeProps {
  label: string;
  depth: number;
  maxDepth: number;
  isEmpty: boolean;
  emptyDisplay: string;
  children: React.ReactNode;
}

function CollapsibleNode({
  label,
  depth,
  maxDepth,
  isEmpty,
  emptyDisplay,
  children,
}: CollapsibleNodeProps) {
  const [open, setOpen] = useState(depth < maxDepth);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  if (isEmpty) {
    return <span className="text-muted-foreground">{emptyDisplay}</span>;
  }

  return (
    <div className="inline">
      <button
        onClick={toggle}
        className={cn(
          'inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground',
          'focus:outline-none',
        )}
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span className="text-xs">{label}</span>
      </button>
      {open && <div className="border-l border-border/50 ml-1.5">{children}</div>}
    </div>
  );
}
