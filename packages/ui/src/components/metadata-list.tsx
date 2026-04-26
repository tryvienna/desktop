/**
 * MetadataList — Key-value pairs in a grid layout with optional copy and link actions
 *
 * @ai-context
 * - Density-aware via useContentDensity context
 * - Grid layout: label column + value column
 * - Values support: plain text, links (with ChevronRight), copyable (with copy button)
 * - 8pt grid fixes: gap-1.5 → gap-2, [&>svg]:size-3.5 → size-4, size-3.5 → size-4, py-1.5 → py-2
 * - data-slot="metadata-list", data-slot="metadata-item"
 *
 * @example
 * <MetadataList
 *   items={[
 *     { label: 'Status', value: 'Active' },
 *     { label: 'ID', value: 'abc-123', copyable: true },
 *     { label: 'Docs', value: 'View docs', href: '/docs' },
 *   ]}
 * />
 */
import * as React from 'react';
import { CheckIcon, CopyIcon, ChevronRightIcon } from 'lucide-react';
import { cn } from '../utils/cn';
import { useContentDensity, metadataSpacing } from './content-provider';

interface MetadataItem {
  label: string;
  value: React.ReactNode;
  href?: string;
  copyable?: boolean;
  copyValue?: string;
  icon?: React.ReactNode;
  hidden?: boolean;
}

interface MetadataListProps extends React.ComponentProps<'dl'> {
  items: MetadataItem[];
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = React.useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [value]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center justify-center size-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      aria-label="Copy to clipboard"
    >
      {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
    </button>
  );
}

function MetadataList({ items, className, ...props }: MetadataListProps) {
  const density = useContentDensity();
  const visibleItems = items.filter((item) => !item.hidden);

  return (
    <dl
      data-slot="metadata-list"
      data-density={density}
      className={cn(
        'grid grid-cols-[auto_1fr] items-baseline',
        metadataSpacing({ density }),
        className
      )}
      {...props}
    >
      {visibleItems.map((item) => (
        <React.Fragment key={item.label}>
          <dt
            data-slot="metadata-item"
            className="flex items-center gap-2 text-muted-foreground whitespace-nowrap py-2 [&>svg]:size-4 [&>svg]:shrink-0"
          >
            {item.icon}
            {item.label}
          </dt>
          <dd className="flex items-center gap-2 py-2 min-w-0">
            {item.href ? (
              <a
                href={item.href}
                className="inline-flex items-center gap-1 text-foreground hover:text-foreground/80 transition-colors truncate"
              >
                <span className="truncate">{item.value}</span>
                <ChevronRightIcon className="size-4 shrink-0" />
              </a>
            ) : (
              <span className="truncate">{item.value}</span>
            )}
            {item.copyable && (
              <CopyButton
                value={item.copyValue ?? (typeof item.value === 'string' ? item.value : '')}
              />
            )}
          </dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

export { MetadataList };
export type { MetadataItem, MetadataListProps };
