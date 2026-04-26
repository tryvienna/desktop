/**
 * CommandPalette — Command execution palette triggered by / in chat input
 *
 * @ai-context
 * - Renders the / command palette with tab-based filtering and search
 * - Tab selection memory persists across tab switches
 * - AbortController for debounced search cancellation
 * - Keyboard navigation (up/down/Enter/Esc/Tab)
 * - data-slot="command-palette"
 *
 * @example
 * <CommandPalette isOpen={open} onClose={close} onExecute={exec} dataProvider={provider} />
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
import { createRendererLogger } from '@vienna/logger/renderer';

import { CommandIcon } from './icons';
import {
  PaletteContainer,
  PaletteTabBar,
  PaletteResultsList,
  PaletteResultItem,
  PaletteSection,
  EmptyState,
  LoadingState,
  PaletteKeyboardHints,
  KeyboardShortcutDisplay,
} from './primitives';
import type { Command, CommandPaletteProps, PaletteHandle } from './types';

const logger = createRendererLogger();

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_MAX_RESULTS = 20;

// =============================================================================
// COMPONENT
// =============================================================================

export const CommandPalette = memo(
  forwardRef<PaletteHandle, CommandPaletteProps>(function CommandPalette(
    {
      isOpen,
      onClose,
      onExecute,
      dataProvider,
      query = '',
      activeTab,
      onTabChange,
      tabs = [],
      maxResults = DEFAULT_MAX_RESULTS,
      className,
      flowRegistry,
      fallbackCommand,
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

    const [results, setResults] = useState<Command[]>([]);
    const [allCommands, setAllCommands] = useState<Command[]>([]);
    const [recents, setRecents] = useState<Command[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // -------------------------------------------------------------------------
    // REFS
    // -------------------------------------------------------------------------

    const abortControllerRef = useRef<AbortController | undefined>(undefined);
    // Guards against phantom hover-selects when the palette opens beneath a
    // resting cursor. The browser synthesises mouseenter for elements that
    // appear under the pointer without any pointer movement. We only honour
    // hover-based selection after the user has genuinely moved the mouse.
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
    // LOAD ALL COMMANDS AND RECENTS
    // -------------------------------------------------------------------------

    useEffect(() => {
      if (isOpen && dataProvider) {
        Promise.all([dataProvider.getCommands(), dataProvider.getRecents(5)]).then(
          ([commands, recent]) => {
            setAllCommands(commands);
            setRecents(recent);
          }
        );
      }
    }, [isOpen, dataProvider]);

    // -------------------------------------------------------------------------
    // SEARCH WITH ABORT CONTROLLER
    // -------------------------------------------------------------------------

    useEffect(() => {
      if (!dataProvider || !query) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      // Cancel previous request
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Commands are in-memory (Fuse.js) — search immediately, no debounce
      const categoryFilter = currentTab === 'all' ? undefined : currentTab;
      dataProvider.search(query, categoryFilter, controller.signal).then((searchResults) => {
        if (controller.signal.aborted) return;
        setResults(searchResults.slice(0, maxResults));
        setSelectedIndex(0);
      }).catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        logger.error('Search error', { error: error instanceof Error ? error.message : String(error) });
        setResults([]);
      });

      return () => {
        controller.abort();
      };
    }, [query, currentTab, dataProvider, maxResults]);

    // -------------------------------------------------------------------------
    // RESET ON CLOSE
    // -------------------------------------------------------------------------

    useEffect(() => {
      if (!isOpen) {
        setResults([]);
        setAllCommands([]);
        setRecents([]);
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

    // Display items: search results, or filtered commands, or recents
    const displayItems = useMemo(() => {
      if (query) {
        return results; // Search results
      }
      if (currentTab === 'all') {
        return allCommands.slice(0, maxResults); // All commands
      }
      // Filter by category
      return allCommands.filter((c) => c.category === currentTab).slice(0, maxResults);
    }, [query, results, currentTab, allCommands, maxResults]);

    // Fallback command shown at the bottom when the user is searching
    const fallback = useMemo(() => {
      if (query && fallbackCommand) {
        return fallbackCommand(query);
      }
      return undefined;
    }, [query, fallbackCommand]);

    // Show sections when on "All" tab with no query
    const showSections = !query && currentTab === 'all' && recents.length > 0;

    // Combined navigable items (recents + display items + optional fallback)
    const navigableItems = useMemo(() => {
      const base = showSections ? [...recents, ...displayItems] : displayItems;
      if (fallback) return [...base, fallback];
      return base;
    }, [showSections, recents, displayItems, fallback]);

    // -------------------------------------------------------------------------
    // HANDLERS
    // -------------------------------------------------------------------------

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
      mouseHasMovedRef.current = true;
      // Set data attribute so CSS hover styles activate only after real movement
      e.currentTarget.setAttribute('data-mouse-active', '');
    }, []);

    const handleExecute = useCallback(
      (command: Command) => {
        if (command.disabled) return;
        dataProvider?.markRecent(command);
        onExecute(command);
        // Don't close if command has a flow - parent will handle this
        if (!flowRegistry || !flowRegistry[command.id]) {
          onClose();
        }
      },
      [dataProvider, onExecute, onClose, flowRegistry]
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent): boolean => {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setSelectedIndex((prev) => (prev < navigableItems.length - 1 ? prev + 1 : 0));
            return true;

          case 'ArrowUp':
            e.preventDefault();
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : navigableItems.length - 1));
            return true;

          case 'Enter': {
            e.preventDefault();
            const selected = navigableItems[selectedIndex];
            if (selected && !selected.disabled) {
              handleExecute(selected);
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
      [navigableItems, selectedIndex, handleExecute, onClose, tabs, currentTab, setActiveTab]
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
      <PaletteContainer
        className={className}
        data-slot="command-palette"
        data-palette-type="command"
        onMouseMove={handleMouseMove}
      >
        {/* Tabs */}
        {tabs.length > 0 && (
          <PaletteTabBar tabs={tabs} activeTab={currentTab} onTabChange={setActiveTab} />
        )}

        {/* Results */}
        <PaletteResultsList>
          {/* Loading */}
          {isLoading && <LoadingState message="Searching..." />}

          {/* Empty (only when no fallback available either) */}
          {!isLoading && navigableItems.length === 0 && (
            <EmptyState
              message={query ? 'No commands found' : 'No commands available'}
              hint={query ? 'Try a different search term' : undefined}
            />
          )}

          {/* Results with sections */}
          {!isLoading && navigableItems.length > 0 && (
            <>
              {/* Recent section */}
              {showSections && (
                <>
                  <PaletteSection title="Recent" />
                  {recents.map((command, index) => (
                    <PaletteResultItem
                      key={`recent-${command.id}`}
                      title={command.title}
                      subtitle={
                        command.disabled && command.disabledReason
                          ? command.disabledReason
                          : command.description
                      }
                      icon={command.icon || <CommandIcon category={command.category} size={16} />}
                      metadata={
                        command.shortcut && (
                          <KeyboardShortcutDisplay shortcut={command.shortcut} size="sm" />
                        )
                      }
                      selected={index === selectedIndex}
                      disabled={command.disabled}
                      onSelect={() => handleExecute(command)}
                      onHover={() => {
                        if (mouseHasMovedRef.current) setSelectedIndex(index);
                      }}
                    />
                  ))}
                  <PaletteSection title="All Commands" />
                </>
              )}

              {/* All commands */}
              {displayItems.map((command, index) => {
                const adjustedIndex = showSections ? index + recents.length : index;
                return (
                  <PaletteResultItem
                    key={command.id}
                    title={command.title}
                    subtitle={
                      command.disabled && command.disabledReason
                        ? command.disabledReason
                        : command.description
                    }
                    icon={command.icon || <CommandIcon category={command.category} size={16} />}
                    metadata={
                      command.shortcut && (
                        <KeyboardShortcutDisplay shortcut={command.shortcut} size="sm" />
                      )
                    }
                    selected={adjustedIndex === selectedIndex}
                    disabled={command.disabled}
                    onSelect={() => handleExecute(command)}
                    onHover={() => {
                      if (mouseHasMovedRef.current) setSelectedIndex(adjustedIndex);
                    }}
                  />
                );
              })}

              {/* Fallback: any-command escape hatch */}
              {fallback && (
                <PaletteResultItem
                  key="fallback-any-command"
                  title={fallback.title}
                  subtitle={fallback.description}
                  icon={fallback.icon || <CommandIcon category={fallback.category} size={16} />}
                  selected={navigableItems.length - 1 === selectedIndex}
                  onSelect={() => handleExecute(fallback)}
                  onHover={() => {
                    if (mouseHasMovedRef.current) setSelectedIndex(navigableItems.length - 1);
                  }}
                />
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

CommandPalette.displayName = 'CommandPalette';
