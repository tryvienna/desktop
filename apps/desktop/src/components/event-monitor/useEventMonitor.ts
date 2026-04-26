/**
 * useEventMonitor — Hook that manages Event Monitor state.
 *
 * Subscribes to live plugin events via IPC, manages the circular buffer,
 * and provides filtering (event name multi-select, payload key=value, freeform text).
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getApi, getEvents } from '@vienna/ipc/renderer';
import { api, events } from '../../ipc';
import type { CapturedEvent, EventSummary, SavedEvent, Tab } from './types';

const MAX_EVENTS = 500;

const client = getApi(api);
const subscriptions = getEvents(events);

/** A key=value filter applied from the JSON payload viewer. */
export interface PayloadFilter {
  /** JSON path (e.g., "tools[0].name"). */
  path: string;
  /** Stringified value to match. */
  value: string;
}

export interface EventMonitorState {
  tab: Tab;
  setTab: (tab: Tab) => void;

  /** All live events (unfiltered buffer, newest first). */
  liveEvents: CapturedEvent[];
  /** Filtered live events (after all filters applied). */
  filteredEvents: CapturedEvent[];
  paused: boolean;
  togglePause: () => void;
  clearLive: () => void;

  /** Freeform text filter — matches event name + stringified payload. */
  textFilter: string;
  setTextFilter: (filter: string) => void;

  /** Multi-select: which event names to include (empty = all). */
  selectedEventNames: Set<string>;
  toggleEventName: (name: string) => void;
  clearEventNameFilter: () => void;

  /** Payload key=value filters (from clicking values in the JSON viewer). */
  payloadFilters: PayloadFilter[];
  addPayloadFilter: (path: string, value: unknown) => void;
  removePayloadFilter: (index: number) => void;
  clearPayloadFilters: () => void;

  /** All unique event names seen so far (for the combobox options). */
  seenEventNames: string[];

  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;

  savedEvents: SavedEvent[];
  saveEvent: (event: CapturedEvent, label?: string) => Promise<void>;
  deleteSavedEvent: (id: string) => Promise<void>;
  clearSavedEvents: () => Promise<void>;

  registryEvents: EventSummary[];
  refreshRegistry: () => Promise<void>;

  replayEvent: (event: CapturedEvent) => Promise<{ success: boolean; error?: string }>;
}

/** Check if a stringified payload contains a key=value filter. */
function matchesPayloadFilter(payload: unknown, filter: PayloadFilter): boolean {
  // Walk the JSON path and check the value
  const parts = filter.path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let current: unknown = payload;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return false;
    current = (current as Record<string, unknown>)[part];
  }
  return String(current) === filter.value;
}

/** Check if any part of the event matches a freeform text query. */
function matchesText(event: CapturedEvent, query: string): boolean {
  if (event.eventName.toLowerCase().includes(query)) return true;
  // Search stringified payload
  try {
    return JSON.stringify(event.payload).toLowerCase().includes(query);
  } catch {
    return false;
  }
}

