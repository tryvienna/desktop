/**
 * Combobox — Advanced combobox with single and multi-select support
 *
 * @ai-context
 * - Built on Command (cmdk) + Popover for searchable dropdown selection
 * - Single-select: value is string, displays selected label in trigger
 * - Multi-select: value is string[], displays badges with remove buttons
 * - Supports grouped options, creatable items, icons, disabled state
 * - 8pt grid fixes: min-h-9 → min-h-10, gap-0.5 → gap-1, pr-0.5 → pr-1, ml-0.5 → ml-1, p-0.5 → p-1
 * - All spacing on 4px sub-grid
 * - data-slot="combobox"
 *
 * @example
 * // Single select
 * <Combobox
 *   options={[{ label: 'React', value: 'react' }]}
 *   value={selected}
 *   onValueChange={setSelected}
 *   placeholder="Select framework..."
 * />
 *
 * // Multi select
 * <Combobox
 *   options={options}
 *   value={selectedItems}
 *   onValueChange={setSelectedItems}
 *   multiple
 *   placeholder="Select tags..."
 * />
 */
import * as React from 'react';
import { CheckIcon, ChevronDownIcon, PlusIcon, XIcon } from 'lucide-react';
import { cn } from '../utils/cn';
import { Badge } from './badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

interface ComboboxOption {
  label: string;
  value: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface ComboboxGroup {
  label?: string;
  options: ComboboxOption[];
}

interface ComboboxBaseProps extends Omit<React.ComponentProps<'div'>, 'onChange'> {
  options: ComboboxOption[] | ComboboxGroup[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  onCreateOption?: (inputValue: string) => void;
  /** Start with the popover open (read on mount only — conditionally render to re-trigger) */
  defaultOpen?: boolean;
  /** Called when the popover open state changes */
  onOpenChange?: (open: boolean) => void;
}

interface ComboboxSingleProps extends ComboboxBaseProps {
  multiple?: false;
  value: string;
  onValueChange: (value: string) => void;
}

interface ComboboxMultiProps extends ComboboxBaseProps {
  multiple: true;
  value: string[];
  onValueChange: (value: string[]) => void;
}

type ComboboxProps = ComboboxSingleProps | ComboboxMultiProps;

function isGrouped(options: ComboboxOption[] | ComboboxGroup[]): options is ComboboxGroup[] {
  return options.length > 0 && 'options' in options[0];
}

function flattenOptions(options: ComboboxOption[] | ComboboxGroup[]): ComboboxOption[] {
  if (isGrouped(options)) {
    return options.flatMap((group) => group.options);
  }
  return options;
}

function Combobox({
  options,
  value,
  onValueChange,
  multiple = false,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyText = 'No results found.',
  disabled = false,
  onCreateOption,
  defaultOpen = false,
  onOpenChange: onOpenChangeProp,
  className,
  ...props
}: ComboboxProps) {
  const [open, setOpenInternal] = React.useState(defaultOpen);
  const setOpen = React.useCallback((nextOpen: boolean) => {
    setOpenInternal(nextOpen);
    onOpenChangeProp?.(nextOpen);
  }, [onOpenChangeProp]);
  const [search, setSearch] = React.useState('');

  const allOptions = React.useMemo(() => flattenOptions(options), [options]);
  const selectedValues = multiple ? (value as string[]) : value ? [value as string] : [];

  const getLabel = (val: string) => {
    const option = allOptions.find((o) => o.value === val);
    return option?.label ?? val;
  };

  const getOption = (val: string) => {
    return allOptions.find((o) => o.value === val);
  };

  const handleSelect = React.useCallback(
    (optionValue: string) => {
      if (multiple) {
        const current = value as string[];
        const onChange = onValueChange as (value: string[]) => void;
        if (current.includes(optionValue)) {
          onChange(current.filter((v) => v !== optionValue));
        } else {
          onChange([...current, optionValue]);
        }
      } else {
        const onChange = onValueChange as (value: string) => void;
        onChange(optionValue === value ? '' : optionValue);
        setOpen(false);
      }
      setSearch('');
    },
    [multiple, value, onValueChange]
  );

  const handleRemove = React.useCallback(
    (optionValue: string) => {
      if (multiple) {
        const current = value as string[];
        const onChange = onValueChange as (value: string[]) => void;
        onChange(current.filter((v) => v !== optionValue));
      }
    },
    [multiple, value, onValueChange]
  );

  const handleCreate = React.useCallback(() => {
    if (onCreateOption && search.trim()) {
      onCreateOption(search.trim());
      setSearch('');
    }
  }, [onCreateOption, search]);

  const showCreate =
    onCreateOption &&
    search.trim() &&
    !allOptions.some((o) => o.label.toLowerCase() === search.trim().toLowerCase());

  const renderOptions = (optionList: ComboboxOption[]) =>
    optionList.map((option) => (
      <CommandItem
        key={option.value}
        value={option.label}
        disabled={option.disabled}
        onSelect={() => handleSelect(option.value)}
      >
        <CheckIcon
          className={cn(
            'size-4 shrink-0',
            selectedValues.includes(option.value) ? 'opacity-100' : 'opacity-0'
          )}
        />
        {option.icon && <span className="shrink-0">{option.icon}</span>}
        {option.label}
      </CommandItem>
    ));

  return (
    <div data-slot="combobox" className={cn('w-full', className)} {...props}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "border-input [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50 flex w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
              multiple ? 'min-h-10 h-auto' : 'h-10',
              !value || (multiple && (value as string[]).length === 0)
                ? 'text-muted-foreground'
                : ''
            )}
          >
            {multiple && selectedValues.length > 0 ? (
              <div className="flex flex-wrap gap-1 p-1 overflow-hidden">
                {selectedValues.map((v) => {
                  const option = getOption(v);
                  return (
                    <Badge key={v} variant="secondary" className="gap-1 pr-1">
                      {option?.icon}
                      {getLabel(v)}
                      <span
                        role="button"
                        tabIndex={0}
                        className="ml-1 inline-flex items-center justify-center rounded-full hover:bg-foreground/20 size-4 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(v);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemove(v);
                          }
                        }}
                        aria-label={`Remove ${getLabel(v)}`}
                      >
                        <XIcon className="size-3" />
                      </span>
                    </Badge>
                  );
                })}
              </div>
            ) : selectedValues.length === 1 ? (
              <span className="flex items-center gap-2 truncate">
                {getOption(selectedValues[0])?.icon}
                {getLabel(selectedValues[0])}
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
          <Command shouldFilter>
            <CommandInput
              placeholder={searchPlaceholder}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              {isGrouped(options) ? (
                options.map((group, index) => (
                  <CommandGroup key={group.label ?? index} heading={group.label}>
                    {renderOptions(group.options)}
                  </CommandGroup>
                ))
              ) : (
                <CommandGroup>{renderOptions(options)}</CommandGroup>
              )}
              {showCreate && (
                <CommandGroup>
                  <CommandItem onSelect={handleCreate}>
                    <PlusIcon className="size-4 shrink-0" />
                    Create &quot;{search.trim()}&quot;
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export { Combobox };
export type { ComboboxProps, ComboboxOption, ComboboxGroup };
