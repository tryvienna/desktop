/**
 * LiveTab — Real-time stream of plugin events with rich filtering.
 *
 * Filtering layers (all AND'd together):
 * 1. Event name multi-select combobox (empty = all events)
 * 2. Payload key=value filters (added by clicking filter icon in JSON viewer)
 * 3. Freeform text search (matches event name + payload content)
 */

import { useState, useRef, useEffect } from 'react';
import { Pause, Play, Trash2, Radio, ChevronDown, X, Filter } from 'lucide-react';
import { Button } from '@tryvienna/ui';
import { cn } from '@tryvienna/ui/utils';
import { EventRow } from './EventRow';
import type { EventMonitorState } from './useEventMonitor';

interface LiveTabProps {
  state: EventMonitorState;
}

export function LiveTab({ state }: LiveTabProps) {
  const hasActiveFilters =
    state.selectedEventNames.size > 0 ||
    state.payloadFilters.length > 0 ||
    state.textFilter.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={state.togglePause}>
          {state.paused ? (
            <><Play className="h-3.5 w-3.5" /> Resume</>
          ) : (
            <><Pause className="h-3.5 w-3.5" /> Pause</>
          )}
        </Button>

        <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={state.clearLive}>
          <Trash2 className="h-3.5 w-3.5" /> Clear
        </Button>

        <div className="w-px h-4 bg-border" />

        {/* Event name multi-select */}
        <EventNameCombobox
          options={state.seenEventNames}
          selected={state.selectedEventNames}
          onToggle={state.toggleEventName}
          onClear={state.clearEventNameFilter}
        />

        <div className="flex-1" />

        {/* Freeform text filter */}
        <input
          type="text"
          placeholder="Search events..."
          value={state.textFilter}
          onChange={(e) => state.setTextFilter(e.target.value)}
          className="h-7 w-48 rounded border border-border bg-background px-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Radio className={`h-3 w-3 ${state.paused ? 'text-muted-foreground' : 'text-green-500'}`} />
          {hasActiveFilters
            ? `${state.filteredEvents.length}/${state.liveEvents.length}`
            : state.liveEvents.length}
        </div>
      </div>

      {/* Active filter pills */}
      {hasActiveFilters && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border/50 bg-muted/20 flex-wrap">
          <Filter className="h-3 w-3 text-muted-foreground shrink-0" />

          {/* Event name pills */}
          {Array.from(state.selectedEventNames).map((name) => (
            <FilterPill
              key={`event:${name}`}
              label={name}
              onRemove={() => state.toggleEventName(name)}
            />
          ))}

          {/* Payload filter pills */}
          {state.payloadFilters.map((pf, i) => (
            <FilterPill
              key={`payload:${i}`}
              label={`${pf.path}=${pf.value}`}
              variant="payload"
              onRemove={() => state.removePayloadFilter(i)}
            />
          ))}

          {/* Text filter pill */}
          {state.textFilter && (
            <FilterPill
              label={`"${state.textFilter}"`}
              variant="text"
              onRemove={() => state.setTextFilter('')}
            />
          )}

          {/* Clear all */}
          <button
            className="text-[10px] text-muted-foreground hover:text-foreground ml-1"
            onClick={() => {
              state.clearEventNameFilter();
              state.clearPayloadFilters();
              state.setTextFilter('');
            }}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Event list */}
      <div className="flex-1 overflow-y-auto">
        {state.filteredEvents.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
            {state.liveEvents.length === 0
              ? 'No events yet. Events will appear here as they are emitted.'
              : 'No events match the active filters.'}
          </div>
        ) : (
          state.filteredEvents.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              expanded={state.expandedIds.has(event.id)}
              onToggle={() => state.toggleExpanded(event.id)}
              onReplay={() => void state.replayEvent(event)}
              onSave={() => void state.saveEvent(event)}
              onAddPayloadFilter={state.addPayloadFilter}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Filter pill ─────────────────────────────────────────────────────────

interface FilterPillProps {
  label: string;
  variant?: 'event' | 'payload' | 'text';
  onRemove: () => void;
}

function FilterPill({ label, variant = 'event', onRemove }: FilterPillProps) {
  const colors = {
    event: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    payload: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    text: 'bg-green-500/15 text-green-400 border-green-500/30',
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-mono max-w-48',
      colors[variant],
    )}>
      <span className="truncate">{label}</span>
      <button
        className="shrink-0 hover:opacity-70"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}

// ── Event name combobox (multi-select dropdown) ─────────────────────────

interface EventNameComboboxProps {
  options: string[];
  selected: Set<string>;
  onToggle: (name: string) => void;
  onClear: () => void;
}

function EventNameCombobox({ options, selected, onToggle, onClear }: EventNameComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = search
    ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div className="relative" ref={ref}>
      <button
        className={cn(
          'flex items-center gap-1 h-7 px-2 rounded border text-xs',
          'hover:bg-muted/50 transition-colors',
          selected.size > 0
            ? 'border-blue-500/50 text-blue-400'
            : 'border-border text-muted-foreground',
        )}
        onClick={() => setOpen((o) => !o)}
      >
        <Filter className="h-3 w-3" />
        {selected.size > 0 ? `${selected.size} event${selected.size > 1 ? 's' : ''}` : 'Events'}
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-72 rounded-md border border-border bg-popover shadow-md">
          {/* Search input */}
          <div className="p-2 border-b border-border">
            <input
              type="text"
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 w-full rounded border border-border bg-background px-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              autoFocus
            />
          </div>

          {/* Options */}
          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                {options.length === 0 ? 'No events seen yet' : 'No matches'}
              </div>
            ) : (
              filtered.map((name) => (
                <button
                  key={name}
                  className={cn(
                    'flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs text-left',
                    'hover:bg-muted/50 transition-colors',
                    selected.has(name) && 'bg-muted/30',
                  )}
                  onClick={() => onToggle(name)}
                >
                  <div className={cn(
                    'h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0',
                    selected.has(name)
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-border',
                  )}>
                    {selected.has(name) && (
                      <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="font-mono truncate">{name}</span>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {selected.size > 0 && (
            <div className="p-2 border-t border-border">
              <button
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => { onClear(); setOpen(false); setSearch(''); }}
              >
                Clear selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
