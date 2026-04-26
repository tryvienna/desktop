/**
 * EventMonitorView — Developer tool for inspecting plugin events.
 *
 * Three tabs:
 * - **Live** — Real-time stream of all plugin events with filtering, replay, save
 * - **Saved** — Bookmarked events persisted to disk for later inspection/replay
 * - **Registry** — Browse all registered event definitions (name, owner, schema, listeners)
 */

import { Radio, Bookmark, List } from 'lucide-react';
import { cn } from '@tryvienna/ui/utils';
import { useEventMonitor } from './useEventMonitor';
import { LiveTab } from './LiveTab';
import { SavedTab } from './SavedTab';
import { RegistryTab } from './RegistryTab';
import type { Tab } from './types';

const TABS: { id: Tab; label: string; icon: typeof Radio }[] = [
  { id: 'live', label: 'Live', icon: Radio },
  { id: 'saved', label: 'Saved', icon: Bookmark },
  { id: 'registry', label: 'Registry', icon: List },
];

export function EventMonitorView() {
  const state = useEventMonitor();

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Tab bar */}
      <div className="flex items-center border-b border-border px-3">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors',
              'border-b-2 -mb-px',
              state.tab === id
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
            onClick={() => state.setTab(id)}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {id === 'live' && state.liveEvents.length > 0 && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none">
                {state.liveEvents.length}
              </span>
            )}
            {id === 'saved' && state.savedEvents.length > 0 && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none">
                {state.savedEvents.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {state.tab === 'live' && <LiveTab state={state} />}
        {state.tab === 'saved' && <SavedTab state={state} />}
        {state.tab === 'registry' && <RegistryTab state={state} />}
      </div>
    </div>
  );
}
