/**
 * useFeed — Hook for subscribing to feed workstream output.
 *
 * On mount, loads cached feed content if available and fresh (< 6 hours old).
 * Otherwise triggers a refresh. Manual refresh always re-processes.
 *
 * During a refresh, existing items remain visible (isRefreshing=true).
 * Items are only replaced once new content arrives from the AI.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getApi, getEvents } from '@vienna/ipc/renderer';
import { api, events } from '../../ipc/index';
import { parseSpecsIncremental, interleaveItems, extractDirectItems } from '@tryvienna/ui/feed';
import type { FeedCardSpec, FeedMdSegment, FeedItem } from '@tryvienna/ui/feed';

/** Sentinel project ID used when no project is selected (global feed). */
const GLOBAL_FEED_PROJECT_ID = '__global__';

/** Cache TTL: 6 hours in milliseconds. */
const FEED_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Custom DOM event dispatched when feed.md is written externally
 * (e.g. from the template browser or feed editor). Signals useFeed
 * to re-initialize and pick up the new config + workstream events.
 */
export const FEED_REFRESH_EVENT = 'vienna:feed-refresh';

export function emitFeedRefresh(): void {
  window.dispatchEvent(new CustomEvent(FEED_REFRESH_EVENT));
}

export interface UseFeedResult {
  items: FeedItem[];
  /** True during initial load when no cached content is available. */
  isLoading: boolean;
  /** True while the AI is actively streaming text deltas. */
  isStreaming: boolean;
  /** True when a refresh is in progress (existing content stays visible). */
  isRefreshing: boolean;
  hasFeedConfig: boolean;
  refresh: () => void;
  feedWorkstreamId: string | null;
}

/**
 * Subscribe to feed workstream output and parse json-render specs.
 */
