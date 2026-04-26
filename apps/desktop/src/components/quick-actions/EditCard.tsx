/**
 * EditCard — Inline editor for creating/editing quick action categories.
 *
 * Features emoji picker, category label, option list (label + prompt),
 * add/remove options, and save/cancel/delete actions.
 *
 * @module quick-actions/EditCard
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button, Input, Textarea } from '@tryvienna/ui';
import { Plus, Trash2 } from 'lucide-react';
import type { QuickActionCategory, QuickActionOption } from './types';
import { generateId } from './types';

const EMOJI_OPTIONS = [
  '\u2600\uFE0F', '\uD83D\uDCCB', '\uD83D\uDD0D', '\uD83C\uDFAB', '\uD83D\uDCA1', '\uD83D\uDCCC', '\uD83D\uDE80', '\uD83C\uDFAF',
  '\uD83D\uDCCA', '\uD83D\uDCAC', '\uD83D\uDCDD', '\uD83D\uDD27', '\uD83D\uDCE6', '\uD83E\uDDEA', '\uD83D\uDC1B', '\u2705',
  '\uD83D\uDCC5', '\uD83D\uDCBB', '\uD83D\uDD12', '\uD83D\uDCC8', '\uD83C\uDFA8', '\u26A1', '\uD83C\uDFD7\uFE0F', '\uD83E\uDDF9',
  '\uD83D\uDCE3', '\uD83E\uDD1D', '\uD83E\uDDE0', '\uD83D\uDD14', '\uD83D\uDCCE', '\uD83D\uDDC2\uFE0F', '\u23F0', '\uD83C\uDF1F',
];

interface EditCardProps {
  draft: QuickActionCategory;
  isNew: boolean;
  onSave: (category: QuickActionCategory) => void;
  onCancel: () => void;
  onDelete: () => void;
}

export function EditCard({ draft, isNew, onSave, onCancel, onDelete }: EditCardProps) {
  const [icon, setIcon] = useState(draft.icon || '\uD83D\uDCCC');
  const [label, setLabel] = useState(draft.label);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);
  const [options, setOptions] = useState<QuickActionOption[]>(
    draft.options.length > 0 ? draft.options : [{ id: generateId(), label: '', prompt: '' }],
  );

  // Close emoji picker on outside click
  useEffect(() => {
    if (!emojiOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setEmojiOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [emojiOpen]);

  const handleOptionChange = useCallback((index: number, field: 'label' | 'prompt', value: string) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, [field]: value } : o)));
  }, []);

  const handleRemoveOption = useCallback((index: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddOption = useCallback(() => {
    setOptions((prev) => [...prev, { id: generateId(), label: '', prompt: '' }]);
  }, []);

  const handleSave = useCallback(() => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) return;
    const validOptions = options.filter((o) => o.label.trim() && o.prompt.trim());
    if (validOptions.length === 0) return;
    onSave({ id: draft.id, label: trimmedLabel, icon, options: validOptions });
  }, [draft.id, label, icon, options, onSave]);

  const canSave = label.trim() && options.some((o) => o.label.trim() && o.prompt.trim());

  return (
    <div className="w-full overflow-hidden rounded-2xl border bg-popover shadow-md">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-2.5">
        <div ref={emojiRef} className="relative shrink-0">
          <button
            onClick={() => setEmojiOpen((v) => !v)}
            className="flex h-[38px] w-[38px] items-center justify-center rounded-lg border bg-background text-lg transition-colors hover:bg-accent"
            type="button"
          >
            {icon}
          </button>
          {emojiOpen && (
            <div className="absolute left-0 top-[42px] z-10 grid w-[280px] grid-cols-8 gap-0.5 rounded-xl border bg-popover p-1.5 shadow-lg">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => { setIcon(e); setEmojiOpen(false); }}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-base transition-colors hover:bg-accent"
                  type="button"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Category name"
          autoFocus
          className="flex-1 text-sm font-medium"
        />
      </div>

      {/* Options */}
      <div className="flex flex-col">
        {options.map((opt, i) => (
          <div key={opt.id} className="flex items-start gap-2 border-t px-4 py-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Input
                value={opt.label}
                onChange={(e) => handleOptionChange(i, 'label', e.target.value)}
                placeholder="Option label"
                className="text-sm"
              />
              <Textarea
                value={opt.prompt}
                onChange={(e) => handleOptionChange(i, 'prompt', e.target.value)}
                placeholder="Prompt text injected into chat..."
                rows={2}
                className="min-h-[48px] resize-y text-[13px] text-muted-foreground"
              />
            </div>
            {options.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveOption(i)}
                className="mt-1.5 h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                title="Remove option"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}

        {/* Add option */}
        <button
          onClick={handleAddOption}
          className="flex w-full items-center justify-center gap-1.5 border-t px-4 py-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-accent"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add option</span>
        </button>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 border-t px-4 py-2.5">
        {!isNew && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Delete category
          </Button>
        )}
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={!canSave}>
          Save
        </Button>
      </div>
    </div>
  );
}