export function useEventMonitor(): EventMonitorState {
  const [tab, setTab] = useState<Tab>('live');
  const [liveEvents, setLiveEvents] = useState<CapturedEvent[]>([]);
  const [paused, setPaused] = useState(false);
  const [textFilter, setTextFilter] = useState('');
  const [selectedEventNames, setSelectedEventNames] = useState<Set<string>>(new Set());
  const [payloadFilters, setPayloadFilters] = useState<PayloadFilter[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [savedEvents, setSavedEvents] = useState<SavedEvent[]>([]);
  const [registryEvents, setRegistryEvents] = useState<EventSummary[]>([]);

  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  // All available event names: registered events + any seen in the live stream
  const seenEventNames = useMemo(() => {
    const names = new Set<string>();
    for (const e of registryEvents) names.add(e.qualifiedName);
    for (const e of liveEvents) names.add(e.eventName);
    return Array.from(names).sort();
  }, [liveEvents, registryEvents]);

  // Apply all filters
  const filteredEvents = useMemo(() => {
    let result = liveEvents;

    // 1. Event name multi-select
    if (selectedEventNames.size > 0) {
      result = result.filter((e) => selectedEventNames.has(e.eventName));
    }

    // 2. Payload key=value filters
    for (const pf of payloadFilters) {
      result = result.filter((e) => matchesPayloadFilter(e.payload, pf));
    }

    // 3. Freeform text
    if (textFilter) {
      const lower = textFilter.toLowerCase();
      result = result.filter((e) => matchesText(e, lower));
    }

    return result;
  }, [liveEvents, selectedEventNames, payloadFilters, textFilter]);

  // Subscribe to live events
  useEffect(() => {
    const unsub = subscriptions.pluginEvents.onEventEmitted((captured: CapturedEvent) => {
      if (pausedRef.current) return;
      setLiveEvents((prev) => {
        const next = [captured, ...prev];
        return next.length > MAX_EVENTS ? next.slice(0, MAX_EVENTS) : next;
      });
    });
    return unsub;
  }, []);

  // Load saved events on mount
  useEffect(() => {
    const load = async () => {
      const result = await client.pluginEvents.getSavedEvents({});
      setSavedEvents(result.events as SavedEvent[]);
    };
    void load();
  }, []);

  // Load registry when tab switches
  const refreshRegistry = useCallback(async () => {
    const result = await client.pluginEvents.getRegisteredEvents({});
    setRegistryEvents(result.events as EventSummary[]);
  }, []);

  // Load registry on mount (for combobox options) and when tab switches to registry
  useEffect(() => {
    void refreshRegistry();
  }, [refreshRegistry]);

  useEffect(() => {
    if (tab === 'registry') void refreshRegistry();
  }, [tab, refreshRegistry]);

  const togglePause = useCallback(() => setPaused((p) => !p), []);
  const clearLive = useCallback(() => setLiveEvents([]), []);

  const toggleEventName = useCallback((name: string) => {
    setSelectedEventNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const clearEventNameFilter = useCallback(() => {
    setSelectedEventNames(new Set());
  }, []);

  const addPayloadFilter = useCallback((path: string, value: unknown) => {
    setPayloadFilters((prev) => [...prev, { path, value: String(value) }]);
  }, []);

  const removePayloadFilter = useCallback((index: number) => {
    setPayloadFilters((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearPayloadFilters = useCallback(() => {
    setPayloadFilters([]);
  }, []);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const saveEvent = useCallback(async (event: CapturedEvent, label?: string) => {
    await client.pluginEvents.saveEvent({ event, label });
    const result = await client.pluginEvents.getSavedEvents({});
    setSavedEvents(result.events as SavedEvent[]);
  }, []);

  const deleteSavedEvent = useCallback(async (id: string) => {
    await client.pluginEvents.deleteSavedEvent({ id });
    const result = await client.pluginEvents.getSavedEvents({});
    setSavedEvents(result.events as SavedEvent[]);
  }, []);

  const clearSavedEvents = useCallback(async () => {
    await client.pluginEvents.clearSavedEvents({});
    setSavedEvents([]);
  }, []);

  const replayEvent = useCallback(async (event: CapturedEvent) => {
    const result = await client.pluginEvents.replayEvent({
      eventName: event.eventName,
      payload: event.payload,
    });
    return { success: result.success, error: result.error ?? undefined };
  }, []);

  return {
    tab, setTab,
    liveEvents, filteredEvents, paused, togglePause, clearLive,
    textFilter, setTextFilter,
    selectedEventNames, toggleEventName, clearEventNameFilter,
    payloadFilters, addPayloadFilter, removePayloadFilter, clearPayloadFilters,
    seenEventNames,
    expandedIds, toggleExpanded,
    savedEvents, saveEvent, deleteSavedEvent, clearSavedEvents,
    registryEvents, refreshRegistry,
    replayEvent,
  };
}
