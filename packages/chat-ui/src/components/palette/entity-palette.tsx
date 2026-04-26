/**
 * EntityPalette — Entity search palette triggered by @ in chat input
 *
 * @ai-context
 * - Renders the @ entity palette for referencing Linear issues, GitHub PRs, etc.
 * - Provider-defined sectioned results with tab-based filtering
 * - Filter bar with keyword syntax (e.g., "status:done") and UI dropdown pickers
 * - AbortController for debounced search cancellation
 * - Integration connection status and retry support
 * - data-slot="entity-palette"
 *
 * @example
 * <EntityPalette isOpen={open} onClose={close} onSelect={select} dataProvider={provider} />
 */

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  forwardRef,
  useImperativeHandle,
  memo,
} from 'react';

import { EntityIcon } from './icons';
import {
  PaletteContainer,
  PaletteTabBar,
  PaletteResultsList,
  PaletteResultItem,
  PaletteSection,
  EmptyState,
  LoadingState,
  ErrorState,
  DisconnectedState,
  PaletteKeyboardHints,
  PaletteFilterBar,
} from './primitives';
import type {
  Entity,
  EntityType,
  EntityPaletteProps,
  PaletteHandle,
  PaletteSection as PaletteSectionType,
  PaletteFilterDefinition,
  ActivePaletteFilter,
} from './types';
import { parseKeywordFilters, mergeFilters } from '../../utils/filter-keyword-parser';

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_MAX_RESULTS = 20;
const SEARCH_DEBOUNCE_MS = 150; // Consistent debounce

// =============================================================================
// INLINE STATUS BADGE
// =============================================================================

function StatusBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded border border-border-muted text-muted-foreground bg-surface-interactive">
      {children}
    </span>
  );
}

// =============================================================================
// HELPER: Check if result is sections or flat array
// =============================================================================

function isSectionedResults(
  results: PaletteSectionType<Entity>[] | Entity[]
): results is PaletteSectionType<Entity>[] {
  return (
    Array.isArray(results) && results.length > 0 && 'items' in results[0] && 'label' in results[0]
  );
}

// =============================================================================
// COMPONENT
// =============================================================================

