/**
 * EntitySearchDialog — Modal for searching and selecting entities to link.
 *
 * Domain-specific, extracted from @tryvienna/ui.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { SearchIcon, XIcon, Loader2Icon } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, Badge, KeyboardHint } from '@tryvienna/ui';
import { useEntityLinking } from './context';
import type { EntitySearchResult, EntityTypeInfo } from './context';

const SEARCH_DEBOUNCE_MS = 150;
const MAX_RESULTS = 20;

interface EntitySearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (result: EntitySearchResult) => void;
  excludeUris: string[];
}

export function EntitySearchDialog({
  open,
  onOpenChange,
  onSelect,
  excludeUris,
}: EntitySearchDialogProps) {
  const adapter = useEntityLinking();
  const [query, setQuery] = useState('');
  const [activeType, setActiveType] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState<EntitySearchResult[]>([]);
  const [entityTypes, setEntityTypes] = useState<EntityTypeInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isKeyboardNavigating = useRef(false);
  const searchIdRef = useRef(0);

  // Load entity types on open
  useEffect(() => {
    if (open) {
      adapter.getEntityTypes().then(
        (types) => setEntityTypes(types),
        () => { /* ignore errors */ },
      );
    }
  }, [open, adapter]);

  // Filter out already-linked entities
  const filteredResults = useMemo(() => {
    return results
      .filter((e) => !excludeUris.includes(e.uri))
      .slice(0, MAX_RESULTS);
  }, [results, excludeUris]);

  // Reset selectedIndex when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredResults]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveType(null);
      setSelectedIndex(0);
      setResults([]);
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;

    clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const id = ++searchIdRef.current;
      setIsLoading(true);
      adapter.searchEntities(
        query || '',
        activeType ? [activeType] : null,
        MAX_RESULTS + excludeUris.length,
      ).then(
        (searchResults) => {
          if (searchIdRef.current === id) {
            setResults(searchResults);
            setIsLoading(false);
          }
        },
        () => {
          if (searchIdRef.current === id) setIsLoading(false);
        },
      );
    }, query ? SEARCH_DEBOUNCE_MS : 0);

    return () => clearTimeout(debounceRef.current);
  }, [open, query, activeType, adapter, excludeUris.length]);

  const handleSelect = useCallback(
    (entity: EntitySearchResult) => {
      onSelect(entity);
      onOpenChange(false);
    },
    [onSelect, onOpenChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          isKeyboardNavigating.current = true;
          setSelectedIndex((prev) =>
            prev < filteredResults.length - 1 ? prev + 1 : 0,
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          isKeyboardNavigating.current = true;
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredResults.length - 1,
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredResults[selectedIndex]) {
            handleSelect(filteredResults[selectedIndex]);
          }
          break;
      }
    },
    [filteredResults, selectedIndex, handleSelect],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-slot="entity-search-dialog"
        className="max-w-[520px] p-0 gap-0 overflow-hidden"
        onKeyDown={handleKeyDown}
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Search entities</DialogTitle>
        {/* Search Input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <SearchIcon className="size-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search entities to link..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="p-0.5 rounded hover:bg-muted transition-colors"
            >
              <XIcon className="size-3.5 text-muted-foreground" />
            </button>
          )}
          {isLoading && (
            <Loader2Icon className="size-4 text-muted-foreground animate-spin shrink-0" />
          )}
        </div>

        {/* Type Filter Bar */}
        {entityTypes.length > 0 && (
          <div className="flex items-center gap-1 px-4 py-2 border-b border-border overflow-x-auto">
            <button
              onClick={() => { setActiveType(null); setSelectedIndex(0); }}
              className={`px-2 py-1 text-xs rounded-md transition-colors shrink-0 ${
                activeType === null
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              All
            </button>
            {entityTypes.filter((et) => et.type).map((et) => (
              <button
                key={et.type}
                onClick={() => { setActiveType(et.type); setSelectedIndex(0); }}
                className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors shrink-0 ${
                  activeType === et.type
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {et.icon && et.icon.startsWith('<')
                  ? <span className="inline-flex size-3 shrink-0 [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: et.icon }} />
                  : et.icon ? <span>{et.icon}</span> : null}
                {et.displayName}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        <div
          className="h-[320px] overflow-y-auto p-1"
          onMouseMove={() => { isKeyboardNavigating.current = false; }}
        >
          {isLoading && filteredResults.length === 0 && (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin mr-2" />
              Searching...
            </div>
          )}

          {!isLoading && filteredResults.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground">
              {query ? 'No entities found' : 'Type to search entities'}
            </div>
          )}

          {filteredResults.map((entity, index) => (
            <button
              key={`${entity.type}-${entity.id}`}
              onClick={() => handleSelect(entity)}
              onMouseEnter={() => {
                if (!isKeyboardNavigating.current) setSelectedIndex(index);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors ${
                index === selectedIndex ? 'bg-accent' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm truncate flex-1">{entity.title}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                {(entity.type ?? '').replace(/_/g, ' ')}
              </Badge>
            </button>
          ))}
        </div>

        {/* Footer with keyboard hints */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-border text-xs text-muted-foreground">
          <KeyboardHint keys="↑↓" label="Navigate" />
          <KeyboardHint keys="↵" label="Select" />
          <KeyboardHint keys="Esc" label="Close" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
