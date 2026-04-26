/**
 * SearchFilterBar — Search input with optional filter dropdown
 *
 * @ai-context
 * - Combined search input with optional Select-based filter
 * - Search icon on left, clear button on right when value present
 * - 8pt grid fixes: left-2.5 → left-3, right-2.5 → right-3
 * - All icon positions on 4px sub-grid
 * - data-slot="search-filter-bar"
 *
 * @example
 * <SearchFilterBar
 *   value={search}
 *   onChange={setSearch}
 *   placeholder="Search items..."
 *   filter={{
 *     value: statusFilter,
 *     onChange: setStatusFilter,
 *     placeholder: 'All statuses',
 *     options: [
 *       { label: 'Active', value: 'active' },
 *       { label: 'Archived', value: 'archived' },
 *     ],
 *   }}
 * />
 */
import * as React from 'react';
import { SearchIcon, XIcon } from 'lucide-react';
import { cn } from '../utils/cn';
import { Input } from './input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterConfig {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  options: FilterOption[];
}

interface SearchFilterBarProps extends Omit<React.ComponentProps<'div'>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  filter?: FilterConfig;
  autoFocus?: boolean;
}

function SearchFilterBar({
  value,
  onChange,
  placeholder = 'Search...',
  filter,
  autoFocus = false,
  className,
  ...props
}: SearchFilterBarProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleClear = React.useCallback(() => {
    onChange('');
    inputRef.current?.focus();
  }, [onChange]);

  return (
    <div
      data-slot="search-filter-bar"
      className={cn('flex items-center gap-2', className)}
      {...props}
    >
      <div className="relative flex-1">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="pl-10 pr-10"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center size-4 rounded-full text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <XIcon className="size-4" />
          </button>
        )}
      </div>
      {filter && (
        <Select value={filter.value} onValueChange={filter.onChange}>
          <SelectTrigger className="w-auto min-w-[140px]" size="default">
            <SelectValue placeholder={filter.placeholder ?? 'Filter'} />
          </SelectTrigger>
          <SelectContent position="popper">
            {filter.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

export { SearchFilterBar };
export type { SearchFilterBarProps, FilterConfig, FilterOption };