export const EntityPalette = memo(
  forwardRef<PaletteHandle, EntityPaletteProps>(function EntityPalette(
    {
      isOpen,
      onClose,
      onSelect,
      dataProvider,
      query = '',
      activeTab,
      onTabChange,
      tabs = [],
      maxResults = DEFAULT_MAX_RESULTS,
      className,
      onConnectIntegration,
      iconHints,
    },
    ref
  ) {
    // -------------------------------------------------------------------------
    // STATE
    // -------------------------------------------------------------------------

    const [internalActiveTab, setInternalActiveTab] = useState(tabs[0]?.id || 'all');
    const currentTab = activeTab ?? internalActiveTab;

    // Selection state per tab (maintains selection when switching tabs)
    const selectionStateByTab = useRef<Record<string, number>>({});
    const [selectedIndex, setSelectedIndex] = useState(0);

    const [results, setResults] = useState<Entity[]>([]);
    const [sections, setSections] = useState<PaletteSectionType<Entity>[]>([]);
    const [recents, setRecents] = useState<Entity[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSourceConnected, setIsSourceConnected] = useState(true);

    // Filter bar state
    const [currentFilters, setCurrentFilters] = useState<PaletteFilterDefinition[]>([]);
    const [activeFilters, setActiveFilters] = useState<ActivePaletteFilter[]>(
      () => dataProvider.getInitialFilters?.() ?? []
    );

    // Error state and retry counter (incrementing retryCount re-runs the search effect)
    const [searchError, setSearchError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    // -------------------------------------------------------------------------
    // REFS
    // -------------------------------------------------------------------------

    const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const abortControllerRef = useRef<AbortController | undefined>(undefined);
    // Suppress hover selection during keyboard navigation to prevent
    // scroll-triggered mouseEnter from overriding the keyboard selection
    const isKeyboardNavigating = useRef(false);
    // Guards against phantom hover-selects when the palette opens beneath a
    // resting cursor. Only honour hover after the user has genuinely moved.
    const mouseHasMovedRef = useRef(false);

    // -------------------------------------------------------------------------
    // HELPERS
    // -------------------------------------------------------------------------

    const setActiveTab = useCallback(
      (tabId: string) => {
        // Save current selection
        selectionStateByTab.current[currentTab] = selectedIndex;

        // Switch tab
        if (onTabChange) {
          onTabChange(tabId);
        } else {
          setInternalActiveTab(tabId);
        }

        // Restore selection for new tab (or default to 0)
        setSelectedIndex(selectionStateByTab.current[tabId] ?? 0);
      },
      [currentTab, selectedIndex, onTabChange]
    );

    // -------------------------------------------------------------------------
    // LOAD FILTER DEFINITIONS FOR CURRENT TAB
    // -------------------------------------------------------------------------

    useEffect(() => {
      // Filters only make sense on type-specific tabs (not "all")
      const typeTab = currentTab !== 'all' ? currentTab : null;

      if (!typeTab || !dataProvider?.getFiltersForType) {
        setCurrentFilters([]);
        setActiveFilters([]);
        return;
      }

      let cancelled = false;
      dataProvider.getFiltersForType(typeTab).then((filters) => {
        if (!cancelled) {
          setCurrentFilters(filters);
          setActiveFilters([]); // Reset active selections when switching tabs
        }
      });

      return () => {
        cancelled = true;
      };
    }, [dataProvider, currentTab]);

    // -------------------------------------------------------------------------
    // LOAD RECENTS
    // -------------------------------------------------------------------------

    useEffect(() => {
      if (!isOpen || query || !dataProvider) return;

      // Clear stale recents immediately so switching tabs never flashes
      // cross-type items from the previous tab.
      setRecents([]);

      dataProvider.getRecents(5).then((all) => {
        // Filter recents to the current tab's entity type.
        // "all" tab keeps everything; type-specific tabs keep only their type.
        const filtered =
          currentTab && currentTab !== 'all' ? all.filter((e) => e.type === currentTab) : all;
        setRecents(filtered);
      });
    }, [isOpen, query, dataProvider, currentTab]);

    // -------------------------------------------------------------------------
    // PARSE KEYWORD FILTERS FROM QUERY (e.g., "status:done bug fix")
    // -------------------------------------------------------------------------

    const { textQuery, effectiveFilters } = useMemo(() => {
      if (!query || currentFilters.length === 0) {
        return { textQuery: query, effectiveFilters: activeFilters };
      }
      const parsed = parseKeywordFilters(query, currentFilters);
      if (parsed.filters.length === 0) {
        return { textQuery: query, effectiveFilters: activeFilters };
      }
      return {
        textQuery: parsed.textQuery,
        effectiveFilters: mergeFilters(activeFilters, parsed.filters),
      };
    }, [query, currentFilters, activeFilters]);

    // -------------------------------------------------------------------------
    // SEARCH WITH ABORT CONTROLLER
    // -------------------------------------------------------------------------

    useEffect(() => {
      if (!dataProvider) {
        setResults([]);
        setSections([]);
        setIsLoading(false);
        return;
      }

      let cancelled = false;

      // When query is empty, show all entities (not just recents)
      if (!textQuery) {
        setIsLoading(true);
        setSearchError(null);
        dataProvider
          .search(
            '',
            currentTab === 'all' ? undefined : (currentTab as EntityType),
            effectiveFilters.length > 0 ? effectiveFilters : undefined
          )
          .then((data) => {
            if (cancelled) return;
            if (Array.isArray(data) && data.length > 0 && 'items' in data[0]) {
              const sectionedData = data as PaletteSectionType<Entity>[];
              setSections(sectionedData);
              // Flatten sections into results for keyboard navigation
              const allItems = sectionedData.flatMap((s) => s.items);
              setResults(allItems.slice(0, maxResults));
            } else {
              const flat = data as Entity[];
              setResults(flat);
              setSections([]);
            }
            setIsLoading(false);
          })
          .catch((error) => {
            if (cancelled) return;
            if (error.message === 'Search aborted') return;
            setSearchError(error.message || 'Search failed');
            setResults([]);
            setSections([]);
            setIsLoading(false);
          });
        return () => {
          cancelled = true;
        };
      }

      // Check connection status for specific type filters
      if (currentTab !== 'all') {
        const connected = dataProvider.isSourceConnected(currentTab);
        setIsSourceConnected(connected);
        if (!connected) {
          setResults([]);
          setSections([]);
          setIsLoading(false);
          return;
        }
      } else {
        setIsSourceConnected(true);
      }

      // Cancel previous request
      abortControllerRef.current?.abort();

      // Clear results/error immediately
      setResults([]);
      setSections([]);
      setSearchError(null);
      setIsLoading(true);

      // Debounced search
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
          const typeFilter = currentTab === 'all' ? undefined : currentTab;
          const searchResults = await dataProvider.search(
            textQuery,
            typeFilter,
            effectiveFilters.length > 0 ? effectiveFilters : undefined,
            controller.signal
          );

          // Check if request was aborted
          if (controller.signal.aborted) return;

          // Handle sectioned or flat results
          if (isSectionedResults(searchResults)) {
            setSections(searchResults);
            // Flatten for keyboard navigation
            const allItems = searchResults.flatMap((s) => s.items);
            setResults(allItems.slice(0, maxResults));
          } else {
            setResults(searchResults.slice(0, maxResults));
            setSections([]);
          }

          setSelectedIndex(0);
        } catch (error: unknown) {
          if (error instanceof Error && error.name === 'AbortError') return; // Ignore cancellation
          setSearchError(error instanceof Error ? error.message : 'Search failed');
          setResults([]);
          setSections([]);
        } finally {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        }
      }, SEARCH_DEBOUNCE_MS);

      return () => {
        cancelled = true;
        clearTimeout(debounceRef.current);
        abortControllerRef.current?.abort();
      };
    }, [textQuery, currentTab, dataProvider, maxResults, effectiveFilters, retryCount]);

    // -------------------------------------------------------------------------
    // RESET ON CLOSE
    // -------------------------------------------------------------------------

    useEffect(() => {
      if (!isOpen) {
        setResults([]);
        setSections([]);
        setRecents([]);
        setSearchError(null);
        setSelectedIndex(0);
        selectionStateByTab.current = {};
      } else {
        // Reset on every open so a resting cursor can't steal selection.
        mouseHasMovedRef.current = false;
      }
    }, [isOpen]);

    // -------------------------------------------------------------------------
    // COMPUTED
    // -------------------------------------------------------------------------

    // When there's an active query, only show actual search results — never silently
    // fall back to recents, which would make old recents appear as if they matched.
    // When there's no query, fall back to recents so the palette isn't empty on open.
    const displayItems = results.length > 0 || !!query ? results : recents;
    const hasSections = sections.length > 0;
    const showRecentsHeader = !query && recents.length > 0 && results.length === 0;

    // Show recents at the top of any tab (when no query, no provider-defined
    // sections, and both recents and results exist). On type-specific tabs the
    // recents are already filtered to that type; on "All" they are cross-type.
    const showRecentsAtTop = !query && recents.length > 0 && !hasSections && results.length > 0;

    // Combined navigable list for keyboard navigation.
    // When showing the recents+all layout, recents come first (deduped from results).
    const navigableItems = useMemo(() => {
      if (!showRecentsAtTop) return displayItems;
      const recentIds = new Set(recents.map((e) => e.id));
      const remaining = results.filter((e) => !recentIds.has(e.id));
      return [...recents, ...remaining];
    }, [showRecentsAtTop, recents, results, displayItems]);

    // -------------------------------------------------------------------------
    // HANDLERS
    // -------------------------------------------------------------------------

    const handleSelect = useCallback(
      (entity: Entity) => {
        dataProvider?.markAccessed(entity);
        onSelect(entity);
        onClose();
      },
      [dataProvider, onSelect, onClose]
    );

    // Clear keyboard navigating flag on real mouse movement
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
      mouseHasMovedRef.current = true;
      isKeyboardNavigating.current = false;
      // Set data attribute so CSS hover styles activate only after real movement
      e.currentTarget.setAttribute('data-mouse-active', '');
    }, []);

    const handleHover = useCallback((index: number) => {
      if (mouseHasMovedRef.current && !isKeyboardNavigating.current) {
        setSelectedIndex(index);
      }
    }, []);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent): boolean => {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            isKeyboardNavigating.current = true;
            setSelectedIndex((prev) => (prev < navigableItems.length - 1 ? prev + 1 : 0));
            return true;

          case 'ArrowUp':
            e.preventDefault();
            isKeyboardNavigating.current = true;
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : navigableItems.length - 1));
            return true;

          case 'Enter': {
            e.preventDefault();
            const selected = navigableItems[selectedIndex];
            if (selected) {
              handleSelect(selected);
            }
            return true;
          }

          case 'Escape':
            e.preventDefault();
            onClose();
            return true;

          case 'Tab': {
            e.preventDefault();
            const currentIndex = tabs.findIndex((t) => t.id === currentTab);
            const nextIndex = e.shiftKey
              ? (currentIndex - 1 + tabs.length) % tabs.length
              : (currentIndex + 1) % tabs.length;
            setActiveTab(tabs[nextIndex].id);
            return true;
          }

          default:
            return false;
        }
      },
      [navigableItems, selectedIndex, handleSelect, onClose, tabs, currentTab, setActiveTab]
    );

    useImperativeHandle(
      ref,
      () => ({
        handleKeyDown: (e: React.KeyboardEvent) => handleKeyDown(e),
      }),
      [handleKeyDown]
    );

    // -------------------------------------------------------------------------
    // RENDER
    // -------------------------------------------------------------------------

    if (!isOpen) return null;

    return (
      <PaletteContainer className={className} data-slot="entity-palette" data-palette-type="entity" onMouseMove={handleMouseMove}>
        {/* Tabs */}
        {tabs.length > 0 && (
          <PaletteTabBar tabs={tabs} activeTab={currentTab} onTabChange={setActiveTab} />
        )}

        {/* Filter bar — only renders when the active tab declares filters */}
        <PaletteFilterBar
          filters={currentFilters}
          activeFilters={effectiveFilters}
          onFiltersChange={setActiveFilters}
        />

        {/* Results */}
        <PaletteResultsList>
          {/* Loading */}
          {isLoading && <LoadingState message="Searching..." />}

          {/* Disconnected */}
          {!isLoading && !isSourceConnected && currentTab !== 'all' && (
            <DisconnectedState
              integrationName={tabs.find((t) => t.id === currentTab)?.label || currentTab}
              onConnect={onConnectIntegration ? () => onConnectIntegration(currentTab) : undefined}
            />
          )}

          {/* Error (API-level: rate limit, auth failure, etc.) */}
          {!isLoading && searchError && (
            <ErrorState message={searchError} onRetry={() => setRetryCount((c) => c + 1)} />
          )}

          {/* Empty */}
          {!isLoading &&
            !searchError &&
            isSourceConnected &&
            navigableItems.length === 0 &&
            !hasSections && (
              <EmptyState
                message={query ? 'No results found' : 'No recent items'}
                hint={query ? 'Try a different search term' : undefined}
              />
            )}

          {/* Sectioned results (provider-defined sections) */}
          {!isLoading && isSourceConnected && hasSections && (
            <>
              {sections.map((section) => (
                <div key={section.id}>
                  <PaletteSection title={section.label} isLoading={section.isLoading} />
                  {section.items.map((entity, index) => {
                    // Calculate global index for keyboard navigation
                    const globalIndex =
                      sections
                        .slice(0, sections.indexOf(section))
                        .reduce((acc, s) => acc + s.items.length, 0) + index;

                    return (
                      <PaletteResultItem
                        key={entity.id}
                        title={entity.title}
                        subtitle={entity.subtitle}
                        icon={
                          entity.icon || (
                            <EntityIcon
                              type={entity.type}
                              size={16}
                              iconHint={iconHints?.[entity.type]}
                            />
                          )
                        }
                        metadata={
                          entity.metadata && (
                            <>
                              {entity.metadata.status && (
                                <StatusBadge>{entity.metadata.status}</StatusBadge>
                              )}
                              {entity.metadata.time && <span>{entity.metadata.time}</span>}
                              {entity.metadata.number && (
                                <span className="font-mono">{entity.metadata.number}</span>
                              )}
                            </>
                          )
                        }
                        selected={globalIndex === selectedIndex}
                        onSelect={() => handleSelect(entity)}
                        onHover={() => handleHover(globalIndex)}
                      />
                    );
                  })}
                </div>
              ))}
            </>
          )}

          {/* Non-sectioned results */}
          {!isLoading && isSourceConnected && !hasSections && navigableItems.length > 0 && (
            <>
              {/* "All" tab with no query: recents at top, then full list */}
              {showRecentsAtTop && (
                <>
                  <PaletteSection title="Recent" />
                  {recents.map((entity, index) => (
                    <PaletteResultItem
                      key={entity.id}
                      title={entity.title}
                      subtitle={entity.subtitle}
                      icon={
                        entity.icon || (
                          <EntityIcon
                            type={entity.type}
                            size={16}
                            iconHint={iconHints?.[entity.type]}
                          />
                        )
                      }
                      metadata={
                        entity.metadata && (
                          <>
                            {entity.metadata.status && (
                              <StatusBadge>{entity.metadata.status}</StatusBadge>
                            )}
                            {entity.metadata.time && <span>{entity.metadata.time}</span>}
                            {entity.metadata.number && (
                              <span className="font-mono">{entity.metadata.number}</span>
                            )}
                          </>
                        )
                      }
                      selected={index === selectedIndex}
                      onSelect={() => handleSelect(entity)}
                      onHover={() => handleHover(index)}
                    />
                  ))}
                  {navigableItems.length > recents.length && <PaletteSection title="All" />}
                </>
              )}

              {/* Single-section header (non-"All" tabs showing only recents) */}
              {!showRecentsAtTop && showRecentsHeader && <PaletteSection title="Recent" />}

              {/* Result items — deduped tail when showRecentsAtTop, otherwise full list */}
              {(showRecentsAtTop ? navigableItems.slice(recents.length) : navigableItems).map(
                (entity, index) => {
                  const adjustedIndex = showRecentsAtTop ? index + recents.length : index;
                  return (
                    <PaletteResultItem
                      key={entity.id}
                      title={entity.title}
                      subtitle={entity.subtitle}
                      icon={
                        entity.icon || (
                          <EntityIcon
                            type={entity.type}
                            size={16}
                            iconHint={iconHints?.[entity.type]}
                          />
                        )
                      }
                      metadata={
                        entity.metadata && (
                          <>
                            {entity.metadata.status && (
                              <StatusBadge>{entity.metadata.status}</StatusBadge>
                            )}
                            {entity.metadata.time && <span>{entity.metadata.time}</span>}
                            {entity.metadata.number && (
                              <span className="font-mono">{entity.metadata.number}</span>
                            )}
                          </>
                        )
                      }
                      selected={adjustedIndex === selectedIndex}
                      onSelect={() => handleSelect(entity)}
                      onHover={() => handleHover(adjustedIndex)}
                    />
                  );
                }
              )}
            </>
          )}
        </PaletteResultsList>

        {/* Keyboard hints */}
        <PaletteKeyboardHints />
      </PaletteContainer>
    );
  })
);

EntityPalette.displayName = 'EntityPalette';
