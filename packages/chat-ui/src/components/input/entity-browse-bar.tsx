/**
 * EntityBrowseBar — Dedicated search experience for Cmd+P entity browsing
 *
 * @ai-context
 * - Replaces the text input when entity browse mode is active (Cmd+P)
 * - Same container shape as ChatInput for seamless AnimatePresence morph
 * - Search input + EntityPalette in a single focused component
 * - Escape or entity selection closes and restores the normal input
 * - data-slot="entity-browse-bar"
 */

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@tryvienna/ui';
import { EntityPalette } from '../palette/entity-palette';
import type {
  Entity as PaletteEntity,
  EntityPaletteDataProvider,
  PaletteTab,
  PaletteHandle,
} from '../palette/types';

export interface EntityBrowseBarProps {
  dataProvider: EntityPaletteDataProvider;
  tabs: PaletteTab[];
  onSelect: (entity: PaletteEntity) => void;
  onClose: () => void;
  iconHints?: Record<string, string>;
}

export const EntityBrowseBar = memo(function EntityBrowseBar({
  dataProvider,
  tabs,
  onSelect,
  onClose,
  iconHints,
}: EntityBrowseBarProps) {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const paletteRef = useRef<PaletteHandle>(null);

  // Auto-focus on mount
  useEffect(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      paletteRef.current?.handleKeyDown(e);
    },
    [onClose]
  );

  const handleSelect = useCallback(
    (entity: PaletteEntity) => {
      onSelect(entity);
    },
    [onSelect]
  );

  return (
    <div data-slot="entity-browse-bar" className="relative">
      {/* Entity Palette (floating above input) */}
      <div className="absolute bottom-full left-0 right-0 mb-2">
        <EntityPalette
          ref={paletteRef}
          isOpen={true}
          onClose={onClose}
          onSelect={handleSelect}
          dataProvider={dataProvider}
          query={query}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={tabs}
          iconHints={iconHints}
        />
      </div>

      {/* Search input container — matches ChatInputUnified shape */}
      <div
        className={cn(
          'flex flex-col p-3',
          'bg-surface-page border border-border-default rounded-xl',
          'transition-colors focus-within:border-ai'
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
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search entities..."
            className={cn(
              'flex-1 bg-transparent outline-none',
              'text-[14px] leading-[1.5] text-foreground',
              'placeholder:text-muted-foreground'
            )}
          />
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'text-[11px] text-muted-foreground',
              'px-1.5 py-0.5 rounded border border-border-muted',
              'hover:bg-surface-hover transition-colors'
            )}
          >
            ESC
          </button>
        </div>
      </div>
    </div>
  );
});
