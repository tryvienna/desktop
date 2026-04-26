/**
 * SavedTab — Bookmarked events persisted across sessions.
 *
 * Shows saved events with options to replay, delete individual events,
 * or clear all saved events.
 */

import { Trash2 } from 'lucide-react';
import { Button } from '@tryvienna/ui';
import { EventRow } from './EventRow';
import type { EventMonitorState } from './useEventMonitor';

interface SavedTabProps {
  state: EventMonitorState;
}

export function SavedTab({ state }: SavedTabProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <span className="text-xs text-muted-foreground">
          {state.savedEvents.length} saved event{state.savedEvents.length === 1 ? '' : 's'}
        </span>

        <div className="flex-1" />

        {state.savedEvents.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-destructive"
            onClick={() => void state.clearSavedEvents()}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear All
          </Button>
        )}
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto">
        {state.savedEvents.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
            No saved events. Click the bookmark icon on a live event to save it.
          </div>
        ) : (
          state.savedEvents.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              expanded={state.expandedIds.has(event.id)}
              onToggle={() => state.toggleExpanded(event.id)}
              onReplay={() => void state.replayEvent(event)}
              onDelete={() => void state.deleteSavedEvent(event.id)}
              label={event.label}
            />
          ))
        )}
      </div>
    </div>
  );
}
