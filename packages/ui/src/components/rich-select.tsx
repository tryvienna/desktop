/**
 * RichSelect -- Custom select with full control over option and value rendering
 *
 * @ai-context
 * - Unlike the Radix Select, supports custom rendering for both options and trigger value
 * - Built with Popover + listbox pattern for full flexibility
 * - Full keyboard navigation (ArrowUp/Down, Enter, Space, Escape)
 * - Use for selects that need icons, descriptions, colors, or any custom content
 * - For simple text-only selects, use the standard Select component instead
 * - All spacing on 8pt grid
 * - data-slot="rich-select"
 *
 * @example
 * <RichSelect
 *   value={model}
 *   onValueChange={setModel}
 *   options={models}
 *   renderOption={(opt, { selected }) => (
 *     <span className="flex items-center gap-2">
 *       <ModelDot color={opt.color} />
 *       <span>{opt.label}</span>
 *     </span>
 *   )}
 *   renderValue={(opt) => (
 *     <span className="flex items-center gap-2">
 *       <ModelDot color={opt.color} />
 *       <span>{opt.label}</span>
 *     </span>
 *   )}
 * />
 */
import * as React from 'react';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import { cn } from '../utils/cn';

interface RichSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  [key: string]: unknown;
}

interface RichSelectProps<T extends RichSelectOption = RichSelectOption> extends Omit<
  React.ComponentProps<'div'>,
  'onChange'
> {
  /** Currently selected value */
  value: string;
  /** Callback when value changes */
  onValueChange: (value: string) => void;
  /** Array of options */
  options: T[];
  /** Custom renderer for each option in the dropdown */
  renderOption?: (option: T, state: { selected: boolean; focused: boolean }) => React.ReactNode;
  /** Custom renderer for the selected value in the trigger */
  renderValue?: (option: T) => React.ReactNode;
  /** Placeholder when no value selected */
  placeholder?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Dropdown direction */
  side?: 'top' | 'bottom';
  /** Trigger size variant */
  size?: 'sm' | 'default';
}

function RichSelect<T extends RichSelectOption = RichSelectOption>({
  value,
  onValueChange,
  options,
  renderOption,
  renderValue,
  placeholder = 'Select...',
  disabled = false,
  side = 'bottom',
  size = 'default',
  className,
  ...props
}: RichSelectProps<T>) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [focusedIndex, setFocusedIndex] = React.useState(-1);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  // Close on outside click
  React.useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (isOpen && focusedIndex >= 0) {
            const option = options[focusedIndex];
            if (option && !option.disabled && option.value !== value) {
              onValueChange(option.value);
            }
            setIsOpen(false);
          } else if (!isOpen) {
            setIsOpen(true);
            setFocusedIndex(options.findIndex((o) => o.value === value));
          }
          break;
        case 'Escape':
          if (isOpen) {
            e.preventDefault();
            setIsOpen(false);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
            setFocusedIndex(options.findIndex((o) => o.value === value));
          } else {
            setFocusedIndex((i) => {
              let next = i + 1;
              while (next < options.length && options[next]?.disabled) next++;
              return next < options.length ? next : i;
            });
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (isOpen) {
            setFocusedIndex((i) => {
              let next = i - 1;
              while (next >= 0 && options[next]?.disabled) next--;
              return next >= 0 ? next : i;
            });
          }
          break;
        case 'Tab':
          if (isOpen) setIsOpen(false);
          break;
      }
    },
    [disabled, isOpen, focusedIndex, value, onValueChange, options]
  );

  const handleSelect = React.useCallback(
    (optionValue: string) => {
      if (!disabled && optionValue !== value) {
        onValueChange(optionValue);
      }
      setIsOpen(false);
    },
    [disabled, value, onValueChange]
  );

  const toggleOpen = React.useCallback(() => {
    if (!disabled) {
      setIsOpen((prev) => {
        if (!prev) {
          setFocusedIndex(options.findIndex((o) => o.value === value));
        }
        return !prev;
      });
    }
  }, [disabled, value, options]);

  return (
    <div
      ref={containerRef}
      className={cn('relative', className)}
      onKeyDown={handleKeyDown}
      data-slot="rich-select"
      {...props}
    >
      <button
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={selectedOption ? `Selected: ${selectedOption.label}` : placeholder}
        onClick={toggleOpen}
        aria-disabled={disabled || undefined}
        className={cn(
          'flex items-center justify-between w-full',
          'rounded-md border bg-transparent text-sm shadow-xs transition-[color,box-shadow]',
          'focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
          size === 'default' && 'h-10 px-3 py-2',
          size === 'sm' && 'h-8 px-3 py-1',
          isOpen ? 'border-ring' : 'border-input hover:border-ring/50',
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled && 'cursor-pointer'
        )}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedOption ? (
            renderValue ? (
              renderValue(selectedOption)
            ) : (
              selectedOption.label
            )
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <ChevronDownIcon
          className={cn(
            'size-4 text-muted-foreground shrink-0 ml-2 transition-transform duration-150',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Options"
          className={cn(
            'absolute z-50 left-0 right-0',
            side === 'top' ? 'bottom-full mb-1' : 'top-full mt-1',
            'bg-popover border border-border rounded-md',
            'shadow-md overflow-hidden',
            'animate-in fade-in-0 zoom-in-95 duration-100'
          )}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isFocused = index === focusedIndex;
            const isDisabled = !!option.disabled;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                aria-disabled={isDisabled || undefined}
                onClick={() => !isDisabled && handleSelect(option.value)}
                onMouseEnter={() => !isDisabled && setFocusedIndex(index)}
                data-slot="rich-select-option"
                className={cn(
                  'flex items-center justify-between w-full',
                  'px-3 py-2 text-left text-sm transition-colors duration-75 outline-none',
                  isSelected && 'bg-accent/50',
                  !isSelected && isFocused && 'bg-accent/30',
                  !isSelected && !isFocused && 'hover:bg-accent/30',
                  isDisabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <span className="flex-1 min-w-0">
                  {renderOption
                    ? renderOption(option as T, { selected: isSelected, focused: isFocused })
                    : option.label}
                </span>
                {isSelected && <CheckIcon className="size-4 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { RichSelect };
export type { RichSelectProps, RichSelectOption };
