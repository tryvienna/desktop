/**
 * GlobalSearchBrowseBar — Dedicated search experience for Cmd+Shift+F content search
 *
 * @ai-context
 * - Replaces the text input when global search mode is active (Cmd+Shift+F)
 * - Same container shape as ChatInput for seamless AnimatePresence morph
 * - Search input + results panel showing matches grouped by file
 * - Click a match → opens file at line in editor drawer
 * - Escape closes and restores the normal input
 * - data-slot="global-search-browse-bar"
 */

import { memo, useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { createRendererLogger } from '@vienna/logger/renderer';
import { cn } from '@tryvienna/ui';

const logger = createRendererLogger();

// =============================================================================
// TYPES
// =============================================================================

export interface ContentMatch {
  line: number;
  text: string;
  matchStart: number;
  matchEnd: number;
}

export interface ContentSearchFileResult {
  path: string;
  relativePath: string;
  projectRoot: string;
  matches: ContentMatch[];
}

export interface ContentSearchResult {
  results: ContentSearchFileResult[];
  totalMatches: number;
  truncated: boolean;
}

export interface ContentSearchOpts {
  caseSensitive?: boolean;
  regex?: boolean;
  glob?: string;
  includeIgnored?: boolean;
}

export interface GlobalSearchBrowseBarProps {
  onSearch: (query: string, opts?: ContentSearchOpts) => Promise<ContentSearchResult>;
  onSelect: (filePath: string, lineNumber: number) => void;
  onClose: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const SEARCH_DEBOUNCE_MS = 300;
const MAX_LINE_DISPLAY = 200; // max chars to display per line

// =============================================================================
// COMPONENT
// =============================================================================

export const GlobalSearchBrowseBar = memo(function GlobalSearchBrowseBar({
  onSearch,
  onSelect,
  onClose,
}: GlobalSearchBrowseBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ContentSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());
  const [includeIgnored, setIncludeIgnored] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Auto-focus on mount
  useEffect(() => {
    logger.info('GlobalSearchBrowseBar mounted');
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  // Build flat list of selectable items for keyboard nav
  const selectableItems = useMemo(() => {
    if (!results) return [];
    const items: Array<{ filePath: string; line: number }> = [];
    for (const file of results.results) {
      if (collapsedFiles.has(file.path)) continue;
      for (const match of file.matches) {
        items.push({ filePath: file.path, line: match.line });
      }
    }
    return items;
  }, [results, collapsedFiles]);

  // Perform search with debounce
  const doSearch = useCallback(
    (searchQuery: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortRef.current) {
        abortRef.current.abort();
      }

      if (!searchQuery.trim()) {
        setResults(null);
        setIsSearching(false);
        setSearchError(null);
        setSelectedIndex(0);
        return;
      }

      setIsSearching(true);

      debounceRef.current = setTimeout(async () => {
        const controller = new AbortController();
        abortRef.current = controller;

        logger.info('Executing search', { query: searchQuery, includeIgnored, caseSensitive });
        try {
          const result = await onSearch(searchQuery, { includeIgnored, caseSensitive });
          logger.info('Search returned', {
            query: searchQuery,
            resultCount: result.results.length,
            totalMatches: result.totalMatches,
          });
          if (!controller.signal.aborted) {
            setResults(result);
            setSearchError(null);
            setSelectedIndex(0);
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          logger.error('Search failed', { query: searchQuery, error: errorMsg });
          if (!controller.signal.aborted) {
            setResults(null);
            setSearchError(errorMsg);
          }
        } finally {
          if (!controller.signal.aborted) {
            setIsSearching(false);
          }
        }
      }, SEARCH_DEBOUNCE_MS);
    },
    [onSearch, includeIgnored, caseSensitive],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);
      doSearch(value);
    },
    [doSearch],
  );

  // Re-search when search options change
  const optionsInitRef = useRef(true);
  useEffect(() => {
    if (optionsInitRef.current) {
      optionsInitRef.current = false;
      return;
    }
    if (query.trim()) {
      doSearch(query);
    }
  }, [includeIgnored, caseSensitive]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleFile = useCallback((filePath: string) => {
    setCollapsedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  }, []);

  const handleMatchClick = useCallback(
    (filePath: string, line: number) => {
      onSelect(filePath, line);
    },
    [onSelect],
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (selectableItems.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % selectableItems.length);
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + selectableItems.length) % selectableItems.length);
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const item = selectableItems[selectedIndex];
        if (item) {
          onSelect(item.filePath, item.line);
        }
        return;
      }
    },
    [onClose, selectableItems, selectedIndex, onSelect],
  );

  // Scroll selected item into view
  useEffect(() => {
    const container = resultsRef.current;
    if (!container) return;
    const selected = container.querySelector('[data-selected="true"]');
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // Build a flat offset map for keyboard navigation (concurrent-mode safe)
  const flatOffsets = useMemo(() => {
    if (!results) return new Map<string, number>();
    const offsets = new Map<string, number>();
    let offset = 0;
    for (const file of results.results) {
      offsets.set(file.path, offset);
      if (!collapsedFiles.has(file.path)) {
        offset += file.matches.length;
      }
    }
    return offsets;
  }, [results, collapsedFiles]);

  return (
    <div data-slot="global-search-browse-bar" className="relative">
      {/* Results panel (floating above input) */}
      <div className="absolute bottom-full left-0 right-0 mb-2">
        <div
          ref={resultsRef}
          id="global-search-results"
          role="listbox"
          aria-label="Search results"
          className={cn(
            'max-h-[388px] overflow-y-auto rounded-xl',
            'bg-surface-page border border-border-default',
            'shadow-lg',
          )}
        >
          {isSearching && !results && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <svg
                className="animate-spin h-4 w-4 mr-2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="12" cy="12" r="10" opacity="0.25" />
                <path d="M4 12a8 8 0 018-8" opacity="0.75" />
              </svg>
              <span className="text-xs">Searching...</span>
            </div>
          )}

          {searchError && !isSearching && (
            <div className="flex items-center justify-center py-8 text-destructive">
              <span className="text-xs">Search failed: {searchError}</span>
            </div>
          )}

          {!searchError && results && results.results.length === 0 && query.trim() && !isSearching && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <span className="text-xs">No results found</span>
            </div>
          )}

          {results && results.results.length > 0 && (
            <>
              {/* Summary bar */}
              <div className="sticky top-0 z-10 bg-surface-page border-b border-border-muted px-3 py-1.5 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  {results.totalMatches} result{results.totalMatches !== 1 ? 's' : ''} in{' '}
                  {results.results.length} file{results.results.length !== 1 ? 's' : ''}
                  {results.truncated && ' (truncated)'}
                </span>
                {isSearching && (
                  <span className="text-[11px] text-muted-foreground">Updating...</span>
                )}
              </div>

              {/* File groups */}
              {results.results.map((file) => {
                const isCollapsed = collapsedFiles.has(file.path);
                return (
                  <div key={file.path} className="border-b border-border-muted last:border-b-0">
                    {/* File header */}
                    <button
                      type="button"
                      onClick={() => handleToggleFile(file.path)}
                      className={cn(
                        'w-full flex items-center gap-1.5 px-3 py-1.5',
                        'hover:bg-surface-hover transition-colors text-left',
                      )}
                    >
                      <svg
                        width={12}
                        height={12}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        className={cn(
                          'shrink-0 text-muted-foreground transition-transform',
                          isCollapsed ? '' : 'rotate-90',
                        )}
                      >
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                      <span className="text-[12px] font-medium text-foreground truncate">
                        {file.relativePath}
                      </span>
                      <span className="text-[11px] text-muted-foreground ml-auto shrink-0">
                        {file.matches.length}
                      </span>
                    </button>

                    {/* Match lines */}
                    {!isCollapsed &&
                      file.matches.map((match, mi) => {
                        const currentIndex = (flatOffsets.get(file.path) ?? 0) + mi;
                        const isSelected = currentIndex === selectedIndex;
                        return (
                          <button
                            key={`${match.line}-${mi}`}
                            id={`search-match-${currentIndex}`}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            data-selected={isSelected}
                            onClick={() => handleMatchClick(file.path, match.line)}
                            className={cn(
                              'w-full flex items-start gap-2 px-3 py-1 text-left',
                              'hover:bg-surface-hover transition-colors',
                              isSelected && 'bg-surface-hover',
                            )}
                          >
                            <span className="text-[11px] text-muted-foreground w-8 text-right shrink-0 pt-px">
                              {match.line}
                            </span>
                            <span className="text-[12px] text-foreground font-mono truncate">
                              <HighlightedLine
                                text={match.text.slice(0, MAX_LINE_DISPLAY)}
                                matchStart={match.matchStart}
                                matchEnd={Math.min(match.matchEnd, MAX_LINE_DISPLAY)}
                              />
                            </span>
                          </button>
                        );
                      })}
                  </div>
                );
              })}
            </>
          )}

          {!results && !isSearching && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <span className="text-xs">Type to search file contents</span>
            </div>
          )}
        </div>
      </div>

      {/* Search input container — matches ChatInputUnified shape */}
      <div
        className={cn(
          'flex flex-col p-3',
          'bg-surface-page border border-border-default rounded-xl',
          'transition-colors focus-within:border-ai',
        )}
      >
        <div className="flex items-center gap-2">
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground shrink-0"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            placeholder="Search in files..."
            role="combobox"
            aria-expanded={!!results && results.results.length > 0}
            aria-controls="global-search-results"
            aria-activedescendant={selectableItems.length > 0 ? `search-match-${selectedIndex}` : undefined}
            aria-label="Search in files"
            className={cn(
              'flex-1 bg-transparent outline-none',
              'text-[14px] leading-[1.5] text-foreground',
              'placeholder:text-muted-foreground',
            )}
          />
          <button
            type="button"
            onClick={() => setCaseSensitive((prev) => !prev)}
            title={caseSensitive ? 'Case sensitive (click for insensitive)' : 'Case insensitive (click for sensitive)'}
            className={cn(
              'text-[11px] shrink-0',
              'px-1.5 py-0.5 rounded border transition-colors',
              caseSensitive
                ? 'text-foreground border-ai bg-ai/10'
                : 'text-muted-foreground border-border-muted hover:bg-surface-hover',
            )}
          >
            <span className="flex items-center gap-0.5 font-mono font-semibold text-[12px] leading-none">
              Aa
            </span>
          </button>
          <button
            type="button"
            onClick={() => setIncludeIgnored((prev) => !prev)}
            title={includeIgnored ? 'Showing gitignored files (click to hide)' : 'Hiding gitignored files (click to show)'}
            className={cn(
              'text-[11px] shrink-0',
              'px-1.5 py-0.5 rounded border transition-colors',
              includeIgnored
                ? 'text-foreground border-ai bg-ai/10'
                : 'text-muted-foreground border-border-muted hover:bg-surface-hover',
            )}
          >
            {/* Eye icon for gitignored files */}
            <span className="flex items-center gap-1">
              <svg
                width={12}
                height={12}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
                {!includeIgnored && <path d="m2 2 20 20" />}
              </svg>
              .gitignore
            </span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'text-[11px] text-muted-foreground shrink-0',
              'px-1.5 py-0.5 rounded border border-border-muted',
              'hover:bg-surface-hover transition-colors',
            )}
          >
            ESC
          </button>
        </div>
      </div>
    </div>
  );
});

// =============================================================================
// HIGHLIGHTED LINE
// =============================================================================

function HighlightedLine({
  text,
  matchStart,
  matchEnd,
}: {
  text: string;
  matchStart: number;
  matchEnd: number;
}) {
  if (matchStart >= text.length || matchEnd <= 0 || matchStart >= matchEnd) {
    return <>{text}</>;
  }

  const before = text.slice(0, matchStart);
  const match = text.slice(matchStart, matchEnd);
  const after = text.slice(matchEnd);

  return (
    <>
      {before}
      <span className="bg-yellow-500/30 text-foreground font-semibold rounded-sm px-px">
        {match}
      </span>
      {after}
    </>
  );
}
