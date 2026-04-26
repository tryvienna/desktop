import { useState, useCallback, useRef } from 'react';
import { Button, Input, Command, CommandEmpty, CommandGroup, CommandItem, CommandList, Popover, PopoverContent, PopoverAnchor } from '@tryvienna/ui';
import { Plus, X } from 'lucide-react';

export interface SuggestionItem {
  value: string;
  description?: string;
}

export interface SuggestionGroup {
  label: string;
  items: SuggestionItem[];
}

interface StringArrayEditorProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  suggestions?: SuggestionGroup[];
}

export function StringArrayEditor({ value, onChange, placeholder = 'Add item...', suggestions }: StringArrayEditorProps) {
  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const add = useCallback((item?: string) => {
    const trimmed = (item ?? draft).trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setDraft('');
  }, [draft, value, onChange]);

  const remove = useCallback((index: number) => {
    onChange(value.filter((_, i) => i !== index));
  }, [value, onChange]);

  // Filter suggestions based on draft text, excluding already-added values
  const filteredGroups = suggestions
    ?.map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          !value.includes(item.value) &&
          (draft === '' || item.value.toLowerCase().includes(draft.toLowerCase()) || item.description?.toLowerCase().includes(draft.toLowerCase()))
      ),
    }))
    .filter((group) => group.items.length > 0);

  const hasSuggestions = filteredGroups && filteredGroups.length > 0;
  const showPopover = focused && hasSuggestions;

  const inputElement = (
    <Input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        // Don't close if clicking inside the popover
        if (containerRef.current?.contains(e.relatedTarget as Node)) return;
        // Small delay to allow click events on popover items to fire
        setTimeout(() => setFocused(false), 150);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          add();
        }
        if (e.key === 'Escape') {
          setFocused(false);
          inputRef.current?.blur();
        }
      }}
      placeholder={placeholder}
      className="h-7 flex-1 text-xs"
    />
  );

  return (
    <div className="flex flex-col gap-2" ref={containerRef}>
      {value.map((item, i) => (
        <div key={`${i}-${item}`} className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
            {item}
          </code>
          <button
            type="button"
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
            onClick={() => remove(i)}
          >
            <X size={12} />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        {suggestions ? (
          <Popover open={showPopover} modal={false}>
            <PopoverAnchor asChild>
              {inputElement}
            </PopoverAnchor>
            <PopoverContent
              className="w-(--radix-popover-trigger-width) p-0"
              align="start"
              side="bottom"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
              onPointerDownOutside={(e) => e.preventDefault()}
              onInteractOutside={(e) => e.preventDefault()}
            >
              <Command shouldFilter={false}>
                <CommandList className="max-h-52">
                  <CommandEmpty>No suggestions</CommandEmpty>
                  {filteredGroups?.map((group) => (
                    <CommandGroup key={group.label} heading={group.label}>
                      {group.items.map((item) => (
                        <CommandItem
                          key={item.value}
                          value={item.value}
                          onSelect={() => {
                            add(item.value);
                            inputRef.current?.focus();
                          }}
                          className="flex flex-col items-start gap-0.5"
                        >
                          <code className="text-xs">{item.value}</code>
                          {item.description && (
                            <span className="text-xs text-muted-foreground">{item.description}</span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        ) : (
          inputElement
        )}
        <Button variant="ghost" size="sm" className="h-7 w-7 shrink-0 p-0" onClick={() => add()} disabled={!draft.trim()}>
          <Plus size={12} />
        </Button>
      </div>
    </div>
  );
}
