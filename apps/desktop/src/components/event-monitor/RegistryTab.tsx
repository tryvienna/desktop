/**
 * RegistryTab — Browse all registered events in the plugin system.
 *
 * Shows event name, owner plugin, listener count, description, and schema.
 * Refreshes on tab activation and has a manual refresh button.
 */

import { useState, useMemo } from 'react';
import { RefreshCw, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@tryvienna/ui';
import { cn } from '@tryvienna/ui/utils';
import type { EventMonitorState } from './useEventMonitor';
import type { EventSummary } from './types';

interface RegistryTabProps {
  state: EventMonitorState;
}

export function RegistryTab({ state }: RegistryTabProps) {
  const [filter, setFilter] = useState('');
  const [expandedNames, setExpandedNames] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!filter) return state.registryEvents;
    const lower = filter.toLowerCase();
    return state.registryEvents.filter(
      (e) =>
        e.qualifiedName.toLowerCase().includes(lower) ||
        e.ownerPluginId.toLowerCase().includes(lower) ||
        e.description.toLowerCase().includes(lower),
    );
  }, [state.registryEvents, filter]);

  // Group by owner plugin
  const grouped = useMemo(() => {
    const groups = new Map<string, EventSummary[]>();
    for (const event of filtered) {
      let list = groups.get(event.ownerPluginId);
      if (!list) {
        list = [];
        groups.set(event.ownerPluginId, list);
      }
      list.push(event);
    }
    return groups;
  }, [filtered]);

  const toggleExpanded = (name: string) => {
    setExpandedNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <span className="text-xs text-muted-foreground">
          {state.registryEvents.length} registered event{state.registryEvents.length === 1 ? '' : 's'}
        </span>

        <div className="flex-1" />

        <input
          type="text"
          placeholder="Filter..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-7 w-48 rounded border border-border bg-background px-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />

        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1"
          onClick={() => void state.refreshRegistry()}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Event groups */}
      <div className="flex-1 overflow-y-auto">
        {state.registryEvents.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
            No events registered. Events appear when plugins are loaded.
          </div>
        ) : (
          Array.from(grouped.entries()).map(([owner, events]) => (
            <div key={owner} className="border-b border-border/50">
              <div className="px-3 py-1.5 bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {owner} ({events.length})
              </div>
              {events.map((event) => (
                <RegistryEventRow
                  key={event.qualifiedName}
                  event={event}
                  expanded={expandedNames.has(event.qualifiedName)}
                  onToggle={() => toggleExpanded(event.qualifiedName)}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Individual registry event row ─────────────────────────────────────────

interface RegistryEventRowProps {
  event: EventSummary;
  expanded: boolean;
  onToggle: () => void;
}

function RegistryEventRow({ event, expanded, onToggle }: RegistryEventRowProps) {
  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer',
          'hover:bg-muted/50 transition-colors',
          expanded && 'bg-muted/30',
        )}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); }
        }}
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
        )}

        <span className="font-mono font-medium text-foreground truncate flex-1">
          {event.qualifiedName}
        </span>

        <span
          className="shrink-0 text-muted-foreground"
          title={`${event.listenerCount} listener${event.listenerCount === 1 ? '' : 's'}`}
        >
          {event.listenerCount}L
        </span>
      </div>

      {expanded && (
        <div className="px-3 py-2 pl-8 bg-muted/20 border-t border-border/30 space-y-1.5">
          {event.description && (
            <div className="text-xs text-muted-foreground">{event.description}</div>
          )}
          {event.payloadSchema && (
            <div className="text-xs">
              <span className="text-muted-foreground">Schema: </span>
              <code className="font-mono text-purple-400">{event.payloadSchema}</code>
            </div>
          )}
          <div className="text-xs">
            <span className="text-muted-foreground">Owner: </span>
            <span className="font-mono">{event.ownerPluginId}</span>
          </div>
        </div>
      )}
    </div>
  );
}
