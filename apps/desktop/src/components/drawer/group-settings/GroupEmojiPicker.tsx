/**
 * GroupEmojiPicker — Popover-based emoji picker for workstream group icons.
 *
 * @ai-context
 * - Opens a popover with a search-filterable grid of curated emojis
 * - Search input auto-focuses on open for smooth keyboard-first flow
 * - Selecting an emoji calls onSelect and closes the popover
 * - "Remove" button clears the emoji (sets to null)
 * - data-slot="group-emoji-picker"
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Smile, X } from 'lucide-react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  Button,
} from '@tryvienna/ui';
import { EMOJI_CATEGORIES } from '../../../renderer/utils/group-emojis';
import type { EmojiEntry } from '../../../renderer/utils/group-emojis';

export interface GroupEmojiPickerProps {
  value: string | null;
  onSelect: (emoji: string | null) => void;
}

export function GroupEmojiPicker({ value, onSelect }: GroupEmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus search input when popover opens
  useEffect(() => {
    if (open) {
      // Delay to let popover render before focusing
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    } else {
      setSearch('');
    }
  }, [open]);

  const handleSelect = useCallback(
    (emoji: string) => {
      onSelect(emoji);
      setOpen(false);
    },
    [onSelect],
  );

  const handleRemove = useCallback(() => {
    onSelect(null);
    setOpen(false);
  }, [onSelect]);

  const lowerSearch = search.toLowerCase();
  const filteredCategories = EMOJI_CATEGORIES.map((cat) => ({
    ...cat,
    emojis: cat.emojis.filter(
      (e) =>
        e.label.toLowerCase().includes(lowerSearch) ||
        e.emoji.includes(search),
    ),
  })).filter((cat) => cat.emojis.length > 0);

  // Detect if the search input itself is an emoji (for typing/pasting custom emojis)
  const trimmed = search.trim();
  const isCustomEmoji = trimmed.length > 0 && filteredCategories.length === 0;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && trimmed) {
        e.preventDefault();
        handleSelect(trimmed);
      }
    },
    [trimmed, handleSelect],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-border-muted px-3 py-2 text-sm hover:bg-accent/50 transition-colors"
          data-slot="group-emoji-picker"
        >
          {value ? (
            <span className="text-lg leading-none">{value}</span>
          ) : (
            <Smile size={16} className="text-muted-foreground" />
          )}
          <span className="text-muted-foreground">
            {value ? 'Change icon' : 'Add icon'}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-72 p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="p-2 border-b border-border-muted">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search or type an emoji..."
            className="w-full px-2 py-1.5 text-xs bg-transparent border border-border-muted rounded-md outline-none focus:border-ai transition-colors"
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-2">
          {filteredCategories.map((cat) => (
            <div key={cat.name} className="mb-2">
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-1 mb-1">
                {cat.name}
              </div>
              <div className="grid grid-cols-8 gap-0.5">
                {cat.emojis.map((entry: EmojiEntry) => (
                  <button
                    key={entry.emoji}
                    type="button"
                    onClick={() => handleSelect(entry.emoji)}
                    className="flex items-center justify-center rounded-md p-1.5 text-lg hover:bg-accent/50 transition-colors"
                    title={entry.label}
                  >
                    {entry.emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {isCustomEmoji && (
            <button
              type="button"
              onClick={() => handleSelect(trimmed)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-accent/50 transition-colors"
            >
              <span className="text-lg leading-none">{trimmed}</span>
              <span className="text-xs text-muted-foreground">Use "{trimmed}"</span>
              <span className="ml-auto text-[10px] text-muted-foreground">↵</span>
            </button>
          )}
          {filteredCategories.length === 0 && !isCustomEmoji && (
            <div className="py-4 text-center text-xs text-muted-foreground">
              No emojis found
            </div>
          )}
        </div>
        {value && (
          <div className="border-t border-border-muted p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-2 text-muted-foreground"
              onClick={handleRemove}
            >
              <X size={14} />
              Remove icon
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
