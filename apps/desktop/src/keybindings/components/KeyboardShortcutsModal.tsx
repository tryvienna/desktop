/**
 * Keyboard Shortcuts Modal
 *
 * @ai-context
 * Dialog showing all available keyboard shortcuts grouped by category.
 * Self-documenting: automatically reflects current keybindings.
 * Uses COMMAND_METADATA (not a command registry) for titles/descriptions.
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
} from '@tryvienna/ui';
import { Pencil } from 'lucide-react';
import { useKeybindings } from '../../providers/KeybindingsProvider';
import { ShortcutBadge } from './ShortcutBadge';
import { COMMAND_METADATA } from '../defaults';
import { CATEGORY_ORDER, CATEGORY_LABELS, fuzzyMatch } from '../utils';
import type { KeyboardShortcut } from '../schemas';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEditShortcuts?: () => void;
}

export function KeyboardShortcutsModal({
  isOpen,
  onClose,
  onEditShortcuts,
}: KeyboardShortcutsModalProps) {
  const { keybindings, platform } = useKeybindings();
  const [searchQuery, setSearchQuery] = useState('');

  // Reset search when modal opens (useEffect handles prop-driven open changes)
  useEffect(() => {
    if (isOpen) setSearchQuery('');
  }, [isOpen]);

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  const grouped = useMemo(() => {
    if (!keybindings) return [];

    const query = searchQuery.trim();
    const groups: Record<string, Array<{ id: string; title: string; description?: string; shortcut: KeyboardShortcut }>> = {};

    for (const [cmdId, meta] of Object.entries(COMMAND_METADATA)) {
      const shortcut = keybindings[cmdId];
      if (!shortcut) continue;

      if (query) {
        const catLabel = CATEGORY_LABELS[meta.category];
        if (
          !fuzzyMatch(query, meta.title) &&
          !(meta.description && fuzzyMatch(query, meta.description)) &&
          !fuzzyMatch(query, catLabel)
        ) {
          continue;
        }
      }

      const cat = meta.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat]!.push({ id: cmdId, title: meta.title, description: meta.description, shortcut });
    }

    return CATEGORY_ORDER
      .filter((cat) => groups[cat]?.length)
      .map((cat) => ({
        category: cat,
        label: CATEGORY_LABELS[cat],
        items: groups[cat]!,
      }));
  }, [keybindings, searchQuery]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[640px] h-[80vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>All available shortcuts in the app.</DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-3 shrink-0">
          <Input
            type="text"
            placeholder="Search shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto px-6 border-t">
          <div className="py-4">
            {grouped.map(({ category, label, items }) => (
              <div key={category} className="mb-6 last:mb-0">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {label}
                </h3>
                <div className="flex flex-col gap-px rounded-lg overflow-hidden border">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-3.5 py-2.5 bg-secondary/50"
                    >
                      <span className="text-sm text-foreground">{item.title}</span>
                      <ShortcutBadge shortcut={item.shortcut} size="sm" platform={platform} />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {grouped.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {searchQuery.trim()
                  ? `No shortcuts matching "${searchQuery.trim()}"`
                  : 'No shortcuts configured'}
              </div>
            )}
          </div>
        </div>

        {onEditShortcuts && (
          <DialogFooter className="px-6 py-4 border-t shrink-0">
            <Button variant="outline" size="sm" className="gap-2" onClick={onEditShortcuts}>
              <Pencil size={14} />
              Edit Shortcuts
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