export function useFeed(projectId: string | null, enabled = true): UseFeedResult {
  const effectiveProjectId = projectId ?? GLOBAL_FEED_PROJECT_ID;
  const [items, setItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasFeedConfig, setHasFeedConfig] = useState(false);
  const [feedWorkstreamId, setFeedWorkstreamId] = useState<string | null>(null);

  // Accumulates text deltas from the AI response
  const responseRef = useRef('');

  // Direct items from feed.md (inline specs, plugin feeds, entity feeds — rendered without LLM)
  const directItemsRef = useRef<Array<{ index: number; item: FeedItem }>>([]);
  const segmentsRef = useRef<FeedMdSegment[]>([]);
  // LLM-generated specs (before interleaving)
  const llmSpecsRef = useRef<FeedCardSpec[]>([]);

  // Counter to force re-initialization (incremented by refresh or external events)
  const [refreshKey, setRefreshKey] = useState(0);

  // Listen for external feed refresh events (from template browser, feed editor)
  useEffect(() => {
    const handler = () => setRefreshKey((k) => k + 1);
    window.addEventListener(FEED_REFRESH_EVENT, handler);
    return () => window.removeEventListener(FEED_REFRESH_EVENT, handler);
  }, []);

  // Parse LLM response text, interleave with direct items, and update state.
  const mergeAndSetItems = useCallback((responseText: string) => {
    const parsed = parseSpecsIncremental(responseText);
    llmSpecsRef.current = parsed;
    const merged = interleaveItems(parsed, directItemsRef.current, segmentsRef.current);
    if (merged.length > 0) {
      setItems(merged);
    }
  }, []);

  // Initialize: check cache, load or refresh
  useEffect(() => {
    if (!enabled) return;

    const ipc = getApi(api);
    let cancelled = false;

    (async () => {
      try {
        const { hasFeed } = await ipc.feed.hasFeedConfig({ projectId: effectiveProjectId });
        if (cancelled) return;
        setHasFeedConfig(hasFeed);

        if (!hasFeed) {
          setFeedWorkstreamId(null);
          return;
        }

        // Fetch segments from feed.md and extract direct items (inline specs, plugin/entity feeds)
        const { segments } = await ipc.feed.getInlineSpecs({ projectId: effectiveProjectId });
        if (cancelled) return;

        segmentsRef.current = segments;
        directItemsRef.current = extractDirectItems(segments);

        // Show direct items immediately (before LLM responds)
        if (directItemsRef.current.length > 0) {
          setItems(directItemsRef.current.map((d) => d.item));
        }

        // Try to load cached content (skip cache on manual refresh)
        const isManualRefresh = refreshKey > 0;
        const cached = isManualRefresh
          ? { responseText: null, lastActivityAt: null }
          : await ipc.feed.getFeedContent({ projectId: effectiveProjectId });
        if (cancelled) return;

        const now = Date.now();
        const isFresh = cached.responseText && cached.lastActivityAt &&
          (now - cached.lastActivityAt) < FEED_CACHE_TTL_MS;

        if (isFresh && cached.responseText) {
          // Use cached response — no API call needed
          responseRef.current = cached.responseText;
          mergeAndSetItems(cached.responseText);

          const { workstreamId } = await ipc.feed.getFeedWorkstreamId({ projectId: effectiveProjectId });
          if (cancelled) return;
          setFeedWorkstreamId(workstreamId);
        } else {
          // Stale or missing — refresh
          if (items.length > 0) {
            setIsRefreshing(true);
          } else {
            setIsLoading(true);
          }
          const result = await ipc.feed.refreshFeed({ projectId: effectiveProjectId });
          if (cancelled) return;
          if (result.success) {
            // refreshFeed clears the segment cache — re-fetch to get fresh segments
            const { segments: freshSegments } = await ipc.feed.getInlineSpecs({ projectId: effectiveProjectId });
            if (cancelled) return;
            segmentsRef.current = freshSegments;
            directItemsRef.current = extractDirectItems(freshSegments);
            setItems(directItemsRef.current.map((d) => d.item));

            const { workstreamId } = await ipc.feed.getFeedWorkstreamId({ projectId: effectiveProjectId });
            if (cancelled) return;
            setFeedWorkstreamId(workstreamId);

            // No workstream means no LLM processing was triggered (empty/plugin-only feed).
            // Clear loading states immediately — there are no events to wait for.
            if (!workstreamId) {
              setIsLoading(false);
              setIsRefreshing(false);
            }
          } else {
            setIsLoading(false);
            setIsRefreshing(false);
          }
        }
      } catch {
        // Feed system not available yet
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [effectiveProjectId, enabled, refreshKey]);

  // Subscribe to feed workstream events (for live streaming + manual refresh)
  useEffect(() => {
    if (!feedWorkstreamId) return;

    const ipcEvents = getEvents(events);

    const unsub = ipcEvents.workstream.onAgentEvent((payload) => {
      if (payload.workstreamId !== feedWorkstreamId) return;

      const event = payload.event as Record<string, unknown>;
      const isHistory = payload.isFromHistory;

      if (event.type === 'assistant_message') {
        if (!isHistory) {
          setIsStreaming(true);
          setIsRefreshing(true);
        }
        responseRef.current = '';
        llmSpecsRef.current = [];
      } else if (event.type === 'text_delta') {
        const delta = event.text as string;
        if (delta) {
          responseRef.current += delta;
          mergeAndSetItems(responseRef.current);
        }
      } else if (event.type === 'text_done') {
        const text = (event.fullText ?? event.text) as string;
        if (text) {
          responseRef.current = text;
          mergeAndSetItems(text);
        }
      } else if (event.type === 'turn_end') {
        setIsStreaming(false);
        setIsLoading(false);
        setIsRefreshing(false);
        mergeAndSetItems(responseRef.current);
      } else if (event.type === 'error') {
        setIsStreaming(false);
        setIsLoading(false);
        setIsRefreshing(false);
      }
    });

    return unsub;
  }, [feedWorkstreamId, mergeAndSetItems]);

  // Manual refresh — triggers re-initialization which handles loading states
  const refresh = useCallback(() => {
    responseRef.current = '';
    llmSpecsRef.current = [];
    setRefreshKey((k) => k + 1);
  }, []);

  return {
    items,
    isLoading,
    isStreaming,
    isRefreshing,
    hasFeedConfig,
    refresh,
    feedWorkstreamId,
  };
}
