/**
 * EventRow — Single event row in the Live or Saved tab.
 *
 * Shows timestamp, event name, owner badge, listener count.
 * Expandable to show the full JSON payload with filterable values.
 */

import { useCallback } from 'react';
import { ChevronRight, ChevronDown, Bookmark, Play, Trash2 } from 'lucide-react';
import { Button } from '@tryvienna/ui';
import { cn } from '@tryvienna/ui/utils';
import { JsonTreeViewer } from './JsonTreeViewer';
import type { CapturedEvent } from './types';

interface EventRowProps {
  event: CapturedEvent;
  expanded: boolean;
  onToggle: () => void;
  onReplay: () => void;
  onSave?: () => void;
  onDelete?: () => void;
  /** Called when the filter icon is clicked on a payload value. */
  onAddPayloadFilter?: (path: string, value: unknown) => void;
  label?: string;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 3 });
  } catch {
    return iso;
  }
}

function extractOwner(eventName: string): string {
  const dot = eventName.indexOf('.');
  return dot > 0 ? eventName.slice(0, dot) : eventName;
}

export function EventRow({
  event,
  expanded,
  onToggle,
  onReplay,
  onSave,
  onDelete,
  onAddPayloadFilter,
  label,
}: EventRowProps) {
  const owner = extractOwner(event.eventName);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onToggle();
      }
    },
    [onToggle],
  );

  return (
    <div className="border-b border-border/50 last:border-b-0">
      {/* Header row */}
      <div
        role="button"
        tabIndex={0}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer',
          'hover:bg-muted/50 transition-colors',
          expanded && 'bg-muted/30',
        )}
        onClick={onToggle}
        onKeyDown={handleKeyDown}
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
        )}

        <span className="text-muted-foreground font-mono shrink-0 w-20">
          {formatTime(event.timestamp)}
        </span>

        <span className="font-mono font-medium text-foreground truncate flex-1">
          {event.eventName}
        </span>

        {label && (
          <span className="text-xs text-amber-400 truncate max-w-32">{label}</span>
        )}

        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {owner}
        </span>

        <span
          className="shrink-0 text-muted-foreground"
          title={`${event.listenerCount} listener${event.listenerCount === 1 ? '' : 's'}`}
        >
          {event.listenerCount}L
        </span>

        {/* Action buttons */}
        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onReplay} title="Replay event">
            <Play className="h-3 w-3" />
          </Button>
          {onSave && (
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onSave} title="Save event">
              <Bookmark className="h-3 w-3" />
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={onDelete} title="Delete">
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Expanded payload */}
      {expanded && (
        <div className="px-3 py-2 pl-10 bg-muted/20 border-t border-border/30">
          <div className="font-mono text-xs overflow-auto max-h-64">
            <JsonTreeViewer data={event.payload} onFilterClick={onAddPayloadFilter} />
          </div>
        </div>
      )}
    </div>
  );
}
