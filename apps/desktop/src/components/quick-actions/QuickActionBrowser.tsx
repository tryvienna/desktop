/**
 * QuickActionBrowser — Browse and add quick actions from the registry.
 *
 * Fetches all available registry quick actions, provides search filtering,
 * and lets users add actions to their personalized list.
 *
 * @module quick-actions/QuickActionBrowser
 */

import { useState, useEffect, useRef } from 'react';
import { Button, Input } from '@tryvienna/ui';
import { X, Search, Check } from 'lucide-react';
import type { RegistryQuickAction } from './types';

interface QuickActionBrowserProps {
  enabledIds: Set<string>;
  browseRegistry: () => Promise<RegistryQuickAction[]>;
  onAdd: (action: RegistryQuickAction) => void;
  onClose: () => void;
}

export function QuickActionBrowser({ enabledIds, browseRegistry, onAdd, onClose }: QuickActionBrowserProps) {
  const [actions, setActions] = useState<RegistryQuickAction[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    browseRegistry()
      .then(setActions)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [browseRegistry]);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const filtered = search
    ? actions.filter(
        (a) =>
          a.label.toLowerCase().includes(search.toLowerCase()) ||
          a.description.toLowerCase().includes(search.toLowerCase()) ||
          a.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase())),
      )
    : actions;

  return (
    <div ref={containerRef} className="w-full overflow-hidden rounded-2xl border bg-popover shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <span className="text-sm font-medium text-muted-foreground">Browse quick actions</span>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 text-muted-foreground">
          <X className="h-[18px] w-[18px]" />
        </Button>
      </div>

      {/* Search */}
      <div className="px-4 pb-2.5">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actions..."
            className="pl-8 text-sm"
            autoFocus
          />
        </div>
      </div>

      {/* List */}
      <div className="max-h-[280px] overflow-y-auto">
        {isLoading ? (
          <div className="px-4 py-6 text-center text-[13px] text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-6 text-center text-[13px] text-muted-foreground">
            {search ? 'No matching actions found' : 'No actions available in registry'}
          </div>
        ) : (
          filtered.map((action) => {
            const isEnabled = enabledIds.has(action.id) || addedIds.has(action.id);
            return (
              <div
                key={action.id}
                className="flex items-start gap-3 border-t px-4 py-3 transition-colors hover:bg-accent"
              >
                <span className="mt-0.5 text-base leading-none">{action.icon}</span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-sm font-medium text-foreground">{action.label}</span>
                  <span className="text-[13px] leading-snug text-muted-foreground">{action.description}</span>
                  {action.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {action.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  variant={isEnabled ? 'ghost' : 'outline'}
                  size="sm"
                  className="mt-0.5 shrink-0"
                  disabled={isEnabled}
                  onClick={() => {
                    setAddedIds((prev) => new Set(prev).add(action.id));
                    onAdd(action);
                  }}
                >
                  {isEnabled ? (
                    <>
                      <Check className="mr-1 h-3 w-3" />
                      Added
                    </>
                  ) : (
                    'Add'
                  )}
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
