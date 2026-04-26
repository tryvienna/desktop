/**
 * EventRegistrySection — Displays all registered events in the plugin event system.
 *
 * Shown in the Advanced settings page. Groups events by owner plugin and shows
 * qualified name, description, payload schema, and listener count.
 */

import { useQuery } from '@vienna/graphql/client';
import { GET_REGISTERED_EVENTS } from '@vienna/graphql/client';
import { Badge } from '@tryvienna/ui';

interface EventsByPlugin {
  pluginId: string;
  events: Array<{
    qualifiedName: string;
    localName: string;
    description: string;
    listenerCount: number;
    payloadSchema: string | null;
  }>;
}

function groupByPlugin(
  events: Array<{
    qualifiedName: string;
    localName: string;
    description: string;
    ownerPluginId: string;
    listenerCount: number;
    payloadSchema: string | null;
  }>,
): EventsByPlugin[] {
  const map = new Map<string, EventsByPlugin>();
  for (const event of events) {
    let group = map.get(event.ownerPluginId);
    if (!group) {
      group = { pluginId: event.ownerPluginId, events: [] };
      map.set(event.ownerPluginId, group);
    }
    group.events.push(event);
  }
  // Sort: core first, then alphabetical
  return Array.from(map.values()).sort((a, b) => {
    if (a.pluginId === 'core') return -1;
    if (b.pluginId === 'core') return 1;
    return a.pluginId.localeCompare(b.pluginId);
  });
}

export function EventRegistrySection() {
  const { data, loading } = useQuery(GET_REGISTERED_EVENTS);
  const events = data?.registeredEvents;

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">Loading events...</div>
    );
  }

  if (!events?.length) {
    return (
      <div className="text-sm text-muted-foreground">No events registered.</div>
    );
  }

  const groups = groupByPlugin(events);

  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <p className="text-xs text-muted-foreground">
          {events.length} event{events.length !== 1 ? 's' : ''} registered across{' '}
          {groups.length} source{groups.length !== 1 ? 's' : ''}.
        </p>
      </div>

      {groups.map((group) => (
        <div key={group.pluginId} className="grid gap-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {group.pluginId}
          </h4>
          <div className="grid gap-1.5">
            {group.events.map((event) => (
              <div
                key={event.qualifiedName}
                className="rounded-md border border-border px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono font-medium text-foreground">
                    {event.qualifiedName}
                  </code>
                  {event.listenerCount > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {event.listenerCount} listener{event.listenerCount !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                {event.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {event.description}
                  </p>
                )}
                {event.payloadSchema && (
                  <code className="mt-1 block text-[11px] font-mono text-muted-foreground">
                    {event.payloadSchema}
                  </code>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
